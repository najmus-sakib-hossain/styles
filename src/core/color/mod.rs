use crate::core::engine::StyleEngine;

#[cfg(all(feature = "image", not(feature = "std")))]
compile_error!("\"image\" feature requires \"std\" feature");

#[cfg(all(feature = "std", feature = "libm"))]
compile_error!("features \"std\" and \"libm\" cannot be enabled simultaneously");

#[cfg(all(not(feature = "std"), not(feature = "libm")))]
compile_error!("\"no-std\" requires \"libm\" feature");

#[cfg(not(feature = "std"))]
extern crate alloc;
#[cfg(feature = "std")]
extern crate std;

#[cfg(feature = "std")]
pub(crate) use ahash::HashMap as Map;
#[cfg(not(feature = "std"))]
pub(crate) use alloc::collections::BTreeMap as Map;

pub(crate) type IndexMap<K, V> =
    indexmap::IndexMap<K, V, core::hash::BuildHasherDefault<ahash::AHasher>>;

pub mod blend;
pub mod color;
pub mod contrast;
pub mod dislike;
pub mod dynamic_color;
pub mod error;
pub mod hct;
#[cfg(feature = "image")]
pub mod image;
pub mod palette;
pub mod quantize;
pub mod scheme;
pub mod score;
pub mod temperature;
pub mod theme;
pub mod utils;

pub use error::Error;

pub fn generate_color_css(engine: &StyleEngine, class_name: &str) -> Option<String> {
    if let Some(name) = class_name.strip_prefix("bg-") {
        if let Some(val) = engine.colors.get(name) {
            let _ = val;
            return Some(format!("background-color: var(--color-{})", name));
        }
    }
    if let Some(name) = class_name.strip_prefix("text-") {
        if let Some(val) = engine.colors.get(name) {
            let _ = val;
            return Some(format!("color: var(--color-{})", name));
        }
    }
    None
}
