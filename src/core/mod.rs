use crate::{
    cache, datasource, generator, parser::extract_classes_fast, telemetry::format_duration,
};
mod animation;
mod engine;
mod group;
use ahash::{AHashSet, AHasher};
use colored::Colorize;
use std::hash::Hasher;
pub mod css_output;
use css_output::CssOutput;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use std::sync::atomic::{AtomicBool, Ordering};

static FIRST_LOG_DONE: AtomicBool = AtomicBool::new(false);

pub struct AppState {
    pub html_hash: u64,
    pub class_cache: AHashSet<String>,
    pub css_out: CssOutput,
    pub last_css_hash: u64,
    pub css_buffer: Vec<u8>,
    pub class_list_checksum: u64,
}

impl AppState {
    pub fn engine() -> &'static engine::StyleEngine {
        use std::sync::OnceLock;
        static INSTANCE: OnceLock<engine::StyleEngine> = OnceLock::new();
        INSTANCE.get_or_init(|| {
            engine::StyleEngine::load_from_disk().unwrap_or_else(|_| engine::StyleEngine::empty())
        })
    }
}

pub fn rebuild_styles(
    state: Arc<Mutex<AppState>>,
    index_path: &str,
    is_initial_run: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    let html_bytes = datasource::read_file(index_path)?;

    let hash_timer = Instant::now();
    let new_html_hash = {
        let mut hasher = AHasher::default();
        hasher.write(&html_bytes);
        hasher.finish()
    };
    let hash_duration = hash_timer.elapsed();

    {
        let state_guard = state.lock().unwrap();
        if !is_initial_run && state_guard.html_hash == new_html_hash {
            return Ok(());
        }
    }

    let parse_timer = Instant::now();
    let prev_len_hint = { state.lock().unwrap().class_cache.len() };
    let all_classes = extract_classes_fast(&html_bytes, prev_len_hint.next_power_of_two());
    let parse_extract_duration = parse_timer.elapsed();

    {
        let state_guard = state.lock().unwrap();
        if all_classes.is_empty() && !state_guard.class_cache.is_empty() {
            return Ok(());
        }
    }

    let diff_timer = Instant::now();
    let (added, removed, old_hash_just_for_info) = {
        let state_guard = state.lock().unwrap();
        let old = &state_guard.class_cache;
        let added: Vec<String> = all_classes.difference(old).cloned().collect();
        let removed: Vec<String> = old.difference(&all_classes).cloned().collect();
        (added, removed, state_guard.html_hash)
    };
    let diff_duration = diff_timer.elapsed();

    if added.is_empty() && removed.is_empty() {
        let mut state_guard = state.lock().unwrap();
        let mut h = AHasher::default();
        for c in &state_guard.class_cache {
            h.write(c.as_bytes());
        }
        let checksum = h.finish();
        state_guard.class_list_checksum = checksum;
        state_guard.html_hash = new_html_hash;
        return Ok(());
    }

    let cache_update_timer = Instant::now();
    {
        let mut state_guard = state.lock().unwrap();
        state_guard.html_hash = new_html_hash;
        state_guard.class_cache = all_classes.clone();
        let mut h = AHasher::default();
        for c in &state_guard.class_cache {
            h.write(c.as_bytes());
        }
        state_guard.class_list_checksum = h.finish();
    }
    let cache_update_duration = cache_update_timer.elapsed();

    if let Err(e) = cache::save_cache(&state.lock().unwrap().class_cache, new_html_hash) {
        eprintln!("{} {}", "Error saving cache:".red(), e);
    }

    let css_write_timer = Instant::now();
    let css_write_duration = {
        use std::hash::Hasher as _;
        let (need_full_rewrite, added_clone) = {
            let mut state_guard = state.lock().unwrap();
            state_guard.css_buffer.clear();
            let added_color = added.iter().any(|c| {
                let base = c.rsplit(':').next().unwrap_or(c);
                base.starts_with("bg-") || base.starts_with("text-")
            });
            if !removed.is_empty() || added_color {
                let class_vec: Vec<String> = state_guard.class_cache.iter().cloned().collect();
                generator::generate_css_into(&mut state_guard.css_buffer, class_vec.iter());
                (true, Vec::new())
            } else {
                let local_added: Vec<String> = added.iter().cloned().collect();
                generator::generate_css_into(&mut state_guard.css_buffer, local_added.iter());
                (false, local_added)
            }
        };
        let mut hasher = AHasher::default();
        let css_fragment = {
            let state_guard = state.lock().unwrap();
            state_guard.css_buffer.clone()
        };
        hasher.write(&css_fragment);
        let new_hash_fragment = hasher.finish();

        if need_full_rewrite {
            let mut state_guard = state.lock().unwrap();
            if state_guard.last_css_hash != new_hash_fragment {
                state_guard.css_out.replace(&css_fragment)?;
                state_guard.last_css_hash = new_hash_fragment;
            }
        } else if !added_clone.is_empty() {
            let mut state_guard = state.lock().unwrap();
            state_guard.css_out.append(&css_fragment)?;
            state_guard.last_css_hash ^= new_hash_fragment;
        }
        {
            let mut state_guard = state.lock().unwrap();
            state_guard.css_out.flush_if_dirty()?;
        }
        css_write_timer.elapsed()
    };

    let total_processing = hash_duration
        + parse_extract_duration
        + diff_duration
        + cache_update_duration
        + css_write_duration;

    let suppress_timings = !FIRST_LOG_DONE.load(Ordering::Relaxed);
    if suppress_timings {
        println!(
            "Processed: {} added, {} removed (prev hash: {:x})",
            format!("{}", added.len()).green(),
            format!("{}", removed.len()).red(),
            old_hash_just_for_info
        );
        FIRST_LOG_DONE.store(true, Ordering::Relaxed);
    } else {
        println!(
            "Processed: {} added, {} removed (prev hash: {:x}) | (Total: {} -> Hash: {}, Parse: {}, Diff: {}, Cache: {}, Write: {})",
            format!("{}", added.len()).green(),
            format!("{}", removed.len()).red(),
            old_hash_just_for_info,
            format_duration(total_processing),
            format_duration(hash_duration),
            format_duration(parse_extract_duration),
            format_duration(diff_duration),
            format_duration(cache_update_duration),
            format_duration(css_write_duration)
        );
    }

    Ok(())
}
