use crate::core::engine::StyleEngine;

pub fn generate_color_css(engine: &StyleEngine, class_name: &str) -> Option<String> {
    if let Some(name) = class_name.strip_prefix("bg-") {
        if let Some(val) = engine.colors.get(name) {
            let _ = val;
            return Some(format!("background-color: var(--color-{})", name));
        }
    }
    if let Some(name) = class_name.strip_prefix("text-") {
        if let Some(val) = engine.colors.get(name) {
            let _ = val;
            return Some(format!("color: var(--color-{})", name));
        }
    }
    None
}
