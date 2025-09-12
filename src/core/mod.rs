use crate::{
    cache, datasource, generator, parser::extract_classes_fast, telemetry::format_duration,
};
mod animation;
mod engine;
mod group;
use ahash::{AHashSet, AHasher};
use colored::Colorize;
use std::hash::Hasher;
pub mod color;
pub mod output;
use output::CssOutput;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;

static BASE_LAYER_PRESENT: AtomicBool = AtomicBool::new(false);
pub fn set_base_layer_present() {
    BASE_LAYER_PRESENT.store(true, Ordering::Relaxed);
}
#[allow(dead_code)]
fn base_layer_present() -> bool {
    BASE_LAYER_PRESENT.load(Ordering::Relaxed)
}

static PROPERTIES_LAYER_PRESENT: AtomicBool = AtomicBool::new(false);
pub fn set_properties_layer_present() {
    PROPERTIES_LAYER_PRESENT.store(true, Ordering::Relaxed);
}
#[allow(dead_code)]
pub fn properties_layer_present() -> bool {
    PROPERTIES_LAYER_PRESENT.load(Ordering::Relaxed)
}

static FIRST_LOG_DONE: AtomicBool = AtomicBool::new(false);

pub struct AppState {
    pub html_hash: u64,
    pub class_cache: AHashSet<String>,
    pub css_out: CssOutput,
    pub last_css_hash: u64,
    pub css_buffer: Vec<u8>,
    pub class_list_checksum: u64,
    pub css_index: ahash::AHashMap<String, (usize, usize)>,
    pub utilities_offset: usize,
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
        let html_same = state_guard.html_hash == new_html_hash;
        let css_complete = state_guard.css_index.len() == state_guard.class_cache.len();
        if html_same && (!is_initial_run || css_complete) {
            return Ok(());
        }
    }

    let parse_timer = Instant::now();
    let prev_len_hint = { state.lock().unwrap().class_cache.len() };
    let all_classes = extract_classes_fast(&html_bytes, prev_len_hint.next_power_of_two());
    let parse_extract_duration = parse_timer.elapsed();

    let diff_timer = Instant::now();
    let (added, removed) = {
        let state_guard = state.lock().unwrap();
        let old = &state_guard.class_cache;
        let added: Vec<String> = all_classes.difference(old).cloned().collect();
        let removed: Vec<String> = old.difference(&all_classes).cloned().collect();
        (added, removed)
    };
    let diff_duration = diff_timer.elapsed();

    let css_incomplete = {
        let s = state.lock().unwrap();
        s.css_index.len() != s.class_cache.len()
    };
    if added.is_empty() && removed.is_empty() && !css_incomplete {
        let mut state_guard = state.lock().unwrap();
        let mut h = AHasher::default();
        for c in &state_guard.class_cache {
            h.write(c.as_bytes());
        }
        state_guard.class_list_checksum = h.finish();
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

    struct WriteStats {
        mode: &'static str,
        classes_written: usize,
        bytes_written: usize,
        sub1_label: &'static str,
        sub1: std::time::Duration,
        sub2_label: Option<&'static str>,
        sub2: Option<std::time::Duration>,
        sub3_label: Option<&'static str>,
        sub3: Option<std::time::Duration>,
    }
    let css_write_timer = Instant::now();
    let (css_write_duration, write_stats) = {
        let mut state_guard = state.lock().unwrap();
        state_guard.css_buffer.clear();
        let is_color = |c: &str| {
            let base = c.rsplit(':').next().unwrap_or(c);
            base.starts_with("bg-") || base.starts_with("text-")
        };
        let removed_has_color = removed.iter().any(|c| is_color(c));
        let added_has_color = added.iter().any(|c| is_color(c));
        let missing_index_for_removed = removed
            .iter()
            .any(|c| !state_guard.css_index.contains_key(c));
        let only_additions = !added.is_empty() && removed.is_empty();
        let only_removals = !removed.is_empty() && added.is_empty();
        let need_full = if is_initial_run {
            true
        } else if only_additions {
            added_has_color
        } else if only_removals {
            removed_has_color || missing_index_for_removed
        } else {
            true
        };
        if need_full {
            let mut class_vec: Vec<String> = state_guard.class_cache.iter().cloned().collect();
            class_vec.sort();
            let phase_start = Instant::now();
            state_guard
                .css_buffer
                .extend_from_slice(b"@layer theme, components, utilities, base, properties;\n");
            fn write_layer(buf: &mut Vec<u8>, name: &str, body: &str) {
                let trimmed = body.trim();
                if trimmed.is_empty() {
                    buf.extend_from_slice(format!("@layer {} {{}}\n", name).as_bytes());
                } else {
                    buf.extend_from_slice(format!("@layer {} {{\n", name).as_bytes());
                    for line in trimmed.lines() {
                        if line.is_empty() {
                            continue;
                        }
                        buf.extend_from_slice(b"  ");
                        buf.extend_from_slice(line.as_bytes());
                        buf.push(b'\n');
                    }
                    buf.extend_from_slice(b"}\n");
                }
            }
            let (root_vars, dark_vars) = {
                let engine = AppState::engine();
                engine.generate_color_vars_for(
                    class_vec.iter().collect::<Vec<_>>().iter().map(|s| *s),
                )
            };
            let mut theme_body = String::new();
            if !root_vars.is_empty() {
                theme_body.push_str(root_vars.trim_end());
                theme_body.push('\n');
            }
            if !dark_vars.is_empty() {
                theme_body.push_str(dark_vars.trim_end());
                theme_body.push('\n');
            }
            write_layer(&mut state_guard.css_buffer, "theme", &theme_body);
            write_layer(&mut state_guard.css_buffer, "components", "");
            if let Some(base_raw) = AppState::engine().base_layer_raw.as_ref() {
                if !base_raw.is_empty() {
                    let mut base_body = String::new();
                    for line in base_raw.trim_end().lines() {
                        if line.trim().is_empty() {
                            continue;
                        }
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
            {
                let props = AppState::engine().property_at_rules();
                if props.is_empty() {
                    write_layer(&mut state_guard.css_buffer, "properties", "");
                } else {
                    let mut prop_body = String::new();
                    for line in props.lines() {
                        if line.is_empty() {
                            continue;
                        }
                        prop_body.push_str(line);
                        prop_body.push('\n');
                    }
                    write_layer(&mut state_guard.css_buffer, "properties", &prop_body);
                }
                set_properties_layer_present();
            }
            let mut util_buf = Vec::new();
            generator::generate_class_rules_only(&mut util_buf, class_vec.iter());
            let gen_layers_utils = phase_start.elapsed();
            let util_phase_start = Instant::now();
            let mut util_body = String::new();
            for line in String::from_utf8_lossy(&util_buf).lines() {
                if line.trim().is_empty() {
                    continue;
                }
                util_body.push_str(line);
                util_body.push('\n');
            }
            state_guard
                .css_buffer
                .extend_from_slice(b"@layer utilities {\n");
            state_guard.utilities_offset = state_guard.css_buffer.len();
            for line in util_body.lines() {
                if line.is_empty() {
                    continue;
                }
                state_guard.css_buffer.extend_from_slice(b"  ");
                state_guard.css_buffer.extend_from_slice(line.as_bytes());
                state_guard.css_buffer.push(b'\n');
            }
            state_guard.css_buffer.extend_from_slice(b"}\n");
            let fragment_vec = state_guard.css_buffer.clone();
            let build_utilities = util_phase_start.elapsed();
            let flush_start = Instant::now();
            use ahash::AHasher;
            let mut hh = AHasher::default();
            hh.write(&fragment_vec);
            let frag_hash = hh.finish();
            let fragment_len = fragment_vec.len();
            let utilities_offset = state_guard.utilities_offset;
            if state_guard.last_css_hash != frag_hash {
                state_guard.css_out.replace(&fragment_vec)?;
                state_guard.last_css_hash = frag_hash;
            }
            state_guard.css_index.clear();
            let body_slice: Vec<u8> = fragment_vec[utilities_offset..fragment_len - 2].to_vec();
            let mut rel = 0usize;
            for line in body_slice.split(|b| *b == b'\n') {
                if line.is_empty() {
                    continue;
                }
                let trimmed = {
                    let mut i = 0;
                    while i < line.len() && (line[i] == b' ' || line[i] == b'\t') {
                        i += 1;
                    }
                    &line[i..]
                };
                if trimmed.starts_with(b".") {
                    if let Some(br) = trimmed.iter().position(|c| *c == b'{') {
                        let name = String::from_utf8_lossy(&trimmed[1..br]).to_string();
                        let len = line.len() + 1;
                        state_guard.css_index.insert(name, (rel, len));
                        rel += len;
                    } else {
                        rel += line.len() + 1;
                    }
                } else {
                    rel += line.len() + 1;
                }
            }
            state_guard.css_out.flush_now()?;
            let flush_time = flush_start.elapsed();
            (
                css_write_timer.elapsed(),
                WriteStats {
                    mode: "full",
                    classes_written: class_vec.len(),
                    bytes_written: fragment_vec.len(),
                    sub1_label: "layers+gen",
                    sub1: gen_layers_utils,
                    sub2_label: Some("utilities"),
                    sub2: Some(build_utilities),
                    sub3_label: Some("flush"),
                    sub3: Some(flush_time),
                },
            )
        } else if only_additions {
            let gen_start = Instant::now();
            generator::generate_class_rules_only(&mut state_guard.css_buffer, added.iter());
            if !state_guard.css_buffer.is_empty() {
                let gen_time = gen_start.elapsed();
                let build_start = Instant::now();
                let raw = std::mem::take(&mut state_guard.css_buffer);
                let mut block = Vec::with_capacity(raw.len() + 32);
                for line in raw.split(|b| *b == b'\n') {
                    if line.is_empty() {
                        continue;
                    }
                    block.extend_from_slice(b"  ");
                    block.extend_from_slice(line);
                    block.push(b'\n');
                }
                let build_time = build_start.elapsed();
                let flush_start = Instant::now();
                let start_rel = state_guard.css_out.append_inside_final_block(&block)?;
                let mut rel_off = start_rel - state_guard.utilities_offset;
                for line in block.split(|b| *b == b'\n') {
                    if line.is_empty() {
                        continue;
                    }
                    let trimmed = {
                        let mut i = 0;
                        while i < line.len() && (line[i] == b' ' || line[i] == b'\t') {
                            i += 1;
                        }
                        &line[i..]
                    };
                    if trimmed.starts_with(b".") {
                        if let Some(br) = trimmed.iter().position(|c| *c == b'{') {
                            let name = String::from_utf8_lossy(&trimmed[1..br]).to_string();
                            let len = line.len() + 1;
                            state_guard.css_index.insert(name, (rel_off, len));
                            rel_off += len;
                        } else {
                            rel_off += line.len() + 1;
                        }
                    } else {
                        rel_off += line.len() + 1;
                    }
                }
                state_guard.css_out.flush_now()?;
                let flush_time = flush_start.elapsed();
                (
                    css_write_timer.elapsed(),
                    WriteStats {
                        mode: "add",
                        classes_written: added.len(),
                        bytes_written: block.len(),
                        sub1_label: "gen",
                        sub1: gen_time,
                        sub2_label: Some("build"),
                        sub2: Some(build_time),
                        sub3_label: Some("flush"),
                        sub3: Some(flush_time),
                    },
                )
            } else {
                (
                    css_write_timer.elapsed(),
                    WriteStats {
                        mode: "add",
                        classes_written: 0,
                        bytes_written: 0,
                        sub1_label: "gen",
                        sub1: gen_start.elapsed(),
                        sub2_label: None,
                        sub2: None,
                        sub3_label: None,
                        sub3: None,
                    },
                )
            }
        } else if !removed.is_empty() && added.is_empty() {
            let mut removed_bytes = 0usize;
            for r in &removed {
                if let Some((off, len)) = state_guard.css_index.remove(r) {
                    let abs = state_guard.utilities_offset + off;
                    let _ = state_guard.css_out.blank_range(abs, len);
                    removed_bytes += len;
                }
            }
            let flush_start = Instant::now();
            state_guard.css_out.flush_now()?;
            let flush_time = flush_start.elapsed();
            (
                css_write_timer.elapsed(),
                WriteStats {
                    mode: "remove",
                    classes_written: removed.len(),
                    bytes_written: removed_bytes,
                    sub1_label: "blank",
                    sub1: flush_time, // treat all as one phase
                    sub2_label: None,
                    sub2: None,
                    sub3_label: None,
                    sub3: None,
                },
            )
        } else {
            drop(state_guard);
            (
                css_write_timer.elapsed(),
                WriteStats {
                    mode: "mixed",
                    classes_written: added.len() + removed.len(),
                    bytes_written: 0,
                    sub1_label: "noop",
                    sub1: std::time::Duration::from_micros(0),
                    sub2_label: None,
                    sub2: None,
                    sub3_label: None,
                    sub3: None,
                },
            )
        }
    };

    let total_processing = hash_duration
        + parse_extract_duration
        + diff_duration
        + cache_update_duration
        + css_write_duration;

    if !FIRST_LOG_DONE.load(Ordering::Relaxed) {
        let line_fmt = format!(
            "Initial: {} added, {} removed",
            format!("{}", added.len()).green(),
            format!("{}", removed.len()).red(),
        );
        println!("{}", line_fmt);
        FIRST_LOG_DONE.store(true, Ordering::Relaxed);
    } else {
        // Build write detail string
        let mut write_detail = format!(
            "mode={} classes={} bytes={} {}={:?}",
            write_stats.mode,
            write_stats.classes_written,
            write_stats.bytes_written,
            write_stats.sub1_label,
            write_stats.sub1
        );
        if let (Some(l2), Some(d2)) = (write_stats.sub2_label, write_stats.sub2) {
            write_detail.push_str(&format!(" {}={:?}", l2, d2));
        }
        if let (Some(l3), Some(d3)) = (write_stats.sub3_label, write_stats.sub3) {
            write_detail.push_str(&format!(" {}={:?}", l3, d3));
        }
        println!(
            "Processed: {} added, {} removed | (Total: {} -> Hash: {}, Parse: {}, Diff: {}, Cache: {}, Write: {} [{}])",
            format!("{}", added.len()).green(),
            format!("{}", removed.len()).red(),
            format_duration(total_processing),
            format_duration(hash_duration),
            format_duration(parse_extract_duration),
            format_duration(diff_duration),
            format_duration(cache_update_duration),
            format_duration(css_write_duration),
            write_detail
        );
    }

    if !added.is_empty() || !removed.is_empty() {
        if let Ok(mut guard) = state.lock() {
            let _ = guard.css_out.flush_now();
        }
    }

    Ok(())
}
