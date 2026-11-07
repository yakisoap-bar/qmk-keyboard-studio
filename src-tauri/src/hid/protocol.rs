use crate::hid::macros::{decode_macros_from_buffer, encode_macros_to_buffer};
use crate::models::profile::{hs_to_hex, LightingConfig, MacroSlot, PerKeyRgbCell};
use crate::models::registry::{
    active_led_coordinates, eval_template_bytes, ColorReadTemplate, CommandTemplate,
    CustomControlSpec, KeyboardDefinition, ReadTemplate, TemplateVars,
};
use anyhow::{anyhow, bail, Context, Result};
use hidapi::HidDevice;
use std::collections::HashMap;
use std::thread;
use std::time::Duration;

// Standard VIA Raw HID Commands
pub const CMD_GET_PROTOCOL_VERSION: u8 = 0x01;
pub const CMD_GET_KEYBOARD_VALUE: u8 = 0x02;
pub const CMD_SET_KEYBOARD_VALUE: u8 = 0x03;
pub const CMD_DYNAMIC_KEYMAP_GET_KEYCODE: u8 = 0x04;
pub const CMD_DYNAMIC_KEYMAP_SET_KEYCODE: u8 = 0x05;
pub const CMD_CUSTOM_MENU_SET_VALUE: u8 = 0x07;
pub const CMD_CUSTOM_MENU_GET_VALUE: u8 = 0x08;
pub const CMD_CUSTOM_MENU_SAVE: u8 = 0x09;
pub const CMD_EEPROM_RESET: u8 = 0x0A;
pub const CMD_BOOTLOADER_JUMP: u8 = 0x0B;
pub const CMD_MACRO_GET_COUNT: u8 = 0x0C;
pub const CMD_MACRO_GET_BUFFER_SIZE: u8 = 0x0D;
pub const CMD_MACRO_GET_BUFFER: u8 = 0x0E;
pub const CMD_MACRO_SET_BUFFER: u8 = 0x0F;
pub const CMD_MACRO_RESET: u8 = 0x10;
pub const CMD_GET_LAYER_COUNT: u8 = 0x11;
pub const CMD_KEYMAP_GET_BUFFER: u8 = 0x12;
pub const CMD_KEYMAP_SET_BUFFER: u8 = 0x13;

pub const SUB_LAYOUT_OPTIONS: u8 = 0x02;
pub const SUB_SWITCH_MATRIX_STATE: u8 = 0x03;

pub struct ViaProtocol {
    device: HidDevice,
    pub path: String,
    pub product_name: String,
    pub vendor_id: u16,
    pub product_id: u16,
}

pub type Max102Protocol = ViaProtocol;

impl ViaProtocol {
    pub fn new(
        device: HidDevice,
        path: String,
        product_name: String,
        vendor_id: u16,
        product_id: u16,
    ) -> Self {
        let _ = device.set_blocking_mode(true);
        Self {
            device,
            path,
            product_name,
            vendor_id,
            product_id,
        }
    }

    /// Sends a 32-byte Raw HID report (prefixed with Report ID `0x00` -> 33 bytes written)
    /// and reads back the 32-byte response report.
    pub fn hid_command(&self, cmd: u8, args: &[u8]) -> Result<[u8; 32]> {
        // Flush any stale unread input reports first (non-blocking 1ms drain)
        let mut stale = [0u8; 32];
        while let Ok(n) = self.device.read_timeout(&mut stale, 1) {
            if n == 0 {
                break;
            }
        }

        let mut report = [0u8; 33];
        report[0] = 0x00; // Report ID 0
        report[1] = cmd;
        let copy_len = args.len().min(31);
        report[2..2 + copy_len].copy_from_slice(&args[..copy_len]);

        self.device.write(&report).with_context(|| {
            format!(
                "Failed writing HID command 0x{:02X} to {}",
                cmd, self.product_name
            )
        })?;

        let mut resp = [0u8; 32];
        for _ in 0..8 {
            let n = self.device.read_timeout(&mut resp, 600).with_context(|| {
                format!("Failed reading HID response for command 0x{:02X}", cmd)
            })?;

            if n == 0 {
                bail!("Timed out waiting for response to HID command 0x{:02X}", cmd);
            }
            if resp[0] == cmd || resp[0] == 0xFF {
                return Ok(resp);
            }
        }

        Ok(resp)
    }

    // =========================================================================
    // Generic Byte-Template Execution Engine
    // =========================================================================

    pub fn exec_set_template(
        &self,
        tpl: &CommandTemplate,
        vars: &TemplateVars,
    ) -> Result<[u8; 32]> {
        let (cmd, args) = eval_template_bytes(&tpl.cmd, vars)?;
        self.hid_command(cmd, &args)
    }

    pub fn exec_get_template(&self, tpl: &ReadTemplate, vars: &TemplateVars) -> Result<u8> {
        let (cmd, args) = eval_template_bytes(&tpl.cmd, vars)?;
        let resp = self.hid_command(cmd, &args)?;
        let val = resp.get(tpl.value_index).copied().unwrap_or(0);
        if val == 0 {
            if let Some(ref fb_tokens) = tpl.fallback_cmd {
                let (fb_cmd, fb_args) = eval_template_bytes(fb_tokens, vars)?;
                let fb_resp = self.hid_command(fb_cmd, &fb_args)?;
                let fb_idx = tpl.fallback_value_index.unwrap_or(tpl.value_index);
                return Ok(fb_resp.get(fb_idx).copied().unwrap_or(0));
            }
        }
        Ok(val)
    }

    pub fn exec_color_read_template(
        &self,
        tpl: &ColorReadTemplate,
        vars: &TemplateVars,
    ) -> Result<(u8, u8)> {
        let (cmd, args) = eval_template_bytes(&tpl.cmd, vars)?;
        let resp = self.hid_command(cmd, &args)?;
        let h = resp.get(tpl.hue_index).copied().unwrap_or(0);
        let s = resp.get(tpl.sat_index).copied().unwrap_or(0);
        if h == 0 && s == 0 {
            if let Some(ref fb_tokens) = tpl.fallback_cmd {
                let (fb_cmd, fb_args) = eval_template_bytes(fb_tokens, vars)?;
                let fb_resp = self.hid_command(fb_cmd, &fb_args)?;
                let fb_h_idx = tpl.fallback_hue_index.unwrap_or(tpl.hue_index);
                let fb_s_idx = tpl.fallback_sat_index.unwrap_or(tpl.sat_index);
                return Ok((
                    fb_resp.get(fb_h_idx).copied().unwrap_or(0),
                    fb_resp.get(fb_s_idx).copied().unwrap_or(0),
                ));
            }
        }
        Ok((h, s))
    }

    // =========================================================================
    // Standard VIA Core Protocol
    // =========================================================================

    pub fn get_protocol_version(&self) -> Result<u16> {
        let resp = self.hid_command(CMD_GET_PROTOCOL_VERSION, &[])?;
        Ok(u16::from_be_bytes([resp[1], resp[2]]))
    }

    pub fn get_layer_count(&self, protocol_version: u16) -> Result<u8> {
        if protocol_version >= 8 {
            let resp = self.hid_command(CMD_GET_LAYER_COUNT, &[])?;
            Ok(resp[1].max(1))
        } else {
            Ok(4)
        }
    }

    pub fn get_layout_options(&self) -> Result<u32> {
        let resp = self.hid_command(CMD_GET_KEYBOARD_VALUE, &[SUB_LAYOUT_OPTIONS])?;
        if resp[0] == CMD_GET_KEYBOARD_VALUE && resp[1] == SUB_LAYOUT_OPTIONS {
            Ok(u32::from_be_bytes([resp[2], resp[3], resp[4], resp[5]]))
        } else {
            Ok(0)
        }
    }

    pub fn set_layout_options(&self, options: u32) -> Result<()> {
        let [b3, b2, b1, b0] = options.to_be_bytes();
        self.hid_command(
            CMD_SET_KEYBOARD_VALUE,
            &[SUB_LAYOUT_OPTIONS, b3, b2, b1, b0],
        )?;
        Ok(())
    }

    pub fn get_key(&self, layer: u8, row: u8, col: u8) -> Result<u16> {
        let resp = self.hid_command(CMD_DYNAMIC_KEYMAP_GET_KEYCODE, &[layer, row, col])?;
        Ok(u16::from_be_bytes([resp[4], resp[5]]))
    }

    pub fn set_key(&self, layer: u8, row: u8, col: u8, keycode: u16) -> Result<u16> {
        let [hi, lo] = keycode.to_be_bytes();
        let resp = self.hid_command(CMD_DYNAMIC_KEYMAP_SET_KEYCODE, &[layer, row, col, hi, lo])?;
        Ok(u16::from_be_bytes([resp[4], resp[5]]))
    }

    /// Reads all keycodes for a single layer (`rows * cols` u16 entries) using fast 28-byte buffer reads.
    pub fn read_layer_matrix(&self, layer: u8, rows: u8, cols: u8) -> Result<Vec<u16>> {
        let cells = (rows as usize) * (cols as usize);
        let layer_byte_offset = (layer as usize) * cells * 2;
        let total_bytes = cells * 2;
        let mut raw_bytes = Vec::with_capacity(total_bytes);

        let mut offset = 0usize;
        while offset < total_bytes {
            let chunk_len = (total_bytes - offset).min(28);
            let abs_offset = (layer_byte_offset + offset) as u16;
            let [off_hi, off_lo] = abs_offset.to_be_bytes();
            let resp =
                self.hid_command(CMD_KEYMAP_GET_BUFFER, &[off_hi, off_lo, chunk_len as u8])?;
            raw_bytes.extend_from_slice(&resp[4..4 + chunk_len]);
            offset += chunk_len;
        }

        let mut keycodes = Vec::with_capacity(cells);
        for pair in raw_bytes.chunks_exact(2) {
            keycodes.push(u16::from_be_bytes([pair[0], pair[1]]));
        }
        Ok(keycodes)
    }

    /// Reads all layers (`0..layers_count`).
    pub fn read_all_layers(&self, layers_count: u8, rows: u8, cols: u8) -> Result<Vec<Vec<u16>>> {
        let mut layers = Vec::with_capacity(layers_count as usize);
        for l in 0..layers_count {
            layers.push(self.read_layer_matrix(l, rows, cols)?);
        }
        Ok(layers)
    }

    /// Bulk-writes all layers (`layers[layer][row * cols + col]`) in 28-byte chunks.
    pub fn write_all_layers(&self, layers: &[Vec<u16>]) -> Result<()> {
        let mut flat_bytes = Vec::new();
        for layer in layers {
            for &kc in layer {
                let [hi, lo] = kc.to_be_bytes();
                flat_bytes.push(hi);
                flat_bytes.push(lo);
            }
        }

        let mut offset = 0usize;
        while offset < flat_bytes.len() {
            let chunk_len = (flat_bytes.len() - offset).min(28);
            let [off_hi, off_lo] = (offset as u16).to_be_bytes();
            let mut args = Vec::with_capacity(3 + chunk_len);
            args.push(off_hi);
            args.push(off_lo);
            args.push(chunk_len as u8);
            args.extend_from_slice(&flat_bytes[offset..offset + chunk_len]);
            self.hid_command(CMD_KEYMAP_SET_BUFFER, &args)?;
            offset += chunk_len;
        }
        Ok(())
    }

    // =========================================================================
    // Declarative Lighting Controls (Driven by def.capabilities.lighting)
    // =========================================================================

    pub fn get_lighting_config(&self, def: &KeyboardDefinition) -> Result<LightingConfig> {
        let Some(ref spec) = def.capabilities.lighting else {
            return Ok(LightingConfig::default());
        };
        let vars = TemplateVars::default();
        let brightness = self.exec_get_template(&spec.get_brightness, &vars)?;
        let mut mode = self.exec_get_template(&spec.get_mode, &vars)?;
        if mode == 0 {
            mode = spec
                .effects
                .first()
                .map(|e| e.id)
                .unwrap_or(12);
        }
        let speed = self
            .exec_get_template(&spec.get_speed, &vars)?
            .max(spec.speed_min);
        let (hue, sat) = self.exec_color_read_template(&spec.get_color, &vars)?;

        let mut sleep_timeout = 5u8;
        if let Some(slp_ctrl) = def
            .capabilities
            .custom_controls
            .iter()
            .find(|c| c.id == "sleep_timeout")
        {
            if let Ok(v) = self.get_custom_control(slp_ctrl) {
                sleep_timeout = v;
            }
        }

        Ok(LightingConfig {
            mode,
            brightness,
            speed,
            hue,
            sat,
            color_hex: hs_to_hex(hue, sat),
            sleep_timeout,
        })
    }

    pub fn set_rgb_mode(&self, def: &KeyboardDefinition, mode: u8, save: bool) -> Result<()> {
        let Some(ref spec) = def.capabilities.lighting else {
            return Ok(());
        };
        let vars = TemplateVars {
            val: mode,
            ..Default::default()
        };
        self.exec_set_template(&spec.set_mode, &vars)?;
        if save {
            self.save_lighting(def)?;
        }
        Ok(())
    }

    pub fn set_effect_brightness(
        &self,
        def: &KeyboardDefinition,
        brightness: u8,
        save: bool,
    ) -> Result<()> {
        let Some(ref spec) = def.capabilities.lighting else {
            return Ok(());
        };
        let vars = TemplateVars {
            val: brightness,
            ..Default::default()
        };
        self.exec_set_template(&spec.set_brightness, &vars)?;
        if save {
            self.save_lighting(def)?;
        }
        Ok(())
    }

    pub fn set_effect_speed(
        &self,
        def: &KeyboardDefinition,
        speed: u8,
        save: bool,
    ) -> Result<()> {
        let Some(ref spec) = def.capabilities.lighting else {
            return Ok(());
        };
        let vars = TemplateVars {
            val: speed,
            ..Default::default()
        };
        self.exec_set_template(&spec.set_speed, &vars)?;
        if save {
            self.save_lighting(def)?;
        }
        Ok(())
    }

    pub fn set_effect_color(
        &self,
        def: &KeyboardDefinition,
        hue: u8,
        sat: u8,
        save: bool,
    ) -> Result<()> {
        let Some(ref spec) = def.capabilities.lighting else {
            return Ok(());
        };
        let vars = TemplateVars {
            hue,
            sat,
            ..Default::default()
        };
        self.exec_set_template(&spec.set_color, &vars)?;
        if save {
            self.save_lighting(def)?;
        }
        Ok(())
    }

    pub fn save_lighting(&self, def: &KeyboardDefinition) -> Result<()> {
        let Some(ref spec) = def.capabilities.lighting else {
            return Ok(());
        };
        self.exec_set_template(&spec.save, &TemplateVars::default())?;
        Ok(())
    }

    // =========================================================================
    // Declarative Per-Key RGB Matrix (Driven by def.capabilities.lighting.per_key_rgb)
    // =========================================================================

    pub fn get_key_color(
        &self,
        def: &KeyboardDefinition,
        row: u8,
        col: u8,
    ) -> Result<PerKeyRgbCell> {
        let Some(ref pk_spec) = def
            .capabilities
            .lighting
            .as_ref()
            .and_then(|l| l.per_key_rgb.as_ref())
        else {
            return Ok(PerKeyRgbCell::from_hs(row, col, 0, 0));
        };
        let vars = TemplateVars {
            row,
            col,
            ..Default::default()
        };
        let (hue, sat) = self.exec_color_read_template(&pk_spec.get, &vars)?;
        Ok(PerKeyRgbCell::from_hs(row, col, hue, sat))
    }

    /// Reads the entire per-key RGB matrix defined by `def.matrix` and `active_led_coordinates(def)`.
    pub fn get_all_key_colors(&self, def: &KeyboardDefinition) -> Result<Vec<PerKeyRgbCell>> {
        let rows = def.matrix.rows;
        let cols = def.matrix.cols;
        let has_per_key = def
            .capabilities
            .lighting
            .as_ref()
            .and_then(|l| l.per_key_rgb.as_ref())
            .is_some();

        let mut queried: HashMap<(u8, u8), PerKeyRgbCell> = HashMap::new();
        if has_per_key {
            let active = active_led_coordinates(def);
            queried.reserve(active.len());
            for (r, c) in active {
                let cell = self.get_key_color(def, r, c)?;
                queried.insert((r, c), cell);
            }
        }

        let mut all = Vec::with_capacity((rows as usize) * (cols as usize));
        for r in 0..rows {
            for c in 0..cols {
                if let Some(cell) = queried.remove(&(r, c)) {
                    all.push(cell);
                } else {
                    all.push(PerKeyRgbCell::from_hs(r, c, 0, 0));
                }
            }
        }
        Ok(all)
    }

    pub fn set_raw_led_color(
        &self,
        def: &KeyboardDefinition,
        row: u8,
        col: u8,
        hue: u8,
        sat: u8,
    ) -> Result<()> {
        let Some(ref pk_spec) = def
            .capabilities
            .lighting
            .as_ref()
            .and_then(|l| l.per_key_rgb.as_ref())
        else {
            return Ok(());
        };
        let vars = TemplateVars {
            row,
            col,
            hue,
            sat,
            ..Default::default()
        };
        self.exec_set_template(&pk_spec.set, &vars)?;
        Ok(())
    }

    /// Batch-updates multiple per-key RGB cells.
    /// If `unified_zones` is true, any update to a switch coordinate defined in `def.layouts.multi_led_keys`
    /// automatically expands to all `led_cells` in that zone.
    pub fn set_key_colors_batch(
        &self,
        def: &KeyboardDefinition,
        updates: &[(u8, u8, u8, u8)], // (row, col, hue, sat)
        unified_zones: bool,
        commit_eeprom: bool,
    ) -> Result<()> {
        let Some(ref pk_spec) = def
            .capabilities
            .lighting
            .as_ref()
            .and_then(|l| l.per_key_rgb.as_ref())
        else {
            return Ok(());
        };
        let delay_ms = pk_spec.inter_packet_delay_ms;

        for &(row, col, hue, sat) in updates {
            if unified_zones {
                if let Some(zone) = def
                    .layouts
                    .multi_led_keys
                    .iter()
                    .find(|z| z.switch_row == row && z.switch_col == col)
                {
                    for cell in &zone.led_cells {
                        self.set_raw_led_color(def, cell.row, cell.col, hue, sat)?;
                        if delay_ms > 0 {
                            thread::sleep(Duration::from_millis(delay_ms));
                        }
                    }
                    continue;
                }
            }
            self.set_raw_led_color(def, row, col, hue, sat)?;
            if delay_ms > 0 && updates.len() > 1 {
                thread::sleep(Duration::from_millis(delay_ms));
            }
        }
        if commit_eeprom {
            self.save_key_colors(def)?;
        }
        Ok(())
    }

    pub fn save_key_colors(&self, def: &KeyboardDefinition) -> Result<()> {
        let Some(ref pk_spec) = def
            .capabilities
            .lighting
            .as_ref()
            .and_then(|l| l.per_key_rgb.as_ref())
        else {
            return Ok(());
        };
        if let Some(ref save_tpl) = pk_spec.save {
            self.exec_set_template(save_tpl, &TemplateVars::default())?;
        }
        Ok(())
    }

    // =========================================================================
    // Declarative Custom Hardware Controls (def.capabilities.custom_controls)
    // =========================================================================

    pub fn get_custom_control(&self, ctrl: &CustomControlSpec) -> Result<u8> {
        let Some(ref get_tpl) = ctrl.get else {
            return Ok(ctrl.default_value);
        };
        self.exec_get_template(get_tpl, &TemplateVars::default())
    }

    pub fn set_custom_control(&self, ctrl: &CustomControlSpec, val: u8) -> Result<()> {
        let vars = TemplateVars {
            val,
            ..Default::default()
        };
        self.exec_set_template(&ctrl.set, &vars)?;
        if let Some(ref save_tpl) = ctrl.save {
            self.exec_set_template(save_tpl, &vars)?;
        }
        Ok(())
    }

    pub fn read_all_custom_controls(&self, def: &KeyboardDefinition) -> HashMap<String, u8> {
        let mut map = HashMap::new();
        for ctrl in &def.capabilities.custom_controls {
            let val = self.get_custom_control(ctrl).unwrap_or(ctrl.default_value);
            map.insert(ctrl.id.clone(), val);
        }
        map
    }

    // =========================================================================
    // Switch Matrix State, Macros, Reset
    // =========================================================================

    /// Polls `SWITCH_MATRIX_STATE` (`[0x02, 0x03, offset]`) across 28-byte chunks if `total_bytes > 28`
    /// and returns a list of `(row, col)` currently pressed.
    pub fn get_pressed_matrix_keys(&self, rows: u8, cols: u8) -> Result<Vec<(u8, u8)>> {
        let bytes_per_row = ((cols as usize) + 7) / 8;
        let total_bytes = (rows as usize) * bytes_per_row;
        let mut raw_matrix = Vec::with_capacity(total_bytes);

        let mut offset = 0usize;
        while offset < total_bytes {
            let resp = self.hid_command(
                CMD_GET_KEYBOARD_VALUE,
                &[SUB_SWITCH_MATRIX_STATE, offset as u8],
            )?;
            if resp[0] != CMD_GET_KEYBOARD_VALUE || resp[1] != SUB_SWITCH_MATRIX_STATE {
                return Ok(Vec::new());
            }
            let chunk_len = (total_bytes - offset).min(28);
            raw_matrix.extend_from_slice(&resp[3..3 + chunk_len]);
            offset += chunk_len;
        }

        let mut pressed = Vec::new();
        for r in 0..(rows as usize) {
            let row_slice_start = r * bytes_per_row;
            if row_slice_start + bytes_per_row > raw_matrix.len() {
                break;
            }
            let row_bytes = &raw_matrix[row_slice_start..row_slice_start + bytes_per_row];
            // QMK packs each row big-endian across `bytes_per_row`
            let mut row_bits: u32 = 0;
            for &b in row_bytes {
                row_bits = (row_bits << 8) | (b as u32);
            }
            for c in 0..(cols as usize) {
                if (row_bits & (1 << c)) != 0 {
                    pressed.push((r as u8, c as u8));
                }
            }
        }
        Ok(pressed)
    }

    pub fn get_macro_count(&self) -> Result<u8> {
        let resp = self.hid_command(CMD_MACRO_GET_COUNT, &[])?;
        Ok(resp[1].max(16))
    }

    pub fn get_macro_buffer_size(&self) -> Result<u16> {
        let resp = self.hid_command(CMD_MACRO_GET_BUFFER_SIZE, &[])?;
        Ok(u16::from_be_bytes([resp[1], resp[2]]))
    }

    pub fn read_macros(&self) -> Result<Vec<MacroSlot>> {
        let count = self.get_macro_count()? as usize;
        let buf_size = self.get_macro_buffer_size()? as usize;
        if buf_size == 0 {
            return Ok((0..count)
                .map(|i| MacroSlot {
                    index: i as u8,
                    name: format!("M{}", i),
                    steps: Vec::new(),
                })
                .collect());
        }

        let mut raw = Vec::with_capacity(buf_size);
        let mut offset = 0usize;
        while offset < buf_size {
            let chunk_len = (buf_size - offset).min(28);
            let [off_hi, off_lo] = (offset as u16).to_be_bytes();
            let resp =
                self.hid_command(CMD_MACRO_GET_BUFFER, &[off_hi, off_lo, chunk_len as u8])?;
            raw.extend_from_slice(&resp[4..4 + chunk_len]);
            offset += chunk_len;
        }

        Ok(decode_macros_from_buffer(&raw, count))
    }

    pub fn write_macros(&self, slots: &[MacroSlot]) -> Result<()> {
        let count = self.get_macro_count()? as usize;
        let buf_size = self.get_macro_buffer_size()? as usize;
        if buf_size == 0 {
            return Err(anyhow!("Keyboard reported macro buffer size 0"));
        }

        let bytes = encode_macros_to_buffer(slots, count, buf_size)?;
        let last_byte_offset = (buf_size - 1) as u16;
        let [last_hi, last_lo] = last_byte_offset.to_be_bytes();

        self.hid_command(CMD_MACRO_RESET, &[])?;
        // Set dirty marker at end of buffer during write (VIA specification)
        self.hid_command(CMD_MACRO_SET_BUFFER, &[last_hi, last_lo, 1, 0xFF])?;

        let write_res = (|| -> Result<()> {
            let mut offset = 0usize;
            while offset < bytes.len() {
                let chunk_len = (bytes.len() - offset).min(28);
                let [off_hi, off_lo] = (offset as u16).to_be_bytes();
                let mut args = Vec::with_capacity(3 + chunk_len);
                args.push(off_hi);
                args.push(off_lo);
                args.push(chunk_len as u8);
                args.extend_from_slice(&bytes[offset..offset + chunk_len]);
                self.hid_command(CMD_MACRO_SET_BUFFER, &args)?;
                offset += chunk_len;
            }
            Ok(())
        })();

        // Always clear dirty marker at end of buffer
        let _ = self.hid_command(CMD_MACRO_SET_BUFFER, &[last_hi, last_lo, 1, 0x00]);
        write_res
    }

    pub fn reset_eeprom(&self) -> Result<()> {
        self.hid_command(CMD_EEPROM_RESET, &[])?;
        thread::sleep(Duration::from_millis(350));
        Ok(())
    }
}
