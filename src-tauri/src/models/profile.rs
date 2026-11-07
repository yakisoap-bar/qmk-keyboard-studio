use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// VIA colors carry hue and saturation; brightness is controlled separately.
pub fn hex_to_hs(hex: &str) -> anyhow::Result<(u8, u8)> {
    let clean = hex.trim().trim_start_matches('#');
    anyhow::ensure!(
        clean.len() == 6 && clean.bytes().all(|b| b.is_ascii_hexdigit()),
        "Expected a six-digit RGB hex color"
    );
    let r = u8::from_str_radix(&clean[0..2], 16)? as f64 / 255.0;
    let g = u8::from_str_radix(&clean[2..4], 16)? as f64 / 255.0;
    let b = u8::from_str_radix(&clean[4..6], 16)? as f64 / 255.0;
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let delta = max - min;
    let h = if delta == 0.0 {
        0.0
    } else if max == r {
        ((g - b) / delta).rem_euclid(6.0)
    } else if max == g {
        (b - r) / delta + 2.0
    } else {
        (r - g) / delta + 4.0
    };
    Ok((
        (h / 6.0 * 255.0).round() as u8,
        (if max == 0.0 { 0.0 } else { delta / max * 255.0 }).round() as u8,
    ))
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MacroStep {
    /// `"keydown"` or `"keyup"`
    pub action: String,
    /// DOM code e.g. `"KeyA"`, `"Enter"`, `"ShiftLeft"`
    pub code: String,
    /// Display label e.g. `"A"`, `"Enter"`
    pub key: String,
    /// Delay after this event in milliseconds (`0` = no delay)
    pub delay: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MacroSlot {
    pub index: u8,
    pub name: String,
    pub steps: Vec<MacroStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyboardProfile {
    pub schema_version: u8,
    pub name: String,
    pub device_name: String,
    #[serde(default)]
    pub definition_id: String,
    #[serde(default)]
    pub vendor_id: u16,
    #[serde(default)]
    pub product_id: u16,
    pub protocol_version: u16,
    pub layers_count: u8,
    pub rows: u8,
    pub cols: u8,
    #[serde(default)]
    pub layout_options: u32,
    /// `layers[layer_idx][row * cols + col]` = 16-bit QMK keycode
    pub layers: Vec<Vec<u16>>,
    pub macros: Vec<MacroSlot>,
    #[serde(default)]
    pub via_lighting_values: HashMap<String, Vec<u8>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn via_hex_color_encoding() {
        assert_eq!(hex_to_hs("#ff0000").unwrap(), (0, 255));
        assert_eq!(hex_to_hs("#00ff00").unwrap(), (85, 255));
        assert_eq!(hex_to_hs("#ffffff").unwrap(), (0, 0));
        assert!(hex_to_hs("not a color").is_err());
    }
}
