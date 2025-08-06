// build.rs
use std::collections::HashMap;
use std::fs;
use std::path::Path;

use flatbuffers::FlatBufferBuilder;
use serde::Deserialize;

mod styles_generated {
    include!(concat!(env!("OUT_DIR"), "/styles_generated.rs"));
}
use styles_generated::style_schema;

#[derive(Deserialize, Debug)]
struct TomlConfig {
    #[serde(default)]
    static: HashMap<String, String>,
    #[serde(default)]
    dynamic: HashMap<String, HashMap<String, String>>,
    #[serde(default)]
    generators: HashMap<String, GeneratorConfig>,
}

#[derive(Deserialize, Debug, Clone)]
struct GeneratorConfig {
    multiplier: f32,
    unit: String,
}

#[derive(Debug, Clone)]
struct StyleRecord {
    name: String,
    css: String,
}

fn main() {
    let fbs_file = "src/styles.fbs";
    let toml_path = "styles.toml";
    let out_dir = std::env::var("OUT_DIR").unwrap();

    println!("cargo:rerun-if-changed={}", fbs_file);
    println!("cargo:rerun-if-changed={}", toml_path);

    flatc_rust::run(flatc_rust::Args {
        lang: "rust",
        inputs: &[Path::new(fbs_file)],
        out_dir: Path::new(&out_dir),
        ..Default::default()
    })
    .expect("flatc schema compilation failed");

    let toml_content = fs::read_to_string(toml_path).expect("Failed to read styles.toml");
    let toml_data: TomlConfig = toml::from_str(&toml_content).expect("Failed to parse styles.toml");

    let mut precompiled_styles = Vec::new();

    for (name, css) in toml_data.static {
        precompiled_styles.push(StyleRecord { name, css });
    }

    for (key, values) in toml_data.dynamic {
        let parts: Vec<&str> = key.split('|').collect();
        if parts.len() != 2 {
            continue;
        }
        let prefix = parts[0];
        let property = parts[1];
        for (suffix, value) in values {
            let name = format!("{}-{}", prefix, suffix);
            let css = format!("{}: {};", property, value);
            precompiled_styles.push(StyleRecord { name, css });
        }
    }

    precompiled_styles.sort_by(|a, b| a.name.cmp(&b.name));

    let mut builder = FlatBufferBuilder::new();

    let mut style_offsets = Vec::new();
    for style in &precompiled_styles {
        let name = builder.create_string(&style.name);
        let css = builder.create_string(&style.css);
        let style_offset = style_schema::Style::create(
            &mut builder,
            &style_schema::StyleArgs {
                name: Some(name),
                css: Some(css),
            },
        );
        style_offsets.push(style_offset);
    }
    let styles_vec = builder.create_vector(&style_offsets);

    let mut generator_offsets = Vec::new();
    for (key, config) in toml_data.generators {
        let parts: Vec<&str> = key.split('|').collect();
        if parts.len() != 2 {
            continue;
        }
        let prefix = builder.create_string(parts[0]);
        let property = builder.create_string(parts[1]);
        let unit = builder.create_string(&config.unit);

        let gen_offset = style_schema::Generator::create(
            &mut builder,
            &style_schema::GeneratorArgs {
                prefix: Some(prefix),
                property: Some(property),
                multiplier: config.multiplier,
                unit: Some(unit),
            },
        );
        generator_offsets.push(gen_offset);
    }
    let generators_vec = builder.create_vector(&generator_offsets);

    let config_root = style_schema::Config::create(
        &mut builder,
        &style_schema::ConfigArgs {
            styles: Some(styles_vec),
            generators: Some(generators_vec),
        },
    );

    builder.finish(config_root, None);

    let buf = builder.finished_data();
    fs::write("styles.bin", buf).expect("Failed to write styles.bin");

    println!("✅ Successfully generated styles.bin from styles.toml");
}
