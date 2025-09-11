use ahash::{AHashMap, AHashSet};
use criterion::{Criterion, criterion_group, criterion_main};
use std::sync::{Arc, Mutex};
use style::{
    config::Config,
    core::{
        AppState,
        output::{CssOutput, set_mmap_threshold},
        rebuild_styles,
    },
};

fn setup_state() -> Arc<Mutex<AppState>> {
    let config = Config::load().unwrap_or_default();

    set_mmap_threshold(u64::MAX);

    let css_out = CssOutput::open(&config.paths.css_file).unwrap();
    Arc::new(Mutex::new(AppState {
        html_hash: 0,
        class_cache: AHashSet::default(),
        css_out,
        last_css_hash: 0,
        css_buffer: Vec::with_capacity(8192),
        class_list_checksum: 0,
        css_index: AHashMap::new(),
        utilities_offset: 0,
    }))
}

fn bench_initial(c: &mut Criterion) {
    let mut group = c.benchmark_group("rebuild_styles");
    group.sample_size(50);
    group.bench_function("cold_initial", |b| {
        b.iter(|| {
            let state = setup_state();
            let cfg = Config::load().unwrap_or_default();
            let result = rebuild_styles(state, &cfg.paths.index_file, true);
            drop(result);
        })
    });
    group.finish();
}

fn bench_hot(c: &mut Criterion) {
    let mut group = c.benchmark_group("rebuild_hot");
    group.sample_size(100);
    let state = setup_state();
    let cfg = Config::load().unwrap_or_default();
    rebuild_styles(state.clone(), &cfg.paths.index_file, true).unwrap();
    group.bench_function("hot_edit", |b| {
        b.iter(|| {
            let result = rebuild_styles(state.clone(), &cfg.paths.index_file, false);
            drop(result);
        })
    });
    group.finish();
}

fn bench_append_vs_full(c: &mut Criterion) {
    let mut group = c.benchmark_group("append_vs_full");
    group.sample_size(80);
    let state = setup_state();
    let cfg = Config::load().unwrap_or_default();
    rebuild_styles(state.clone(), &cfg.paths.index_file, true).unwrap();

    group.bench_function("append_path", |b| {
        b.iter(|| {
            let result = rebuild_styles(state.clone(), &cfg.paths.index_file, false);
            drop(result);
        })
    });

    group.bench_function("full_rewrite", |b| {
        b.iter(|| {
            {
                let mut g = state.lock().unwrap();
                g.class_cache.clear();
            }
            let result = rebuild_styles(state.clone(), &cfg.paths.index_file, false);
            drop(result);
        })
    });
    group.finish();
}

criterion_group!(benches, bench_initial, bench_hot, bench_append_vs_full);
criterion_main!(benches);
