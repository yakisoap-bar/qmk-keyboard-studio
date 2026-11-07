use crate::hid::macros::{decode_macros_from_buffer, encode_macros_to_buffer};
use crate::models::profile::MacroSlot;
use anyhow::{anyhow, bail, Context, Result};
use hidapi::HidDevice;
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
                bail!(
                    "Timed out waiting for response to HID command 0x{:02X}",
                    cmd
                );
            }
            if resp[0] == cmd || resp[0] == 0xFF {
                return Ok(resp);
            }
        }

        Ok(resp)
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
    fn via_lighting_command(&self, command: u8, args: &[u8]) -> Result<[u8; 32]> {
        let response = self.hid_command(command, args)?;
        if response[0] != command || !response[1..].starts_with(&args[..args.len().min(2)]) {
            bail!("Firmware rejected VIA lighting command");
        }
        Ok(response)
    }

    pub fn get_via_lighting(
        &self,
        ctrl: &crate::models::registry::ViaLightingControl,
    ) -> Result<Vec<u8>> {
        let mut args = vec![ctrl.channel, ctrl.value];
        args.extend_from_slice(&ctrl.arguments);
        let response = self.via_lighting_command(CMD_CUSTOM_MENU_GET_VALUE, &args)?;
        let start = 1 + args.len();
        if start + ctrl.byte_count() > response.len() {
            bail!("Lighting response exceeds HID packet");
        }
        Ok(response[start..start + ctrl.byte_count()].to_vec())
    }

    pub fn set_via_lighting(
        &self,
        ctrl: &crate::models::registry::ViaLightingControl,
        value: &[u8],
        save: bool,
    ) -> Result<()> {
        ctrl.validate(value)?;
        let mut args = vec![ctrl.channel, ctrl.value];
        args.extend_from_slice(&ctrl.arguments);
        args.extend_from_slice(value);
        if args.len() > 31 {
            bail!("Lighting command exceeds HID packet");
        }
        self.via_lighting_command(CMD_CUSTOM_MENU_SET_VALUE, &args)?;
        if save {
            self.via_lighting_command(CMD_CUSTOM_MENU_SAVE, &[ctrl.channel])?;
        }
        Ok(())
    }

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
