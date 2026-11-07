use crate::hid::{
    apply_full_profile_to_device, generate_linux_udev_rule, install_linux_udev_rules_pkexec,
    load_profile_from_file, open_qmk_device, read_full_profile_from_device, save_profile_to_file,
    scan_qmk_devices,
};
use crate::models::profile::hex_to_hs;
use crate::models::registry::{
    active_led_coordinates, default_definition, find_definition_by_id, find_definition_by_vid_pid,
    generic_fallback_definition, load_all_definitions, save_user_definition, KeyboardDefinition,
};
use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use std::fs;
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(
    name = "max102-tool",
    version,
    about = "Modular QMK / VIA Keyboard Customization Desktop Studio & CLI"
)]
pub struct CliArgs {
    /// Target USB device by VID:PID in hex (e.g. "342d:e537")
    #[arg(long, global = true)]
    pub device: Option<String>,

    /// Target keyboard definition ID (e.g. "weikav-max102", "generic-qmk-104")
    #[arg(long, global = true)]
    pub definition: Option<String>,

    #[command(subcommand)]
    pub command: Option<CliSubcommand>,
}

#[derive(Subcommand, Debug)]
pub enum CliSubcommand {
    /// List all detected QMK/VIA USB keyboards and available keyboard definitions
    ListDevices,

    /// Import a VIA v2/v3 or QMK Studio keyboard definition JSON into the user registry
    ImportDef {
        /// Path to the keyboard definition .json file
        path: PathBuf,
    },

    /// Print keyboard connection status, protocol version, lighting state, and Linux udev status
    Status,

    /// Export or apply complete keyboard profiles (.json)
    Profile {
        #[command(subcommand)]
        action: ProfileAction,
    },

    /// Configure keyboard RGB backlighting from the command line
    Rgb {
        /// Effect mode ID (or "custom" for per-key RGB)
        #[arg(long)]
        mode: Option<String>,

        /// Brightness level (0..5, or raw 0..255)
        #[arg(long)]
        brightness: Option<u8>,

        /// Speed level (1..5, or raw 0..255)
        #[arg(long)]
        speed: Option<u8>,

        /// Global effect hex color (e.g. "#00ff88")
        #[arg(long)]
        color: Option<String>,

        /// Paint all keys in custom per-key RGB mode to a single hex color (e.g. "#ff0055")
        #[arg(long)]
        all_keys_color: Option<String>,
    },

    /// Remap a single key in the keyboard matrix
    Keymap {
        /// Layer index (0..3)
        #[arg(long, default_value_t = 0)]
        layer: u8,
        /// Matrix row
        #[arg(long)]
        row: u8,
        /// Matrix column
        #[arg(long)]
        col: u8,
        /// 16-bit QMK keycode (decimal or 0xHEX)
        #[arg(long)]
        keycode: String,
    },

    /// Print or install the Linux udev rule for non-root /dev/hidraw* access
    Udev {
        /// Install the udev rule immediately via pkexec
        #[arg(long)]
        install: bool,
    },
}

#[derive(Subcommand, Debug)]
pub enum ProfileAction {
    /// Read current state from the keyboard and save to a JSON file
    Export {
        /// Output file path (e.g. my-profile.json)
        path: PathBuf,
    },
    /// Apply a saved JSON profile file to the connected keyboard
    Apply {
        /// Input file path (e.g. my-profile.json)
        path: PathBuf,
    },
}

fn parse_vid_pid_arg(device_arg: &Option<String>) -> (Option<u16>, Option<u16>) {
    let Some(ref s) = device_arg else {
        return (None, None);
    };
    if let Some((v_str, p_str)) = s.split_once(':') {
        let vid = u16::from_str_radix(v_str.trim_start_matches("0x"), 16).ok();
        let pid = u16::from_str_radix(p_str.trim_start_matches("0x"), 16).ok();
        return (vid, pid);
    }
    (None, None)
}

fn resolve_definition_and_device(
    device_arg: &Option<String>,
    def_arg: &Option<String>,
) -> Result<(crate::hid::protocol::ViaProtocol, KeyboardDefinition)> {
    let (mut target_vid, mut target_pid) = parse_vid_pid_arg(device_arg);
    let explicit_def = def_arg.as_deref().and_then(find_definition_by_id);

    if target_vid.is_none() && target_pid.is_none() {
        if let Some(ref d) = explicit_def {
            if d.vendor_id != 0 || d.product_id != 0 {
                target_vid = Some(d.vendor_id);
                target_pid = Some(d.product_id);
            }
        }
    }

    let proto = open_qmk_device(target_vid, target_pid)?;
    let def = explicit_def
        .or_else(|| find_definition_by_vid_pid(proto.vendor_id, proto.product_id))
        .unwrap_or_else(generic_fallback_definition);
    Ok((proto, def))
}

pub fn run_cli(
    cmd: CliSubcommand,
    device_arg: Option<String>,
    def_arg: Option<String>,
) -> Result<()> {
    match cmd {
        CliSubcommand::ListDevices => {
            let devices = scan_qmk_devices();
            let defs = load_all_definitions();
            println!("=== Connected QMK / VIA Raw HID Keyboards (0xFF60:0x0061) ===");
            if devices.is_empty() {
                println!("  (No QMK Raw HID keyboards detected on USB)");
            } else {
                for d in &devices {
                    println!(
                        "  - {} ({:04x}:{:04x}) [path: {}, definition: {}, access: {}]",
                        d.product_name,
                        d.vendor_id,
                        d.product_id,
                        d.hidraw_path.as_deref().unwrap_or("n/a"),
                        d.matched_definition_id
                            .as_deref()
                            .unwrap_or("unrecognized (generic-qmk-104 fallback)"),
                        if d.permission_denied {
                            "PERMISSION DENIED"
                        } else {
                            "OK"
                        }
                    );
                }
            }
            println!("\n=== Registered Keyboard Definitions ===");
            for def in &defs {
                println!(
                    "  - {} [id: {}, vid:pid: {:04x}:{:04x}, matrix: {}x{}, keys: {}, source: {}]",
                    def.name,
                    def.id,
                    def.vendor_id,
                    def.product_id,
                    def.matrix.rows,
                    def.matrix.cols,
                    def.layouts.keys.len(),
                    if def.builtin { "bundled" } else { "user-imported" }
                );
            }
            Ok(())
        }
        CliSubcommand::ImportDef { path } => {
            let raw = fs::read_to_string(&path)
                .with_context(|| format!("Failed reading {}", path.display()))?;
            let def = save_user_definition(&raw)?;
            println!(
                "Imported definition '{}' (id: {}, vid:pid: {:04x}:{:04x}, {} keys).",
                def.name,
                def.id,
                def.vendor_id,
                def.product_id,
                def.layouts.keys.len()
            );
            Ok(())
        }
        CliSubcommand::Status => {
            let devices = scan_qmk_devices();
            println!("=== QMK / VIA Keyboard Status ===");
            for d in &devices {
                if let Some(ref p) = d.hidraw_path {
                    println!(
                        "Detected USB Node  : {} ({:04x}:{:04x} {})",
                        p, d.vendor_id, d.product_id, d.product_name
                    );
                }
                if d.permission_denied {
                    println!(
                        "Permission status  : DENIED (run `max102-tool udev --install` to fix)"
                    );
                }
            }

            let (proto, def) = resolve_definition_and_device(&device_arg, &def_arg)?;
            let ver = proto.get_protocol_version()?;
            let layers = proto.get_layer_count(ver)?;
            let layout_opts = proto.get_layout_options().unwrap_or(0);
            let lighting = proto.get_lighting_config(&def)?;
            let custom_vals = proto.read_all_custom_controls(&def);
            let macro_count = proto.get_macro_count()?;
            let macro_buf = proto.get_macro_buffer_size()?;

            println!("Device Name        : {}", proto.product_name);
            println!(
                "Active Definition  : {} ({})",
                def.name, def.id
            );
            println!(
                "USB ID             : {:04x}:{:04x}",
                proto.vendor_id, proto.product_id
            );
            println!("HID Path           : {}", proto.path);
            println!("VIA Protocol Ver   : v{}", ver);
            println!("Layers             : {}", layers);
            println!("Layout Options     : 0x{:08X}", layout_opts);
            if def.capabilities.lighting.is_some() {
                println!("Lighting Mode      : {}", lighting.mode);
                println!("Brightness         : {}", lighting.brightness);
                println!("Effect Speed       : {}", lighting.speed);
                println!(
                    "Effect Color       : {} (H={}, S={})",
                    lighting.color_hex, lighting.hue, lighting.sat
                );
            }
            for ctrl in &def.capabilities.custom_controls {
                if let Some(val) = custom_vals.get(&ctrl.id) {
                    println!("Custom [{}] : {}", ctrl.title, val);
                }
            }
            println!(
                "Macros             : {} slots ({} bytes buffer)",
                macro_count, macro_buf
            );
            Ok(())
        }
        CliSubcommand::Profile { action } => {
            let (proto, def) = resolve_definition_and_device(&device_arg, &def_arg)?;
            match action {
                ProfileAction::Export { path } => {
                    println!("Reading full configuration from {}...", proto.product_name);
                    let profile =
                        read_full_profile_from_device(&proto, &def, "CLI Exported Profile")?;
                    save_profile_to_file(&path, &profile)?;
                    println!("Saved profile to {}", path.display());
                    Ok(())
                }
                ProfileAction::Apply { path } => {
                    let profile = load_profile_from_file(&path)?;
                    println!(
                        "Applying profile '{}' to {}...",
                        profile.name, proto.product_name
                    );
                    apply_full_profile_to_device(&proto, &def, &profile)?;
                    println!("Profile applied successfully.");
                    Ok(())
                }
            }
        }
        CliSubcommand::Rgb {
            mode,
            brightness,
            speed,
            color,
            all_keys_color,
        } => {
            let (proto, def) = resolve_definition_and_device(&device_arg, &def_arg)?;
            let b_step = def
                .capabilities
                .lighting
                .as_ref()
                .map(|l| l.brightness_step.max(1))
                .unwrap_or(36);
            let b_max = def
                .capabilities
                .lighting
                .as_ref()
                .map(|l| l.brightness_max)
                .unwrap_or(180);
            let s_step = def
                .capabilities
                .lighting
                .as_ref()
                .map(|l| l.speed_step.max(1))
                .unwrap_or(51);
            let s_min = def
                .capabilities
                .lighting
                .as_ref()
                .map(|l| l.speed_min)
                .unwrap_or(51);

            if let Some(b) = brightness {
                let raw_b = if b <= 5 {
                    b.saturating_mul(b_step).min(b_max)
                } else {
                    b.min(b_max)
                };
                proto.set_effect_brightness(&def, raw_b, false)?;
                println!("Set brightness to {}", raw_b);
            }
            if let Some(s) = speed {
                let raw_s = if s <= 5 {
                    s.max(1).saturating_mul(s_step)
                } else {
                    s.max(s_min)
                };
                proto.set_effect_speed(&def, raw_s, false)?;
                println!("Set speed to {}", raw_s);
            }
            if let Some(hex) = color {
                let (h, s) = hex_to_hs(&hex);
                proto.set_effect_color(&def, h, s, false)?;
                println!("Set global effect color to {} (H={}, S={})", hex, h, s);
            }
            if let Some(m_str) = mode {
                let custom_id = def
                    .capabilities
                    .lighting
                    .as_ref()
                    .and_then(|l| l.per_key_rgb.as_ref())
                    .map(|pk| pk.mode_id)
                    .unwrap_or(45);
                let m_id: u8 = if m_str.eq_ignore_ascii_case("custom") {
                    custom_id
                } else {
                    m_str.parse()?
                };
                proto.set_rgb_mode(&def, m_id, false)?;
                println!("Set RGB mode to {}", m_id);
            }
            proto.save_lighting(&def)?;

            if let Some(hex) = all_keys_color {
                let (h, s) = hex_to_hs(&hex);
                let custom_id = def
                    .capabilities
                    .lighting
                    .as_ref()
                    .and_then(|l| l.per_key_rgb.as_ref())
                    .map(|pk| pk.mode_id)
                    .unwrap_or(45);
                proto.set_rgb_mode(&def, custom_id, true)?;
                let coords = active_led_coordinates(&def);
                let count = coords.len();
                let updates: Vec<(u8, u8, u8, u8)> =
                    coords.into_iter().map(|(r, c)| (r, c, h, s)).collect();
                proto.set_key_colors_batch(&def, &updates, false, true)?;
                println!(
                    "Updated all {} per-key RGB LEDs to {} and saved to EEPROM.",
                    count, hex
                );
            }
            Ok(())
        }
        CliSubcommand::Keymap {
            layer,
            row,
            col,
            keycode,
        } => {
            let kc: u16 = if let Some(hex) = keycode
                .strip_prefix("0x")
                .or_else(|| keycode.strip_prefix("0X"))
            {
                u16::from_str_radix(hex, 16)?
            } else {
                keycode.parse()?
            };
            let (proto, _def) = resolve_definition_and_device(&device_arg, &def_arg)?;
            let verify = proto.set_key(layer, row, col, kc)?;
            println!(
                "Set key (layer={}, row={}, col={}) -> 0x{:04X} (verified: 0x{:04X})",
                layer, row, col, kc, verify
            );
            Ok(())
        }
        CliSubcommand::Udev { install } => {
            let def = def_arg
                .as_deref()
                .and_then(find_definition_by_id)
                .unwrap_or_else(default_definition);
            let (vid_opt, pid_opt) = parse_vid_pid_arg(&device_arg);
            let vid = vid_opt.unwrap_or(def.vendor_id);
            let pid = pid_opt.unwrap_or(def.product_id);
            if install {
                let msg = install_linux_udev_rules_pkexec(vid, pid, &def.name)?;
                println!("{}", msg);
            } else {
                println!("{}", generate_linux_udev_rule(vid, pid, &def.name));
            }
            Ok(())
        }
    }
}
