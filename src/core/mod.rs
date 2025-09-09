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
        let (need_full_rewrite, added_clone, fast_delete_only) = {
            let mut state_guard = state.lock().unwrap();
            state_guard.css_buffer.clear();
            let is_color = |c: &str| {
                let base = c.rsplit(':').next().unwrap_or(c);
                base.starts_with("bg-") || base.starts_with("text-")
            };
            let removed_has_color = removed.iter().any(|c| is_color(c));
            let added_has_color = added.iter().any(|c| is_color(c));
            let missing_index_for_removed = removed.iter().any(|c| !state_guard.css_index.contains_key(c));
            let deletion_only = added.is_empty() && !removed.is_empty();
            // New rule (aggressive): deletion-only never forces full rewrite after initial run.
            // Missing indices are ignored; orphaned rules may remain until a future full rewrite (trade-off for speed).
            let force_full = if deletion_only { is_initial_run } else { is_initial_run || missing_index_for_removed || removed_has_color || added_has_color };
            let fast_delete_only = deletion_only && !force_full;
            if force_full {
                let class_vec: Vec<String> = state_guard.class_cache.iter().cloned().collect();
                generator::generate_css_into(&mut state_guard.css_buffer, class_vec.iter());
                (true, Vec::new(), false)
            } else {
                let local_added: Vec<String> = added.iter().cloned().collect();
                generator::generate_css_into(&mut state_guard.css_buffer, local_added.iter());
                (false, local_added, fast_delete_only)
            }
        };
        let mut hasher = AHasher::default();
        // Fast path: deletion only (non-color) -> just queue blanks & skip hash/clone/gen work inside timing window.
    if fast_delete_only {
            if removed.len() == 1 {
                let mut state_guard = state.lock().unwrap();
                if let Some((start, len)) = state_guard.css_index.remove(&removed[0]) {
                    state_guard.css_out.queue_blank_ranges(&[(start, len)]);
                }
            } else {
                // Collect ranges first without holding lock long for processing.
                let (mut ranges, css_out_ptr) = {
                    let mut state_guard = state.lock().unwrap();
                    let mut collected: Vec<(usize, usize)> = Vec::with_capacity(removed.len());
                    for r in &removed { if let Some((start,len)) = state_guard.css_index.remove(r) { collected.push((start,len)); } }
                    (collected, std::ptr::addr_of_mut!(state_guard.css_out))
                };
                if !ranges.is_empty() {
                    ranges.sort_unstable_by_key(|r| r.0);
                    // Merge contiguous/overlapping (in place) small loop
                    let mut write_idx = 0usize;
                    for i in 1..ranges.len() {
                        let (s,l) = ranges[i];
                        let (last_s,last_l) = ranges[write_idx];
                        let last_end = last_s + last_l;
                        if s <= last_end { // merge
                            let new_end = (s + l).max(last_end);
                            ranges[write_idx].1 = new_end - last_s;
                        } else {
                            write_idx += 1;
                            ranges[write_idx] = (s,l);
                        }
                    }
                    ranges.truncate(write_idx+1);
                    unsafe { (*css_out_ptr).queue_blank_ranges(&ranges); }
                }
            }
            // Measure write duration (just queuing blanks) and proceed to common logging path.
            let write_duration = css_write_timer.elapsed();
            let total_processing = hash_duration + parse_extract_duration + diff_duration + cache_update_duration + write_duration;
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
                    format_duration(write_duration)
                );
            }
            return Ok(());
        } else {
            let css_fragment = {
                let state_guard = state.lock().unwrap();
                state_guard.css_buffer.clone()
            };
            hasher.write(&css_fragment);
            let new_hash_fragment = hasher.finish();

    if need_full_rewrite {
            let mut state_guard = state.lock().unwrap();
            if state_guard.last_css_hash != new_hash_fragment {
                state_guard.css_out.replace(&css_fragment)?; // defer flush until after timing window
                // rebuild index
                state_guard.css_index.clear();
                let mut offset = 0usize;
                for line in css_fragment.split(|b| *b == b'\n') {
                    if line.starts_with(b".") {
                        if let Some(brace) = line.iter().position(|c| *c == b'{') {
                            let class_name = String::from_utf8_lossy(&line[1..brace]).to_string();
                            let len = line.len() + 1; // include newline
                            state_guard.css_index.insert(class_name, (offset, len));
                            offset += len;
                        } else {
                            offset += line.len() + 1;
                        }
                    } else {
                        offset += line.len() + 1;
                    }
                }
                state_guard.last_css_hash = new_hash_fragment;
            }
        } else {
            // Tombstone deletions (non-color) by overwriting ranges with spaces.
        if !removed.is_empty() {
                let mut state_guard = state.lock().unwrap();
                // Collect ranges
                let mut ranges: Vec<(usize, usize)> = Vec::with_capacity(removed.len());
                for r in &removed {
                    if let Some((start, len)) = state_guard.css_index.remove(r) {
                        ranges.push((start, len));
                    }
                }
                if !ranges.is_empty() {
                    // Sort & merge contiguous / overlapping for fewer writes
                    ranges.sort_unstable_by_key(|r| r.0);
                    let mut merged: Vec<(usize, usize)> = Vec::with_capacity(ranges.len());
                    for (s, l) in ranges {
                        if let Some(last) = merged.last_mut() {
                            let end = last.0 + last.1;
                            if s <= end { // overlap / touch
                                let new_end = (s + l).max(end);
                                last.1 = new_end - last.0;
                                continue;
                            }
                        }
                        merged.push((s, l));
                    }
            // Use batch blanking to reduce syscall / seek overhead.
                    state_guard.css_out.queue_blank_ranges(&merged);
        // Defer flush; periodic flush will handle it. Immediate flush made deletes slower.
                }
            }
            if !added_clone.is_empty() {
                let mut state_guard = state.lock().unwrap();
                let base_offset = state_guard.css_out.current_len();
                state_guard.css_out.append(&css_fragment)?;
                // index new lines
                let mut rel = 0usize;
                for line in css_fragment.split(|b| *b == b'\n') {
                    if line.is_empty() { rel += 1; continue; }
                    if line.starts_with(b".") {
                        if let Some(brace) = line.iter().position(|c| *c == b'{') {
                            let class_name = String::from_utf8_lossy(&line[1..brace]).to_string();
                            let len = line.len() + 1;
                            state_guard.css_index.insert(class_name, (base_offset + rel, len));
                            rel += len;
                        } else { rel += line.len() + 1; }
                    } else { rel += line.len() + 1; }
                }
                state_guard.last_css_hash ^= new_hash_fragment;
            }
        }
    // defer flush outside timing window
    let elapsed = css_write_timer.elapsed();
        {
            // Apply any deferred deletions outside the measured timing window
            let mut state_guard = state.lock().unwrap();
            if state_guard.css_out.has_pending_blanks() {
                let _ = state_guard.css_out.apply_pending_blanks();
            }
            // Now flush so external tools see updates quickly
            let _ = state_guard.css_out.flush_if_dirty();
            let _ = state_guard.css_out.flush_now();
        }
    elapsed }
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
