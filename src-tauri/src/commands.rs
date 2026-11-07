use crate::hid::queue::HidQueue;
use crate::hid::{
    apply_full_profile_to_device, default_offline_profile, generate_linux_udev_rule,
    install_linux_udev_rules_pkexec, open_qmk_device, read_full_profile_from_device,
    scan_qmk_devices, ConnectionDiagnostics, DetectedQmkDevice,
};
use crate::models::layout::DEFAULT_LAYERS;
use crate::models::profile::{
    hex_to_hs, KeyboardProfile, LightingConfig, MacroSlot, PerKeyRgbCell,
};
use crate::models::registry::{
    find_definition_by_id, find_definition_by_vid_pid, generic_fallback_definition,
    load_all_definitions, remove_user_definition, save_user_definition, KeyboardDefinition,
};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectResponse {
    pub diagnostics: ConnectionDiagnostics,
    pub profile: KeyboardProfile,
    pub definition: KeyboardDefinition,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevicesAndDefinitionsResponse {
    pub devices: Vec<DetectedQmkDevice>,
    pub definitions: Vec<KeyboardDefinition>,
    #[serde(rename = "activeDefinition")]
    pub active_definition: KeyboardDefinition,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyColorUpdateInput {
    pub row: u8,
    pub col: u8,
    pub hex: String,
}

#[tauri::command]
pub fn list_devices_and_definitions_cmd(
    queue: State<'_, HidQueue>,
) -> DevicesAndDefinitionsResponse {
    let devices = scan_qmk_devices();
    let definitions = load_all_definitions();
    let active_definition = queue.active_definition();
    DevicesAndDefinitionsResponse {
        devices,
        definitions,
        active_definition,
    }
}

#[tauri::command]
pub fn import_definition_cmd(
    queue: State<'_, HidQueue>,
    json_content: String,
) -> Result<KeyboardDefinition, String> {
    let def = save_user_definition(&json_content).map_err(|e| format!("{:#}", e))?;
    queue.set_definition(def.clone());
    Ok(def)
}

#[tauri::command]
pub fn remove_definition_cmd(
    queue: State<'_, HidQueue>,
    definition_id: String,
) -> Result<Vec<KeyboardDefinition>, String> {
    remove_user_definition(&definition_id).map_err(|e| format!("{:#}", e))?;
    let all = load_all_definitions();
    if queue.active_definition().id == definition_id {
        if let Some(first) = all.first().cloned() {
            queue.set_definition(first);
        }
    }
    Ok(all)
}

#[tauri::command]
pub fn get_connection_diagnostics(queue: State<'_, HidQueue>) -> ConnectionDiagnostics {
    let active_def = queue.active_definition();
    let detected = scan_qmk_devices();

    if queue.is_connected() {
        if let Ok((ver, layers, name, path, vid, pid, def_id)) = queue.with_device(|dev, def| {
            let ver = dev.get_protocol_version().unwrap_or(11);
            let layers = dev.get_layer_count(ver).unwrap_or(DEFAULT_LAYERS);
            Ok((
                ver,
                layers,
                dev.product_name.clone(),
                dev.path.clone(),
                dev.vendor_id,
                dev.product_id,
                def.id.clone(),
            ))
        }) {
            let is_unknown = find_definition_by_vid_pid(vid, pid).is_none();
            return ConnectionDiagnostics {
                connected: true,
                usb_detected: true,
                permission_denied: false,
                hidraw_path: Some(path),
                product_name: name.clone(),
                vendor_id: vid,
                product_id: pid,
                definition_id: def_id,
                is_unknown_device: is_unknown,
                protocol_version: ver,
                layers_count: layers,
                message: format!("Connected to {}", name),
            };
        }
    }

    let candidate = detected
        .iter()
        .find(|d| d.vendor_id == active_def.vendor_id && d.product_id == active_def.product_id)
        .or_else(|| detected.first());

    let usb_detected = candidate.is_some();
    let perm_denied = candidate.map(|c| c.permission_denied).unwrap_or(false);
    let sysfs_path = candidate.and_then(|c| c.hidraw_path.clone());
    let vid = candidate
        .map(|c| c.vendor_id)
        .unwrap_or(active_def.vendor_id);
    let pid = candidate
        .map(|c| c.product_id)
        .unwrap_or(active_def.product_id);
    let is_unknown = candidate.map(|c| c.is_unknown_device).unwrap_or(false);
    let prod_name = candidate
        .map(|c| c.product_name.clone())
        .unwrap_or_else(|| active_def.name.clone());

    ConnectionDiagnostics {
        connected: false,
        usb_detected,
        permission_denied: perm_denied,
        hidraw_path: sysfs_path,
        product_name: prod_name.clone(),
        vendor_id: vid,
        product_id: pid,
        definition_id: active_def.id.clone(),
        is_unknown_device: is_unknown,
        protocol_version: 11,
        layers_count: DEFAULT_LAYERS,
        message: if perm_denied {
            format!(
                "{} detected on USB, but Linux /dev/hidraw permission was denied.",
                prod_name
            )
        } else if usb_detected {
            format!("{} detected on USB (ready to connect).", prod_name)
        } else {
            format!("Offline Mode active ({})", active_def.name)
        },
    }
}

fn connect_with_options(
    queue: &HidQueue,
    vendor_id: Option<u16>,
    product_id: Option<u16>,
    definition_id: Option<String>,
) -> Result<ConnectResponse, String> {
    queue.with_exclusive_lock(|session| {
        // Close any existing handle first so we never have two open file descriptors on the same hidraw node
        session.proto = None;

        // If an explicit definition_id was requested, load it first
        if let Some(ref def_id) = definition_id {
            if let Some(found) = find_definition_by_id(def_id) {
                session.definition = found;
            }
        }

        // If an explicit definition_id was requested without a USB VID:PID (e.g. from "Offline / Layout Preview Definitions")
        // and the definition has no hardware VID:PID (0x0000:0x0000, such as Generic 104-Key), enter Offline/Preview mode directly
        // rather than opening an unrelated USB keyboard and reading its matrix into the wrong dimensions.
        if definition_id.is_some()
            && vendor_id.is_none()
            && product_id.is_none()
            && session.definition.vendor_id == 0
            && session.definition.product_id == 0
        {
            let diag = ConnectionDiagnostics {
                connected: false,
                usb_detected: false,
                permission_denied: false,
                hidraw_path: None,
                product_name: session.definition.name.clone(),
                vendor_id: 0,
                product_id: 0,
                definition_id: session.definition.id.clone(),
                is_unknown_device: false,
                protocol_version: 11,
                layers_count: DEFAULT_LAYERS,
                message: format!("Offline Mode active ({})", session.definition.name),
            };
            return Ok(ConnectResponse {
                diagnostics: diag,
                profile: default_offline_profile(&session.definition),
                definition: session.definition.clone(),
            });
        }

        let target_vid = vendor_id.or_else(|| {
            if session.definition.vendor_id != 0 {
                Some(session.definition.vendor_id)
            } else {
                None
            }
        });
        let target_pid = product_id.or_else(|| {
            if session.definition.product_id != 0 {
                Some(session.definition.product_id)
            } else {
                None
            }
        });

        let open_attempt = open_qmk_device(target_vid, target_pid).or_else(|first_err| {
            // Only fall back to "any connected QMK keyboard" when neither VID/PID nor a specific definition_id was forced
            if vendor_id.is_none() && product_id.is_none() && definition_id.is_none() {
                open_qmk_device(None, None).map_err(|_| first_err)
            } else {
                Err(first_err)
            }
        });

        match open_attempt {
            Ok(proto) => {
                // Match definition if caller didn't force a specific definition_id
                let matched_def = find_definition_by_vid_pid(proto.vendor_id, proto.product_id);
                let is_unknown = matched_def.is_none();
                if definition_id.is_none() {
                    if let Some(ref m) = matched_def {
                        session.definition = m.clone();
                    } else {
                        let mut fallback = generic_fallback_definition();
                        fallback.vendor_id = proto.vendor_id;
                        fallback.product_id = proto.product_id;
                        if !proto.product_name.trim().is_empty() {
                            fallback.name = format!("{} (Generic 104 Fallback)", proto.product_name);
                        }
                        session.definition = fallback;
                    }
                }

                let profile =
                    read_full_profile_from_device(&proto, &session.definition, "Hardware Live")
                        .map_err(|e| {
                            format!(
                                "Connected to {}, but failed reading state: {:#}",
                                proto.product_name, e
                            )
                        })?;
                let diag = ConnectionDiagnostics {
                    connected: true,
                    usb_detected: true,
                    permission_denied: false,
                    hidraw_path: Some(proto.path.clone()),
                    product_name: proto.product_name.clone(),
                    vendor_id: proto.vendor_id,
                    product_id: proto.product_id,
                    definition_id: session.definition.id.clone(),
                    is_unknown_device: is_unknown,
                    protocol_version: profile.protocol_version,
                    layers_count: profile.layers_count,
                    message: format!("Connected to {}", proto.product_name),
                };
                session.proto = Some(proto);
                Ok(ConnectResponse {
                    diagnostics: diag,
                    profile,
                    definition: session.definition.clone(),
                })
            }
            Err(err) => {
                let detected = scan_qmk_devices();
                let candidate = detected
                    .iter()
                    .find(|d| {
                        target_vid.map(|v| d.vendor_id == v).unwrap_or(true)
                            && target_pid.map(|p| d.product_id == p).unwrap_or(true)
                    })
                    .or_else(|| detected.first());

                let usb_detected = candidate.is_some();
                let perm_denied = candidate.map(|c| c.permission_denied).unwrap_or(false);
                let sysfs_path = candidate.and_then(|c| c.hidraw_path.clone());
                let vid = candidate
                    .map(|c| c.vendor_id)
                    .unwrap_or(session.definition.vendor_id);
                let pid = candidate
                    .map(|c| c.product_id)
                    .unwrap_or(session.definition.product_id);
                let is_unknown = candidate.map(|c| c.is_unknown_device).unwrap_or(false);

                let diag = ConnectionDiagnostics {
                    connected: false,
                    usb_detected,
                    permission_denied: perm_denied,
                    hidraw_path: sysfs_path,
                    product_name: session.definition.name.clone(),
                    vendor_id: vid,
                    product_id: pid,
                    definition_id: session.definition.id.clone(),
                    is_unknown_device: is_unknown,
                    protocol_version: 11,
                    layers_count: DEFAULT_LAYERS,
                    message: format!("{:#}", err),
                };
                Ok(ConnectResponse {
                    diagnostics: diag,
                    profile: default_offline_profile(&session.definition),
                    definition: session.definition.clone(),
                })
            }
        }
    })
}

#[tauri::command]
pub fn connect_keyboard(queue: State<'_, HidQueue>) -> Result<ConnectResponse, String> {
    connect_with_options(&queue, None, None, None)
}

#[tauri::command]
pub fn select_device_or_definition_cmd(
    queue: State<'_, HidQueue>,
    vendor_id: Option<u16>,
    product_id: Option<u16>,
    definition_id: Option<String>,
) -> Result<ConnectResponse, String> {
    connect_with_options(&queue, vendor_id, product_id, definition_id)
}

#[tauri::command]
pub fn disconnect_keyboard(queue: State<'_, HidQueue>) -> ConnectionDiagnostics {
    queue.set_protocol(None);
    get_connection_diagnostics(queue)
}

#[tauri::command]
pub fn install_udev_rules(queue: State<'_, HidQueue>) -> Result<String, String> {
    let diag = get_connection_diagnostics(queue);
    install_linux_udev_rules_pkexec(diag.vendor_id, diag.product_id, &diag.product_name)
        .map_err(|e| format!("{:#}", e))
}

#[tauri::command]
pub fn get_udev_rule_snippet(queue: State<'_, HidQueue>) -> String {
    let diag = get_connection_diagnostics(queue);
    generate_linux_udev_rule(diag.vendor_id, diag.product_id, &diag.product_name)
}

#[tauri::command]
pub fn set_single_key(
    queue: State<'_, HidQueue>,
    layer: u8,
    row: u8,
    col: u8,
    keycode: u16,
) -> Result<u16, String> {
    if !queue.is_connected() {
        return Ok(keycode);
    }
    queue
        .with_device(|dev, _def| dev.set_key(layer, row, col, keycode))
        .map_err(|e| format!("{:#}", e))
}

#[tauri::command]
pub fn write_all_layers(
    queue: State<'_, HidQueue>,
    layers: Vec<Vec<u16>>,
) -> Result<(), String> {
    if !queue.is_connected() {
        return Ok(());
    }
    queue
        .with_device(|dev, _def| dev.write_all_layers(&layers))
        .map_err(|e| format!("{:#}", e))
}

#[tauri::command]
pub fn set_layout_options_cmd(
    queue: State<'_, HidQueue>,
    layout_options: u32,
) -> Result<(), String> {
    if !queue.is_connected() {
        return Ok(());
    }
    queue
        .with_device(|dev, _def| dev.set_layout_options(layout_options))
        .map_err(|e| format!("{:#}", e))
}

#[tauri::command]
pub fn update_lighting_config(
    queue: State<'_, HidQueue>,
    config: LightingConfig,
    commit: bool,
) -> Result<(), String> {
    if !queue.is_connected() {
        return Ok(());
    }
    queue
        .with_device(|dev, def| {
            dev.set_effect_brightness(def, config.brightness, false)?;
            dev.set_effect_speed(def, config.speed, false)?;
            dev.set_effect_color(def, config.hue, config.sat, false)?;
            dev.set_rgb_mode(def, config.mode, commit)?;
            Ok(())
        })
        .map_err(|e| format!("{:#}", e))
}

#[tauri::command]
pub fn set_rgb_mode_cmd(
    queue: State<'_, HidQueue>,
    mode: u8,
    commit: bool,
) -> Result<(), String> {
    if !queue.is_connected() {
        return Ok(());
    }
    queue
        .with_device(|dev, def| dev.set_rgb_mode(def, mode, commit))
        .map_err(|e| format!("{:#}", e))
}

#[tauri::command]
pub fn set_effect_brightness_cmd(
    queue: State<'_, HidQueue>,
    brightness: u8,
    commit: bool,
) -> Result<(), String> {
    if !queue.is_connected() {
        return Ok(());
    }
    queue
        .with_device(|dev, def| dev.set_effect_brightness(def, brightness, commit))
        .map_err(|e| format!("{:#}", e))
}

#[tauri::command]
pub fn set_effect_speed_cmd(
    queue: State<'_, HidQueue>,
    speed: u8,
    commit: bool,
) -> Result<(), String> {
    if !queue.is_connected() {
        return Ok(());
    }
    queue
        .with_device(|dev, def| dev.set_effect_speed(def, speed, commit))
        .map_err(|e| format!("{:#}", e))
}

#[tauri::command]
pub fn set_effect_color_cmd(
    queue: State<'_, HidQueue>,
    hex: String,
    commit: bool,
) -> Result<(u8, u8), String> {
    let (h, s) = hex_to_hs(&hex);
    if !queue.is_connected() {
        return Ok((h, s));
    }
    queue
        .with_device(|dev, def| {
            dev.set_effect_color(def, h, s, commit)?;
            Ok((h, s))
        })
        .map_err(|e| format!("{:#}", e))
}

#[tauri::command]
pub fn set_per_key_colors_batch_cmd(
    queue: State<'_, HidQueue>,
    updates: Vec<KeyColorUpdateInput>,
    unified_spacebar: bool,
    commit: bool,
) -> Result<Vec<PerKeyRgbCell>, String> {
    let mut raw_updates = Vec::with_capacity(updates.len());
    let mut out_cells = Vec::with_capacity(updates.len());

    for item in &updates {
        let cell = PerKeyRgbCell::from_hex(item.row, item.col, &item.hex);
        raw_updates.push((cell.row, cell.col, cell.h, cell.s));
        out_cells.push(cell);
    }

    if queue.is_connected() {
        queue
            .with_device(|dev, def| {
                dev.set_key_colors_batch(def, &raw_updates, unified_spacebar, commit)
            })
            .map_err(|e| format!("{:#}", e))?;
    }

    Ok(out_cells)
}

#[tauri::command]
pub fn commit_per_key_colors_cmd(queue: State<'_, HidQueue>) -> Result<(), String> {
    if !queue.is_connected() {
        return Ok(());
    }
    queue
        .with_device(|dev, def| dev.save_key_colors(def))
        .map_err(|e| format!("{:#}", e))
}

#[tauri::command]
pub fn read_per_key_colors_cmd(queue: State<'_, HidQueue>) -> Result<Vec<PerKeyRgbCell>, String> {
    if !queue.is_connected() {
        return Ok(default_offline_profile(&queue.active_definition()).per_key_rgb);
    }
    queue
        .with_device(|dev, def| dev.get_all_key_colors(def))
        .map_err(|e| format!("{:#}", e))
}

#[tauri::command]
pub fn set_custom_control_cmd(
    queue: State<'_, HidQueue>,
    control_id: String,
    value: u8,
) -> Result<(), String> {
    if !queue.is_connected() {
        return Ok(());
    }
    queue
        .with_device(|dev, def| {
            let Some(ctrl) = def
                .capabilities
                .custom_controls
                .iter()
                .find(|c| c.id == control_id)
            else {
                return Ok(());
            };
            dev.set_custom_control(ctrl, value)
        })
        .map_err(|e| format!("{:#}", e))
}

#[tauri::command]
pub fn set_sleep_timeout_cmd(queue: State<'_, HidQueue>, timeout: u8) -> Result<(), String> {
    set_custom_control_cmd(queue, "sleep_timeout".to_string(), timeout)
}

#[tauri::command]
pub fn set_nkro_cmd(queue: State<'_, HidQueue>, enabled: bool) -> Result<(), String> {
    set_custom_control_cmd(queue, "nkro".to_string(), u8::from(enabled))
}

#[tauri::command]
pub fn save_macros_cmd(
    queue: State<'_, HidQueue>,
    macros: Vec<MacroSlot>,
) -> Result<(), String> {
    if !queue.is_connected() {
        return Ok(());
    }
    queue
        .with_device(|dev, _def| dev.write_macros(&macros))
        .map_err(|e| format!("{:#}", e))
}

#[tauri::command]
pub fn poll_matrix_state_cmd(queue: State<'_, HidQueue>) -> Result<Vec<(u8, u8)>, String> {
    if !queue.is_connected() {
        return Ok(Vec::new());
    }
    queue
        .with_device(|dev, def| dev.get_pressed_matrix_keys(def.matrix.rows, def.matrix.cols))
        .map_err(|e| format!("{:#}", e))
}

#[tauri::command]
pub fn apply_profile_cmd(
    queue: State<'_, HidQueue>,
    profile: KeyboardProfile,
) -> Result<(), String> {
    if !queue.is_connected() {
        return Ok(());
    }
    queue
        .with_device(|dev, def| apply_full_profile_to_device(dev, def, &profile))
        .map_err(|e| format!("{:#}", e))
}

#[tauri::command]
pub fn factory_reset_cmd(queue: State<'_, HidQueue>) -> Result<KeyboardProfile, String> {
    if !queue.is_connected() {
        return Ok(default_offline_profile(&queue.active_definition()));
    }
    queue
        .with_device(|dev, def| {
            dev.reset_eeprom()?;
            read_full_profile_from_device(dev, def, "Factory Restored")
        })
        .map_err(|e| format!("{:#}", e))
}
