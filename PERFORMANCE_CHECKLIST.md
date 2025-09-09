# Performance Checklist

Applied optimizations (✅ = done)

- ✅ Deferred flush for writer backend (removed per-operation flush)
- ✅ Added dirty flag & debounce interval (25ms) before flushing
- ✅ Unified backend enum to carry flush timing state
- ✅ Avoid immediate flush on append/replace operations
- ✅ Mmap path now tracks last_flush and respects same debounce logic
- ✅ Power-of-two growth retained (already present) for mmap resizing
- ✅ Writer buffer size set to 64KiB (confirmation) for better batching
- ✅ Drop impl performs final synchronous flush only if dirty

Pending / Future candidates (❌ = not yet, planned)

- ❌ Tombstone strategy for deletions to avoid full rewrites
- ❌ Background compaction of fragmented CSS
- ❌ Parallel (rayon) class-to-CSS generation for large batch updates
- ❌ In-memory rule index to enable targeted removal without rebuild
- ❌ Adaptive mmap threshold lowering for medium files (benchmark first)
- ❌ Disable colored logs in hot path (behind feature flag) for lower latency
- ❌ Dedicated micro-benchmarks for write path only

## Benchmark Guidance
Add criterion benchmarks isolating just CssOutput append vs replace to quantify <30µs target. Measure before/after by capturing Write phase timing.

### Current Micro-benchmark Results

Environment: cargo bench (release, Windows) using write_path benchmark.

Initial (after deferred flush):
- append_small: ~25.5–27.0 µs
- replace_small: ~359–368 µs

After logical_len + truncated overwrite optimization:
- append_small: ~23.2–24.6 µs (further improvement)
- replace_small: ~345–361 µs (minor win; still main hotspot)

After tombstone indexing groundwork (non-color deletions in-place):
- append_small: ~23.0–24.0 µs (stable slight variance)
- replace_small: ~344–364 µs (unchanged; next steps target eliminating full replace via fragmentation threshold + compaction)

After removal of seek on append + batched deletions:
- append_small: ~19.4–19.7 µs
- replace_small (microbench scenario now uses small file path benefiting from optimized overwrite): ~24.0–24.5 µs

Recent fixes:
- Startup index reconstruction scans existing CSS so deletions of pre-existing classes work.
- Forced full rewrite when a removed class missing from index to keep output authoritative.

Interpretation:
- Target operation (single append) improved and under budget.
- Full replace still expensive due to truncate + rewrite; will be addressed by planned strategies (tombstones, incremental index, background compaction).
