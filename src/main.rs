use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::mpsc::channel;
use std::time::{Duration, Instant};
use std::fs::File;
use std::io::Write;

use colored::Colorize;
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use oxc_allocator::Allocator;
use oxc_ast::ast::{JSXAttributeItem, JSXOpeningElement, Program};
use oxc_parser::Parser;
use oxc_span::SourceType;
use walkdir::WalkDir;

fn main() {
    let dir = std::env::args().nth(1).unwrap_or_else(|| ".".to_string());
    let dir = Path::new(&dir);

    let mut file_classnames: HashMap<PathBuf, HashSet<String>> = HashMap::new();
    let mut classname_counts: HashMap<String, u32> = HashMap::new();
    let mut global_classnames: HashSet<String> = HashSet::new();

    let files = find_tsx_jsx_files(dir);
    for file in files {
        let class_names = parse_classnames(&file);
        update_maps(&file, &class_names, &mut file_classnames, &mut classname_counts, &mut global_classnames);
    }
    generate_css(&global_classnames, &dir.join("styles.css"));

    let (tx, rx) = channel();
    let config = Config::default().with_poll_interval(Duration::from_millis(100));
    let mut watcher = RecommendedWatcher::new(tx, config).unwrap();
    watcher.watch(dir, RecursiveMode::Recursive).unwrap();

    loop {
        match rx.recv() {
            Ok(Ok(event)) => match event.kind {
                notify::EventKind::Create(_) | notify::EventKind::Modify(_) => {
                    for path in event.paths {
                        if is_tsx_jsx(&path) {
                            process_file_change(&path, &mut file_classnames, &mut classname_counts, &mut global_classnames, dir);
                        }
                    }
                }
                notify::EventKind::Remove(_) => {
                    for path in event.paths {
                        if is_tsx_jsx(&path) {
                            process_file_remove(&path, &mut file_classnames, &mut classname_counts, &mut global_classnames, dir);
                        }
                    }
                }
                _ => {}
            },
            Ok(Err(e)) => println!("Watch error: {:?}", e),
            Err(e) => println!("Channel error: {:?}", e),
        }
    }
}

fn find_tsx_jsx_files(dir: &Path) -> Vec<PathBuf> {
    WalkDir::new(dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            let path = e.path();
            path.extension().map_or(false, |ext| ext == "tsx" || ext == "jsx")
        })
        .map(|e| e.path().to_path_buf())
        .collect()
}

fn is_tsx_jsx(path: &Path) -> bool {
    path.extension().map_or(false, |ext| ext == "tsx" || ext == "jsx")
}

fn parse_classnames(path: &Path) -> HashSet<String> {
    let source_text = match std::fs::read_to_string(path) {
        Ok(text) => text,
        Err(_) => return HashSet::new(),
    };
    let allocator = Allocator::default();
    let source_type = SourceType::from_path(path).unwrap_or(SourceType::default().with_jsx(true).with_typescript(true));
    let parser = Parser::new(&allocator, &source_text, source_type);
    let parse_result = parser.parse();

    if parse_result.errors.is_empty() {
        let mut visitor = ClassNameVisitor::new();
        visitor.visit_program(&parse_result.program);
        visitor.class_names
    } else {
        HashSet::new()
    }
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
                let mut formatted = String::new();
                let attr_name = match &attr.name {
                    oxc_ast::ast::JSXAttributeName::Identifier(ident) => ident.name.as_str(),
                    oxc_ast::ast::JSXAttributeName::NamespacedName(namespaced) => {
                        let ns = namespaced.namespace.name.as_str();
                        let name = namespaced.name.name.as_str();
                        formatted = format!("{}:{}", ns, name);
                        formatted.as_str()
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
    for cn in sorted_class_names {
        writeln!(file, ".{} {{\n    color: red;\n}}", cn).unwrap();
    }
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
    let source_str = format!("./{}", source_path.display());
    let output_str = format!("./{}", output_path.display());
    let file_changes = format!("(+{},{})", added_file, format!("-{}", removed_file).red()).green();
    let output_changes = format!("(+{},{})", added_global, format!("-{}", removed_global).red()).green();
    println!(
        "{} {} -> {} {} · {}ms",
        source_str, file_changes, output_str, output_changes, time_ms
    );
}