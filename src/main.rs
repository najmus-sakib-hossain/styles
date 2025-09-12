use style::core::color::{color::Argb, theme::ThemeBuilder};

fn main(){
    let theme = ThemeBuilder::with_source(Argb::from_u32(0xffaae5a4)).build();
    println!("{:?}", theme);
}
