use colored::Colorize;
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
use core::{AppState, rebuild_styles};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("{}", "Starting DX Style core...".cyan());

    let config = Config::load().unwrap_or_else(|_| Config::default());

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
    let app_state = Arc::new(Mutex::new(AppState {
        html_hash: preloaded_hash,
        class_cache: preloaded_cache,
        css_out,
        last_css_hash: existing_css_hash,
        css_buffer: Vec::with_capacity(8192),
        class_list_checksum,
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

