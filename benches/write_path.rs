use criterion::{Criterion, criterion_group, criterion_main, BatchSize};
use style::core::output::{CssOutput, set_mmap_threshold};
use std::fs; 

// Simple micro benchmark measuring append & replace latency with small payloads.
fn bench_writes(c: &mut Criterion) {
    // Force writer backend (small file) for focused latency.
    set_mmap_threshold(u64::MAX);
    let path = "target/tmp_bench.css";
    let _ = fs::remove_file(path);

    let mut group = c.benchmark_group("css_write");
    group.sample_size(100);

    group.bench_function("append_small", |b| {
        b.iter_batched(|| {
            let mut out = CssOutput::open(path).unwrap();
            out
        }, |mut out| {
            out.append(b".a{color:red;}").unwrap();
            out.flush_if_dirty().unwrap();
        }, BatchSize::SmallInput);
    });

    group.bench_function("replace_small", |b| {
        b.iter_batched(|| {
            let mut out = CssOutput::open(path).unwrap();
            out.append(b".seed{display:block;}").unwrap();
            out
        }, |mut out| {
            out.replace(b".seed{display:block;}.b{margin:0;}").unwrap();
            out.flush_if_dirty().unwrap();
        }, BatchSize::SmallInput);
    });

    group.finish();
}

criterion_group!(benches, bench_writes);
criterion_main!(benches);
