use cssparser::serialize_identifier;

use crate::core::{AppState, properties_layer_present, set_properties_layer_present};

#[allow(dead_code)]
pub fn generate_css_into<'a, I>(buf: &mut Vec<u8>, classes: I)
where
    I: IntoIterator<Item = &'a String>,
{
    let mut escaped = String::with_capacity(64);
    let engine_opt = std::panic::catch_unwind(|| AppState::engine()).ok();
    if let Some(engine) = engine_opt {
        let collected: Vec<&String> = classes.into_iter().collect();
        if buf.is_empty() && !properties_layer_present() {
            let props = engine.property_at_rules();
            if !props.is_empty() {
                buf.extend_from_slice(props.as_bytes());
                set_properties_layer_present();
            }
            let (root_vars, dark_vars) =
                engine.generate_color_vars_for(collected.iter().map(|s| *s));
            if !root_vars.is_empty() {
                buf.extend_from_slice(root_vars.as_bytes());
            }
            if !dark_vars.is_empty() {
                buf.extend_from_slice(dark_vars.as_bytes());
            }
        }
        for class in collected {
            if let Some(css) = engine.css_for_class(class) {
                buf.extend_from_slice(css.as_bytes());
                if !css.ends_with('\n') {
                    buf.push(b'\n');
                }
            } else {
                buf.push(b'.');
                escaped.clear();
                serialize_identifier(class, &mut escaped).unwrap();
                buf.extend_from_slice(escaped.as_bytes());
                buf.extend_from_slice(b" {}\n");
            }
        }
    } else {
        for class in classes {
            buf.push(b'.');
            escaped.clear();
            serialize_identifier(class, &mut escaped).unwrap();
            buf.extend_from_slice(escaped.as_bytes());
            buf.extend_from_slice(b" {}\n");
        }
    }
}

pub fn generate_class_rules_only<'a, I>(buf: &mut Vec<u8>, classes: I)
where
    I: IntoIterator<Item = &'a String>,
{
    use cssparser::serialize_identifier;
    let mut escaped = String::with_capacity(64);
    let engine_opt = std::panic::catch_unwind(|| AppState::engine()).ok();
    if let Some(engine) = engine_opt {
        for class in classes {
            if let Some(css) = engine.css_for_class(class) {
                buf.extend_from_slice(css.as_bytes());
                if !css.ends_with('\n') {
                    buf.push(b'\n');
                }
            } else {
                buf.push(b'.');
                escaped.clear();
                serialize_identifier(class, &mut escaped).unwrap();
                buf.extend_from_slice(escaped.as_bytes());
                buf.extend_from_slice(b" {}\n");
            }
        }
    } else {
        for class in classes {
            buf.push(b'.');
            escaped.clear();
            serialize_identifier(class, &mut escaped).unwrap();
            buf.extend_from_slice(escaped.as_bytes());
            buf.extend_from_slice(b" {}\n");
        }
    }
}
