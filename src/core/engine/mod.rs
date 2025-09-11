pub mod composite;
pub mod container_queries;
pub mod dynamic;
pub mod screens;
pub mod states;

pub use composite::expand_composite;
pub use dynamic::generate_dynamic_css;
pub use screens::{build_block, sanitize_declarations, wrap_media_queries};
pub use states::apply_wrappers_and_states;

#[allow(dead_code)]
pub fn init() {}

use memmap2::Mmap;
use std::collections::HashMap;
use std::fs::File;
use std::path::Path;
use std::sync::Arc;

#[allow(dead_code)]
mod style_generated {
    #![allow(
        dead_code,
        unused_imports,
        non_snake_case,
        clippy::all,
        unsafe_op_in_unsafe_fn,
        mismatched_lifetime_syntaxes
    )]
    include!(concat!(env!("OUT_DIR"), "/style_generated.rs"));
}
use style_generated::style_schema;

#[derive(Clone)]
pub struct GeneratorMeta {
    pub prefix: String,
    pub property: String,
    pub multiplier: f32,
    pub unit: String,
}

pub struct StyleEngine {
    pub(crate) precompiled: HashMap<String, String>,
    pub(crate) _mmap: Arc<Mmap>,
    pub screens: HashMap<String, String>,
    pub states: HashMap<String, String>,
    pub container_queries: HashMap<String, String>,
    pub colors: HashMap<String, String>,
    pub generators: Option<Vec<GeneratorMeta>>,
    pub generator_map: Option<HashMap<String, usize>>,
    #[allow(dead_code)]
    pub properties: Vec<PropertyMeta>,
    pub property_css: String,
    pub base_layer_raw: Option<String>,
}

#[derive(Clone, Debug)]
pub struct PropertyMeta {
    pub name: String,
    pub syntax: String,
    pub inherits: bool,
    pub initial: String,
}

impl StyleEngine {
    pub fn load_from_disk() -> Result<Self, Box<dyn std::error::Error>> {
        let override_path = std::env::var("DX_STYLE_BIN").ok();
        let path_buf;
        let path = if let Some(p) = override_path.as_deref() {
            path_buf = std::path::PathBuf::from(p);
            &path_buf
        } else {
            Path::new(".dx/style/style.bin")
        };
        let file = File::open(path)?;
        let mmap = unsafe { Mmap::map(&file)? };
        let config = flatbuffers::root::<style_schema::Config>(&mmap)
            .map_err(|e| format!("Failed to parse style.bin: {}", e))?;
        let mut precompiled = HashMap::new();
        if let Some(styles) = config.styles() {
            for style in styles {
                let name = style.name();
                let css = style.css();
                if name.is_empty() || css.is_empty() {
                    continue;
                }
                precompiled.insert(
                    name.to_string(),
                    css.trim_end().trim_end_matches(';').to_string(),
                );
            }
        }
        if let Some(dynamics) = config.dynamics() {
            for dynamic in dynamics {
                if let Some(values) = dynamic.values() {
                    for value in values {
                        let key = dynamic.key();
                        let suffix = value.suffix();
                        let property = dynamic.property();
                        let value_str = value.value();
                        let name = if suffix.is_empty() {
                            key.to_string()
                        } else {
                            format!("{}-{}", key, suffix)
                        };
                        if !name.is_empty() {
                            let css = format!(
                                "{}: {}",
                                property,
                                value_str.trim_end().trim_end_matches(';')
                            );
                            precompiled.insert(name, css);
                        }
                    }
                }
            }
        }
        let screens = config.screens().map_or_else(HashMap::new, |s| {
            s.iter()
                .map(|scr| (scr.name().to_string(), scr.value().to_string()))
                .collect()
        });
        let states = config.states().map_or_else(HashMap::new, |s| {
            s.iter()
                .map(|st| (st.name().to_string(), st.value().to_string()))
                .collect()
        });
        let container_queries = config.container_queries().map_or_else(HashMap::new, |c| {
            c.iter()
                .map(|cq| (cq.name().to_string(), cq.value().to_string()))
                .collect()
        });
        let colors = config.colors().map_or_else(HashMap::new, |c| {
            c.iter()
                .map(|col| (col.name().to_string(), col.value().to_string()))
                .collect()
        });
        let generators: Option<Vec<GeneratorMeta>> = config.generators().map(|gen_list| {
            gen_list
                .iter()
                .map(|g| GeneratorMeta {
                    prefix: g.prefix().to_string(),
                    property: g.property().to_string(),
                    multiplier: g.multiplier(),
                    unit: g.unit().to_string(),
                })
                .collect()
        });
        let generator_map = generators.as_ref().map(|vec| {
            let mut m = HashMap::new();
            for (i, g) in vec.iter().enumerate() {
                m.insert(g.prefix.clone(), i);
            }
            m
        });
        let properties = config.properties().map_or_else(Vec::new, |plist| {
            plist
                .iter()
                .map(|p| PropertyMeta {
                    name: p.name().to_string(),
                    syntax: p.syntax().unwrap_or("").to_string(),
                    inherits: p.inherits(),
                    initial: p.initial().unwrap_or("").to_string(),
                })
                .collect()
        });
        let property_css = {
            if properties.is_empty() {
                String::new()
            } else {
                let mut out = String::new();
                for p in &properties {
                    use std::fmt::Write as _;
                    let _ = writeln!(out, "@property {} {{", p.name);
                    if !p.syntax.is_empty() {
                        let _ = writeln!(out, "  syntax: \"{}\";", p.syntax);
                    }
                    let _ = writeln!(
                        out,
                        "  inherits: {};",
                        if p.inherits { "true" } else { "false" }
                    );
                    if !p.initial.is_empty() {
                        let _ = writeln!(out, "  initial-value: {};", p.initial);
                    }
                    let _ = writeln!(out, "}}\n");
                }
                out
            }
        };
        let base_layer_raw = config.base_css().map(|s| s.to_string());
        Ok(Self {
            precompiled,
            _mmap: Arc::new(mmap),
            screens,
            states,
            container_queries,
            colors,
            generators,
            generator_map,
            properties,
            property_css,
            base_layer_raw,
        })
    }

    pub fn empty() -> Self {
        let override_path = std::env::var("DX_STYLE_BIN").ok();
        let default_path = override_path.as_deref().unwrap_or(".dx/style/style.bin");
        let file = File::options()
            .read(true)
            .write(false)
            .create(true)
            .open(default_path)
            .ok();
        let mmap = file.and_then(|f| unsafe { Mmap::map(&f).ok() });
        StyleEngine {
            precompiled: HashMap::new(),
            _mmap: Arc::new(mmap.unwrap_or_else(|| {
                let file = File::options()
                    .read(true)
                    .write(false)
                    .create(true)
                    .open(default_path)
                    .unwrap();
                unsafe { Mmap::map(&file).unwrap_or_else(|_| Mmap::map(&file).unwrap()) }
            })),
            screens: HashMap::new(),
            states: HashMap::new(),
            container_queries: HashMap::new(),
            colors: HashMap::new(),
            generators: None,
            generator_map: None,
            properties: Vec::new(),
            property_css: String::new(),
            base_layer_raw: None,
        }
    }

    pub fn property_at_rules(&self) -> String {
        self.property_css.clone()
    }

    pub fn compute_css(&self, class_name: &str) -> Option<String> {
        if class_name.starts_with("from(")
            || class_name.starts_with("to(")
            || class_name.starts_with("via(")
        {
            return None;
        }
        let mut last_colon = None;
        for (i, b) in class_name.as_bytes().iter().enumerate() {
            if *b == b':' {
                last_colon = Some(i);
            }
        }
        let (prefix_segment, base_class) = if let Some(idx) = last_colon {
            (&class_name[..idx], &class_name[idx + 1..])
        } else {
            ("", class_name)
        };
        let (media_queries, pseudo_classes, wrappers) =
            crate::core::engine::apply_wrappers_and_states(self, prefix_segment);
        let core_css_raw = crate::core::engine::expand_composite(self, class_name)
            .or_else(|| self.precompiled.get(base_class).cloned())
            .or_else(|| crate::core::color::generate_color_css(self, base_class))
            .or_else(|| {
                if class_name.contains(' ') {
                    None
                } else {
                    crate::core::animation::generate_animation_css(class_name)
                }
            })
            .or_else(|| crate::core::engine::generate_dynamic_css(self, base_class))
            .or_else(|| crate::core::engine::expand_composite(self, base_class));
        core_css_raw.map(|mut css| {
            css = crate::core::engine::sanitize_declarations(&css);
            let mut escaped_ident = String::with_capacity(class_name.len() + 8);
            struct Acc<'a> {
                buf: &'a mut String,
            }
            impl<'a> std::fmt::Write for Acc<'a> {
                fn write_str(&mut self, s: &str) -> std::fmt::Result {
                    self.buf.push_str(s);
                    Ok(())
                }
            }
            if cssparser::serialize_identifier(
                class_name,
                &mut Acc {
                    buf: &mut escaped_ident,
                },
            )
            .is_err()
            {
                for ch in class_name.chars() {
                    match ch {
                        ':' => escaped_ident.push_str("\\:"),
                        '@' => escaped_ident.push_str("\\@"),
                        '(' => escaped_ident.push_str("\\("),
                        ')' => escaped_ident.push_str("\\)"),
                        ' ' => escaped_ident.push_str("\\ "),
                        '/' => escaped_ident.push_str("\\/"),
                        '\\' => escaped_ident.push_str("\\\\"),
                        _ => escaped_ident.push(ch),
                    }
                }
            }
            let mut selector =
                String::with_capacity(escaped_ident.len() + pseudo_classes.len() + 2);
            selector.push('.');
            selector.push_str(&escaped_ident);
            selector.push_str(&pseudo_classes);
            let blocks = self.decode_encoded_css(&css, &selector, &wrappers);
            crate::core::engine::wrap_media_queries(blocks, &media_queries)
        })
    }

    pub fn css_for_class(&self, class: &str) -> Option<String> {
        self.compute_css(class)
    }

    pub fn generate_color_vars_for<'a, I>(&self, classes: I) -> (String, String)
    where
        I: IntoIterator<Item = &'a String>,
    {
        use std::collections::BTreeSet;
        let mut needed: BTreeSet<&str> = BTreeSet::new();
        for c in classes.into_iter() {
            let base = c.rsplit(':').next().unwrap_or(c);
            if let Some(name) = base.strip_prefix("bg-") {
                if self.colors.contains_key(name) {
                    needed.insert(name);
                }
            }
            if let Some(name) = base.strip_prefix("text-") {
                if self.colors.contains_key(name) {
                    needed.insert(name);
                }
            }
        }
        if needed.is_empty() {
            return (String::new(), String::new());
        }
        let mut root = String::from(":root {\n");
        let mut dark = String::from(".dark {\n");
        for name in needed {
            if let Some(val) = self.colors.get(name) {
                use std::fmt::Write as _;
                let _ = writeln!(root, "  --color-{}: {};", name, val);
                let _ = writeln!(dark, "  --color-{}: {};", name, val);
            }
        }
        root.push_str("}\n");
        dark.push_str("}\n");
        (root, dark)
    }

    fn decode_encoded_css(&self, css: &str, selector: &str, wrappers: &[String]) -> String {
        use crate::core::engine::build_block;
        let is_encoded = [
            "BASE|", "STATE|", "CHILD|", "COND|", "DATA|", "RAW|", "ANIM|",
        ]
        .iter()
        .any(|p| css.contains(p));
        if !is_encoded {
            if wrappers.is_empty() {
                return build_block(selector, css);
            }
            let mut out = String::new();
            for w in wrappers {
                let sel = w.replace('&', selector);
                out.push_str(&build_block(&sel, css));
                out.push('\n');
            }
            if out.ends_with('\n') {
                out.pop();
            }
            return out;
        }
        let mut out = String::new();
        let mut pending_anim: Option<crate::core::animation::PendingAnimation> = None;
        let lines: Vec<&str> = if css.contains('\n') {
            css.lines().collect()
        } else {
            vec![css]
        };
        for line in lines {
            if line.is_empty() {
                continue;
            }
            if let Some(rest) = line.strip_prefix("BASE|") {
                if wrappers.is_empty() {
                    out.push_str(&build_block(selector, rest));
                } else {
                    for w in wrappers {
                        let sel = w.replace('&', selector);
                        out.push_str(&build_block(&sel, rest));
                        out.push('\n');
                    }
                    if out.ends_with('\n') {
                        out.pop();
                    }
                }
                out.push('\n');
            } else if let Some(rest) = line.strip_prefix("STATE|") {
                let mut parts = rest.splitn(2, '|');
                let state = parts.next().unwrap_or("");
                let decls = parts.next().unwrap_or("");
                if state == "dark" {
                    out.push_str(&build_block(&format!(".dark {}", selector), decls));
                } else if state == "light" {
                    out.push_str(&build_block(&format!(":root {}", selector), decls));
                    out.push('\n');
                    out.push_str(&build_block(&format!(".light {}", selector), decls));
                } else {
                    out.push_str(&build_block(&format!("{}:{}", selector, state), decls));
                }
                out.push('\n');
            } else if let Some(rest) = line.strip_prefix("CHILD|") {
                let mut parts = rest.splitn(2, '|');
                let child = parts.next().unwrap_or("");
                let decls = parts.next().unwrap_or("");
                out.push_str(&build_block(&format!("{} > {}", selector, child), decls));
                out.push('\n');
            } else if let Some(rest) = line.strip_prefix("DATA|") {
                let mut parts = rest.splitn(2, '|');
                let data = parts.next().unwrap_or("");
                let decls = parts.next().unwrap_or("");
                out.push_str(&build_block(&format!("{}[data-{}]", selector, data), decls));
                out.push('\n');
            } else if let Some(rest) = line.strip_prefix("COND|") {
                let mut parts = rest.splitn(2, '|');
                let cond = parts.next().unwrap_or("");
                let decls = parts.next().unwrap_or("");
                if let Some(val) = cond.strip_prefix("@container>") {
                    out.push_str(&format!("@container (min-width: {}) {{\n", val));
                    for l in build_block(selector, decls).lines() {
                        out.push_str("  ");
                        out.push_str(l);
                        out.push('\n');
                    }
                    out.push_str("}\n");
                } else if let Some(bp) = cond.strip_prefix("screen:") {
                    if let Some(v) = self.screens.get(bp) {
                        out.push_str(&format!("@media (min-width: {}) {{\n", v));
                        for l in build_block(selector, decls).lines() {
                            out.push_str("  ");
                            out.push_str(l);
                            out.push('\n');
                        }
                        out.push_str("}\n");
                    }
                }
            } else if line.starts_with("ANIM|") {
                crate::core::animation::process_anim_line(line, &mut pending_anim);
            } else if let Some(raw) = line.strip_prefix("RAW|") {
                out.push_str(raw);
                if !raw.ends_with('\n') {
                    out.push('\n');
                }
            }
        }
        crate::core::animation::decode_animation_if_pending(
            self,
            selector,
            &mut pending_anim,
            &mut out,
        );
        if out.ends_with('\n') {
            out.pop();
        }
        out
    }
}
