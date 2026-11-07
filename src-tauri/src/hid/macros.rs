use crate::models::keycodes::{dom_code_to_qmk_byte, qmk_byte_to_dom_code};
use crate::models::profile::{MacroSlot, MacroStep};
use anyhow::{bail, Result};

/// Encodes `MacroSlot` list into the raw QMK dynamic macro byte buffer.
/// Fixes the web driver's bug where `delay == 0` emitted a dangling `[0x01, 0x04]` without digits or `'|'`.
pub fn encode_macros_to_buffer(slots: &[MacroSlot], macro_count: usize, max_buffer_size: usize) -> Result<Vec<u8>> {
    let mut out = Vec::new();

    for slot_idx in 0..macro_count {
        if let Some(slot) = slots.iter().find(|s| s.index as usize == slot_idx) {
            for step in &slot.steps {
                let Some(kc_byte) = dom_code_to_qmk_byte(&step.code) else {
                    continue;
                };
                out.push(0x01); // SS_QMK_PREFIX
                match step.action.as_str() {
                    "keyup" => out.push(0x03), // SS_UP_CODE
                    _ => out.push(0x02),       // SS_DOWN_CODE
                }
                out.push(kc_byte);

                // Only emit SS_DELAY_CODE (0x01, 0x04, digits..., '|') when delay > 0!
                if step.delay > 0 {
                    out.push(0x01);
                    out.push(0x04);
                    for ch in step.delay.to_string().bytes() {
                        out.push(ch);
                    }
                    out.push(b'|');
                }
            }
        }
        // Null byte terminates each macro slot
        out.push(0x00);
    }

    if out.len() > max_buffer_size {
        bail!(
            "Encoded macros ({} bytes) exceed keyboard macro buffer capacity ({} bytes)",
            out.len(),
            max_buffer_size
        );
    }

    Ok(out)
}

/// Decodes raw QMK macro buffer bytes from the keyboard into `MacroSlot` structs (`M0..M{count-1}`).
pub fn decode_macros_from_buffer(buf: &[u8], macro_count: usize) -> Vec<MacroSlot> {
    let mut slots = Vec::with_capacity(macro_count);
    let mut pos = 0;

    for slot_idx in 0..macro_count {
        let mut steps: Vec<MacroStep> = Vec::new();

        while pos < buf.len() {
            let b = buf[pos];
            pos += 1;

            if b == 0x00 || b == 0xFF {
                // End of current macro string (0x00) or uninitialized EEPROM (0xFF)
                break;
            }

            if b == 0x01 && pos < buf.len() {
                let sub = buf[pos];
                pos += 1;
                match sub {
                    // SS_TAP (1), SS_DOWN (2), SS_UP (3)
                    0x01..=0x03 => {
                        if pos < buf.len() {
                            let kc = buf[pos];
                            pos += 1;
                            let (code, label) = qmk_byte_to_dom_code(kc);
                            if sub == 0x01 {
                                steps.push(MacroStep {
                                    action: "keydown".to_string(),
                                    code: code.to_string(),
                                    key: label.to_string(),
                                    delay: 0,
                                });
                                steps.push(MacroStep {
                                    action: "keyup".to_string(),
                                    code: code.to_string(),
                                    key: label.to_string(),
                                    delay: 0,
                                });
                            } else {
                                steps.push(MacroStep {
                                    action: if sub == 0x02 {
                                        "keydown".to_string()
                                    } else {
                                        "keyup".to_string()
                                    },
                                    code: code.to_string(),
                                    key: label.to_string(),
                                    delay: 0,
                                });
                            }
                        }
                    }
                    // SS_DELAY (4): digits until '|' (124)
                    0x04 => {
                        let mut delay_ms: u32 = 0;
                        let mut saw_digit = false;
                        while pos < buf.len() {
                            let d = buf[pos];
                            pos += 1;
                            if d == b'|' {
                                break;
                            } else if d.is_ascii_digit() {
                                saw_digit = true;
                                delay_ms = delay_ms.saturating_mul(10).saturating_add((d - b'0') as u32);
                            } else {
                                // Recover gracefully from corrupted web-driver [1, 4] without '|'
                                pos -= 1;
                                break;
                            }
                        }
                        if saw_digit {
                            if let Some(last) = steps.last_mut() {
                                last.delay = delay_ms;
                            }
                        }
                    }
                    _ => {}
                }
            }
        }

        slots.push(MacroSlot {
            index: slot_idx as u8,
            name: format!("M{}", slot_idx),
            steps,
        });
    }

    slots
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_macro_roundtrip_with_zero_and_nonzero_delays() {
        let slots = vec![
            MacroSlot {
                index: 0,
                name: "M0".to_string(),
                steps: vec![
                    MacroStep {
                        action: "keydown".to_string(),
                        code: "KeyH".to_string(),
                        key: "H".to_string(),
                        delay: 25,
                    },
                    MacroStep {
                        action: "keyup".to_string(),
                        code: "KeyH".to_string(),
                        key: "H".to_string(),
                        delay: 0,
                    },
                ],
            },
            MacroSlot {
                index: 1,
                name: "M1".to_string(),
                steps: vec![],
            },
        ];

        let encoded = encode_macros_to_buffer(&slots, 2, 512).unwrap();
        // Verify no dangling [1, 4] after the keyup with delay == 0
        assert_eq!(
            encoded,
            vec![1, 2, 11, 1, 4, b'2', b'5', b'|', 1, 3, 11, 0, 0]
        );

        let decoded = decode_macros_from_buffer(&encoded, 2);
        assert_eq!(decoded[0].steps, slots[0].steps);
        assert!(decoded[1].steps.is_empty());
    }
}
