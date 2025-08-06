use std::borrow::Cow;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::sync::mpsc::channel;
use std::time::{Duration, Instant};
use std::fs::{File, read_dir};
use std::io::Write;

use colored::Colorize;
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher, event::{ModifyKind, AccessKind, AccessMode}};
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
    if !files.is_empty() {
        let scan_start = Instant::now();
        let mut total_added_in_files = 0;

        for file in &files {
            let new_classnames = parse_classnames(file);
            total_added_in_files += new_classnames.len();
            update_maps(file, &new_classnames, &mut file_classnames, &mut classname_counts, &mut global_classnames);
        }
        
        generate_css(&global_classnames, &output_dir.join("styles.css"));
        let scan_duration = scan_start.elapsed();
        
        log_change(
            dir,
            total_added_in_files,
            0,
            &output_dir.join("styles.css"),
            global_classnames.len(),
            0,
            scan_duration.as_micros()
        );
    } else {
        println!("{}", "No .tsx or .jsx files found in src/.".yellow());
    }
    
    println!("{}", "Watching for file changes...".bold().cyan());

    let (tx, rx) = channel();
    let config = Config::default().with_poll_interval(Duration::from_millis(1000));
    let mut watcher = RecommendedWatcher::new(tx, config).unwrap();
    watcher.watch(dir, RecursiveMode::NonRecursive).unwrap();

    loop {
        match rx.recv() {
            Ok(Ok(event)) => {
                for path in event.paths {
                    let processed_paths_clone = Arc::clone(&processed_paths);
                    if is_tsx_jsx(&path) {
                        let mut paths = processed_paths_clone.lock().unwrap();
                        if !paths.contains(&path) {
                            match event.kind {
                                notify::EventKind::Create(_) |
                                notify::EventKind::Modify(ModifyKind::Data(_)) |
                                notify::EventKind::Modify(ModifyKind::Name(_)) |
                                notify::EventKind::Access(AccessKind::Close(AccessMode::Write)) => {
                                    paths.insert(path.clone());
                                    process_file_change(&path, &mut file_classnames, &mut classname_counts, &mut global_classnames, output_dir);
                                }
                                notify::EventKind::Remove(_) => {
                                    paths.insert(path.clone());
                                    process_file_remove(&path, &mut file_classnames, &mut classname_counts, &mut global_classnames, output_dir);
                                }
                                _ => {}
                            }
                            
                            if paths.contains(&path) {
                                std::thread::spawn({
                                    let path_clone = path.clone();
                                    let processed_paths_clone_for_thread = Arc::clone(&processed_paths);
                                    move || {
                                        std::thread::sleep(Duration::from_millis(500));
                                        processed_paths_clone_for_thread.lock().unwrap().remove(&path_clone);
                                    }
                                });
                            }
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
    match read_dir(dir) {
        Ok(entries) => {
            entries
                .filter_map(|entry_result| entry_result.ok())
                .filter(|entry| {
                    let path = entry.path();
                    path.is_file() && is_tsx_jsx(&path)
                })
                .map(|entry| entry.path())
                .collect()
        }
        Err(e) => {
            println!("{} Failed to read directory '{}': {}", "Error:".red(), dir.display(), e);
            Vec::new()
        }
    }
}

fn is_tsx_jsx(path: &Path) -> bool {
    path.extension().map_or(false, |ext| ext == "tsx" || ext == "jsx")
}

fn parse_classnames(path: &Path) -> HashSet<String> {
    let source_text = match std::fs::read_to_string(path) {
        Ok(text) => text,
        Err(_) => {
            return HashSet::new();
        }
    };
    let allocator = Allocator::default();
    let source_type = SourceType::from_path(path).unwrap_or(SourceType::default().with_jsx(true).with_typescript(true));
    let parser = Parser::new(&allocator, &source_text, source_type);
    let parse_result = parser.parse();

    if !parse_result.errors.is_empty() {
        return HashSet::new();
    }

    let mut visitor = ClassNameVisitor::new();
    visitor.visit_program(&parse_result.program);
    visitor.class_names
}

struct ClassNameVisitor {
    class_names: HashSet<String>,
}

impl ClassNameVisitor {
    fn new() -> Self {
        Self {
            class_names: HashSet::new(),
        }
    }

    fn visit_program(&mut self, program: &Program) {
        for stmt in &program.body {
            self.visit_statement(stmt);
        }
    }

    fn visit_statement(&mut self, stmt: &oxc_ast::ast::Statement) {
        match stmt {
            oxc_ast::ast::Statement::FunctionDeclaration(decl) => self.visit_function(decl),
            oxc_ast::ast::Statement::ExportDefaultDeclaration(decl) => {
                self.visit_export_default_declaration(decl)
            }
            oxc_ast::ast::Statement::ExportNamedDeclaration(decl) => {
                if let Some(d) = &decl.declaration {
                    self.visit_declaration(d);
                }
            }
            oxc_ast::ast::Statement::VariableDeclaration(decl) => {
                for var in &decl.declarations {
                    if let Some(init) = &var.init {
                        self.visit_expression(init);
                    }
                }
            }
            oxc_ast::ast::Statement::BlockStatement(stmt) => {
                for s in &stmt.body {
                    self.visit_statement(s);
                }
            }
            oxc_ast::ast::Statement::ReturnStatement(stmt) => {
                if let Some(arg) = &stmt.argument {
                    self.visit_expression(arg);
                }
            }
            oxc_ast::ast::Statement::IfStatement(stmt) => {
                self.visit_statement(&stmt.consequent);
                if let Some(alt) = &stmt.alternate {
                    self.visit_statement(alt);
                }
            }
            oxc_ast::ast::Statement::ExpressionStatement(stmt) => {
                self.visit_expression(&stmt.expression);
            }
            oxc_ast::ast::Statement::ForStatement(stmt) => {
                self.visit_statement(&stmt.body);
            }
            _ => {}
        }
    }
    
    fn visit_declaration(&mut self, decl: &oxc_ast::ast::Declaration) {
        use oxc_ast::ast::Declaration;
        match decl {
            Declaration::VariableDeclaration(var_decl) => {
                for var in &var_decl.declarations {
                    if let Some(init) = &var.init {
                        self.visit_expression(init);
                    }
                }
            }
            Declaration::FunctionDeclaration(func_decl) => self.visit_function(func_decl),
            Declaration::ClassDeclaration(class_decl) => {
                if let Some(super_class) = &class_decl.super_class {
                    self.visit_expression(super_class);
                }
                for member in &class_decl.body.body {
                     if let oxc_ast::ast::ClassElement::MethodDefinition(method) = member {
                         if let Some(body) = &method.value.body {
                             for stmt in &body.statements {
                                 self.visit_statement(stmt);
                             }
                         }
                     }
                }
            }
            _ => {}
        }
    }

    fn visit_expression(&mut self, expr: &oxc_ast::ast::Expression) {
        match expr {
            oxc_ast::ast::Expression::JSXElement(elem) => self.visit_jsx_element(elem),
            oxc_ast::ast::Expression::JSXFragment(frag) => self.visit_jsx_fragment(frag),
            oxc_ast::ast::Expression::FunctionExpression(expr) => self.visit_function(expr),
            oxc_ast::ast::Expression::ArrowFunctionExpression(expr) => {
                self.visit_arrow_function(expr)
            }
            oxc_ast::ast::Expression::ConditionalExpression(expr) => {
                self.visit_expression(&expr.consequent);
                self.visit_expression(&expr.alternate);
            }
            oxc_ast::ast::Expression::LogicalExpression(expr) => {
                self.visit_expression(&expr.left);
                self.visit_expression(&expr.right);
            }
            oxc_ast::ast::Expression::ParenthesizedExpression(expr) => {
                self.visit_expression(&expr.expression)
            }
            oxc_ast::ast::Expression::CallExpression(expr) => {
                for arg in &expr.arguments {
                    self.visit_argument(arg);
                }
            }
            _ => {}
        }
    }
    
    fn visit_argument(&mut self, arg: &oxc_ast::ast::Argument) {
        match arg {
            oxc_ast::ast::Argument::SpreadElement(spread) => {
                self.visit_expression(&spread.argument);
            }
            _ => if let Some(expr) = arg.as_expression() {
                self.visit_expression(expr);
            }
        }
    }
    
    fn visit_export_default_declaration(
        &mut self,
        decl: &oxc_ast::ast::ExportDefaultDeclaration,
    ) {
        use oxc_ast::ast::ExportDefaultDeclarationKind;
        match &decl.declaration {
            ExportDefaultDeclarationKind::FunctionDeclaration(func) => self.visit_function(func),
            ExportDefaultDeclarationKind::ArrowFunctionExpression(func) => {
                self.visit_arrow_function(func)
            }
            ExportDefaultDeclarationKind::FunctionExpression(func) => self.visit_function(func),
            kind => if let Some(expr) = kind.as_expression() {
                self.visit_expression(expr);
            }
        }
    }

    fn visit_function(&mut self, func: &oxc_ast::ast::Function) {
        if let Some(body) = &func.body {
            for stmt in &body.statements {
                self.visit_statement(stmt);
            }
        }
    }

    fn visit_arrow_function(&mut self, func: &oxc_ast::ast::ArrowFunctionExpression) {
        let body = &func.body;
        for stmt in &body.statements {
            match stmt {
                oxc_ast::ast::Statement::ExpressionStatement(expr_stmt) => {
                    self.visit_expression(&expr_stmt.expression);
                }
                _ => {
                    self.visit_statement(stmt);
                }
            }
        }
    }

    fn visit_jsx_element(&mut self, elem: &oxc_ast::ast::JSXElement) {
        self.visit_jsx_opening_element(&elem.opening_element);
        for child in &elem.children {
            self.visit_jsx_child(child);
        }
    }

    fn visit_jsx_fragment(&mut self, frag: &oxc_ast::ast::JSXFragment) {
        for child in &frag.children {
            self.visit_jsx_child(child);
        }
    }

    fn visit_jsx_child(&mut self, child: &oxc_ast::ast::JSXChild) {
        match child {
            oxc_ast::ast::JSXChild::Element(elem) => self.visit_jsx_element(elem),
            oxc_ast::ast::JSXChild::Fragment(frag) => self.visit_jsx_fragment(frag),
            oxc_ast::ast::JSXChild::ExpressionContainer(container) => {
                if let Some(expr) = container.expression.as_expression() {
                    self.visit_expression(expr);
                }
            }
            _ => {}
        }
    }

    fn visit_jsx_opening_element(&mut self, elem: &JSXOpeningElement) {
        for attr in &elem.attributes {
            if let JSXAttributeItem::Attribute(attr) = attr {
                let attr_name = match &attr.name {
                    oxc_ast::ast::JSXAttributeName::Identifier(ident) => {
                        Cow::Borrowed(ident.name.as_str())
                    }
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
    if added_global > 0 || removed_global > 0 {
        generate_css(global_classnames, &dir.join("styles.css"));
    }
    let time_us = start.elapsed().as_micros();
    log_change(path, added_file, removed_file, &dir.join("styles.css"), added_global, removed_global, time_us);
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
        if removed_in_global > 0 {
            generate_css(global_classnames, &dir.join("styles.css"));
        }
        let time_us = start.elapsed().as_micros();
        log_change(path, 0, old_classnames.len(), &dir.join("styles.css"), 0, removed_in_global, time_us);
    }
}

fn log_change(
    source_path: &Path,
    added_file: usize,
    removed_file: usize,
    output_path: &Path,
    added_global: usize,
    removed_global: usize,
    time_us: u128,
) {
    let source_str = source_path.strip_prefix("./").unwrap_or(source_path).display().to_string();
    let output_str = output_path.strip_prefix("./").unwrap_or(output_path).display().to_string();
    
    let file_changes = format!(
        "({}, {})",
        format!("+{}", added_file).bright_green(),
        format!("-{}", removed_file).bright_red()
    );

    let output_changes = format!(
        "({}, {})",
        format!("+{}", added_global).bright_green(),
        format!("-{}", removed_global).bright_red()
    );

    let time_str = if time_us < 1000 {
        format!("{}µs", time_us)
    } else {
        format!("{}ms", time_us / 1000)
    };

    println!(
        "{} {} -> {} {} {} {}",
        source_str.bright_cyan(),
        file_changes,
        output_str.bright_magenta(),
        output_changes,
        "·".bright_black(),
        time_str.yellow()
    );
}
