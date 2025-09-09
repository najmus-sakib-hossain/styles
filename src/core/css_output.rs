use memmap2::MmapMut;
use std::fs::{File, OpenOptions};
use std::io::{BufWriter, Seek, SeekFrom, Write};
use std::path::Path;

static mut MMAP_THRESHOLD_BYTES: u64 = 64 * 1024;

pub enum CssBackend {
    Writer(BufWriter<File>),
    Mmap {
        file: File,
        mmap: MmapMut,
        logical_len: usize,
        dirty: bool,
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
            Ok(Self {
                backend: CssBackend::Writer(BufWriter::with_capacity(65536, f)),
            })
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
            },
        })
    }

    pub fn replace(&mut self, bytes: &[u8]) -> std::io::Result<()> {
        match &mut self.backend {
            CssBackend::Writer(w) => {
                w.get_mut().set_len(0)?;
                w.seek(SeekFrom::Start(0))?;
                w.write_all(bytes)?;
                w.flush()?;
            }
            CssBackend::Mmap {
                file,
                mmap,
                logical_len,
                dirty,
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
            CssBackend::Writer(w) => {
                w.seek(SeekFrom::End(0))?;
                w.write_all(bytes)?;
                w.flush()?;
            }
            CssBackend::Mmap {
                file,
                mmap,
                logical_len,
                dirty,
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
        match &mut self.backend {
            CssBackend::Writer(w) => {
                w.flush()?;
            }
            CssBackend::Mmap { mmap, dirty, .. } => {
                if *dirty {
                    mmap.flush_async()?;
                    *dirty = false;
                }
            }
        }
        Ok(())
    }
}

pub fn set_mmap_threshold(bytes: u64) {
    unsafe {
        MMAP_THRESHOLD_BYTES = bytes;
    }
}
