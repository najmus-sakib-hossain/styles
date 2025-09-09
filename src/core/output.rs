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
            Ok(Self { backend: CssBackend::Writer { writer: BufWriter::with_capacity(64 * 1024, f), logical_len: existing_len, dirty: false, last_flush: Instant::now() } })
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
            backend: CssBackend::Mmap {
                file,
                mmap,
                logical_len: 0,
                dirty: false,
                last_flush: Instant::now(),
            },
        })
    }

    pub fn replace(&mut self, bytes: &[u8]) -> std::io::Result<()> {
        match &mut self.backend {
            CssBackend::Writer { writer, logical_len, dirty, .. } => {
                let old_len = *logical_len;
                let new_len = bytes.len();
                if new_len > old_len {
                    // extend file once (cheaper than shrink+grow pattern)
                    writer.get_mut().set_len(new_len as u64)?;
                }
                writer.seek(SeekFrom::Start(0))?;
                writer.write_all(bytes)?;
                if old_len > new_len {
                    // Overwrite leftover tail with spaces to mask stale bytes without truncation cost
                    let pad = old_len - new_len;
                    // small stack buffer optimization threshold
                    if pad <= 1024 {
                        static SPACE_BLOCK: [u8; 1024] = [b' '; 1024];
                        writer.write_all(&SPACE_BLOCK[..pad])?;
                    } else {
                        let spaces = vec![b' '; pad];
                        writer.write_all(&spaces)?;
                    }
                }
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
                let should_flush = cfg!(feature = "eager-flush") || (*dirty && last_flush.elapsed() >= FLUSH_INTERVAL);
                if should_flush {
                    writer.flush()?;
                    *dirty = false;
                    *last_flush = Instant::now();
                }
            }
            CssBackend::Mmap { mmap, dirty, last_flush, .. } => {
                let should_flush = cfg!(feature = "eager-flush") || (*dirty && last_flush.elapsed() >= FLUSH_INTERVAL);
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
