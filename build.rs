use flatbuffers::{FlatBufferBuilder, WIPOffset};
use serde::Deserialize;
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Deserialize, Debug, Clone)]
struct GeneratorConfig {
    multiplier: f32,
    unit: String,
}

#[derive(Deserialize, Debug)]
struct StaticConfig {
    #[serde(rename = "static")]
    static_styles: HashMap<String, String>,
}

#[derive(Deserialize, Debug)]
struct DynamicConfig {
    dynamic: HashMap<String, HashMap<String, String>>,
}

#[derive(Deserialize, Debug)]
struct GeneratorsConfig {
    generators: HashMap<String, GeneratorConfig>,
}

#[derive(Deserialize, Debug)]
struct ScreensConfig {
    screens: HashMap<String, String>,
}

#[derive(Deserialize, Debug)]
struct StatesConfig {
    states: HashMap<String, String>,
}

#[derive(Deserialize, Debug)]
struct ContainerQueriesConfig {
    container_queries: HashMap<String, String>,
}

#[derive(Deserialize, Debug)]
struct ColorsConfig {
    colors: HashMap<String, String>,
}

#[derive(Deserialize, Debug)]
struct AnimationGeneratorsConfig {
    animation_generators: HashMap<String, String>,
}

#[derive(Deserialize, Debug)]
struct PropertyMetaConfig {
    syntax: String,
    #[serde(default)]
    inherits: Option<bool>,
    #[serde(default, rename = "initial")]
    initial_value: Option<String>,
}

#[derive(Deserialize, Debug)]
struct PropertiesConfig {
    properties: HashMap<String, PropertyMetaConfig>,
}

fn read_toml_file<T: for<'de> Deserialize<'de>>(path: &Path) -> Option<T> {
    if path.exists() {
        let content = fs::read_to_string(path).ok()?;
        toml::from_str(&content).ok()
    } else {
        None
    }
}

fn main() {
    let style_dir_str = (|| {
        if let Ok(content) = std::fs::read_to_string(".dx/config.toml") {
            if let Ok(value) = content.parse::<toml::Value>() {
                if let Some(path_val) = value.get("paths").and_then(|p| p.get("style_dir")) {
                    if let Some(s) = path_val.as_str() {
                        if !s.trim().is_empty() {
                            return s.replace('\\', "/");
                        }
                    }
                }
            }
        }
        ".dx/style".to_string()
    })();
    let style_dir = Path::new(&style_dir_str);
    let fbs_path = style_dir.join("style.fbs");
    let fbs_files_vec = vec![fbs_path.to_string_lossy().to_string()];
    let fbs_files: Vec<&Path> = fbs_files_vec.iter().map(|s| Path::new(s)).collect();
    let out_dir = std::env::var("OUT_DIR").unwrap();

    for fbs_file in &fbs_files_vec {
        println!("cargo:rerun-if-changed={}", fbs_file);
    }
    println!("cargo:rerun-if-changed={}", style_dir.display());

    flatc_rust::run(flatc_rust::Args {
        lang: "rust",
        inputs: &fbs_files,
        out_dir: Path::new(&out_dir),
        includes: &[Path::new("src")],
        ..Default::default()
    })
    .expect("flatc schema compilation failed");

    let static_styles = read_toml_file::<StaticConfig>(&style_dir.join("static.toml"))
        .map(|c| c.static_styles)
        .unwrap_or_default();
    let dynamic = read_toml_file::<DynamicConfig>(&style_dir.join("dynamic.toml"))
        .map(|c| c.dynamic)
        .unwrap_or_default();
    let generators = read_toml_file::<GeneratorsConfig>(&style_dir.join("generators.toml"))
        .map(|c| c.generators)
        .unwrap_or_default();
    let screens = read_toml_file::<ScreensConfig>(&style_dir.join("screens.toml"))
        .map(|c| c.screens)
        .unwrap_or_default();
    let states = read_toml_file::<StatesConfig>(&style_dir.join("states.toml"))
        .map(|c| c.states)
        .unwrap_or_default();
    let container_queries =
        read_toml_file::<ContainerQueriesConfig>(&style_dir.join("container_queries.toml"))
            .map(|c| c.container_queries)
            .unwrap_or_default();
    let colors = read_toml_file::<ColorsConfig>(&style_dir.join("colors.toml"))
        .map(|c| c.colors)
        .unwrap_or_default();
    let animation_generators =
        read_toml_file::<AnimationGeneratorsConfig>(&style_dir.join("animation_generators.toml"))
            .map(|c| c.animation_generators)
            .unwrap_or_default();
    let properties = read_toml_file::<PropertiesConfig>(&style_dir.join("property.toml"))
        .map(|c| c.properties)
        .unwrap_or_default();

    let mut builder = FlatBufferBuilder::new();

    let mut style_offsets = Vec::new();
    for (name, css) in static_styles {
        let name_offset = builder.create_string(&name);
        let css_offset = builder.create_string(&css);
        let table_wip = builder.start_table();
        builder.push_slot(4, name_offset, WIPOffset::new(0));
        builder.push_slot(6, css_offset, WIPOffset::new(0));
        let style_offset = builder.end_table(table_wip);
        style_offsets.push(style_offset);
    }

    let mut dynamic_offsets = Vec::new();
    for (key, values) in dynamic {
        let parts: Vec<&str> = key.split('|').collect();
        if parts.len() != 2 {
            println!(
                "cargo:warning=Invalid dynamic key format in dynamic.toml: '{}'. Skipping.",
                key
            );
            continue;
        }
        let key_name = parts[0];
        let property = parts[1];

        let key_offset = builder.create_string(key_name);
        let property_offset = builder.create_string(property);

        let mut value_offsets = Vec::new();
        for (suffix, value) in values {
            let suffix_offset = builder.create_string(&suffix);
            let value_offset = builder.create_string(&value);
            let table_wip = builder.start_table();
            builder.push_slot(4, suffix_offset, WIPOffset::new(0));
            builder.push_slot(6, value_offset, WIPOffset::new(0));
            let value_offset = builder.end_table(table_wip);
            value_offsets.push(value_offset);
        }
        let values_vec = builder.create_vector(&value_offsets);

        let table_wip = builder.start_table();
        builder.push_slot(4, key_offset, WIPOffset::new(0));
        builder.push_slot(6, property_offset, WIPOffset::new(0));
        builder.push_slot(8, values_vec, WIPOffset::new(0));
        let dynamic_offset = builder.end_table(table_wip);
        dynamic_offsets.push(dynamic_offset);
    }

    let mut generator_offsets = Vec::new();
    for (key, config) in generators {
        let parts: Vec<&str> = key.split('|').collect();
        if parts.len() != 2 {
            println!(
                "cargo:warning=Invalid generator key format in generators.toml: '{}'. Skipping.",
                key
            );
            continue;
        }
        let prefix = parts[0];
        let property = parts[1];

        let prefix_offset = builder.create_string(prefix);
        let property_offset = builder.create_string(property);
        let unit_offset = builder.create_string(&config.unit);

        let table_wip = builder.start_table();
        builder.push_slot(4, prefix_offset, WIPOffset::new(0));
        builder.push_slot(6, property_offset, WIPOffset::new(0));
        builder.push_slot(8, config.multiplier, 0.0f32);
        builder.push_slot(10, unit_offset, WIPOffset::new(0));
        let gen_offset = builder.end_table(table_wip);
        generator_offsets.push(gen_offset);
    }

    let mut screen_offsets = Vec::new();
    for (name, value) in screens {
        let name_offset = builder.create_string(&name);
        let value_offset = builder.create_string(&value);
        let table_wip = builder.start_table();
        builder.push_slot(4, name_offset, WIPOffset::new(0));
        builder.push_slot(6, value_offset, WIPOffset::new(0));
        let screen_offset = builder.end_table(table_wip);
        screen_offsets.push(screen_offset);
    }

    let mut state_offsets = Vec::new();
    for (name, value) in states {
        let name_offset = builder.create_string(&name);
        let value_offset = builder.create_string(&value);
        let table_wip = builder.start_table();
        builder.push_slot(4, name_offset, WIPOffset::new(0));
        builder.push_slot(6, value_offset, WIPOffset::new(0));
        let state_offset = builder.end_table(table_wip);
        state_offsets.push(state_offset);
    }

    let mut cq_offsets = Vec::new();
    for (name, value) in container_queries {
        let name_offset = builder.create_string(&name);
        let value_offset = builder.create_string(&value);
        let table_wip = builder.start_table();
        builder.push_slot(4, name_offset, WIPOffset::new(0));
        builder.push_slot(6, value_offset, WIPOffset::new(0));
        let cq_offset = builder.end_table(table_wip);
        cq_offsets.push(cq_offset);
    }

    let mut color_offsets = Vec::new();
    for (name, value) in colors {
        let name_offset = builder.create_string(&name);
        let value_offset = builder.create_string(&value);
        let table_wip = builder.start_table();
        builder.push_slot(4, name_offset, WIPOffset::new(0));
        builder.push_slot(6, value_offset, WIPOffset::new(0));
        let color_offset = builder.end_table(table_wip);
        color_offsets.push(color_offset);
    }

    let mut anim_gen_offsets = Vec::new();
    for (name, template) in animation_generators {
        let name_offset = builder.create_string(&name);
        let tpl_offset = builder.create_string(&template);
        let table_wip = builder.start_table();
        builder.push_slot(4, name_offset, WIPOffset::new(0));
        builder.push_slot(6, tpl_offset, WIPOffset::new(0));
        let ag_offset = builder.end_table(table_wip);
        anim_gen_offsets.push(ag_offset);
    }

    let styles_vec = builder.create_vector(&style_offsets);
    let dynamic_vec = builder.create_vector(&dynamic_offsets);
    let generators_vec = builder.create_vector(&generator_offsets);
    let screens_vec = builder.create_vector(&screen_offsets);
    let states_vec = builder.create_vector(&state_offsets);
    let cq_vec = builder.create_vector(&cq_offsets);
    let colors_vec = builder.create_vector(&color_offsets);
    let anim_gen_vec = builder.create_vector(&anim_gen_offsets);
    let mut property_offsets = Vec::new();
    for (name, meta) in properties {
        let name_offset = builder.create_string(&name);
        let syntax_offset = builder.create_string(&meta.syntax);
        let initial_offset = builder.create_string(meta.initial_value.as_deref().unwrap_or(""));
        let inherits_flag = meta.inherits.unwrap_or(false);
        let table_wip = builder.start_table();
        builder.push_slot(4, name_offset, WIPOffset::new(0));
        builder.push_slot(6, syntax_offset, WIPOffset::new(0));
        builder.push_slot(8, inherits_flag, false);
        builder.push_slot(10, initial_offset, WIPOffset::new(0));
        let prop_offset = builder.end_table(table_wip);
        property_offsets.push(prop_offset);
    }
    let properties_vec = builder.create_vector(&property_offsets);
    const BASE_CSS: &str = "*, ::after, ::before, ::backdrop, ::file-selector-button {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n  border: 0 solid;\n}\nhtml, :host {\n  line-height: 1.5;\n  -webkit-text-size-adjust: 100%;\n  tab-size: 4;\n  font-family: var(--default-font-family, ui-sans-serif, system-ui, sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\");\n  font-feature-settings: var(--default-font-feature-settings, normal);\n  font-variation-settings: var(--default-font-variation-settings, normal);\n  -webkit-tap-highlight-color: transparent;\n}\nhr {\n  height: 0;\n  color: inherit;\n  border-top-width: 1px;\n}\nabbr:where([title]) {\n  -webkit-text-decoration: underline dotted;\n  text-decoration: underline dotted;\n}\nh1, h2, h3, h4, h5, h6 {\n  font-size: inherit;\n  font-weight: inherit;\n}\na {\n  color: inherit;\n  -webkit-text-decoration: inherit;\n  text-decoration: inherit;\n}\nb, strong {\n  font-weight: bolder;\n}\ncode, kbd, samp, pre {\n  font-family: var(--default-mono-font-family, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace);\n  font-feature-settings: var(--default-mono-font-feature-settings, normal);\n  font-variation-settings: var(--default-mono-font-variation-settings, normal);\n  font-size: 1em;\n}\nsmall {\n  font-size: 80%;\n}\nsub, sup {\n  font-size: 75%;\n  line-height: 0;\n  position: relative;\n  vertical-align: baseline;\n}\nsub {\n  bottom: -0.25em;\n}\nsup {\n  top: -0.5em;\n}\ntable {\n  text-indent: 0;\n  border-color: inherit;\n  border-collapse: collapse;\n}\n:-moz-focusring {\n  outline: auto;\n}\nprogress {\n  vertical-align: baseline;\n}\nsummary {\n  display: list-item;\n}\nol, ul, menu {\n  list-style: none;\n}\nimg, svg, video, canvas, audio, iframe, embed, object {\n  display: block;\n  vertical-align: middle;\n}\nimg, video {\n  max-width: 100%;\n  height: auto;\n}\nbutton, input, select, optgroup, textarea, ::file-selector-button {\n  font: inherit;\n  font-feature-settings: inherit;\n  font-variation-settings: inherit;\n  letter-spacing: inherit;\n  color: inherit;\n  border-radius: 0;\n  background-color: transparent;\n  opacity: 1;\n}\n:where(select:is([multiple], [size])) optgroup {\n  font-weight: bolder;\n}\n:where(select:is([multiple], [size])) optgroup option {\n  padding-inline-start: 20px;\n}\n::file-selector-button {\n  margin-inline-end: 4px;\n}\n::placeholder {\n  opacity: 1;\n}\n@supports (not (-webkit-appearance: -apple-pay-button))  or (contain-intrinsic-size: 1px) {\n  ::placeholder {\n    color: currentcolor;\n    @supports (color: color-mix(in lab, red, red)) {\n      color: color-mix(in oklab, currentcolor 50%, transparent);\n    }\n  }\n}\ntextarea {\n  resize: vertical;\n}\n::-webkit-search-decoration {\n  -webkit-appearance: none;\n}\n::-webkit-date-and-time-value {\n  min-height: 1lh;\n  text-align: inherit;\n}\n::-webkit-datetime-edit {\n  display: inline-flex;\n}\n::-webkit-datetime-edit-fields-wrapper {\n  padding: 0;\n}\n::-webkit-datetime-edit, ::-webkit-datetime-edit-year-field, ::-webkit-datetime-edit-month-field, ::-webkit-datetime-edit-day-field, ::-webkit-datetime-edit-hour-field, ::-webkit-datetime-edit-minute-field, ::-webkit-datetime-edit-second-field, ::-webkit-datetime-edit-millisecond-field, ::-webkit-datetime-edit-meridiem-field {\n  padding-block: 0;\n}\n::-webkit-calendar-picker-indicator {\n  line-height: 1;\n}\n:-moz-ui-invalid {\n  box-shadow: none;\n}\nbutton, input:where([type=\"button\"], [type=\"reset\"], [type=\"submit\"]), ::file-selector-button {\n  appearance: button;\n}\n::-webkit-inner-spin-button, ::-webkit-outer-spin-button {\n  height: auto;\n}\n[hidden]:where(:not([hidden=\"until-found\"])) {\n  display: none !important;\n}";
    let base_css_offset = builder.create_string(BASE_CSS);

    let table_wip = builder.start_table();
    builder.push_slot(4, styles_vec, WIPOffset::new(0));
    builder.push_slot(6, generators_vec, WIPOffset::new(0));
    builder.push_slot(8, dynamic_vec, WIPOffset::new(0));
    builder.push_slot(10, screens_vec, WIPOffset::new(0));
    builder.push_slot(12, states_vec, WIPOffset::new(0));
    builder.push_slot(14, cq_vec, WIPOffset::new(0));
    builder.push_slot(16, colors_vec, WIPOffset::new(0));
    builder.push_slot(18, anim_gen_vec, WIPOffset::new(0));
    builder.push_slot(20, properties_vec, WIPOffset::new(0));
    builder.push_slot(22, base_css_offset, WIPOffset::new(0));
    let config_root = builder.end_table(table_wip);

    builder.finish(config_root, None);

    let buf = builder.finished_data();
    let styles_bin_path = style_dir.join("style.bin");
    fs::create_dir_all(styles_bin_path.parent().unwrap()).expect("Failed to create .dx directory");
    let needs_write = match fs::read(&styles_bin_path) {
        Ok(existing) => existing.as_slice() != buf,
        Err(_) => true,
    };
    if needs_write {
        match fs::write(&styles_bin_path, buf) {
            Ok(_) => {}
            Err(e) => {
                if let Some(code) = e.raw_os_error() {
                    if code == 1224 {
                        let tmp = styles_bin_path.with_extension("bin.new");
                        if fs::write(&tmp, buf).is_ok() {
                            let _ = fs::rename(&tmp, &styles_bin_path);
                        } else {
                        }
                    } else {
                        panic!("Failed to write style.bin: {:?}", e);
                    }
                } else {
                    panic!("Failed to write style.bin: {:?}", e);
                }
            }
        }
    }

    println!(
        "cargo:rustc-env=DX_STYLE_BIN={}",
        style_dir.join("style.bin").to_string_lossy()
    );
}
