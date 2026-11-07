use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PerKeyRgbCell {
    pub row: u8,
    pub col: u8,
    /// QMK Hue (0..=255)
    pub h: u8,
    /// QMK Saturation (0..=255)
    pub s: u8,
    /// Hex color preview `#RRGGBB` (`#000000` when `h == 0 && s == 0`)
    pub color: String,
}

impl PerKeyRgbCell {
    pub fn from_hs(row: u8, col: u8, h: u8, s: u8) -> Self {
        let color = hs_to_hex(h, s);
        Self {
            row,
            col,
            h,
            s,
            color,
        }
    }

    pub fn from_hex(row: u8, col: u8, hex: &str) -> Self {
        let (h, s) = hex_to_hs(hex);
        let normalized_hex = if h == 0 && s == 0 {
            "#000000".to_string()
        } else {
            hs_to_hex(h, s)
        };
        Self {
            row,
            col,
            h,
            s,
            color: normalized_hex,
        }
    }
}

/// Converts QMK `(hue: 0..255, sat: 0..255)` to `#RRGGBB` using the exact same convention as the MAX102 firmware
/// (`h == 0 && s == 0` -> off `#000000`, otherwise `V = 1.0`).
pub fn hs_to_hex(h: u8, s: u8) -> String {
    if h == 0 && s == 0 {
        return "#000000".to_string();
    }
    let hue_deg = (h as f64 / 255.0) * 360.0;
    let sat = (s as f64 / 255.0).clamp(0.0, 1.0);
    let val = 1.0_f64;

    let c = val * sat;
    let x = c * (1.0 - ((hue_deg / 60.0) % 2.0 - 1.0).abs());
    let m = val - c;

    let (r1, g1, b1) = if hue_deg < 60.0 {
        (c, x, 0.0)
    } else if hue_deg < 120.0 {
        (x, c, 0.0)
    } else if hue_deg < 180.0 {
        (0.0, c, x)
    } else if hue_deg < 240.0 {
        (0.0, x, c)
    } else if hue_deg < 300.0 {
        (x, 0.0, c)
    } else {
        (c, 0.0, x)
    };

    let r = ((r1 + m) * 255.0).round().clamp(0.0, 255.0) as u8;
    let g = ((g1 + m) * 255.0).round().clamp(0.0, 255.0) as u8;
    let b = ((b1 + m) * 255.0).round().clamp(0.0, 255.0) as u8;
    format!("#{:02x}{:02x}{:02x}", r, g, b)
}

/// Converts `#RRGGBB` to QMK `(hue: 0..255, sat: 0..255)`.
/// Note: Pure white (`r == g == b > 0`) has `sat == 0` in HSV; to avoid colliding with `h=0, s=0` (LED off),
/// pure white is encoded as `h = 1, s = 0` so the firmware keeps the LED illuminated white!
pub fn hex_to_hs(hex: &str) -> (u8, u8) {
    let clean = hex.trim().trim_start_matches('#');
    if clean.len() < 6 {
        return (0, 0);
    }
    let r = u8::from_str_radix(&clean[0..2], 16).unwrap_or(0) as f64 / 255.0;
    let g = u8::from_str_radix(&clean[2..4], 16).unwrap_or(0) as f64 / 255.0;
    let b = u8::from_str_radix(&clean[4..6], 16).unwrap_or(0) as f64 / 255.0;

    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let delta = max - min;

    if max < 0.02 {
        return (0, 0);
    }

    let mut hue_deg = if delta.abs() < 1e-6 {
        0.0
    } else if (max - r).abs() < 1e-6 {
        60.0 * (((g - b) / delta) % 6.0)
    } else if (max - g).abs() < 1e-6 {
        60.0 * (((b - r) / delta) + 2.0)
    } else {
        60.0 * (((r - g) / delta) + 4.0)
    };
    if hue_deg < 0.0 {
        hue_deg += 360.0;
    }

    let sat = if max == 0.0 { 0.0 } else { delta / max };
    let mut h_byte = ((hue_deg / 360.0) * 255.0).round().clamp(0.0, 255.0) as u8;
    let s_byte = (sat * 255.0).round().clamp(0.0, 255.0) as u8;

    if h_byte == 0 && s_byte == 0 && max >= 0.02 {
        h_byte = 1;
    }
    (h_byte, s_byte)
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LightingConfig {
    /// Effect ID (`2..=41` for built-in effects, `45` for Custom Per-Key RGB)
    pub mode: u8,
    /// Brightness raw value (`0..=180`, step `36`, i.e. levels `0..=5`)
    pub brightness: u8,
    /// Speed raw value (`51..=255`, step `51`, i.e. levels `1..=5`)
    pub speed: u8,
    /// Global effect Hue (`0..=255`)
    pub hue: u8,
    /// Global effect Saturation (`0..=255`)
    pub sat: u8,
    /// Hex representation of global effect color
    pub color_hex: String,
    /// Sleep timeout raw code (`0` = Never, `1` = 1m, `3` = 3m, `5` = 5m, `10` = 10m, `20` = 20m, `30` = 30m)
    pub sleep_timeout: u8,
}

impl Default for LightingConfig {
    fn default() -> Self {
        Self {
            mode: 12,
            brightness: 180,
            speed: 153,
            hue: 120,
            sat: 255,
            color_hex: hs_to_hex(120, 255),
            sleep_timeout: 5,
        }
    }
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
    pub lighting: LightingConfig,
    pub per_key_rgb: Vec<PerKeyRgbCell>,
    pub macros: Vec<MacroSlot>,
    #[serde(default)]
    pub nkro_enabled: bool,
    #[serde(default)]
    pub custom_control_values: HashMap<String, u8>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hs_hex_roundtrip() {
        assert_eq!(hs_to_hex(0, 0), "#000000");
        assert_eq!(hex_to_hs("#000000"), (0, 0));

        // Pure white should preserve non-zero h so it doesn't turn LED off
        let (wh, ws) = hex_to_hs("#ffffff");
        assert_eq!((wh, ws), (1, 0));
        assert_eq!(hs_to_hex(wh, ws), "#ffffff");

        // Emerald green
        let (gh, gs) = hex_to_hs("#00ff80");
        assert!(gh > 90 && gh < 120);
        assert_eq!(gs, 255);
    }
}
