# Dx
Enhance Developer Experience

```rust
use serde_json;
use std::fs::File;
use std::hash::Hasher;
use std::path::Path;
use std::sync::{Arc, Mutex};

mod cache;
mod config;
mod core;
mod datasource;
mod generator;
mod parser;
mod telemetry;
mod watcher;

use crate::config::Config;
use core::{AppState, rebuild_styles, set_base_layer_present, set_properties_layer_present};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = Config::load().unwrap_or_else(|_| Config::default());

    unsafe {
        std::env::set_var("DX_CACHE_DIR", config.resolved_cache_dir());
        let style_bin = format!("{}/style.bin", config.resolved_style_dir());
        std::env::set_var("DX_STYLE_BIN", style_bin);
    }

    if !Path::new(&config.paths.css_file).exists() {
        File::create(&config.paths.css_file)?;
    }
    if !Path::new(&config.paths.index_file).exists() {
        File::create(&config.paths.index_file)?;
    }

    if let Ok(val) = std::env::var("DX_MMAP_THRESHOLD") {
        if let Ok(parsed) = val.parse::<u64>() {
            core::output::set_mmap_threshold(parsed);
        }
    }
    let css_out = core::output::CssOutput::open(&config.paths.css_file)?;

    let (preloaded_cache, preloaded_hash, preloaded_checksum) = cache::load_cache();

    let existing_css_hash = {
        use ahash::AHasher;
        use std::io::Read;
        let mut hasher = AHasher::default();
        if let Ok(mut f) = std::fs::File::open(&config.paths.css_file) {
            let mut buf = [0u8; 8192];
            loop {
                match f.read(&mut buf) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => hasher.write(&buf[..n]),
                }
            }
            hasher.finish()
        } else {
            0
        }
    };

    let class_list_checksum = preloaded_checksum;
    let mut css_index = ahash::AHashMap::with_capacity(256);
    if let Ok(existing) = std::fs::read(&config.paths.css_file) {
        if existing.windows(11).any(|w| w == b"@layer base") {
            set_base_layer_present();
        }
        if existing.windows(18).any(|w| w == b"@layer properties") {
            set_properties_layer_present();
        }
        let mut offset = 0usize;
        for line in existing.split(|b| *b == b'\n') {
            let trimmed = {
                let mut i = 0;
                while i < line.len() && (line[i] == b' ' || line[i] == b'\t') {
                    i += 1;
                }
                &line[i..]
            };
            if trimmed.starts_with(b".") {
                if let Some(brace) = trimmed.iter().position(|c| *c == b'{') {
                    let cls = String::from_utf8_lossy(&trimmed[1..brace]).to_string();
                    let len = line.len() + 1;
                    css_index.insert(cls, (offset, len));
                    offset += len;
                } else {
                    offset += line.len() + 1;
                }
            } else {
                offset += line.len() + 1;
            }
        }
    }
    let app_state = Arc::new(Mutex::new(AppState {
        html_hash: preloaded_hash,
        class_cache: preloaded_cache,
        css_out,
        last_css_hash: existing_css_hash,
        css_buffer: Vec::with_capacity(8192),
        class_list_checksum,
        css_index,
        utilities_offset: 0,
    }));

    if std::env::var("DX_DUMP_STATE_ON_START").is_ok() {
        let s = app_state.lock().unwrap();
        let dump = serde_json::json!({
            "html_hash": s.html_hash,
            "class_cache_len": s.class_cache.len()
        });
        println!("{}", dump.to_string());
        return Ok(());
    }

    rebuild_styles(app_state.clone(), &config.paths.index_file, true)?;

    watcher::start(app_state, config)?;

    Ok(())
}
```
