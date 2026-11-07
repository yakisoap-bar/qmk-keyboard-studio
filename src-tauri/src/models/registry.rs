use anyhow::{bail, Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

const MAX102_VIA_JSON: &str = include_str!("../../../src/data/definitions/max102.json");

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
    pub width: f64,
    pub height: f64,
    #[serde(default)]
    pub labels: Vec<Value>,
    #[serde(default)]
    pub keys: Vec<LayoutKey>,
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
    pub source: Value,
    #[serde(rename = "viaLighting", default)]
    pub via_lighting: Vec<ViaLightingControl>,
}

/// Normalized byte-valued VIA lighting menu control.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViaLightingControl {
    pub id: String,
    pub label: String,
    pub group: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub channel: u8,
    pub value: u8,
    #[serde(default)]
    pub arguments: Vec<u8>,
    #[serde(default)]
    pub options: Vec<Value>,
    #[serde(rename = "showIf", default, skip_serializing_if = "Option::is_none")]
    pub show_if: Option<String>,
}

impl ViaLightingControl {
    pub fn byte_count(&self) -> usize {
        if self.kind == "color" {
            2
        } else {
            1
        }
    }
    pub fn validate(&self, bytes: &[u8]) -> Result<()> {
        if bytes.len() != self.byte_count() {
            bail!("Incorrect lighting value length");
        }
        let v = bytes[0] as u64;
        let valid = match self.kind.as_str() {
            "color" => true,
            "range" => {
                let lo = self.options.first().and_then(Value::as_u64).unwrap_or(0);
                let hi = self.options.get(1).and_then(Value::as_u64).unwrap_or(255);
                v >= lo && v <= hi
            }
            "toggle" => {
                let lo = self.options.first().and_then(Value::as_u64).unwrap_or(0);
                let hi = self.options.get(1).and_then(Value::as_u64).unwrap_or(1);
                v == lo || v == hi
            }
            "dropdown" => self.options.iter().enumerate().any(|(i, o)| {
                if o.is_string() {
                    v == i as u64
                } else {
                    o.get(1).and_then(Value::as_u64) == Some(v)
                }
            }),
            _ => false,
        };
        if !valid {
            bail!("Lighting value is outside the declared options");
        }
        Ok(())
    }
}

fn parse_via_lighting(obj: &serde_json::Map<String, Value>) -> Vec<ViaLightingControl> {
    let builtins: Value =
        serde_json::from_str(include_str!("../../../src/data/viaLightingMenus.json")).unwrap();
    let menus = if let Some(menus) = obj.get("menus").and_then(Value::as_array) {
        menus.clone()
    } else {
        let lighting = obj.get("lighting").unwrap_or(&Value::Null);
        let name = lighting
            .as_str()
            .or_else(|| lighting.get("extends").and_then(Value::as_str))
            .unwrap_or("");
        let mut menu = builtins.get(name).cloned().unwrap_or(Value::Null);
        if let Some(effects) = lighting.get("underglowEffects").and_then(Value::as_array) {
            if let Some(groups) = menu.get_mut("content").and_then(Value::as_array_mut) {
                for group in groups {
                    if let Some(controls) = group.get_mut("content").and_then(Value::as_array_mut) {
                        for control in controls {
                            if control["type"] == "dropdown" && control["content"][1] == 2 {
                                control["options"] = Value::Array(
                                    effects
                                        .iter()
                                        .map(|e| {
                                            if e.is_array() {
                                                e[0].clone()
                                            } else {
                                                e.clone()
                                            }
                                        })
                                        .collect(),
                                );
                            }
                        }
                    }
                }
            }
        }
        vec![menu]
    };
    fn walk(node: &Value, group: &str, conditions: &[String], out: &mut Vec<ViaLightingControl>) {
        let mut conditions = conditions.to_vec();
        if let Some(c) = node.get("showIf").and_then(Value::as_str) {
            conditions.push(c.to_owned());
        }
        if let Some(kind) = node.get("type").and_then(Value::as_str) {
            if !["range", "dropdown", "toggle", "color"].contains(&kind) {
                return;
            }
            let Some(content) = node.get("content").and_then(Value::as_array) else {
                return;
            };
            if content.len() < 3 || content.len() > 29 {
                return;
            }
            let Some(id) = content[0].as_str() else {
                return;
            };
            let Some(bytes) = content[1..]
                .iter()
                .map(|v| v.as_u64().filter(|v| *v <= 255).map(|v| v as u8))
                .collect::<Option<Vec<_>>>()
            else {
                return;
            };
            if out.iter().any(|c| c.id == id) {
                return;
            }
            let options = node
                .get("options")
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
            // Two-byte numeric controls are not supported by this lighting UI.
            if kind != "color"
                && options.iter().any(|v| {
                    v.as_u64()
                        .or_else(|| v.get(1).and_then(Value::as_u64))
                        .map(|v| v > 255)
                        .unwrap_or(false)
                })
            {
                return;
            }
            out.push(ViaLightingControl {
                id: id.into(),
                label: node
                    .get("label")
                    .and_then(Value::as_str)
                    .unwrap_or(id)
                    .into(),
                group: group.into(),
                kind: kind.into(),
                channel: bytes[0],
                value: bytes[1],
                arguments: bytes[2..].to_vec(),
                options,
                show_if: if conditions.is_empty() {
                    None
                } else {
                    Some(
                        conditions
                            .iter()
                            .map(|c| format!("({})", c))
                            .collect::<Vec<_>>()
                            .join(" && "),
                    )
                },
            });
        } else if let Some(children) = node.get("content").and_then(Value::as_array) {
            let group = node.get("label").and_then(Value::as_str).unwrap_or(group);
            for child in children {
                walk(child, group, &conditions, out);
            }
        }
    }
    let mut result = Vec::new();
    for entry in &menus {
        let menu = entry
            .as_str()
            .and_then(|s| builtins.get(s))
            .unwrap_or(entry);
        let label = menu
            .get("label")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_lowercase();
        if label.contains("light") || label.contains("rgb") {
            walk(menu, "Lighting", &[], &mut result);
        }
    }
    result
}

fn parse_unsigned(value: Option<&Value>, max: u64) -> Result<u64> {
    let Some(value) = value else {
        return Ok(0);
    };
    let number = match value {
        Value::Number(n) => n
            .as_u64()
            .context("VIA USB IDs must be unsigned integers")?,
        Value::String(s) => {
            let s = s.trim();
            if let Some(hex) = s.strip_prefix("0x").or_else(|| s.strip_prefix("0X")) {
                u64::from_str_radix(hex, 16).context("Invalid hexadecimal VIA USB ID")?
            } else {
                s.parse::<u64>().context("Invalid VIA USB ID")?
            }
        }
        _ => bail!("Invalid VIA USB ID"),
    };
    if number > max {
        bail!("VIA USB ID is outside the allowed range");
    }
    Ok(number)
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

pub fn parse_via_definition(raw_json: &str, builtin: bool) -> Result<KeyboardDefinition> {
    let val: Value =
        serde_json::from_str(raw_json).context("Invalid JSON in keyboard definition")?;
    let Some(obj) = val.as_object() else {
        bail!("Keyboard definition root must be a JSON object");
    };

    let name = obj
        .get("name")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .context("VIA definition requires a name")?
        .to_owned();
    if obj.contains_key("capabilities") || obj.contains_key("viaLighting") {
        bail!("Only VIA JSON keyboard definitions are supported");
    }

    let mut vendor_id = parse_unsigned(obj.get("vendorId"), 65535)? as u16;
    let mut product_id = parse_unsigned(obj.get("productId"), 65535)? as u16;
    if vendor_id == 0 && product_id == 0 && obj.contains_key("vendorProductId") {
        let packed = parse_unsigned(obj.get("vendorProductId"), u32::MAX as u64)?;
        vendor_id = (packed >> 16) as u16;
        product_id = (packed & 0xffff) as u16;
    }

    let id = slugify_id(&name, vendor_id, product_id);
    let matrix_obj = obj
        .get("matrix")
        .and_then(Value::as_object)
        .context("VIA definition requires a matrix")?;
    let dimension = |key: &str| -> Result<u8> {
        let value = matrix_obj
            .get(key)
            .and_then(Value::as_u64)
            .filter(|v| *v > 0 && *v <= 255)
            .with_context(|| format!("VIA matrix {} must be an integer from 1 to 255", key))?;
        Ok(value as u8)
    };
    let rows = dimension("rows")?;
    let cols = dimension("cols")?;

    let layouts_obj = obj
        .get("layouts")
        .and_then(|v| v.as_object())
        .context("Keyboard definition is missing 'layouts' object")?;

    let labels = layouts_obj
        .get("labels")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    if layouts_obj.contains_key("keys") || layouts_obj.contains_key("multiLedKeys") {
        bail!("Only VIA layouts.keymap is supported");
    }
    let keymap = layouts_obj
        .get("keymap")
        .and_then(Value::as_array)
        .context("VIA definition requires layouts.keymap")?;
    let keys = parse_via_kle_keymap(keymap);
    if keys.is_empty() || keys.iter().any(|k| k.row >= rows || k.col >= cols) {
        bail!("VIA layout must contain valid coordinates within the matrix");
    }

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

    let width = (max_x - min_x).max(1.0);
    let height = (max_y - min_y).max(1.0);

    let custom_keycodes: Vec<CustomKeycodeDef> = obj
        .get("customKeycodes")
        .map(|v| serde_json::from_value(v.clone()).unwrap_or_default())
        .unwrap_or_default();

    let via_lighting = parse_via_lighting(obj);

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
        },
        custom_keycodes,
        source: val.clone(),
        via_lighting,
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
    list.push(default_definition());

    let dir = definitions_dir();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("json") {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(def) = parse_via_definition(&content, false) {
                        if let Some(index) = list.iter().position(|existing| existing.id == def.id)
                        {
                            list[index] = def;
                        } else {
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
    parse_via_definition(MAX102_VIA_JSON, true).expect("Bundled MAX102 VIA JSON must be valid")
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
    let def = parse_via_definition(raw_json, false)?;
    let dir = definitions_dir();
    fs::create_dir_all(&dir).context("Failed to create definitions directory")?;
    let file_path = dir.join(format!("{}.json", def.id));
    let serialized = serde_json::to_string_pretty(&def.source)?;
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn sample() -> Value {
        json!({"name":"Test VIA", "vendorId":"0xFEED", "productId":"0x6060",
            "matrix":{"rows":1,"cols":2}, "layouts":{"keymap":[["0,0","0,1"]]},
            "menus":["qmk_rgb_matrix"]})
    }

    #[test]
    fn bundled_max102_is_original_via_source() {
        let def = default_definition();
        assert_eq!(def.id, "max102-342d-e537");
        assert_eq!((def.vendor_id, def.product_id), (0x342d, 0xe537));
        assert_eq!((def.matrix.rows, def.matrix.cols), (6, 19));
        assert_eq!(def.layouts.keys.len(), 101);
        assert_eq!(def.via_lighting.len(), 4);
        assert_eq!(def.custom_keycodes[0].short_name, "DEV BT1");
        assert_eq!(
            def.source,
            serde_json::from_str::<Value>(MAX102_VIA_JSON).unwrap()
        );
    }

    #[test]
    fn persistence_roundtrip_keeps_raw_via_not_internal_shape() {
        let raw = sample();
        let def = parse_via_definition(&raw.to_string(), false).unwrap();
        let saved = serde_json::to_string(&def.source).unwrap();
        let reloaded = parse_via_definition(&saved, false).unwrap();
        assert_eq!(reloaded.id, def.id);
        assert_eq!(reloaded.source, raw);
        assert_eq!(reloaded.via_lighting[1].options.len(), 45);
        assert!(parse_via_definition(&serde_json::to_string(&def).unwrap(), false).is_err());
    }

    #[test]
    fn rejects_custom_definitions_and_invalid_matrix_coordinates() {
        let mut custom = sample();
        custom["capabilities"] = json!({"lighting":{}});
        assert!(parse_via_definition(&custom.to_string(), false).is_err());
        custom = sample();
        custom["layouts"] = json!({"keys":[]});
        assert!(parse_via_definition(&custom.to_string(), false).is_err());
        for rows in [json!(0), json!(-1), json!(256), json!(1.5)] {
            let mut invalid = sample();
            invalid["matrix"]["rows"] = rows;
            assert!(parse_via_definition(&invalid.to_string(), false).is_err());
        }
        for id in [
            json!(65536),
            json!(-1),
            json!(1.5),
            json!("0x10000"),
            json!("invalid"),
        ] {
            let mut invalid = sample();
            invalid["vendorId"] = id;
            assert!(parse_via_definition(&invalid.to_string(), false).is_err());
        }
        let mut invalid = sample();
        invalid["matrix"]["cols"] = json!(1);
        assert!(parse_via_definition(&invalid.to_string(), false).is_err());
    }

    #[test]
    fn preserves_custom_effect_ids_addressing_and_conditions() {
        let mut raw = sample();
        raw["menus"] = json!([{"label":"Lighting","content":[{"label":"Logo","content":[
            {"label":"Mode","type":"dropdown","content":["mode",0,12,4],"options":[["Off",0],["Pulse",73]]},
            {"label":"Color","type":"color","content":["color",0,13],"showIf":"{mode} == 73"}
        ]}]}]);
        let def = parse_via_definition(&raw.to_string(), false).unwrap();
        assert_eq!(def.via_lighting[0].arguments, vec![4]);
        assert!(def.via_lighting[0].validate(&[73]).is_ok());
        assert!(def.via_lighting[0].validate(&[1]).is_err());
        assert!(def.via_lighting[1].validate(&[0, 0]).is_ok());
        assert!(def.via_lighting[1].validate(&[0]).is_err());
        assert_eq!(
            def.via_lighting[1].show_if.as_deref(),
            Some("({mode} == 73)")
        );
    }

    #[test]
    fn via_v2_lighting_and_physical_options_parse() {
        let mut raw = sample();
        raw.as_object_mut().unwrap().remove("menus");
        raw["lighting"] = json!({"extends":"qmk_rgblight","underglowEffects":[["Off",0],["Solid",1],["Custom",1]]});
        raw["layouts"] = json!({"labels":["Split"],"keymap":[["0,0\n\n\n0,0","0,1\n\n\n0,1"]]});
        let def = parse_via_definition(&raw.to_string(), false).unwrap();
        assert_eq!(def.via_lighting[1].channel, 2);
        assert!(def.via_lighting[1].validate(&[2]).is_ok());
        assert!(def.via_lighting[1].validate(&[3]).is_err());
        assert_eq!(def.layouts.keys[1].option_choice, Some(1));
        assert_eq!(def.layouts.labels.len(), 1);
    }
}
