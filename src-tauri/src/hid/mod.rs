pub mod macros;
pub mod protocol;
pub mod queue;

use crate::hid::protocol::ViaProtocol;
use crate::models::layout::{DEFAULT_LAYERS, RAW_HID_USAGE, RAW_HID_USAGE_PAGE};
use crate::models::profile::{KeyboardProfile, MacroSlot};
use crate::models::registry::{load_all_definitions, KeyboardDefinition};
use anyhow::{bail, Context, Result};
use hidapi::HidApi;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedQmkDevice {
    #[serde(rename = "vendorId")]
    pub vendor_id: u16,
    #[serde(rename = "productId")]
    pub product_id: u16,
    #[serde(rename = "productName")]
    pub product_name: String,
    #[serde(rename = "hidrawPath")]
    pub hidraw_path: Option<String>,
    #[serde(rename = "matchedDefinitionId")]
    pub matched_definition_id: Option<String>,
    #[serde(rename = "isUnknownDevice")]
    pub is_unknown_device: bool,
    #[serde(rename = "permissionDenied")]
    pub permission_denied: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionDiagnostics {
    pub connected: bool,
    pub usb_detected: bool,
    pub permission_denied: bool,
    pub hidraw_path: Option<String>,
    pub product_name: String,
    pub vendor_id: u16,
    pub product_id: u16,
    pub definition_id: String,
    pub is_unknown_device: bool,
    pub protocol_version: u16,
    pub layers_count: u8,
    pub message: String,
}

pub fn generate_linux_udev_rule(vid: u16, pid: u16, product_name: &str) -> String {
    if vid != 0 && pid != 0 {
        format!(
            "# {} (VID 0x{:04x}, PID 0x{:04x}) — QMK / VIA Raw HID\n\
             KERNEL==\"hidraw*\", ATTRS{{idVendor}}==\"{:04x}\", ATTRS{{idProduct}}==\"{:04x}\", GROUP=\"plugdev\", MODE=\"0666\", TAG+=\"uaccess\"\n\
             SUBSYSTEM==\"usb\", ATTR{{idVendor}}==\"{:04x}\", ATTR{{idProduct}}==\"{:04x}\", GROUP=\"plugdev\", MODE=\"0666\", TAG+=\"uaccess\"\n",
            product_name, vid, pid, vid, pid, vid, pid
        )
    } else {
        "# QMK / VIA Raw HID Keyboards\n\
         KERNEL==\"hidraw*\", SUBSYSTEM==\"hidraw\", GROUP=\"plugdev\", MODE=\"0666\", TAG+=\"uaccess\"\n"
            .to_string()
    }
}

#[cfg(target_os = "linux")]
fn parse_uevent_vid_pid_name(uevent: &str) -> Option<(u16, u16, String)> {
    let mut vid = 0u16;
    let mut pid = 0u16;
    let mut name = "QMK Keyboard".to_string();

    for line in uevent.lines() {
        if let Some(rest) = line.strip_prefix("HID_ID=") {
            // Format: BUS:0000VID:0000PID
            let parts: Vec<&str> = rest.trim().split(':').collect();
            if parts.len() == 3 {
                vid = u16::from_str_radix(parts[1].trim_start_matches('0'), 16).unwrap_or(0);
                pid = u16::from_str_radix(parts[2].trim_start_matches('0'), 16).unwrap_or(0);
            }
        } else if let Some(rest) = line.strip_prefix("HID_NAME=") {
            let trimmed = rest.trim();
            if !trimmed.is_empty() {
                name = trimmed.to_string();
            }
        }
    }

    if vid != 0 || pid != 0 {
        Some((vid, pid, name))
    } else {
        None
    }
}

/// Scans `/sys/class/hidraw` on Linux for any HID interface whose report descriptor starts with
/// Usage Page `0xFF60` (`06 60 ff`) and Usage `0x61` (`09 61`), even when `/dev/hidraw*` lacks permissions.
#[cfg(target_os = "linux")]
pub fn scan_linux_sysfs_qmk_hidraw() -> Vec<(u16, u16, String, String, bool)> {
    let mut results = Vec::new();
    let Ok(entries) = fs::read_dir("/sys/class/hidraw") else {
        return results;
    };

    for entry in entries.flatten() {
        let node_name = entry.file_name().to_string_lossy().to_string();
        let desc_path = entry.path().join("device/report_descriptor");
        let Ok(desc) = fs::read(&desc_path) else {
            continue;
        };
        // Check for Usage Page 0xFF60 (06 60 ff), Usage 0x61 (09 61)
        if desc.len() >= 5 && desc[0..5] == [0x06, 0x60, 0xFF, 0x09, 0x61] {
            let uevent_path = entry.path().join("device/uevent");
            if let Ok(uevent) = fs::read_to_string(&uevent_path) {
                if let Some((vid, pid, product_name)) = parse_uevent_vid_pid_name(&uevent) {
                    let dev_path = format!("/dev/{}", node_name);
                    let rw_ok = fs::OpenOptions::new()
                        .read(true)
                        .write(true)
                        .open(&dev_path)
                        .is_ok();
                    results.push((vid, pid, product_name, dev_path, !rw_ok));
                }
            }
        }
    }

    results
}

#[cfg(not(target_os = "linux"))]
pub fn scan_linux_sysfs_qmk_hidraw() -> Vec<(u16, u16, String, String, bool)> {
    Vec::new()
}

/// Discovers all connected QMK/VIA keyboards exposing Usage Page `0xFF60` and Usage `0x0061`
/// and matches them against the loaded `KeyboardDefinition` registry.
pub fn scan_qmk_devices() -> Vec<DetectedQmkDevice> {
    let defs = load_all_definitions();
    let mut detected: Vec<DetectedQmkDevice> = Vec::new();

    // 1. Scan Linux sysfs first (catches devices even when /dev/hidraw* has permission_denied)
    for (vid, pid, product_name, dev_path, perm_denied) in scan_linux_sysfs_qmk_hidraw() {
        let matched = defs
            .iter()
            .find(|d| d.vendor_id == vid && d.product_id == pid && (vid != 0 || pid != 0));
        detected.push(DetectedQmkDevice {
            vendor_id: vid,
            product_id: pid,
            product_name: matched.map(|m| m.name.clone()).unwrap_or(product_name),
            hidraw_path: Some(dev_path),
            matched_definition_id: matched.map(|m| m.id.clone()),
            is_unknown_device: matched.is_none(),
            permission_denied: perm_denied,
        });
    }

    // 2. Scan via cross-platform hidapi
    if let Ok(api) = HidApi::new() {
        for info in api.device_list() {
            if info.usage_page() == RAW_HID_USAGE_PAGE && info.usage() == RAW_HID_USAGE {
                let vid = info.vendor_id();
                let pid = info.product_id();
                if detected
                    .iter()
                    .any(|d| d.vendor_id == vid && d.product_id == pid)
                {
                    continue;
                }
                let matched = defs
                    .iter()
                    .find(|d| d.vendor_id == vid && d.product_id == pid && (vid != 0 || pid != 0));
                let prod_name = info
                    .product_string()
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.to_string())
                    .or_else(|| matched.map(|m| m.name.clone()))
                    .unwrap_or_else(|| format!("QMK Keyboard ({:04X}:{:04X})", vid, pid));
                let path_str = info.path().to_string_lossy().to_string();
                let perm_denied = info.open_device(&api).is_err();

                detected.push(DetectedQmkDevice {
                    vendor_id: vid,
                    product_id: pid,
                    product_name: prod_name,
                    hidraw_path: Some(path_str),
                    matched_definition_id: matched.map(|m| m.id.clone()),
                    is_unknown_device: matched.is_none(),
                    permission_denied: perm_denied,
                });
            }
        }
    }

    detected
}

/// Opens a QMK/VIA Raw HID keyboard (`0xFF60:0x0061`).
/// If `target_vid` and `target_pid` are provided and non-zero, connects specifically to that USB device;
/// otherwise connects to the first available QMK Raw HID keyboard.
pub fn open_qmk_device(target_vid: Option<u16>, target_pid: Option<u16>) -> Result<ViaProtocol> {
    let api = HidApi::new().context("Failed to initialize hidapi")?;
    let filter_vid_pid = match (target_vid, target_pid) {
        (Some(v), Some(p)) if v != 0 || p != 0 => Some((v, p)),
        _ => None,
    };

    // 1. Standard UsagePage 0xFF60 + Usage 0x61 match via hidapi
    for info in api.device_list() {
        let vid_pid_ok = filter_vid_pid
            .map(|(v, p)| info.vendor_id() == v && info.product_id() == p)
            .unwrap_or(true);
        if vid_pid_ok && info.usage_page() == RAW_HID_USAGE_PAGE && info.usage() == RAW_HID_USAGE {
            let dev = info.open_device(&api).with_context(|| {
                format!("Failed to open QMK Raw HID interface at {:?}", info.path())
            })?;
            let product_name = info
                .product_string()
                .filter(|s| !s.trim().is_empty())
                .unwrap_or("QMK Keyboard")
                .to_string();
            return Ok(ViaProtocol::new(
                dev,
                info.path().to_string_lossy().to_string(),
                product_name,
                info.vendor_id(),
                info.product_id(),
            ));
        }
    }

    // 2. Fallback on Linux: inspect sysfs /sys/class/hidraw for UsagePage 0xFF60
    for (vid, pid, product_name, dev_path, perm_denied) in scan_linux_sysfs_qmk_hidraw() {
        let vid_pid_ok = filter_vid_pid
            .map(|(v, p)| vid == v && pid == p)
            .unwrap_or(true);
        if !vid_pid_ok {
            continue;
        }
        if perm_denied {
            bail!(
                "Permission denied opening {} ({:04X}:{:04X}). Install the Linux udev rule to grant non-root access.",
                dev_path,
                vid,
                pid
            );
        }
        for info in api.device_list() {
            if info.vendor_id() == vid
                && info.product_id() == pid
                && info.path().to_string_lossy() == dev_path.as_str()
            {
                let dev = info.open_device(&api)?;
                return Ok(ViaProtocol::new(
                    dev,
                    dev_path,
                    info.product_string()
                        .filter(|s| !s.trim().is_empty())
                        .unwrap_or(&product_name)
                        .to_string(),
                    vid,
                    pid,
                ));
            }
        }
    }

    // 3. Secondary fallback when explicit VID:PID is known: interface 1
    if let Some((v, p)) = filter_vid_pid {
        for info in api.device_list() {
            if info.vendor_id() == v && info.product_id() == p && info.interface_number() == 1 {
                let dev = info.open_device(&api)?;
                return Ok(ViaProtocol::new(
                    dev,
                    info.path().to_string_lossy().to_string(),
                    info.product_string()
                        .filter(|s| !s.trim().is_empty())
                        .unwrap_or("QMK Keyboard")
                        .to_string(),
                    v,
                    p,
                ));
            }
        }
        bail!(
            "QMK Keyboard ({:04X}:{:04X}) not found or not connected over USB",
            v,
            p
        );
    }

    bail!("No QMK/VIA compatible keyboard (Usage Page 0xFF60) detected over USB")
}

/// Installs the Linux udev rule for the given `vid:pid` (and all QMK `0xFF60` raw HID devices) using `pkexec`.
pub fn install_linux_udev_rules_pkexec(vid: u16, pid: u16, product_name: &str) -> Result<String> {
    #[cfg(not(target_os = "linux"))]
    {
        let _ = (vid, pid, product_name);
        bail!("udev rules are only applicable on Linux");
    }

    #[cfg(target_os = "linux")]
    {
        let rule_content = generate_linux_udev_rule(vid, pid, product_name);
        let script = format!(
            "printf '{}' > /etc/udev/rules.d/69-qmk-via-studio.rules && \
             cp /etc/udev/rules.d/69-qmk-via-studio.rules /etc/udev/rules.d/99-qmk-via-studio.rules && \
             udevadm control --reload-rules && \
             udevadm trigger --subsystem-match=hidraw --subsystem-match=usb && \
             for d in /sys/class/hidraw/hidraw*; do \
               if [ -f \"$d/device/report_descriptor\" ]; then \
                 chmod 0666 \"/dev/$(basename \"$d\")\" 2>/dev/null || true; \
               fi; \
             done",
            rule_content.replace('\n', "\\n")
        );

        let status = Command::new("pkexec")
            .arg("sh")
            .arg("-c")
            .arg(&script)
            .status()
            .context("Failed to launch pkexec")?;

        if !status.success() {
            bail!("pkexec exited with status {}", status);
        }

        Ok(
            "Installed /etc/udev/rules.d/69-qmk-via-studio.rules and unlocked /dev/hidraw* permissions."
                .to_string(),
        )
    }
}

/// Reads the complete state of the connected keyboard into a `KeyboardProfile` using `def`.
pub fn read_full_profile_from_device(
    proto: &ViaProtocol,
    def: &KeyboardDefinition,
    profile_name: &str,
) -> Result<KeyboardProfile> {
    let rows = def.matrix.rows;
    let cols = def.matrix.cols;
    let protocol_version = proto.get_protocol_version().unwrap_or(11);
    let layers_count = proto
        .get_layer_count(protocol_version)
        .unwrap_or(DEFAULT_LAYERS);
    let layout_options = proto.get_layout_options().unwrap_or(0);
    let layers = proto.read_all_layers(layers_count, rows, cols)?;
    let macros = proto.read_macros().unwrap_or_else(|_| {
        (0..16)
            .map(|i| MacroSlot {
                index: i,
                name: format!("M{}", i),
                steps: Vec::new(),
            })
            .collect()
    });
    Ok(KeyboardProfile {
        schema_version: 2,
        name: profile_name.to_string(),
        device_name: def.name.clone(),
        definition_id: def.id.clone(),
        vendor_id: proto.vendor_id,
        product_id: proto.product_id,
        protocol_version,
        layers_count,
        rows,
        cols,
        layout_options,
        layers,
        macros,
        via_lighting_values: def
            .via_lighting
            .iter()
            .filter_map(|ctrl| {
                proto
                    .get_via_lighting(ctrl)
                    .ok()
                    .map(|v| (ctrl.id.clone(), v))
            })
            .collect(),
    })
}

/// Applies a complete `KeyboardProfile` to the connected keyboard using `def`.
pub fn apply_full_profile_to_device(
    proto: &ViaProtocol,
    def: &KeyboardDefinition,
    profile: &KeyboardProfile,
) -> Result<()> {
    if !profile.layers.is_empty() {
        proto.write_all_layers(&profile.layers)?;
    }

    if !def.layouts.labels.is_empty() {
        let _ = proto.set_layout_options(profile.layout_options);
    }

    let mut channels = HashSet::new();
    for ctrl in &def.via_lighting {
        if let Some(value) = profile.via_lighting_values.get(&ctrl.id) {
            proto.set_via_lighting(ctrl, value, false)?;
            channels.insert(ctrl.channel);
        }
    }
    for channel in channels {
        let response = proto.hid_command(0x09, &[channel])?;
        if response[0] != 0x09 {
            anyhow::bail!("Firmware rejected lighting save");
        }
    }

    if !profile.macros.is_empty() {
        let _ = proto.write_macros(&profile.macros);
    }

    Ok(())
}

/// Generates a default offline `KeyboardProfile` for editing when unplugged based on `def`.
pub fn default_offline_profile(def: &KeyboardDefinition) -> KeyboardProfile {
    let rows = def.matrix.rows;
    let cols = def.matrix.cols;
    let cells = (rows as usize) * (cols as usize);
    let mut layer0 = vec![0u16; cells];

    // Populate default QWERTY keycodes on Layer 0 based on layout labels
    let numpad_start_x = (def.layouts.width - 4.5).max(14.5);
    for k in &def.layouts.keys {
        if k.d {
            continue;
        }
        if let (Some(_), Some(choice)) = (k.option_index, k.option_choice) {
            if choice != 0 {
                continue;
            }
        }
        let idx = (k.row as usize) * (cols as usize) + (k.col as usize);
        if idx < cells && layer0[idx] == 0 {
            let is_numpad = k.x >= numpad_start_x;
            layer0[idx] = default_keycode_for_label(&k.value, is_numpad);
        }
    }

    let layer_trns = vec![1u16; cells]; // KC_TRNS
    let layers = vec![layer0, layer_trns.clone(), layer_trns.clone(), layer_trns];

    let macros = (0..16)
        .map(|i| MacroSlot {
            index: i,
            name: format!("M{}", i),
            steps: Vec::new(),
        })
        .collect();

    KeyboardProfile {
        schema_version: 2,
        name: "Default Profile".to_string(),
        device_name: format!("{} (Offline)", def.name),
        definition_id: def.id.clone(),
        vendor_id: def.vendor_id,
        product_id: def.product_id,
        protocol_version: 11,
        layers_count: DEFAULT_LAYERS,
        rows,
        cols,
        layout_options: 0,
        layers,
        macros,
        via_lighting_values: HashMap::new(),
    }
}

fn default_keycode_for_label(label: &str, is_numpad: bool) -> u16 {
    let trimmed = label.trim();
    if is_numpad {
        match trimmed {
            "N.Lck" | "Num" | "NumLock" | "NLk" => return 83,
            "/" | "÷" => return 84,
            "*" | "X" | "x" => return 85,
            "-" => return 86,
            "+" => return 87,
            "N.Ent" | "Enter" | "NEnt" => return 88,
            "1" => return 89,
            "2" => return 90,
            "3" => return 91,
            "4" => return 92,
            "5" => return 93,
            "6" => return 94,
            "7" => return 95,
            "8" => return 96,
            "9" => return 97,
            "0" => return 98,
            "." => return 99,
            _ => {}
        }
    }
    match trimmed {
        "Esc" | "ESC" => 41,
        "F1" => 58,
        "F2" => 59,
        "F3" => 60,
        "F4" => 61,
        "F5" => 62,
        "F6" => 63,
        "F7" => 64,
        "F8" => 65,
        "F9" => 66,
        "F10" => 67,
        "F11" => 68,
        "F12" => 69,
        "Print" | "PrtSc" => 70,
        "Scroll" | "ScrLk" => 71,
        "Pause" => 72,
        "Ins" | "Insert" => 73,
        "Del" | "Delete" => 76,
        "Home" => 74,
        "End" => 77,
        "PgUp" => 75,
        "PgDn" => 78,
        "`" | "~" | "~`" | "`~" => 53,
        "1" | "!1" | "1!" => 30,
        "2" | "@2" | "2@" => 31,
        "3" | "#3" | "3#" => 32,
        "4" | "$4" | "4$" => 33,
        "5" | "%5" | "5%" => 34,
        "6" | "^6" | "6^" => 35,
        "7" | "&7" | "7&" => 36,
        "8" | "*8" | "8*" => 37,
        "9" | "(9" | "9(" => 38,
        "0" | ")0" | "0)" => 39,
        "-" | "_-" | "-_" => 45,
        "=" | "+=" | "=+" => 46,
        "Backspace" | "Bksp" => 42,
        "Tab" => 43,
        "Q" => 20,
        "W" => 26,
        "E" => 8,
        "R" => 21,
        "T" => 23,
        "Y" => 28,
        "U" => 24,
        "I" => 12,
        "O" => 18,
        "P" => 19,
        "[" | "{[" | "[{" | "{(" => 47,
        "]" | "}]" | "]}" | "})" => 48,
        "|" | "\\" | "|\\" | "\\|" => 49,
        "CapsLock" | "Caps" | "CAPS" => 57,
        "A" => 4,
        "S" => 22,
        "D" => 7,
        "F" => 9,
        "G" => 10,
        "H" => 11,
        "J" => 13,
        "K" => 14,
        "L" => 15,
        ";" | ";:" | ":;" => 51,
        "'" | "\"'" | "'\"" | "\"\"" => 52,
        "Enter" => 40,
        "LShift" | "LShft" | "Lshft" => 225,
        "Z" => 29,
        "X" => 27,
        "C" => 6,
        "V" => 25,
        "B" => 5,
        "N" => 17,
        "M" => 16,
        "," | ",<" | "<," => 54,
        "." | ".>" | ">." => 55,
        "?" | "/" | "?/" | "/?" => 56,
        "Rshift" | "RShift" | "RShft" | "Rshft" => 229,
        "↑" | "Up" => 82,
        "LCTL" | "LCtl" | "LCtrl" => 224,
        "LWin" | "LGui" => 227,
        "LAlt" => 226,
        "Space" => 44,
        "RAlt" => 230,
        "RWin" | "RGui" => 231,
        "Menu" | "App" => 101,
        "FN" | "Fn" => 21025, // MO(1)
        "Rctl" | "RCtl" | "RCtrl" => 228,
        "←" | "Left" => 80,
        "↓" | "Down" => 81,
        "→" | "Right" => 79,
        "÷" => 84,
        "*" => 85,
        "+" => 87,
        "N.Ent" => 88,
        _ => 0,
    }
}

pub fn load_profile_from_file(path: &Path) -> Result<KeyboardProfile> {
    let content = fs::read_to_string(path)
        .with_context(|| format!("Failed to read profile file {}", path.display()))?;
    let profile: KeyboardProfile = serde_json::from_str(&content)
        .with_context(|| format!("Failed to parse profile JSON from {}", path.display()))?;
    Ok(profile)
}

pub fn save_profile_to_file(path: &Path, profile: &KeyboardProfile) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let json = serde_json::to_string_pretty(profile)?;
    fs::write(path, json)
        .with_context(|| format!("Failed to write profile file {}", path.display()))?;
    Ok(())
}
