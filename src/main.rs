use colored::Colorize;
use style::core::color::{color::Argb, theme::ThemeBuilder};

/// Generate a theme directly from an `Argb` color.
fn color_to_theme(source: Argb) -> style::core::color::theme::Theme {
    ThemeBuilder::with_source(source).build()
}

/// Generate theme from a local image path.
fn local_image_to_theme<P: AsRef<std::path::Path>>(
    path: P,
) -> Result<style::core::color::theme::Theme, String> {
    let bytes = std::fs::read(path).map_err(|e| format!("failed to read file: {}", e))?;

    let mut img = style::core::color::image::ImageReader::read(bytes)
        .map_err(|e| format!("failed to decode image: {}", e))?;

    use style::core::color::image::FilterType;
    img.resize(128, 128, FilterType::Lanczos3);

    let source = style::core::color::image::ImageReader::extract_color(&img);

    Ok(ThemeBuilder::with_source(source).build())
}

/// Generate theme from a remote image URL (async).
async fn remote_image_to_theme(url: &str) -> Result<style::core::color::theme::Theme, String> {
    let resp = reqwest::get(url)
        .await
        .map_err(|e| format!("request failed: {}", e))?;
    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("bytes read failed: {}", e))?;

    let mut img = style::core::color::image::ImageReader::read(bytes.to_vec())
        .map_err(|e| format!("failed to decode image: {}", e))?;

    use style::core::color::image::FilterType;
    img.resize(128, 128, FilterType::Lanczos3);

    let source = style::core::color::image::ImageReader::extract_color(&img);

    Ok(ThemeBuilder::with_source(source).build())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1) Color-based theme
    let color_theme = color_to_theme(Argb::from_u32(0xffaae5a4));
    println!("{}", "Theme generated from color:".green());
    println!("{}", serde_json::to_string_pretty(&color_theme)?);

    // 2) Local image-based theme
    match local_image_to_theme("media/suzume.png") {
        Ok(theme) => {
            println!("{}", "Theme generated from local image:".green());
            println!("{}", serde_json::to_string_pretty(&theme)?);
        }
        Err(e) => {
            println!("{} {}", "Local image theme failed:".red(), e);
        }
    }

    // 3) Remote image-based theme
    let remote_url = "https://picsum.photos/id/866/1920/1080";

    match remote_image_to_theme(remote_url).await {
        Ok(theme) => {
            println!("{}", "Theme generated from remote image:".green());
            println!("{}", serde_json::to_string_pretty(&theme)?);
        }
        Err(e) => {
            println!("{} {}", "Remote image theme failed:".red(), e);
        }
    }

    Ok(())
}
