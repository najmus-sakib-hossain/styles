use std::borrow::Cow;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::sync::mpsc::channel;
use std::time::{Duration, Instant};
use std::fs::{File, read_dir};
use std::io::Write;

use colored::Colorize;
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use oxc_allocator::Allocator;
use oxc_ast::ast::{JSXAttributeItem, JSXOpeningElement, Program};
use oxc_parser::Parser;
use oxc_span::SourceType;

fn main() {
    let dir = Path::new("src");
    let output_dir = Path::new(".");

    let mut file_classnames: HashMap<PathBuf, HashSet<String>> = HashMap::new();
    let mut classname_counts: HashMap<String, u32> = HashMap::new();
    let mut global_classnames: HashSet<String> = HashSet::new();
    let processed_paths = Arc::new(Mutex::new(HashSet::<PathBuf>::new()));

    let files = find_tsx_jsx_files(dir);
    for file in files {
        let class_names = parse_classnames(&file);
        println!("Parsed class names for {}: {:?}", file.display(), class_names);
        update_maps(&file, &class_names, &mut file_classnames, &mut classname_counts, &mut global_classnames);
    }
    generate_css(&global_classnames, &output_dir.join("styles.css"));

    let (tx, rx) = channel();
    let config = Config::default().with_poll_interval(Duration::from_millis(1000));
    let mut watcher = RecommendedWatcher::new(tx, config).unwrap();
    watcher.watch(dir, RecursiveMode::NonRecursive).unwrap();

    loop {
        match rx.recv() {
            Ok(Ok(event)) => {
                println!("Received event: {:?}", event);
                for path in event.paths {
                    let processed_paths = Arc::clone(&processed_paths);
                    if is_tsx_jsx(&path) {
                        let mut paths = processed_paths.lock().unwrap();
                        if !paths.contains(&path) {
                            paths.insert(path.clone());
                            match event.kind {
                                notify::EventKind::Create(_) | notify::EventKind::Modify(_) => {
                                    process_file_change(&path, &mut file_classnames, &mut classname_counts, &mut global_classnames, output_dir);
                                }
                                notify::EventKind::Remove(_) => {
                                    process_file_remove(&path, &mut file_classnames, &mut classname_counts, &mut global_classnames, output_dir);
                                }
                                _ => {}
                            }
                            std::thread::spawn({
                                let path = path.clone();
                                let processed_paths = Arc::clone(&processed_paths);
                                move || {
                                    std::thread::sleep(Duration::from_millis(2000));
                                    processed_paths.lock().unwrap().remove(&path);
                                }
                            });
                        }
                    }
                }
            }
            Ok(Err(e)) => println!("Watch error: {:?}", e),
            Err(e) => println!("Channel error: {:?}", e),
        }
    }
}

fn find_tsx_jsx_files(dir: &Path) -> Vec<PathBuf> {
    read_dir(dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            let path = e.path();
            path.is_file() && path.extension().map_or(false, |ext| ext == "tsx" || ext == "jsx")
        })
        .map(|e| e.path())
        .collect()
}

fn is_tsx_jsx(path: &Path) -> bool {
    path.extension().map_or(false, |ext| ext == "tsx" || ext == "jsx")
}

fn parse_classnames(path: &Path) -> HashSet<String> {
    let source_text = match std::fs::read_to_string(path) {
        Ok(text) => text,
        Err(e) => {
            println!("Error reading {}: {:?}", path.display(), e);
            return HashSet::new();
        }
    };
    let allocator = Allocator::default();
    let source_type = SourceType::from_path(path).unwrap_or(SourceType::default().with_jsx(true).with_typescript(true));
    let parser = Parser::new(&allocator, &source_text, source_type);
    let parse_result = parser.parse();

    if !parse_result.errors.is_empty() {
        println!("Parse errors for {}: {:?}", path.display(), parse_result.errors);
        return HashSet::new();
    }

    let mut visitor = ClassNameVisitor::new();
    visitor.visit_program(&parse_result.program);
    if visitor.class_names.is_empty() {
        println!("No class names found in {}: AST may not contain expected JSX structure", path.display());
    }
    visitor.class_names
}

struct ClassNameVisitor {
    class_names: HashSet<String>,
}

impl ClassNameVisitor {
    fn new() -> Self {
        Self { class_names: HashSet::new() }
    }

    fn visit_program(&mut self, program: &Program) {
        for stmt in &program.body {
            self.visit_statement(stmt);
        }
    }

    fn visit_statement(&mut self, stmt: &oxc_ast::ast::Statement) {
        match stmt {
            oxc_ast::ast::Statement::ExpressionStatement(expr_stmt) => {
                self.visit_expression(&expr_stmt.expression);
            }
            oxc_ast::ast::Statement::BlockStatement(block) => {
                for stmt in &block.body {
                    self.visit_statement(stmt);
                }
            }
            oxc_ast::ast::Statement::ReturnStatement(ret) => {
                if let Some(expr) = &ret.argument {
                    self.visit_expression(expr);
                }
            }
            oxc_ast::ast::Statement::FunctionDeclaration(func) => {
                if let Some(body) = &func.body {
                    for stmt in &body.statements {
                        self.visit_statement(stmt);
                    }
                }
            }
            oxc_ast::ast::Statement::ExportDefaultDeclaration(export) => {
                match &export.declaration {
                    oxc_ast::ast::ExportDefaultDeclarationKind::FunctionDeclaration(func) => {
                        if let Some(body) = &func.body {
                            for stmt in &body.statements {
                                self.visit_statement(stmt);
                            }
                        }
                    }
                    oxc_ast::ast::ExportDefaultDeclarationKind::ArrowFunctionExpression(arrow) => {
                        for stmt in &arrow.body.statements {
                            self.visit_statement(stmt);
                        }
                    }
                    oxc_ast::ast::ExportDefaultDeclarationKind::FunctionExpression(func) => {
                        if let Some(body) = &func.body {
                            for stmt in &body.statements {
                                self.visit_statement(stmt);
                            }
                        }
                    }
                    _ => {}
                }
            }
            _ => {}
        }
    }

    fn visit_expression(&mut self, expr: &oxc_ast::ast::Expression) {
        match expr {
            oxc_ast::ast::Expression::JSXElement(jsx_elem) => {
                self.visit_jsx_element(jsx_elem);
            }
            oxc_ast::ast::Expression::ArrowFunctionExpression(arrow) => {
                for stmt in &arrow.body.statements {
                    self.visit_statement(stmt);
                }
            }
            oxc_ast::ast::Expression::FunctionExpression(func) => {
                if let Some(body) = &func.body {
                    for stmt in &body.statements {
                        self.visit_statement(stmt);
                    }
                }
            }
            _ => {}
        }
    }

    fn visit_jsx_element(&mut self, elem: &oxc_ast::ast::JSXElement) {
        self.visit_jsx_opening_element(&elem.opening_element);
        for child in &elem.children {
            if let oxc_ast::ast::JSXChild::Element(child_elem) = child {
                self.visit_jsx_element(child_elem);
            }
        }
    }

    fn visit_jsx_opening_element(&mut self, elem: &JSXOpeningElement) {
        for attr in &elem.attributes {
            if let JSXAttributeItem::Attribute(attr) = attr {
                let attr_name = match &attr.name {
                    oxc_ast::ast::JSXAttributeName::Identifier(ident) => Cow::Borrowed(ident.name.as_str()),
                    oxc_ast::ast::JSXAttributeName::NamespacedName(namespaced) => {
                        let ns = namespaced.namespace.name.as_str();
                        let name = namespaced.name.name.as_str();
                        Cow::Owned(format!("{}:{}", ns, name))
                    }
                };
                if attr_name == "className" {
                    if let Some(value) = &attr.value {
                        if let oxc_ast::ast::JSXAttributeValue::StringLiteral(lit) = value {
                            for cn in lit.value.split_whitespace() {
                                self.class_names.insert(cn.to_string());
                            }
                        }
                    }
                }
            }
        }
    }
}

fn update_maps(
    path: &Path,
    new_classnames: &HashSet<String>,
    file_classnames: &mut HashMap<PathBuf, HashSet<String>>,
    classname_counts: &mut HashMap<String, u32>,
    global_classnames: &mut HashSet<String>,
) -> (usize, usize, usize, usize) {
    let old_classnames = file_classnames.get(path).cloned().unwrap_or_default();
    let added_in_file: HashSet<_> = new_classnames.difference(&old_classnames).cloned().collect();
    let removed_in_file: HashSet<_> = old_classnames.difference(new_classnames).cloned().collect();

    let mut added_in_global = 0;
    let mut removed_in_global = 0;

    for cn in &removed_in_file {
        if let Some(count) = classname_counts.get_mut(cn) {
            *count -= 1;
            if *count == 0 {
                global_classnames.remove(cn);
                removed_in_global += 1;
            }
        }
    }

    for cn in &added_in_file {
        let count = classname_counts.entry(cn.clone()).or_insert(0);
        if *count == 0 {
            global_classnames.insert(cn.clone());
            added_in_global += 1;
        }
        *count += 1;
    }

    file_classnames.insert(path.to_path_buf(), new_classnames.clone());
    (added_in_file.len(), removed_in_file.len(), added_in_global, removed_in_global)
}

fn generate_css(class_names: &HashSet<String>, output_path: &Path) {
    let mut file = File::create(output_path).unwrap();
    let mut sorted_class_names: Vec<_> = class_names.iter().collect();
    sorted_class_names.sort();

    let class_map: HashMap<&str, &str> = [
        ("h-full", "height: 100%;"),
        ("w-full", "width: 100%;"),
        ("flex", "display: flex;"),
        ("items-center", "align-items: center;"),
        ("justify-center", "justify-content: center;"),
        ("text-3xl", "font-size: 1.875rem; line-height: 2.25rem;"),
        ("font-bold", "font-weight: 700;"),
    ].into_iter().collect();

    for cn in sorted_class_names {
        let style = class_map.get(cn.as_str()).unwrap_or(&"color: red;");
        writeln!(file, ".{} {{\n    {}\n}}", cn, style).unwrap();
    }
    println!("Generated CSS for {} classes: {:?}", class_names.len(), class_names);
}

fn process_file_change(
    path: &Path,
    file_classnames: &mut HashMap<PathBuf, HashSet<String>>,
    classname_counts: &mut HashMap<String, u32>,
    global_classnames: &mut HashSet<String>,
    dir: &Path,
) {
    let start = Instant::now();
    let new_classnames = parse_classnames(path);
    let (added_file, removed_file, added_global, removed_global) = update_maps(
        path,
        &new_classnames,
        file_classnames,
        classname_counts,
        global_classnames,
    );
    generate_css(global_classnames, &dir.join("styles.css"));
    let time_ms = start.elapsed().as_millis();
    log_change(path, added_file, removed_file, &dir.join("styles.css"), added_global, removed_global, time_ms);
}

fn process_file_remove(
    path: &Path,
    file_classnames: &mut HashMap<PathBuf, HashSet<String>>,
    classname_counts: &mut HashMap<String, u32>,
    global_classnames: &mut HashSet<String>,
    dir: &Path,
) {
    if let Some(old_classnames) = file_classnames.remove(path) {
        let start = Instant::now();
        let mut removed_in_global = 0;
        for cn in &old_classnames {
            if let Some(count) = classname_counts.get_mut(cn) {
                *count -= 1;
                if *count == 0 {
                    global_classnames.remove(cn);
                    removed_in_global += 1;
                }
            }
        }
        generate_css(global_classnames, &dir.join("styles.css"));
        let time_ms = start.elapsed().as_millis();
        log_change(path, 0, old_classnames.len(), &dir.join("styles.css"), 0, removed_in_global, time_ms);
    }
}

fn log_change(
    source_path: &Path,
    added_file: usize,
    removed_file: usize,
    output_path: &Path,
    added_global: usize,
    removed_global: usize,
    time_ms: u128,
) {
    let source_str = source_path.strip_prefix("./").unwrap_or(source_path).display().to_string();
    let output_str = output_path.strip_prefix("./").unwrap_or(output_path).display().to_string();
    let file_changes = format!("(+{},{})", added_file, format!("-{}", removed_file).red()).green();
    let output_changes = format!("(+{},{})", added_global, format!("-{}", removed_global).red()).green();
    println!(
        "{} {} -> {} {} · {}ms",
        source_str, file_changes, output_str, output_changes, time_ms
    );
}