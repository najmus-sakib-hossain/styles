use crate::{
    cache, datasource, generator, parser::extract_classes_fast, telemetry::format_duration,
};
mod animation;
mod engine;
mod group;
use ahash::{AHashSet, AHasher};
use colored::Colorize;
use std::hash::Hasher;
mod color;
pub mod output;
use output::CssOutput;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use std::sync::atomic::{AtomicBool, Ordering};

static BASE_LAYER_PRESENT: AtomicBool = AtomicBool::new(false);
pub fn set_base_layer_present() { BASE_LAYER_PRESENT.store(true, Ordering::Relaxed); }
fn base_layer_present() -> bool { BASE_LAYER_PRESENT.load(Ordering::Relaxed) }

static PROPERTIES_LAYER_PRESENT: AtomicBool = AtomicBool::new(false);
pub fn set_properties_layer_present() { PROPERTIES_LAYER_PRESENT.store(true, Ordering::Relaxed); }
pub fn properties_layer_present() -> bool { PROPERTIES_LAYER_PRESENT.load(Ordering::Relaxed) }

static FIRST_LOG_DONE: AtomicBool = AtomicBool::new(false);

pub struct AppState {
    pub html_hash: u64,
    pub class_cache: AHashSet<String>,
    pub css_out: CssOutput,
    pub last_css_hash: u64,
    pub css_buffer: Vec<u8>,
    pub class_list_checksum: u64,
    // Map class -> (offset, len) in CSS file for tombstone deletes
    pub css_index: ahash::AHashMap<String, (usize, usize)>,
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

    // Removed early-return that prevented clearing CSS when all classes disappear.

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
            let is_color = |c: &str| {
                let base = c.rsplit(':').next().unwrap_or(c);
                base.starts_with("bg-") || base.starts_with("text-")
            };
            let removed_has_color = removed.iter().any(|c| is_color(c));
            let added_has_color = added.iter().any(|c| is_color(c));
            let missing_index_for_removed = removed.iter().any(|c| !state_guard.css_index.contains_key(c));
            // We only need a full rewrite when removed classes exist OR color classes changed
            // or we lack index info. User-added manual CSS (outside managed marker) is preserved by backend.
            // We now always do a full rewrite for ANY additions or removals to keep layers singular
            // and avoid duplicating @layer utilities blocks. This trades some extra I/O for
            // correctness & uniqueness of layer/content structure.
            let force_full = is_initial_run || !removed.is_empty() || !added.is_empty() || missing_index_for_removed || removed_has_color || added_has_color;
            if force_full {
                let class_vec: Vec<String> = state_guard.class_cache.iter().cloned().collect();
                // Prepend base layer CSS once if not already present in managed region
                // Layer preamble always at top
                state_guard.css_buffer.extend_from_slice(b"@layer theme, components, utilities, base, properties;\n");

                // Helper to write a layer block with optional body (indented); empty -> one-liner {}
                fn write_layer(buf: &mut Vec<u8>, name: &str, body: &str) {
                    let trimmed = body.trim();
                    if trimmed.is_empty() {
                        buf.extend_from_slice(format!("@layer {} {{}}\n", name).as_bytes());
                    } else {
                        buf.extend_from_slice(format!("@layer {} {{\n", name).as_bytes());
                        for line in trimmed.lines() {
                            if line.is_empty() { continue; }
                            buf.extend_from_slice(b"  ");
                            buf.extend_from_slice(line.as_bytes());
                            buf.push(b'\n');
                        }
                        buf.extend_from_slice(b"}\n");
                    }
                }
                // Theme layer (variables)
                let (root_vars, dark_vars) = {
                    let engine = AppState::engine();
                    engine.generate_color_vars_for(class_vec.iter().collect::<Vec<_>>().iter().map(|s| *s))
                };
                let mut theme_body = String::new();
                if !root_vars.is_empty() { theme_body.push_str(root_vars.trim_end()); theme_body.push('\n'); }
                if !dark_vars.is_empty() { theme_body.push_str(dark_vars.trim_end()); theme_body.push('\n'); }
                write_layer(&mut state_guard.css_buffer, "theme", &theme_body);
                // Components layer currently empty placeholder
                write_layer(&mut state_guard.css_buffer, "components", "");
                // Utilities layer for all classes with indentation
                {
                    let mut util_buf = Vec::new();
                    generator::generate_class_rules_only(&mut util_buf, class_vec.iter());
                    let mut util_body = String::new();
                    for line in String::from_utf8_lossy(&util_buf).lines() {
                        if line.trim().is_empty() { continue; }
                        util_body.push_str(line);
                        util_body.push('\n');
                    }
                    write_layer(&mut state_guard.css_buffer, "utilities", &util_body);
                }
                // Base layer after utilities per requested order (always emit exactly once in rewrite)
                if let Some(base_raw) = AppState::engine().base_layer_raw.as_ref() {
                    if !base_raw.is_empty() {
                        let mut base_body = String::new();
                        for line in base_raw.trim_end().lines() {
                            if line.trim().is_empty() { continue; }
                            base_body.push_str(line);
                            base_body.push('\n');
                        }
                        write_layer(&mut state_guard.css_buffer, "base", &base_body);
                    } else {
                        write_layer(&mut state_guard.css_buffer, "base", "");
                    }
                } else {
                    write_layer(&mut state_guard.css_buffer, "base", "");
                }
                set_base_layer_present();
                // Properties layer last (always emit once)
                {
                    let props = AppState::engine().property_at_rules();
                    if props.is_empty() {
                        write_layer(&mut state_guard.css_buffer, "properties", "");
                    } else {
                        let mut prop_body = String::new();
                        for line in props.lines() {
                            if line.is_empty() { continue; }
                            prop_body.push_str(line);
                            prop_body.push('\n');
                        }
                        write_layer(&mut state_guard.css_buffer, "properties", &prop_body);
                    }
                    set_properties_layer_present();
                }
                (true, Vec::<String>::new())
            } else {
                // (Unreachable now because force_full includes any additions/removals). Keep fallback.
                (true, Vec::<String>::new())
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
                // rebuild index (support leading spaces before '.')
                state_guard.css_index.clear();
                let mut offset = 0usize;
                for line in css_fragment.split(|b| *b == b'\n') {
                    let trimmed = {
                        let mut i = 0; while i < line.len() && (line[i] == b' ' || line[i] == b'\t') { i+=1;} &line[i..]
                    };
                    if trimmed.starts_with(b".") {
                        if let Some(brace) = trimmed.iter().position(|c| *c == b'{') {
                            let class_name = String::from_utf8_lossy(&trimmed[1..brace]).to_string();
                            let len = line.len() + 1; // include newline
                            state_guard.css_index.insert(class_name, (offset, len));
                            offset += len;
                        } else { offset += line.len() + 1; }
                    } else {
                        offset += line.len() + 1;
                    }
                }
                state_guard.last_css_hash = new_hash_fragment;
                state_guard.css_out.flush_now()?; // ensure removal visible
            }
    } else { /* no else branch; all paths now rewrite */ }
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

    // Final synchronous flush to guarantee bytes are visible immediately after log.
    if !added.is_empty() || !removed.is_empty() {
        if let Ok(mut guard) = state.lock() {
            // Best-effort flush; ignore error to avoid breaking hot loop.
            let _ = guard.css_out.flush_now();
        }
    }

    Ok(())
}
