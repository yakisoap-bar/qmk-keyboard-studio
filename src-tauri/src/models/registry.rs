use anyhow::{bail, Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

const WEIKAV_MAX102_JSON: &str = include_str!("../../../src/data/definitions/weikav_max102.json");
const GENERIC_104_JSON: &str = include_str!("../../../src/data/definitions/generic_104.json");

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutKey {
    pub row: u8,
    pub col: u8,
    pub x: f64,
    pub y: f64,
    #[serde(default = "default_one")]
    pub w: f64,
    #[serde(default = "default_one")]
    pub h: f64,
    #[serde(default)]
    pub r: f64,
    #[serde(default)]
    pub rx: f64,
    #[serde(default)]
    pub ry: f64,
    #[serde(default)]
    pub d: bool,
    #[serde(default)]
    pub value: String,
    #[serde(default = "default_alpha")]
    pub color: String,
    #[serde(rename = "optionIndex", default)]
    pub option_index: Option<u8>,
    #[serde(rename = "optionChoice", default)]
    pub option_choice: Option<u8>,
}

fn default_one() -> f64 {
    1.0
}

fn default_alpha() -> String {
    "alpha".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiLedCell {
    pub row: u8,
    pub col: u8,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiLedKeyZone {
    pub id: String,
    pub label: String,
    #[serde(rename = "badgeText", default)]
    pub badge_text: Option<String>,
    #[serde(rename = "switchRow")]
    pub switch_row: u8,
    #[serde(rename = "switchCol")]
    pub switch_col: u8,
    #[serde(rename = "ledCells")]
    pub led_cells: Vec<MultiLedCell>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatrixDim {
    pub rows: u8,
    pub cols: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomKeycodeDef {
    pub name: String,
    #[serde(default)]
    pub title: String,
    #[serde(rename = "shortName", default)]
    pub short_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutsBlock {
    #[serde(default = "default_board_width")]
    pub width: f64,
    #[serde(default = "default_board_height")]
    pub height: f64,
    #[serde(default)]
    pub labels: Vec<Value>,
    #[serde(default)]
    pub keys: Vec<LayoutKey>,
    #[serde(rename = "multiLedKeys", default)]
    pub multi_led_keys: Vec<MultiLedKeyZone>,
}

fn default_board_width() -> f64 {
    20.5
}

fn default_board_height() -> f64 {
    6.25
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandTemplate {
    pub cmd: Vec<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadTemplate {
    pub cmd: Vec<Value>,
    #[serde(rename = "valueIndex")]
    pub value_index: usize,
    #[serde(rename = "fallbackCmd", default)]
    pub fallback_cmd: Option<Vec<Value>>,
    #[serde(rename = "fallbackValueIndex", default)]
    pub fallback_value_index: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColorReadTemplate {
    pub cmd: Vec<Value>,
    #[serde(rename = "hueIndex")]
    pub hue_index: usize,
    #[serde(rename = "satIndex")]
    pub sat_index: usize,
    #[serde(rename = "fallbackCmd", default)]
    pub fallback_cmd: Option<Vec<Value>>,
    #[serde(rename = "fallbackHueIndex", default)]
    pub fallback_hue_index: Option<usize>,
    #[serde(rename = "fallbackSatIndex", default)]
    pub fallback_sat_index: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbEffectDef {
    pub name: String,
    pub id: u8,
    #[serde(default = "default_simulation")]
    pub simulation: String,
    #[serde(default)]
    pub reactive: bool,
}

fn default_simulation() -> String {
    "cycle_all".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerKeyRgbSpec {
    #[serde(rename = "modeId")]
    pub mode_id: u8,
    #[serde(rename = "interPacketDelayMs", default = "default_inter_packet_delay")]
    pub inter_packet_delay_ms: u64,
    pub get: ColorReadTemplate,
    pub set: CommandTemplate,
    #[serde(default)]
    pub save: Option<CommandTemplate>,
}

fn default_inter_packet_delay() -> u64 {
    4
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LightingCapabilitySpec {
    #[serde(rename = "brightnessMax", default = "default_brightness_max")]
    pub brightness_max: u8,
    #[serde(rename = "brightnessStep", default = "default_brightness_step")]
    pub brightness_step: u8,
    #[serde(rename = "speedMin", default = "default_speed_min")]
    pub speed_min: u8,
    #[serde(rename = "speedMax", default = "default_speed_max")]
    pub speed_max: u8,
    #[serde(rename = "speedStep", default = "default_speed_step")]
    pub speed_step: u8,
    #[serde(rename = "getBrightness")]
    pub get_brightness: ReadTemplate,
    #[serde(rename = "setBrightness")]
    pub set_brightness: CommandTemplate,
    #[serde(rename = "getMode")]
    pub get_mode: ReadTemplate,
    #[serde(rename = "setMode")]
    pub set_mode: CommandTemplate,
    #[serde(rename = "getSpeed")]
    pub get_speed: ReadTemplate,
    #[serde(rename = "setSpeed")]
    pub set_speed: CommandTemplate,
    #[serde(rename = "getColor")]
    pub get_color: ColorReadTemplate,
    #[serde(rename = "setColor")]
    pub set_color: CommandTemplate,
    pub save: CommandTemplate,
    #[serde(default)]
    pub effects: Vec<RgbEffectDef>,
    #[serde(rename = "perKeyRgb", default)]
    pub per_key_rgb: Option<PerKeyRgbSpec>,
}

fn default_brightness_max() -> u8 {
    180
}
fn default_brightness_step() -> u8 {
    36
}
fn default_speed_min() -> u8 {
    51
}
fn default_speed_max() -> u8 {
    255
}
fn default_speed_step() -> u8 {
    51
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomControlOption {
    pub label: String,
    pub value: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomControlSpec {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub description: String,
    pub kind: String,
    #[serde(rename = "defaultValue", default)]
    pub default_value: u8,
    #[serde(default)]
    pub options: Vec<CustomControlOption>,
    #[serde(default)]
    pub get: Option<ReadTemplate>,
    pub set: CommandTemplate,
    #[serde(default)]
    pub save: Option<CommandTemplate>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CapabilitiesBlock {
    #[serde(default)]
    pub lighting: Option<LightingCapabilitySpec>,
    #[serde(rename = "customControls", default)]
    pub custom_controls: Vec<CustomControlSpec>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyboardDefinition {
    pub id: String,
    pub name: String,
    #[serde(rename = "vendorId")]
    pub vendor_id: u16,
    #[serde(rename = "productId")]
    pub product_id: u16,
    #[serde(default)]
    pub builtin: bool,
    pub matrix: MatrixDim,
    pub layouts: LayoutsBlock,
    #[serde(rename = "customKeycodes", default)]
    pub custom_keycodes: Vec<CustomKeycodeDef>,
    #[serde(default)]
    pub capabilities: CapabilitiesBlock,
}

#[derive(Debug, Clone, Copy, Default)]
pub struct TemplateVars {
    pub row: u8,
    pub col: u8,
    pub val: u8,
    pub hue: u8,
    pub sat: u8,
    pub hi: u8,
    pub lo: u8,
}

pub fn eval_template_bytes(tokens: &[Value], vars: &TemplateVars) -> Result<(u8, Vec<u8>)> {
    let mut bytes = Vec::with_capacity(tokens.len());
    for token in tokens {
        match token {
            Value::Number(n) => {
                let b = n.as_u64().unwrap_or(0).min(255) as u8;
                bytes.push(b);
            }
            Value::String(s) => {
                let trimmed = s.trim();
                let b = match trimmed {
                    "$row" => vars.row,
                    "$col" => vars.col,
                    "$val" => vars.val,
                    "$hue" => vars.hue,
                    "$sat" => vars.sat,
                    "$hi" => vars.hi,
                    "$lo" => vars.lo,
                    _ if trimmed.starts_with("0x") || trimmed.starts_with("0X") => {
                        u8::from_str_radix(&trimmed[2..], 16).unwrap_or(0)
                    }
                    _ => trimmed.parse::<u8>().unwrap_or(0),
                };
                bytes.push(b);
            }
            _ => bytes.push(0),
        }
    }

    let Some((&cmd, args)) = bytes.split_first() else {
        bail!("Command template cannot be empty");
    };
    Ok((cmd, args.to_vec()))
}

pub fn parse_u16_hex_or_num(val: Option<&Value>, default: u16) -> u16 {
    let Some(v) = val else {
        return default;
    };
    match v {
        Value::Number(n) => (n.as_u64().unwrap_or(default as u64) & 0xFFFF) as u16,
        Value::String(s) => {
            let t = s.trim();
            if let Some(hex) = t.strip_prefix("0x").or_else(|| t.strip_prefix("0X")) {
                u16::from_str_radix(hex, 16).unwrap_or(default)
            } else {
                t.parse::<u16>().unwrap_or(default)
            }
        }
        _ => default,
    }
}

pub fn slugify_id(name: &str, vid: u16, pid: u16) -> String {
    let mut slug = String::new();
    let mut last_dash = false;
    for ch in name.chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch.to_ascii_lowercase());
            last_dash = false;
        } else if !last_dash && !slug.is_empty() {
            slug.push('-');
            last_dash = true;
        }
    }
    let slug = slug.trim_matches('-');
    if slug.is_empty() {
        format!("qmk-{:04x}-{:04x}", vid, pid)
    } else {
        format!("{}-{:04x}-{:04x}", slug, vid, pid)
    }
}

fn classify_kle_color(hex: &str, w: f64, label: &str) -> String {
    let lower = hex.to_ascii_lowercase();
    if lower.contains("00ff")
        || lower.contains("34d3")
        || lower.contains("10b9")
        || lower.contains("f43f")
        || label.eq_ignore_ascii_case("esc")
    {
        return "accent".to_string();
    }
    if lower == "#777777" || lower == "#555555" || lower == "#666666" || w >= 1.5 {
        return "mod".to_string();
    }
    "alpha".to_string()
}

pub fn parse_via_kle_keymap(keymap: &[Value]) -> Vec<LayoutKey> {
    let mut keys = Vec::new();
    let mut curr_x: f64;
    let mut curr_y = 0.0_f64;
    let mut next_w = 1.0_f64;
    let mut next_h = 1.0_f64;
    let mut curr_r = 0.0_f64;
    let mut curr_rx = 0.0_f64;
    let mut curr_ry = 0.0_f64;
    let mut curr_color = "#cccccc".to_string();
    let mut is_decal = false;

    for (row_idx, row_val) in keymap.iter().enumerate() {
        let Some(row_items) = row_val.as_array() else {
            continue;
        };
        if row_idx == 0 {
            curr_x = curr_rx;
            curr_y = curr_ry;
        } else {
            curr_x = curr_rx;
            curr_y += 1.0;
        }

        for item in row_items {
            if let Some(obj) = item.as_object() {
                if let Some(r) = obj.get("r").and_then(|v| v.as_f64()) {
                    curr_r = r;
                }
                if let Some(rx) = obj.get("rx").and_then(|v| v.as_f64()) {
                    curr_rx = rx;
                    curr_x = curr_rx;
                    curr_y = curr_ry;
                }
                if let Some(ry) = obj.get("ry").and_then(|v| v.as_f64()) {
                    curr_ry = ry;
                    curr_x = curr_rx;
                    curr_y = curr_ry;
                }
                if let Some(x) = obj.get("x").and_then(|v| v.as_f64()) {
                    curr_x += x;
                }
                if let Some(y) = obj.get("y").and_then(|v| v.as_f64()) {
                    curr_y += y;
                }
                if let Some(w) = obj.get("w").and_then(|v| v.as_f64()) {
                    next_w = w;
                }
                if let Some(h) = obj.get("h").and_then(|v| v.as_f64()) {
                    next_h = h;
                }
                if let Some(c) = obj.get("c").and_then(|v| v.as_str()) {
                    curr_color = c.to_string();
                }
                if let Some(d) = obj.get("d").and_then(|v| v.as_bool()) {
                    is_decal = d;
                }
            } else if let Some(s) = item.as_str() {
                if !is_decal {
                    let parts: Vec<&str> = s.split('\n').collect();
                    let top_left = parts.first().copied().unwrap_or("").trim();
                    if let Some((r_str, c_str)) = top_left.split_once(',') {
                        if let (Ok(row), Ok(col)) =
                            (r_str.trim().parse::<u8>(), c_str.trim().parse::<u8>())
                        {
                            let mut option_index = None;
                            let mut option_choice = None;
                            if let Some(br) = parts.get(3).map(|p| p.trim()) {
                                if let Some((oi_s, oc_s)) = br.split_once(',') {
                                    if let (Ok(oi), Ok(oc)) =
                                        (oi_s.trim().parse::<u8>(), oc_s.trim().parse::<u8>())
                                    {
                                        option_index = Some(oi);
                                        option_choice = Some(oc);
                                    }
                                }
                            }

                            let mut label = String::new();
                            for &slot in &[9usize, 8, 6, 4, 2, 1, 10, 11] {
                                if let Some(candidate) = parts.get(slot).map(|p| p.trim()) {
                                    if !candidate.is_empty() {
                                        label = candidate.to_string();
                                        break;
                                    }
                                }
                            }
                            if label.is_empty() {
                                label = if row == 0 && col == 0 {
                                    "Esc".to_string()
                                } else if next_w >= 5.5 {
                                    "Space".to_string()
                                } else {
                                    format!("{},{}", row, col)
                                };
                            }

                            keys.push(LayoutKey {
                                row,
                                col,
                                x: (curr_x * 10000.0).round() / 10000.0,
                                y: (curr_y * 10000.0).round() / 10000.0,
                                w: (next_w * 10000.0).round() / 10000.0,
                                h: (next_h * 10000.0).round() / 10000.0,
                                r: curr_r,
                                rx: curr_rx,
                                ry: curr_ry,
                                d: false,
                                value: label.clone(),
                                color: classify_kle_color(&curr_color, next_w, &label),
                                option_index,
                                option_choice,
                            });
                        }
                    }
                }

                curr_x += next_w;
                next_w = 1.0;
                next_h = 1.0;
                is_decal = false;
            }
        }
    }

    keys
}

pub fn standard_via_lighting_spec(channel: u8) -> LightingCapabilitySpec {
    let ch = Value::from(channel);
    LightingCapabilitySpec {
        brightness_max: 255,
        brightness_step: 51,
        speed_min: 0,
        speed_max: 255,
        speed_step: 51,
        get_brightness: ReadTemplate {
            cmd: vec![Value::from(8), ch.clone(), Value::from(1)],
            value_index: 3,
            fallback_cmd: Some(vec![Value::from(2), ch.clone(), Value::from(1)]),
            fallback_value_index: Some(3),
        },
        set_brightness: CommandTemplate {
            cmd: vec![
                Value::from(7),
                ch.clone(),
                Value::from(1),
                Value::from("$val"),
            ],
        },
        get_mode: ReadTemplate {
            cmd: vec![Value::from(2), ch.clone(), Value::from(2)],
            value_index: 3,
            fallback_cmd: Some(vec![Value::from(8), ch.clone(), Value::from(2)]),
            fallback_value_index: Some(3),
        },
        set_mode: CommandTemplate {
            cmd: vec![
                Value::from(7),
                ch.clone(),
                Value::from(2),
                Value::from("$val"),
            ],
        },
        get_speed: ReadTemplate {
            cmd: vec![Value::from(8), ch.clone(), Value::from(3)],
            value_index: 3,
            fallback_cmd: Some(vec![Value::from(2), ch.clone(), Value::from(3)]),
            fallback_value_index: Some(3),
        },
        set_speed: CommandTemplate {
            cmd: vec![
                Value::from(7),
                ch.clone(),
                Value::from(3),
                Value::from("$val"),
            ],
        },
        get_color: ColorReadTemplate {
            cmd: vec![Value::from(2), ch.clone(), Value::from(4)],
            hue_index: 3,
            sat_index: 4,
            fallback_cmd: Some(vec![Value::from(8), ch.clone(), Value::from(4)]),
            fallback_hue_index: Some(3),
            fallback_sat_index: Some(4),
        },
        set_color: CommandTemplate {
            cmd: vec![
                Value::from(7),
                ch.clone(),
                Value::from(4),
                Value::from("$hue"),
                Value::from("$sat"),
            ],
        },
        save: CommandTemplate {
            cmd: vec![Value::from(9), ch],
        },
        effects: vec![
            RgbEffectDef { name: "Solid Color".into(), id: 1, simulation: "solid".into(), reactive: false },
            RgbEffectDef { name: "Alphas Mods".into(), id: 2, simulation: "alphas_mods".into(), reactive: false },
            RgbEffectDef { name: "Gradient Left Right".into(), id: 4, simulation: "gradient_left_right".into(), reactive: false },
            RgbEffectDef { name: "Breathing".into(), id: 5, simulation: "breathing".into(), reactive: false },
            RgbEffectDef { name: "Band Sat".into(), id: 6, simulation: "band_sat".into(), reactive: false },
            RgbEffectDef { name: "Band Val".into(), id: 7, simulation: "band_val".into(), reactive: false },
            RgbEffectDef { name: "Band Pinwheel Val".into(), id: 9, simulation: "band_pinwheel_val".into(), reactive: false },
            RgbEffectDef { name: "Band Spiral Val".into(), id: 11, simulation: "band_spiral_val".into(), reactive: false },
            RgbEffectDef { name: "Cycle All".into(), id: 12, simulation: "cycle_all".into(), reactive: false },
            RgbEffectDef { name: "Cycle Left Right".into(), id: 13, simulation: "cycle_left_right".into(), reactive: false },
            RgbEffectDef { name: "Cycle Up Down".into(), id: 14, simulation: "cycle_up_down".into(), reactive: false },
            RgbEffectDef { name: "Rainbow Moving Chevron".into(), id: 15, simulation: "rainbow_chevron".into(), reactive: false },
            RgbEffectDef { name: "Cycle Out In".into(), id: 16, simulation: "cycle_out_in".into(), reactive: false },
            RgbEffectDef { name: "Cycle Out In Dual".into(), id: 17, simulation: "cycle_out_in_dual".into(), reactive: false },
            RgbEffectDef { name: "Cycle Pinwheel".into(), id: 18, simulation: "cycle_pinwheel".into(), reactive: false },
            RgbEffectDef { name: "Cycle Spiral".into(), id: 19, simulation: "cycle_spiral".into(), reactive: false },
            RgbEffectDef { name: "Dual Beacon".into(), id: 20, simulation: "dual_beacon".into(), reactive: false },
            RgbEffectDef { name: "Rainbow Beacon".into(), id: 21, simulation: "rainbow_beacon".into(), reactive: false },
            RgbEffectDef { name: "Rainbow Pinwheels".into(), id: 22, simulation: "rainbow_pinwheels".into(), reactive: false },
            RgbEffectDef { name: "Raindrops".into(), id: 23, simulation: "raindrops".into(), reactive: false },
            RgbEffectDef { name: "Jellybean Raindrops".into(), id: 24, simulation: "jellybean_raindrops".into(), reactive: false },
            RgbEffectDef { name: "Pixel Flow".into(), id: 29, simulation: "pixel_flow".into(), reactive: false },
            RgbEffectDef { name: "Digital Rain".into(), id: 32, simulation: "digital_rain".into(), reactive: false },
            RgbEffectDef { name: "Solid Reactive Simple".into(), id: 33, simulation: "reactive_simple".into(), reactive: true },
            RgbEffectDef { name: "Solid Reactive Cross".into(), id: 37, simulation: "reactive_cross".into(), reactive: true },
            RgbEffectDef { name: "Splash".into(), id: 41, simulation: "splash".into(), reactive: true },
        ],
        per_key_rgb: None,
    }
}

pub fn parse_via_or_normalized_json(raw_json: &str, builtin: bool) -> Result<KeyboardDefinition> {
    let val: Value =
        serde_json::from_str(raw_json).context("Invalid JSON in keyboard definition")?;
    let Some(obj) = val.as_object() else {
        bail!("Keyboard definition root must be a JSON object");
    };

    let name = obj
        .get("name")
        .and_then(|v| v.as_str())
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or("QMK Keyboard")
        .to_string();

    let mut vendor_id = parse_u16_hex_or_num(obj.get("vendorId"), 0);
    let mut product_id = parse_u16_hex_or_num(obj.get("productId"), 0);
    if vendor_id == 0 && product_id == 0 {
        if let Some(vpid) = obj.get("vendorProductId").and_then(|v| v.as_u64()) {
            vendor_id = ((vpid >> 16) & 0xFFFF) as u16;
            product_id = (vpid & 0xFFFF) as u16;
        }
    }

    let id = obj
        .get("id")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| slugify_id(&name, vendor_id, product_id));

    let matrix_obj = obj.get("matrix").and_then(|v| v.as_object());
    let rows = matrix_obj
        .and_then(|m| m.get("rows"))
        .and_then(|v| v.as_u64())
        .unwrap_or(6)
        .max(1) as u8;
    let cols = matrix_obj
        .and_then(|m| m.get("cols"))
        .and_then(|v| v.as_u64())
        .unwrap_or(21)
        .max(1) as u8;

    let layouts_obj = obj
        .get("layouts")
        .and_then(|v| v.as_object())
        .context("Keyboard definition is missing 'layouts' object")?;

    let labels = layouts_obj
        .get("labels")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let keys: Vec<LayoutKey> = if let Some(keys_val) = layouts_obj.get("keys") {
        serde_json::from_value(keys_val.clone())
            .context("Failed parsing layouts.keys array")?
    } else if let Some(keymap_arr) = layouts_obj.get("keymap").and_then(|v| v.as_array()) {
        parse_via_kle_keymap(keymap_arr)
    } else {
        bail!("Keyboard definition 'layouts' must contain either 'keys' or 'keymap'");
    };

    let mut min_x = f64::INFINITY;
    let mut min_y = f64::INFINITY;
    let mut max_x = 0.0_f64;
    let mut max_y = 0.0_f64;
    for k in &keys {
        if k.d {
            continue;
        }
        if k.x < min_x {
            min_x = k.x;
        }
        if k.y < min_y {
            min_y = k.y;
        }
        if k.x + k.w > max_x {
            max_x = k.x + k.w;
        }
        if k.y + k.h > max_y {
            max_y = k.y + k.h;
        }
    }
    if !min_x.is_finite() {
        min_x = 0.0;
    }
    if !min_y.is_finite() {
        min_y = 0.0;
    }

    let width = layouts_obj
        .get("width")
        .and_then(|v| v.as_f64())
        .filter(|&w| w > 0.0)
        .unwrap_or_else(|| (max_x - min_x).max(1.0));
    let height = layouts_obj
        .get("height")
        .and_then(|v| v.as_f64())
        .filter(|&h| h > 0.0)
        .unwrap_or_else(|| (max_y - min_y).max(1.0));

    let multi_led_keys: Vec<MultiLedKeyZone> = layouts_obj
        .get("multiLedKeys")
        .map(|v| serde_json::from_value(v.clone()).unwrap_or_default())
        .unwrap_or_default();

    let custom_keycodes: Vec<CustomKeycodeDef> = obj
        .get("customKeycodes")
        .map(|v| serde_json::from_value(v.clone()).unwrap_or_default())
        .unwrap_or_default();

    let mut capabilities: CapabilitiesBlock = obj
        .get("capabilities")
        .map(|v| serde_json::from_value(v.clone()).unwrap_or_default())
        .unwrap_or_default();

    if capabilities.lighting.is_none() {
        if let Some(lighting_val) = obj.get("lighting") {
            let is_none = lighting_val
                .as_str()
                .map(|s| s.eq_ignore_ascii_case("none") || s.eq_ignore_ascii_case("false"))
                .unwrap_or(false);
            if !is_none && !lighting_val.is_null() {
                let channel = lighting_val
                    .as_str()
                    .map(|s| if s.to_ascii_lowercase().contains("rgblight") { 2u8 } else { 3u8 })
                    .unwrap_or(3u8);
                capabilities.lighting = Some(standard_via_lighting_spec(channel));
            }
        }
    }

    Ok(KeyboardDefinition {
        id,
        name,
        vendor_id,
        product_id,
        builtin,
        matrix: MatrixDim { rows, cols },
        layouts: LayoutsBlock {
            width,
            height,
            labels,
            keys,
            multi_led_keys,
        },
        custom_keycodes,
        capabilities,
    })
}

pub fn definitions_dir() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("max102-tool")
        .join("definitions")
}

pub fn load_all_definitions() -> Vec<KeyboardDefinition> {
    let mut list = Vec::new();
    if let Ok(weikav) = parse_via_or_normalized_json(WEIKAV_MAX102_JSON, true) {
        list.push(weikav);
    }
    if let Ok(generic) = parse_via_or_normalized_json(GENERIC_104_JSON, true) {
        list.push(generic);
    }

    let dir = definitions_dir();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("json") {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(def) = parse_via_or_normalized_json(&content, false) {
                        if !list.iter().any(|existing| existing.id == def.id) {
                            list.push(def);
                        }
                    }
                }
            }
        }
    }

    list
}

pub fn default_definition() -> KeyboardDefinition {
    parse_via_or_normalized_json(WEIKAV_MAX102_JSON, true)
        .expect("Bundled weikav_max102.json must be valid")
}

pub fn generic_fallback_definition() -> KeyboardDefinition {
    parse_via_or_normalized_json(GENERIC_104_JSON, true)
        .expect("Bundled generic_104.json must be valid")
}

pub fn find_definition_by_id(def_id: &str) -> Option<KeyboardDefinition> {
    load_all_definitions().into_iter().find(|d| d.id == def_id)
}

pub fn find_definition_by_vid_pid(vid: u16, pid: u16) -> Option<KeyboardDefinition> {
    if vid == 0 && pid == 0 {
        return None;
    }
    load_all_definitions()
        .into_iter()
        .find(|d| d.vendor_id == vid && d.product_id == pid)
}

pub fn save_user_definition(raw_json: &str) -> Result<KeyboardDefinition> {
    let def = parse_via_or_normalized_json(raw_json, false)?;
    let dir = definitions_dir();
    fs::create_dir_all(&dir).context("Failed to create definitions directory")?;
    let file_path = dir.join(format!("{}.json", def.id));
    let serialized = serde_json::to_string_pretty(&def)?;
    fs::write(&file_path, serialized)
        .with_context(|| format!("Failed to write definition to {}", file_path.display()))?;
    Ok(def)
}

pub fn remove_user_definition(def_id: &str) -> Result<()> {
    let dir = definitions_dir();
    let file_path = dir.join(format!("{}.json", def_id));
    if file_path.exists() {
        fs::remove_file(&file_path)
            .with_context(|| format!("Failed removing {}", file_path.display()))?;
    }
    Ok(())
}

/// Computes all active LED `(row, col)` coordinates for a definition, expanding any multi-LED switch zones.
pub fn active_led_coordinates(def: &KeyboardDefinition) -> Vec<(u8, u8)> {
    let mut set: HashSet<(u8, u8)> = HashSet::new();
    let mut coords = Vec::new();

    for k in &def.layouts.keys {
        if k.d {
            continue;
        }
        if let Some(zone) = def
            .layouts
            .multi_led_keys
            .iter()
            .find(|z| z.switch_row == k.row && z.switch_col == k.col)
        {
            for cell in &zone.led_cells {
                if set.insert((cell.row, cell.col)) {
                    coords.push((cell.row, cell.col));
                }
            }
        } else if set.insert((k.row, k.col)) {
            coords.push((k.row, k.col));
        }
    }

    coords.sort_by_key(|&(r, c)| (r, c));
    coords
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bundled_definitions_parse() {
        let weikav = default_definition();
        assert_eq!(weikav.id, "weikav-max102");
        assert_eq!(weikav.vendor_id, 0x342D);
        assert_eq!(weikav.product_id, 0xE537);
        assert_eq!(weikav.matrix.rows, 6);
        assert_eq!(weikav.matrix.cols, 19);
        assert_eq!(weikav.layouts.keys.len(), 101);
        assert_eq!(weikav.layouts.multi_led_keys.len(), 1);
        assert_eq!(active_led_coordinates(&weikav).len(), 105);

        let generic = generic_fallback_definition();
        assert_eq!(generic.id, "generic-qmk-104");
        assert_eq!(generic.matrix.rows, 6);
        assert_eq!(generic.matrix.cols, 21);
        assert!(generic.capabilities.lighting.is_some());
    }

    #[test]
    fn test_standard_via_kle_json_parses() {
        let via_json = r##"{
            "name": "Test 60% Board",
            "vendorId": "0xFEED",
            "productId": "0x6060",
            "lighting": "qmk_rgb_matrix",
            "matrix": { "rows": 5, "cols": 14 },
            "layouts": {
                "labels": ["Split Backspace"],
                "keymap": [
                    [
                        {"c": "#777777"},
                        "0,0\n\n\n\n\n\n\n\n\nEsc",
                        {"c": "#cccccc"},
                        "0,1\n\n\n\n\n\n\n\n\n1!",
                        {"w": 2},
                        "0,13\n\n\n0,0\n\n\n\n\n\nBksp"
                    ]
                ]
            }
        }"##;
        let def = parse_via_or_normalized_json(via_json, false).unwrap();
        assert_eq!(def.vendor_id, 0xFEED);
        assert_eq!(def.product_id, 0x6060);
        assert_eq!(def.layouts.keys.len(), 3);
        assert_eq!(def.layouts.keys[0].value, "Esc");
        assert_eq!(def.layouts.keys[2].w, 2.0);
        assert_eq!(def.layouts.keys[2].option_index, Some(0));
        assert_eq!(def.layouts.keys[2].option_choice, Some(0));
    }

    #[test]
    fn test_template_eval() {
        let vars = TemplateVars {
            row: 5,
            col: 6,
            val: 180,
            hue: 120,
            sat: 255,
            hi: 0,
            lo: 0,
        };
        let tokens = vec![
            Value::from(7),
            Value::from(0),
            Value::from(3),
            Value::from(0),
            Value::from("$row"),
            Value::from("$col"),
            Value::from("$sat"),
            Value::from("$hue"),
        ];
        let (cmd, args) = eval_template_bytes(&tokens, &vars).unwrap();
        assert_eq!(cmd, 7);
        assert_eq!(args, vec![0, 3, 0, 5, 6, 255, 120]);
    }
}
