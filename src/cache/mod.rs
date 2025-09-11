use ahash::AHashSet;
use std::hash::Hasher;
mod snapshot;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{Read, Write};

fn cache_dir() -> String {
    std::env::var("DX_CACHE_DIR").unwrap_or_else(|_| ".dx/cache".to_string())
}

fn cache_file_path() -> String {
    format!("{}/cache.json", cache_dir())
}

#[derive(Serialize, Deserialize)]
struct CacheDump {
    classes: Vec<String>,
    html_hash: u64,
}

pub fn load_cache() -> (AHashSet<String>, u64, u64) {
    if let Some((set, html_hash, checksum)) = snapshot::load_snapshot() {
        return (set, html_hash, checksum);
    }
    if let Ok(mut f) = File::open(cache_file_path()) {
        let mut buf = String::new();
        if f.read_to_string(&mut buf).is_ok() {
            if let Ok(dump) = serde_json::from_str::<CacheDump>(&buf) {
                let mut h = ahash::AHasher::default();
                for c in &dump.classes {
                    h.write(c.as_bytes());
                }
                return (
                    dump.classes.into_iter().collect(),
                    dump.html_hash,
                    h.finish(),
                );
            }
        }
    }

    (AHashSet::default(), 0, 0)
}

pub fn save_cache(
    cache: &AHashSet<String>,
    html_hash: u64,
) -> Result<(), Box<dyn std::error::Error>> {
    let dump = CacheDump {
        classes: cache.iter().cloned().collect(),
        html_hash,
    };
    let bytes = serde_json::to_string(&dump)?.into_bytes();
    if let Err(e) = fs::create_dir_all(cache_dir()) {
        return Err(Box::new(e));
    }
    let mut f = File::create(cache_file_path())?;
    f.write_all(&bytes)?;
    snapshot::save_snapshot(cache, html_hash);
    Ok(())
}
