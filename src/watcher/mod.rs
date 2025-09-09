use crate::core::{AppState, rebuild_styles};
use colored::Colorize;
use notify::RecursiveMode;
use notify_debouncer_full::new_debouncer;
use std::path::Path;
use std::sync::{Arc, Mutex, mpsc};
use std::time::Duration;

use crate::config::Config;

pub fn start(
    state: Arc<Mutex<AppState>>,
    config: Config,
) -> Result<(), Box<dyn std::error::Error>> {
    let (tx, rx) = mpsc::channel();
    let debounce_ms = config
        .watch
        .as_ref()
        .and_then(|w| w.debounce_ms)
        .unwrap_or(250);

    let mut debouncer = new_debouncer(Duration::from_millis(debounce_ms), None, tx)?;
    debouncer.watch(Path::new(&config.paths.html_dir), RecursiveMode::Recursive)?;

    println!(
        "{}",
        format!("Watching {} for changes...", &config.paths.html_dir).cyan()
    );

    loop {
        let res = rx.recv();
        match res {
            Ok(Ok(events)) => {
                let mut relevant = false;
                for ev in events {
                    for path in &ev.paths {
                        if let Some(p) = path.to_str() {
                            if p.ends_with("index.html") || p.ends_with("style.css") {
                                relevant = true;
                                break;
                            }
                        }
                    }
                    if relevant {
                        break;
                    }
                }
                if relevant {
                    if let Err(e) = rebuild_styles(state.clone(), &config.paths.index_file, false) {
                        eprintln!("{} {}", "Error rebuilding styles:".red(), e);
                    }
                }
            }
            Ok(Err(e)) => eprintln!("{} {:?}", "Watch error:".red(), e),
            Err(_) => break,
        }
    }

    Ok(())
}
