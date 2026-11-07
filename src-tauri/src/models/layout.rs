pub use crate::models::registry::{
    active_led_coordinates, default_definition, find_definition_by_id, find_definition_by_vid_pid,
    generic_fallback_definition, load_all_definitions, CustomKeycodeDef, KeyboardDefinition,
    LayoutKey, LayoutsBlock, MatrixDim, MultiLedCell, MultiLedKeyZone,
};

pub const RAW_HID_USAGE_PAGE: u16 = 0xFF60;
pub const RAW_HID_USAGE: u16 = 0x0061;
pub const DEFAULT_LAYERS: u8 = 4;
