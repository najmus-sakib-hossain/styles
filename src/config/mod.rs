use serde::Deserialize;
use std::fs;

#[derive(Debug, Deserialize, Clone)]
pub struct PathsConfig {
    pub html_dir: String,
    pub index_file: String,
    pub css_file: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct WatchConfig {
    pub debounce_ms: Option<u64>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Config {
    pub paths: PathsConfig,
    pub watch: Option<WatchConfig>,
}

impl Config {
    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let content = fs::read_to_string(".dx/config.toml")?;
        let cfg: Config = toml::from_str(&content)?;
        Ok(cfg)
    }
}

impl Default for Config {
    fn default() -> Self {
        Config {
            paths: PathsConfig {
                html_dir: "playgrounds/html".into(),
                index_file: "playgrounds/html/index.html".into(),
                css_file: "playgrounds/html/style.css".into(),
            },
            watch: Some(WatchConfig {
                debounce_ms: Some(250),
            }),
        }
    }
}
