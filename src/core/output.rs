use memmap2::MmapMut;
use std::fs::{File, OpenOptions};
use std::io::{BufWriter, Seek, SeekFrom, Write};
use std::path::Path;
use std::time::{Duration, Instant};

static mut MMAP_THRESHOLD_BYTES: u64 = 64 * 1024;

pub enum CssBackend {
    Writer {
        writer: BufWriter<File>,
        logical_len: usize,
        dirty: bool,
        last_flush: Instant,
    },
    Mmap {
        file: File,
        mmap: MmapMut,
        logical_len: usize,
        dirty: bool,
        last_flush: Instant,
    },
}

pub struct CssOutput {
    backend: CssBackend,
    pending_blanks: Vec<(usize, usize)>, // queued (start,len) deletions
}

impl CssOutput {
    pub fn open(path: &str) -> std::io::Result<Self> {
        let p = Path::new(path);
        if !p.exists() {
            File::create(p)?;
        }
        let meta_len = p.metadata().map(|m| m.len()).unwrap_or(0);
        let threshold = unsafe { MMAP_THRESHOLD_BYTES };
        if meta_len >= threshold {
            Self::open_mmap(path)
        } else {
            let f = OpenOptions::new()
                .read(true)
                .write(true)
                .create(true)
                .open(path)?;
            let existing_len = f.metadata().map(|m| m.len() as usize).unwrap_or(0);
            Ok(Self { backend: CssBackend::Writer { writer: BufWriter::with_capacity(64 * 1024, f), logical_len: existing_len, dirty: false, last_flush: Instant::now() }, pending_blanks: Vec::new() })
        }
    }

    fn open_mmap(path: &str) -> std::io::Result<Self> {
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(path)?;
        if file.metadata()?.len() == 0 {
            file.set_len(4096)?;
        }
        let mmap = unsafe { MmapMut::map_mut(&file)? };
        Ok(Self {
            backend: CssBackend::Mmap { file, mmap, logical_len: 0, dirty: false, last_flush: Instant::now() },
            pending_blanks: Vec::new(),
        })
    }

    pub fn replace(&mut self, bytes: &[u8]) -> std::io::Result<()> {
        match &mut self.backend {
            CssBackend::Writer { writer, logical_len, dirty, .. } => {
                let old_len = *logical_len;
                let new_len = bytes.len();
                // If shrinking, truncate first to prevent stale trailing rules from remaining visible.
                if new_len < old_len {
                    writer.get_mut().set_len(new_len as u64)?; // shrink file size
                } else if new_len > old_len {
                    writer.get_mut().set_len(new_len as u64)?; // grow
                }
                writer.seek(SeekFrom::Start(0))?;
                writer.write_all(bytes)?;
                *logical_len = new_len;
                *dirty = true; // defer flush
            }
            CssBackend::Mmap {
                file,
                mmap,
                logical_len,
                dirty,
                ..
            } => {
                if mmap.len() < bytes.len() {
                    let new_len = (bytes.len().next_power_of_two()).max(4096);
                    file.set_len(new_len as u64)?;
                    *mmap = unsafe { MmapMut::map_mut(&*file)? };
                }
                mmap[..bytes.len()].copy_from_slice(bytes);
                *logical_len = bytes.len();
                *dirty = true;
            }
        }
        Ok(())
    }

    pub fn append(&mut self, bytes: &[u8]) -> std::io::Result<()> {
        match &mut self.backend {
            CssBackend::Writer { writer, logical_len, dirty, .. } => {
                // Always seek to logical end in case prior operations (blank_range) moved cursor.
                writer.seek(SeekFrom::Start(*logical_len as u64))?;
                writer.write_all(bytes)?;
                *logical_len += bytes.len();
                *dirty = true;
            }
            CssBackend::Mmap {
                file,
                mmap,
                logical_len,
                dirty,
                ..
            } => {
                let needed = *logical_len + bytes.len();
                if mmap.len() < needed {
                    let new_len = (needed.next_power_of_two()).max(4096);
                    file.set_len(new_len as u64)?;
                    *mmap = unsafe { MmapMut::map_mut(&*file)? };
                }
                mmap[*logical_len..needed].copy_from_slice(bytes);
                *logical_len = needed;
                *dirty = true;
            }
        }
        Ok(())
    }

    pub fn flush_if_dirty(&mut self) -> std::io::Result<()> {
        // Only flush if enough time has elapsed or feature forces eager flushing.
        const FLUSH_INTERVAL: Duration = Duration::from_millis(25); // debounce window
        match &mut self.backend {
            CssBackend::Writer { writer, dirty, last_flush, .. } => {
                let should_flush = cfg!(feature = "eager-flush") || !self.pending_blanks.is_empty() || (*dirty && last_flush.elapsed() >= FLUSH_INTERVAL);
                if should_flush {
                    writer.flush()?;
                    *dirty = false;
                    *last_flush = Instant::now();
                }
            }
            CssBackend::Mmap { mmap, dirty, last_flush, .. } => {
                let should_flush = cfg!(feature = "eager-flush") || !self.pending_blanks.is_empty() || (*dirty && last_flush.elapsed() >= FLUSH_INTERVAL);
                if should_flush {
                    mmap.flush_async()?;
                    *dirty = false;
                    *last_flush = Instant::now();
                }
            }
        }
        Ok(())
    }

    pub fn flush_now(&mut self) -> std::io::Result<()> {
        match &mut self.backend {
            CssBackend::Writer { writer, dirty, last_flush, .. } => {
                if *dirty { writer.flush()?; *dirty = false; }
                *last_flush = Instant::now();
            }
            CssBackend::Mmap { mmap, dirty, last_flush, .. } => {
                if *dirty { mmap.flush()?; *dirty = false; }
                *last_flush = Instant::now();
            }
        }
        Ok(())
    }

    pub fn current_len(&self) -> usize {
        match &self.backend {
            CssBackend::Writer { logical_len, .. } => *logical_len,
            CssBackend::Mmap { logical_len, .. } => *logical_len,
        }
    }

    // Overwrite a region with spaces (tombstone). Safe for both backends, avoids shifting bytes.
    pub fn blank_range(&mut self, start: usize, len: usize) -> std::io::Result<()> {
        match &mut self.backend {
            CssBackend::Writer { writer, logical_len, dirty, .. } => {
                if start + len > *logical_len { return Ok(()); }
                writer.seek(SeekFrom::Start(start as u64))?;
                const SPACE_BLOCK: [u8; 1024] = [b' '; 1024];
                let mut remaining = len;
                while remaining > 0 {
                    let chunk = remaining.min(1024);
                    writer.write_all(&SPACE_BLOCK[..chunk])?;
                    remaining -= chunk;
                }
                // Restore cursor to EOF so subsequent append writes at end.
                writer.seek(SeekFrom::Start(*logical_len as u64))?;
                *dirty = true;
            }
            CssBackend::Mmap { mmap, logical_len, dirty, .. } => {
                if start + len > *logical_len { return Ok(()); }
                for b in &mut mmap[start..start+len] { *b = b' '; }
                *dirty = true;
            }
        }
        Ok(())
    }

    // Batch variant to minimize repeated seeks & EOF resets during multiple deletions.
    pub fn blank_ranges(&mut self, ranges: &[(usize, usize)]) -> std::io::Result<()> {
        if ranges.is_empty() { return Ok(()); }
        match &mut self.backend {
            CssBackend::Writer { writer, logical_len, dirty, .. } => {
                const SPACE_BLOCK: [u8; 1024] = [b' '; 1024];
                for (start, len) in ranges.iter().copied() {
                    if start + len > *logical_len { continue; }
                    writer.seek(SeekFrom::Start(start as u64))?;
                    let mut remaining = len;
                    while remaining > 0 {
                        let chunk = remaining.min(1024);
                        writer.write_all(&SPACE_BLOCK[..chunk])?;
                        remaining -= chunk;
                    }
                }
                // Single EOF seek at end to preserve append invariant.
                writer.seek(SeekFrom::Start(*logical_len as u64))?;
                *dirty = true;
            }
            CssBackend::Mmap { mmap, logical_len, dirty, .. } => {
                for (start, len) in ranges.iter().copied() {
                    if start + len > *logical_len { continue; }
                    for b in &mut mmap[start..start+len] { *b = b' '; }
                }
                *dirty = true;
            }
        }
        Ok(())
    }

    // Queue deletions to apply later (outside critical timing window)
    pub fn queue_blank_ranges(&mut self, ranges: &[(usize, usize)]) {
        if ranges.is_empty() { return; }
        self.pending_blanks.extend_from_slice(ranges);
        // Mark dirty so a near-term flush will happen
        match &mut self.backend {
            CssBackend::Writer { dirty, .. } => *dirty = true,
            CssBackend::Mmap { dirty, .. } => *dirty = true,
        }
    }

    pub fn apply_pending_blanks(&mut self) -> std::io::Result<()> {
        if self.pending_blanks.is_empty() { return Ok(()); }
        // Simple merge to reduce IO (assumes small vector)
        self.pending_blanks.sort_unstable_by_key(|r| r.0);
        let mut merged: Vec<(usize, usize)> = Vec::with_capacity(self.pending_blanks.len());
        for (s,l) in self.pending_blanks.drain(..) {
            if let Some(last) = merged.last_mut() {
                let end = last.0 + last.1;
                if s <= end { // overlap
                    let new_end = (s + l).max(end);
                    last.1 = new_end - last.0;
                    continue;
                }
            }
            merged.push((s,l));
        }
        self.blank_ranges(&merged)?;
        Ok(())
    }

    pub fn has_pending_blanks(&self) -> bool { !self.pending_blanks.is_empty() }
}

impl Drop for CssOutput {
    fn drop(&mut self) {
        // Ensure proper cleanup of memory-mapped files on Windows
        match &mut self.backend {
            CssBackend::Writer { writer, dirty, .. } => {
                if *dirty {
                    let _ = writer.flush();
                }
            }
            CssBackend::Mmap { mmap, dirty, .. } => {
                if *dirty {
                    let _ = mmap.flush(); // synchronous flush at drop
                }
            }
        }
    }
}

pub fn set_mmap_threshold(bytes: u64) {
    unsafe {
        MMAP_THRESHOLD_BYTES = bytes;
    }
}
