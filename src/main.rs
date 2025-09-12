use style::core::color::{color::Argb, theme::ThemeBuilder};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Try to fetch an image and generate a theme from it. If anything fails,
    // fall back to a solid-source theme.
    let theme = if let Ok(bytes) = fetch_image_bytes("https://picsum.photos/id/866/1920/1080").await
    {
        // Use the project's image reader to decode + resize + extract a source color.
        if let Ok(mut data) = style::core::color::image::ImageReader::read(bytes) {
            use style::core::color::image::FilterType;

            data.resize(128, 128, FilterType::Lanczos3);

            let source = style::core::color::image::ImageReader::extract_color(&data);

            ThemeBuilder::with_source(source).build()
        } else {
            ThemeBuilder::with_source(Argb::from_u32(0xffaae5a4)).build()
        }
    } else {
        ThemeBuilder::with_source(Argb::from_u32(0xffaae5a4)).build()
    };

    let json = serde_json::to_string_pretty(&theme)?;
    println!("{}", json);

    Ok(())
}

async fn fetch_image_bytes(url: &str) -> Result<Vec<u8>, reqwest::Error> {
    let resp = reqwest::get(url).await?;
    let bytes = resp.bytes().await?;
    Ok(bytes.to_vec())
}
