import { CustomKeycodeDef } from "../utils/kleParser";

export interface KeycodeEntry {
  code: string;
  name: string;
  shortName?: string;
  title?: string;
  category:
    | "basic"
    | "numpad"
    | "navigation"
    | "media"
    | "lighting"
    | "layer"
    | "macro"
    | "custom"
    | "mouse";
}

export interface ProtocolKeyRanges {
  QK_MODS: number;
  QK_MODS_MAX: number;
  QK_MOD_TAP: number;
  QK_MOD_TAP_MAX: number;
  QK_LAYER_TAP: number;
  QK_LAYER_TAP_MAX: number;
  QK_LAYER_MOD: number;
  QK_LAYER_MOD_MAX: number;
  QK_TO: number;
  QK_TO_MAX: number;
  QK_MOMENTARY: number;
  QK_MOMENTARY_MAX: number;
  QK_DEF_LAYER: number;
  QK_DEF_LAYER_MAX: number;
  QK_TOGGLE_LAYER: number;
  QK_TOGGLE_LAYER_MAX: number;
  QK_ONE_SHOT_LAYER: number;
  QK_ONE_SHOT_LAYER_MAX: number;
  QK_ONE_SHOT_MOD: number;
  QK_ONE_SHOT_MOD_MAX: number;
  QK_LAYER_TAP_TOGGLE: number;
  QK_LAYER_TAP_TOGGLE_MAX: number;
  QK_MACRO: number;
  QK_MACRO_MAX: number;
  QK_KB: number;
  QK_KB_MAX: number;
}

export function getProtocolRanges(version = 11): ProtocolKeyRanges {
  if (version === 12 || version === 13) {
    return {
      QK_MODS: 256,
      QK_MODS_MAX: 8191,
      QK_MOD_TAP: 8192,
      QK_MOD_TAP_MAX: 16383,
      QK_LAYER_TAP: 16384,
      QK_LAYER_TAP_MAX: 20479,
      QK_LAYER_MOD: 20480,
      QK_LAYER_MOD_MAX: 20991,
      QK_TO: 20992,
      QK_TO_MAX: 21023,
      QK_MOMENTARY: 21024,
      QK_MOMENTARY_MAX: 21055,
      QK_DEF_LAYER: 21056,
      QK_DEF_LAYER_MAX: 21087,
      QK_TOGGLE_LAYER: 21088,
      QK_TOGGLE_LAYER_MAX: 21119,
      QK_ONE_SHOT_LAYER: 21120,
      QK_ONE_SHOT_LAYER_MAX: 21151,
      QK_ONE_SHOT_MOD: 21152,
      QK_ONE_SHOT_MOD_MAX: 21183,
      QK_LAYER_TAP_TOGGLE: 21184,
      QK_LAYER_TAP_TOGGLE_MAX: 21215,
      QK_MACRO: 30464,
      QK_MACRO_MAX: 30591,
      QK_KB: 32256,
      QK_KB_MAX: 32511,
    };
  }
  if (version === 11) {
    return {
      QK_MODS: 256,
      QK_MODS_MAX: 8191,
      QK_MOD_TAP: 8192,
      QK_MOD_TAP_MAX: 16383,
      QK_LAYER_TAP: 16384,
      QK_LAYER_TAP_MAX: 20479,
      QK_LAYER_MOD: 20480,
      QK_LAYER_MOD_MAX: 20991,
      QK_TO: 20992,
      QK_TO_MAX: 21023,
      QK_MOMENTARY: 21024,
      QK_MOMENTARY_MAX: 21055,
      QK_DEF_LAYER: 21056,
      QK_DEF_LAYER_MAX: 21087,
      QK_TOGGLE_LAYER: 21088,
      QK_TOGGLE_LAYER_MAX: 21119,
      QK_ONE_SHOT_LAYER: 21120,
      QK_ONE_SHOT_LAYER_MAX: 21151,
      QK_ONE_SHOT_MOD: 21152,
      QK_ONE_SHOT_MOD_MAX: 21183,
      QK_LAYER_TAP_TOGGLE: 21184,
      QK_LAYER_TAP_TOGGLE_MAX: 21215,
      QK_MACRO: 30466,
      QK_MACRO_MAX: 30481,
      QK_KB: 32512,
      QK_KB_MAX: 32767,
    };
  }
  return {
    QK_MODS: 256,
    QK_MODS_MAX: 8191,
    QK_MOD_TAP: 24576,
    QK_MOD_TAP_MAX: 32767,
    QK_LAYER_TAP: 16384,
    QK_LAYER_TAP_MAX: 20479,
    QK_LAYER_MOD: 22784,
    QK_LAYER_MOD_MAX: 23039,
    QK_TO: 20480,
    QK_TO_MAX: 20511,
    QK_MOMENTARY: 20736,
    QK_MOMENTARY_MAX: 20767,
    QK_DEF_LAYER: 20992,
    QK_DEF_LAYER_MAX: 21023,
    QK_TOGGLE_LAYER: 21248,
    QK_TOGGLE_LAYER_MAX: 21279,
    QK_ONE_SHOT_LAYER: 21504,
    QK_ONE_SHOT_LAYER_MAX: 21535,
    QK_ONE_SHOT_MOD: 21760,
    QK_ONE_SHOT_MOD_MAX: 22015,
    QK_LAYER_TAP_TOGGLE: 22528,
    QK_LAYER_TAP_TOGGLE_MAX: 22559,
    QK_MACRO: 24338,
    QK_MACRO_MAX: 24353,
    QK_KB: 24448,
    QK_KB_MAX: 24463,
  };
}

export const BASIC_KEYCODE_VALUES: Record<string, number> = {
  KC_NO: 0,
  KC_TRNS: 1,
  KC_A: 4,
  KC_B: 5,
  KC_C: 6,
  KC_D: 7,
  KC_E: 8,
  KC_F: 9,
  KC_G: 10,
  KC_H: 11,
  KC_I: 12,
  KC_J: 13,
  KC_K: 14,
  KC_L: 15,
  KC_M: 16,
  KC_N: 17,
  KC_O: 18,
  KC_P: 19,
  KC_Q: 20,
  KC_R: 21,
  KC_S: 22,
  KC_T: 23,
  KC_U: 24,
  KC_V: 25,
  KC_W: 26,
  KC_X: 27,
  KC_Y: 28,
  KC_Z: 29,
  KC_1: 30,
  KC_2: 31,
  KC_3: 32,
  KC_4: 33,
  KC_5: 34,
  KC_6: 35,
  KC_7: 36,
  KC_8: 37,
  KC_9: 38,
  KC_0: 39,
  KC_ENT: 40,
  KC_ESC: 41,
  KC_BSPC: 42,
  KC_TAB: 43,
  KC_SPC: 44,
  KC_MINS: 45,
  KC_EQL: 46,
  KC_LBRC: 47,
  KC_RBRC: 48,
  KC_BSLS: 49,
  KC_NUHS: 50,
  KC_SCLN: 51,
  KC_QUOT: 52,
  KC_GRV: 53,
  KC_COMM: 54,
  KC_DOT: 55,
  KC_SLSH: 56,
  KC_CAPS: 57,
  KC_F1: 58,
  KC_F2: 59,
  KC_F3: 60,
  KC_F4: 61,
  KC_F5: 62,
  KC_F6: 63,
  KC_F7: 64,
  KC_F8: 65,
  KC_F9: 66,
  KC_F10: 67,
  KC_F11: 68,
  KC_F12: 69,
  KC_PSCR: 70,
  KC_SLCK: 71,
  KC_PAUS: 72,
  KC_INS: 73,
  KC_HOME: 74,
  KC_PGUP: 75,
  KC_DEL: 76,
  KC_END: 77,
  KC_PGDN: 78,
  KC_RGHT: 79,
  KC_LEFT: 80,
  KC_DOWN: 81,
  KC_UP: 82,
  KC_NLCK: 83,
  KC_PSLS: 84,
  KC_PAST: 85,
  KC_PMNS: 86,
  KC_PPLS: 87,
  KC_PENT: 88,
  KC_P1: 89,
  KC_P2: 90,
  KC_P3: 91,
  KC_P4: 92,
  KC_P5: 93,
  KC_P6: 94,
  KC_P7: 95,
  KC_P8: 96,
  KC_P9: 97,
  KC_P0: 98,
  KC_PDOT: 99,
  KC_NUBS: 100,
  KC_APP: 101,
  KC_POWER: 102,
  KC_PEQL: 103,
  KC_F13: 104,
  KC_F14: 105,
  KC_F15: 106,
  KC_F16: 107,
  KC_F17: 108,
  KC_F18: 109,
  KC_F19: 110,
  KC_F20: 111,
  KC_F21: 112,
  KC_F22: 113,
  KC_F23: 114,
  KC_F24: 115,
  KC_UNDO: 122,
  KC_CUT: 123,
  KC_COPY: 124,
  KC_PASTE: 125,
  KC_FIND: 126,
  KC_PCMM: 133,
  KC_PWR: 165,
  KC_SLEP: 166,
  KC_WAKE: 167,
  KC_MUTE: 168,
  KC_VOLU: 169,
  KC_VOLD: 170,
  KC_MNXT: 171,
  KC_MPRV: 172,
  KC_MSTP: 173,
  KC_MPLY: 174,
  KC_MSEL: 175,
  KC_EJCT: 176,
  KC_MAIL: 177,
  KC_CALC: 178,
  KC_MYCM: 179,
  KC_WWW_SEARCH: 180,
  KC_WWW_HOME: 181,
  KC_WWW_BACK: 182,
  KC_WWW_FORWARD: 183,
  KC_WWW_STOP: 184,
  KC_WWW_REFRESH: 185,
  KC_WWW_FAVORITES: 186,
  KC_MFFD: 187,
  KC_MRWD: 188,
  KC_BRIU: 189,
  KC_BRID: 190,
  KC_MS_UP: 205,
  KC_MS_DOWN: 206,
  KC_MS_LEFT: 207,
  KC_MS_RIGHT: 208,
  KC_MS_BTN1: 209,
  KC_MS_BTN2: 210,
  KC_MS_BTN3: 211,
  KC_MS_BTN4: 212,
  KC_MS_BTN5: 213,
  KC_MS_WH_UP: 217,
  KC_MS_WH_DOWN: 218,
  KC_MS_WH_LEFT: 219,
  KC_MS_WH_RIGHT: 220,
  KC_MS_ACCEL0: 221,
  KC_MS_ACCEL1: 222,
  KC_MS_ACCEL2: 223,
  KC_LCTL: 224,
  KC_LSFT: 225,
  KC_LALT: 226,
  KC_LGUI: 227,
  KC_RCTL: 228,
  KC_RSFT: 229,
  KC_RALT: 230,
  KC_RGUI: 231,
  MAGIC_TOGGLE_NKRO: 28691,
  RGB_TOG: 30752,
  RGB_MOD: 30753,
  RGB_RMOD: 30754,
  RGB_HUI: 30755,
  RGB_HUD: 30756,
  RGB_SAI: 30757,
  RGB_SAD: 30758,
  RGB_VAI: 30759,
  RGB_VAD: 30760,
  RGB_SPI: 30761,
  RGB_SPD: 30762,
  RESET: 31744,
  QK_CLEAR_EEPROM: 31747,
};

export const KEYCODE_CATALOG: KeycodeEntry[] = [
  // Basic
  { code: "KC_NO", name: "None", shortName: "None", title: "No action (KC_NO)", category: "basic" },
  { code: "KC_TRNS", name: "▽ Pass", shortName: "▽", title: "Transparent / Pass-through to lower layer (KC_TRNS)", category: "basic" },
  { code: "KC_ESC", name: "Esc", category: "basic" },
  { code: "KC_A", name: "A", category: "basic" },
  { code: "KC_B", name: "B", category: "basic" },
  { code: "KC_C", name: "C", category: "basic" },
  { code: "KC_D", name: "D", category: "basic" },
  { code: "KC_E", name: "E", category: "basic" },
  { code: "KC_F", name: "F", category: "basic" },
  { code: "KC_G", name: "G", category: "basic" },
  { code: "KC_H", name: "H", category: "basic" },
  { code: "KC_I", name: "I", category: "basic" },
  { code: "KC_J", name: "J", category: "basic" },
  { code: "KC_K", name: "K", category: "basic" },
  { code: "KC_L", name: "L", category: "basic" },
  { code: "KC_M", name: "M", category: "basic" },
  { code: "KC_N", name: "N", category: "basic" },
  { code: "KC_O", name: "O", category: "basic" },
  { code: "KC_P", name: "P", category: "basic" },
  { code: "KC_Q", name: "Q", category: "basic" },
  { code: "KC_R", name: "R", category: "basic" },
  { code: "KC_S", name: "S", category: "basic" },
  { code: "KC_T", name: "T", category: "basic" },
  { code: "KC_U", name: "U", category: "basic" },
  { code: "KC_V", name: "V", category: "basic" },
  { code: "KC_W", name: "W", category: "basic" },
  { code: "KC_X", name: "X", category: "basic" },
  { code: "KC_Y", name: "Y", category: "basic" },
  { code: "KC_Z", name: "Z", category: "basic" },
  { code: "KC_1", name: "1 !", shortName: "1", category: "basic" },
  { code: "KC_2", name: "2 @", shortName: "2", category: "basic" },
  { code: "KC_3", name: "3 #", shortName: "3", category: "basic" },
  { code: "KC_4", name: "4 $", shortName: "4", category: "basic" },
  { code: "KC_5", name: "5 %", shortName: "5", category: "basic" },
  { code: "KC_6", name: "6 ^", shortName: "6", category: "basic" },
  { code: "KC_7", name: "7 &", shortName: "7", category: "basic" },
  { code: "KC_8", name: "8 *", shortName: "8", category: "basic" },
  { code: "KC_9", name: "9 (", shortName: "9", category: "basic" },
  { code: "KC_0", name: "0 )", shortName: "0", category: "basic" },
  { code: "KC_MINS", name: "- _", shortName: "-", category: "basic" },
  { code: "KC_EQL", name: "= +", shortName: "=", category: "basic" },
  { code: "KC_GRV", name: "` ~", shortName: "`", category: "basic" },
  { code: "KC_LBRC", name: "[ {", shortName: "[", category: "basic" },
  { code: "KC_RBRC", name: "] }", shortName: "]", category: "basic" },
  { code: "KC_BSLS", name: "\\ |", shortName: "\\", category: "basic" },
  { code: "KC_SCLN", name: "; :", shortName: ";", category: "basic" },
  { code: "KC_QUOT", name: "' \"", shortName: "'", category: "basic" },
  { code: "KC_COMM", name: ", <", shortName: ",", category: "basic" },
  { code: "KC_DOT", name: ". >", shortName: ".", category: "basic" },
  { code: "KC_SLSH", name: "/ ?", shortName: "/", category: "basic" },
  { code: "KC_TAB", name: "Tab", category: "basic" },
  { code: "KC_CAPS", name: "Caps Lock", shortName: "Caps", category: "basic" },
  { code: "KC_SPC", name: "Space", category: "basic" },
  { code: "KC_ENT", name: "Enter", category: "basic" },
  { code: "KC_BSPC", name: "Backspace", shortName: "Bksp", category: "basic" },
  { code: "KC_LCTL", name: "Left Ctrl", shortName: "LCtl", category: "basic" },
  { code: "KC_LSFT", name: "Left Shift", shortName: "LShft", category: "basic" },
  { code: "KC_LALT", name: "Left Alt", shortName: "LAlt", category: "basic" },
  { code: "KC_LGUI", name: "Left Win/Gui", shortName: "LWin", category: "basic" },
  { code: "KC_RCTL", name: "Right Ctrl", shortName: "RCtl", category: "basic" },
  { code: "KC_RSFT", name: "Right Shift", shortName: "RShft", category: "basic" },
  { code: "KC_RALT", name: "Right Alt", shortName: "RAlt", category: "basic" },
  { code: "KC_RGUI", name: "Right Win/Gui", shortName: "RWin", category: "basic" },
  { code: "KC_APP", name: "Menu / App", shortName: "Menu", category: "basic" },

  // Function & Navigation
  { code: "KC_F1", name: "F1", category: "navigation" },
  { code: "KC_F2", name: "F2", category: "navigation" },
  { code: "KC_F3", name: "F3", category: "navigation" },
  { code: "KC_F4", name: "F4", category: "navigation" },
  { code: "KC_F5", name: "F5", category: "navigation" },
  { code: "KC_F6", name: "F6", category: "navigation" },
  { code: "KC_F7", name: "F7", category: "navigation" },
  { code: "KC_F8", name: "F8", category: "navigation" },
  { code: "KC_F9", name: "F9", category: "navigation" },
  { code: "KC_F10", name: "F10", category: "navigation" },
  { code: "KC_F11", name: "F11", category: "navigation" },
  { code: "KC_F12", name: "F12", category: "navigation" },
  { code: "KC_F13", name: "F13", category: "navigation" },
  { code: "KC_F14", name: "F14", category: "navigation" },
  { code: "KC_F15", name: "F15", category: "navigation" },
  { code: "KC_F16", name: "F16", category: "navigation" },
  { code: "KC_F17", name: "F17", category: "navigation" },
  { code: "KC_F18", name: "F18", category: "navigation" },
  { code: "KC_F19", name: "F19", category: "navigation" },
  { code: "KC_F20", name: "F20", category: "navigation" },
  { code: "KC_F21", name: "F21", category: "navigation" },
  { code: "KC_F22", name: "F22", category: "navigation" },
  { code: "KC_F23", name: "F23", category: "navigation" },
  { code: "KC_F24", name: "F24", category: "navigation" },
  { code: "KC_PSCR", name: "Print Screen", shortName: "PrtSc", category: "navigation" },
  { code: "KC_SLCK", name: "Scroll Lock", shortName: "ScrLk", category: "navigation" },
  { code: "KC_PAUS", name: "Pause", category: "navigation" },
  { code: "KC_INS", name: "Insert", shortName: "Ins", category: "navigation" },
  { code: "KC_DEL", name: "Delete", shortName: "Del", category: "navigation" },
  { code: "KC_HOME", name: "Home", category: "navigation" },
  { code: "KC_END", name: "End", category: "navigation" },
  { code: "KC_PGUP", name: "Page Up", shortName: "PgUp", category: "navigation" },
  { code: "KC_PGDN", name: "Page Down", shortName: "PgDn", category: "navigation" },
  { code: "KC_UP", name: "↑ Up", shortName: "↑", category: "navigation" },
  { code: "KC_DOWN", name: "↓ Down", shortName: "↓", category: "navigation" },
  { code: "KC_LEFT", name: "← Left", shortName: "←", category: "navigation" },
  { code: "KC_RGHT", name: "→ Right", shortName: "→", category: "navigation" },

  // Numpad
  { code: "KC_NLCK", name: "Num Lock", shortName: "NLk", category: "numpad" },
  { code: "KC_PSLS", name: "Num /", shortName: "N /", category: "numpad" },
  { code: "KC_PAST", name: "Num *", shortName: "N *", category: "numpad" },
  { code: "KC_PMNS", name: "Num -", shortName: "N -", category: "numpad" },
  { code: "KC_PPLS", name: "Num +", shortName: "N +", category: "numpad" },
  { code: "KC_PENT", name: "Num Enter", shortName: "NEnt", category: "numpad" },
  { code: "KC_P1", name: "Num 1", shortName: "N1", category: "numpad" },
  { code: "KC_P2", name: "Num 2", shortName: "N2", category: "numpad" },
  { code: "KC_P3", name: "Num 3", shortName: "N3", category: "numpad" },
  { code: "KC_P4", name: "Num 4", shortName: "N4", category: "numpad" },
  { code: "KC_P5", name: "Num 5", shortName: "N5", category: "numpad" },
  { code: "KC_P6", name: "Num 6", shortName: "N6", category: "numpad" },
  { code: "KC_P7", name: "Num 7", shortName: "N7", category: "numpad" },
  { code: "KC_P8", name: "Num 8", shortName: "N8", category: "numpad" },
  { code: "KC_P9", name: "Num 9", shortName: "N9", category: "numpad" },
  { code: "KC_P0", name: "Num 0", shortName: "N0", category: "numpad" },
  { code: "KC_PDOT", name: "Num .", shortName: "N.", category: "numpad" },
  { code: "KC_PEQL", name: "Num =", shortName: "N=", category: "numpad" },

  // Media & System
  { code: "KC_MUTE", name: "Mute", category: "media" },
  { code: "KC_VOLU", name: "Vol +", category: "media" },
  { code: "KC_VOLD", name: "Vol -", category: "media" },
  { code: "KC_MPLY", name: "Play / Pause", shortName: "Play", category: "media" },
  { code: "KC_MSTP", name: "Media Stop", shortName: "Stop", category: "media" },
  { code: "KC_MPRV", name: "Prev Track", shortName: "Prev", category: "media" },
  { code: "KC_MNXT", name: "Next Track", shortName: "Next", category: "media" },
  { code: "KC_MSEL", name: "Media Player", shortName: "Media", category: "media" },
  { code: "KC_BRIU", name: "Screen Bright +", shortName: "Scr+", category: "media" },
  { code: "KC_BRID", name: "Screen Bright -", shortName: "Scr-", category: "media" },
  { code: "KC_CALC", name: "Calculator", shortName: "Calc", category: "media" },
  { code: "KC_MAIL", name: "Mail", category: "media" },
  { code: "KC_MYCM", name: "My Computer", shortName: "MyPC", category: "media" },
  { code: "KC_WWW_SEARCH", name: "Browser Search", shortName: "W.Srch", category: "media" },
  { code: "KC_WWW_HOME", name: "Browser Home", shortName: "W.Home", category: "media" },
  { code: "KC_WWW_BACK", name: "Browser Back", shortName: "W.Back", category: "media" },
  { code: "KC_WWW_FORWARD", name: "Browser Fwd", shortName: "W.Fwd", category: "media" },
  { code: "KC_WWW_REFRESH", name: "Browser Refresh", shortName: "W.Ref", category: "media" },
  { code: "KC_PWR", name: "System Power", shortName: "Power", category: "media" },
  { code: "KC_SLEP", name: "System Sleep", shortName: "Sleep", category: "media" },
  { code: "KC_WAKE", name: "System Wake", shortName: "Wake", category: "media" },

  // Lighting & Special
  { code: "RGB_TOG", name: "RGB Toggle", shortName: "RGBTg", category: "lighting" },
  { code: "RGB_MOD", name: "RGB Mode +", shortName: "RGBM+", category: "lighting" },
  { code: "RGB_RMOD", name: "RGB Mode -", shortName: "RGBM-", category: "lighting" },
  { code: "RGB_HUI", name: "Hue +", shortName: "Hue+", category: "lighting" },
  { code: "RGB_HUD", name: "Hue -", shortName: "Hue-", category: "lighting" },
  { code: "RGB_SAI", name: "Sat +", shortName: "Sat+", category: "lighting" },
  { code: "RGB_SAD", name: "Sat -", shortName: "Sat-", category: "lighting" },
  { code: "RGB_VAI", name: "Bright +", shortName: "Brt+", category: "lighting" },
  { code: "RGB_VAD", name: "Bright -", shortName: "Brt-", category: "lighting" },
  { code: "RGB_SPI", name: "Speed +", shortName: "Spd+", category: "lighting" },
  { code: "RGB_SPD", name: "Speed -", shortName: "Spd-", category: "lighting" },
  { code: "MAGIC_TOGGLE_NKRO", name: "Toggle NKRO", shortName: "NKRO", category: "lighting" },
  { code: "QK_CLEAR_EEPROM", name: "Clear EEPROM", shortName: "ClrEEP", category: "lighting" },

  // Mouse
  { code: "KC_MS_UP", name: "Mouse ↑", shortName: "Ms↑", category: "mouse" },
  { code: "KC_MS_DOWN", name: "Mouse ↓", shortName: "Ms↓", category: "mouse" },
  { code: "KC_MS_LEFT", name: "Mouse ←", shortName: "Ms←", category: "mouse" },
  { code: "KC_MS_RIGHT", name: "Mouse →", shortName: "Ms→", category: "mouse" },
  { code: "KC_MS_BTN1", name: "Mouse Left Click", shortName: "MBtn1", category: "mouse" },
  { code: "KC_MS_BTN2", name: "Mouse Right Click", shortName: "MBtn2", category: "mouse" },
  { code: "KC_MS_BTN3", name: "Mouse Middle Click", shortName: "MBtn3", category: "mouse" },
  { code: "KC_MS_WH_UP", name: "Wheel ↑", shortName: "Whl↑", category: "mouse" },
  { code: "KC_MS_WH_DOWN", name: "Wheel ↓", shortName: "Whl↓", category: "mouse" },

  // Layers
  ...[0, 1, 2, 3].flatMap((l): KeycodeEntry[] => [
    { code: `MO(${l})`, name: `MO(${l})`, shortName: `MO(${l})`, title: `Momentary hold Layer ${l}`, category: "layer" },
    { code: `TG(${l})`, name: `TG(${l})`, shortName: `TG(${l})`, title: `Toggle Layer ${l} on/off`, category: "layer" },
    { code: `TO(${l})`, name: `TO(${l})`, shortName: `TO(${l})`, title: `Switch directly to Layer ${l}`, category: "layer" },
    { code: `DF(${l})`, name: `DF(${l})`, shortName: `DF(${l})`, title: `Set default Layer ${l}`, category: "layer" },
    { code: `OSL(${l})`, name: `OSL(${l})`, shortName: `OSL(${l})`, title: `One-Shot Layer ${l}`, category: "layer" },
    { code: `TT(${l})`, name: `TT(${l})`, shortName: `TT(${l})`, title: `Tap-Toggle Layer ${l}`, category: "layer" },
  ]),

  // Macros M0..M15
  ...Array.from({ length: 16 }, (_, i): KeycodeEntry => ({
    code: `MACRO(${i})`,
    name: `Macro M${i}`,
    shortName: `M${i}`,
    title: `Execute Macro M${i}`,
    category: "macro",
  })),


];

export function buildKeycodeCatalog(
  customKeycodes?: CustomKeycodeDef[],
  layersCount = 4
): KeycodeEntry[] {
  const baseEntries = KEYCODE_CATALOG.filter(
    (e) => e.category !== "custom" && e.category !== "layer"
  );
  const layerNums = Array.from({ length: Math.max(1, layersCount) }, (_, i) => i);
  const layerEntries: KeycodeEntry[] = layerNums.flatMap((l): KeycodeEntry[] => [
    { code: `MO(${l})`, name: `MO(${l})`, shortName: `MO(${l})`, title: `Momentary hold Layer ${l}`, category: "layer" },
    { code: `TG(${l})`, name: `TG(${l})`, shortName: `TG(${l})`, title: `Toggle Layer ${l} on/off`, category: "layer" },
    { code: `TO(${l})`, name: `TO(${l})`, shortName: `TO(${l})`, title: `Switch directly to Layer ${l}`, category: "layer" },
    { code: `DF(${l})`, name: `DF(${l})`, shortName: `DF(${l})`, title: `Set default Layer ${l}`, category: "layer" },
    { code: `OSL(${l})`, name: `OSL(${l})`, shortName: `OSL(${l})`, title: `One-Shot Layer ${l}`, category: "layer" },
    { code: `TT(${l})`, name: `TT(${l})`, shortName: `TT(${l})`, title: `Tap-Toggle Layer ${l}`, category: "layer" },
  ]);
  const customEntries: KeycodeEntry[] =
    customKeycodes && customKeycodes.length > 0
      ? customKeycodes.map((c, idx) => ({
          code: `CUSTOM(${idx})`,
          name: c.shortName || c.name,
          shortName: c.shortName || c.name,
          title: `${c.title || c.name} (CUSTOM(${idx}))`,
          category: "custom",
        }))
      : Array.from({ length: 16 }, (_, idx) => {
          const pad = idx.toString().padStart(2, "0");
          return {
            code: `USER${pad}`,
            name: `USER${pad}`,
            shortName: `U${idx}`,
            title: `QMK Custom Keycode USER${pad} / QK_KB_${idx}`,
            category: "custom" as const,
          };
        });
  return [...baseEntries, ...layerEntries, ...customEntries];
}

export const MOD_BITS: { id: string; label: string; modBit: number; qkModBit: number }[] = [
  { id: "LCTL", label: "LCtrl", modBit: 0x01, qkModBit: 0x0100 },
  { id: "LSFT", label: "LShift", modBit: 0x02, qkModBit: 0x0200 },
  { id: "LALT", label: "LAlt", modBit: 0x04, qkModBit: 0x0400 },
  { id: "LGUI", label: "LWin/Cmd", modBit: 0x08, qkModBit: 0x0800 },
  { id: "RCTL", label: "RCtrl", modBit: 0x11, qkModBit: 0x1100 },
  { id: "RSFT", label: "RShift", modBit: 0x12, qkModBit: 0x1200 },
  { id: "RALT", label: "RAlt", modBit: 0x14, qkModBit: 0x1400 },
  { id: "RGUI", label: "RWin/Cmd", modBit: 0x18, qkModBit: 0x1800 },
];

const REVERSE_BASIC_MAP: Record<number, KeycodeEntry> = (() => {
  const m: Record<number, KeycodeEntry> = {};
  for (const item of KEYCODE_CATALOG) {
    const val = BASIC_KEYCODE_VALUES[item.code];
    if (val !== undefined && m[val] === undefined) {
      m[val] = item;
    }
  }
  return m;
})();

/**
 * Resolves a symbolic keycode string (e.g. `"KC_A"`, `"MO(1)"`, `"CUSTOM(11)"`, `"MACRO(0)"`, `"0x1234"`)
 * into a 16-bit QMK keycode integer for the target protocol version.
 */
export function encodeKeycodeString(expr: string, version = 11): number {
  const trimmed = expr.trim();
  if (!trimmed) return 0;

  if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
    return parseInt(trimmed, 16) & 0xffff;
  }
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10) & 0xffff;
  }

  if (BASIC_KEYCODE_VALUES[trimmed] !== undefined) {
    return BASIC_KEYCODE_VALUES[trimmed];
  }

  const ranges = getProtocolRanges(version);
  const fnMatch = trimmed.match(/^([A-Z_]+)\((\d+)\)$/);
  if (fnMatch) {
    const [, fnName, argStr] = fnMatch;
    const n = parseInt(argStr, 10);
    switch (fnName) {
      case "MO":
        return Math.min(ranges.QK_MOMENTARY + n, ranges.QK_MOMENTARY_MAX);
      case "TG":
        return Math.min(ranges.QK_TOGGLE_LAYER + n, ranges.QK_TOGGLE_LAYER_MAX);
      case "TO":
        return Math.min(ranges.QK_TO + n, ranges.QK_TO_MAX);
      case "DF":
        return Math.min(ranges.QK_DEF_LAYER + n, ranges.QK_DEF_LAYER_MAX);
      case "OSL":
        return Math.min(ranges.QK_ONE_SHOT_LAYER + n, ranges.QK_ONE_SHOT_LAYER_MAX);
      case "TT":
        return Math.min(ranges.QK_LAYER_TAP_TOGGLE + n, ranges.QK_LAYER_TAP_TOGGLE_MAX);
      case "MACRO":
        return Math.min(ranges.QK_MACRO + n, ranges.QK_MACRO_MAX);
      case "CUSTOM":
        return Math.min(ranges.QK_KB + n, ranges.QK_KB_MAX);
    }
  }

  const userMatch = trimmed.match(/^USER0*(\d+)$/i);
  if (userMatch) {
    const n = parseInt(userMatch[1], 10);
    return Math.min(ranges.QK_KB + n, ranges.QK_KB_MAX);
  }

  return 0;
}

/**
 * Encodes a Mod+Key combination (e.g. `LCtrl + LShift + KC_T`).
 */
export function encodeModCombo(modMask5Bit: number, basicKeycode: number): number {
  return ((modMask5Bit & 0x1f) << 8) | (basicKeycode & 0xff);
}

/**
 * Encodes a QMK Mod-Tap `MT(mod, kc)` (Hold for modifier, Tap for basic keycode).
 */
export function encodeModTap(modMask5Bit: number, basicKeycode: number, version = 11): number {
  const ranges = getProtocolRanges(version);
  return ranges.QK_MOD_TAP | ((modMask5Bit & 0x1f) << 8) | (basicKeycode & 0xff);
}

/**
 * Encodes a QMK Layer-Tap `LT(layer, kc)` (Hold for layer `0..3`, Tap for basic keycode).
 */
export function encodeLayerTap(layer: number, basicKeycode: number, version = 11): number {
  const ranges = getProtocolRanges(version);
  return ranges.QK_LAYER_TAP | ((layer & 0x0f) << 8) | (basicKeycode & 0xff);
}

/**
 * Decodes any 16-bit QMK keycode into a human-readable `{ shortLabel, fullLabel, code, category }`
 * for display on the KeyboardCanvas and Inspector.
 */
export function decodeKeycode(
  keycode: number,
  version = 11,
  customKeycodes?: CustomKeycodeDef[]
): { shortLabel: string; fullLabel: string; code: string; category: string } {
  if (keycode === 0) {
    return { shortLabel: "", fullLabel: "None (KC_NO)", code: "KC_NO", category: "basic" };
  }
  if (keycode === 1) {
    return { shortLabel: "▽", fullLabel: "Pass-through (KC_TRNS)", code: "KC_TRNS", category: "basic" };
  }

  const direct = REVERSE_BASIC_MAP[keycode];
  if (direct) {
    return {
      shortLabel: direct.shortName || direct.name,
      fullLabel: direct.title || direct.name,
      code: direct.code,
      category: direct.category,
    };
  }

  const ranges = getProtocolRanges(version);

  // Layer operations
  if (keycode >= ranges.QK_MOMENTARY && keycode <= ranges.QK_MOMENTARY_MAX) {
    const l = keycode - ranges.QK_MOMENTARY;
    return { shortLabel: `MO(${l})`, fullLabel: `Momentary Layer ${l}`, code: `MO(${l})`, category: "layer" };
  }
  if (keycode >= ranges.QK_TOGGLE_LAYER && keycode <= ranges.QK_TOGGLE_LAYER_MAX) {
    const l = keycode - ranges.QK_TOGGLE_LAYER;
    return { shortLabel: `TG(${l})`, fullLabel: `Toggle Layer ${l}`, code: `TG(${l})`, category: "layer" };
  }
  if (keycode >= ranges.QK_TO && keycode <= ranges.QK_TO_MAX) {
    const l = keycode - ranges.QK_TO;
    return { shortLabel: `TO(${l})`, fullLabel: `Switch To Layer ${l}`, code: `TO(${l})`, category: "layer" };
  }
  if (keycode >= ranges.QK_DEF_LAYER && keycode <= ranges.QK_DEF_LAYER_MAX) {
    const l = keycode - ranges.QK_DEF_LAYER;
    return { shortLabel: `DF(${l})`, fullLabel: `Default Layer ${l}`, code: `DF(${l})`, category: "layer" };
  }
  if (keycode >= ranges.QK_ONE_SHOT_LAYER && keycode <= ranges.QK_ONE_SHOT_LAYER_MAX) {
    const l = keycode - ranges.QK_ONE_SHOT_LAYER;
    return { shortLabel: `OSL(${l})`, fullLabel: `One-Shot Layer ${l}`, code: `OSL(${l})`, category: "layer" };
  }
  if (keycode >= ranges.QK_LAYER_TAP_TOGGLE && keycode <= ranges.QK_LAYER_TAP_TOGGLE_MAX) {
    const l = keycode - ranges.QK_LAYER_TAP_TOGGLE;
    return { shortLabel: `TT(${l})`, fullLabel: `Tap-Toggle Layer ${l}`, code: `TT(${l})`, category: "layer" };
  }

  // Macros
  if (keycode >= ranges.QK_MACRO && keycode <= ranges.QK_MACRO_MAX) {
    const idx = keycode - ranges.QK_MACRO;
    return { shortLabel: `M${idx}`, fullLabel: `Macro M${idx}`, code: `MACRO(${idx})`, category: "macro" };
  }

  // Board Custom Keycodes (QK_KB / USER00..USER15)
  if (keycode >= ranges.QK_KB && keycode <= ranges.QK_KB_MAX) {
    const idx = keycode - ranges.QK_KB;
    const custom = customKeycodes?.[idx];
    if (custom) {
      return {
        shortLabel: custom.shortName || custom.name,
        fullLabel: `${custom.name} — ${custom.title || custom.name}`,
        code: `CUSTOM(${idx})`,
        category: "custom",
      };
    }
    return {
      shortLabel: `KB${idx}`,
      fullLabel: `Custom Key ${idx}`,
      code: `CUSTOM(${idx})`,
      category: "custom",
    };
  }

  // Layer-Tap LT(layer, kc)
  if (keycode >= ranges.QK_LAYER_TAP && keycode <= ranges.QK_LAYER_TAP_MAX) {
    const layer = (keycode >> 8) & 0x0f;
    const baseKc = keycode & 0xff;
    const base = REVERSE_BASIC_MAP[baseKc];
    const baseName = base ? base.shortName || base.name : `0x${baseKc.toString(16)}`;
    return {
      shortLabel: `LT${layer}/${baseName}`,
      fullLabel: `Hold: Layer ${layer} / Tap: ${baseName}`,
      code: `0x${keycode.toString(16).toUpperCase()}`,
      category: "layer",
    };
  }

  // Mod-Tap MT(mod, kc)
  if (keycode >= ranges.QK_MOD_TAP && keycode <= ranges.QK_MOD_TAP_MAX) {
    const mod = (keycode >> 8) & 0x1f;
    const baseKc = keycode & 0xff;
    const base = REVERSE_BASIC_MAP[baseKc];
    const baseName = base ? base.shortName || base.name : `0x${baseKc.toString(16)}`;
    const modText = formatModMask(mod);
    return {
      shortLabel: `MT(${modText},${baseName})`,
      fullLabel: `Hold: ${modText} / Tap: ${baseName}`,
      code: `0x${keycode.toString(16).toUpperCase()}`,
      category: "basic",
    };
  }

  // Modifier + Basic Key (0x0100..0x1FFF)
  if (keycode >= ranges.QK_MODS && keycode <= ranges.QK_MODS_MAX) {
    const mod = (keycode >> 8) & 0x1f;
    const baseKc = keycode & 0xff;
    const base = REVERSE_BASIC_MAP[baseKc];
    const baseName = base ? base.shortName || base.name : `0x${baseKc.toString(16)}`;
    const modText = formatModMask(mod);
    return {
      shortLabel: `${modText}+${baseName}`,
      fullLabel: `Shortcut: ${modText} + ${baseName}`,
      code: `0x${keycode.toString(16).toUpperCase()}`,
      category: "basic",
    };
  }

  const hex = `0x${keycode.toString(16).toUpperCase().padStart(4, "0")}`;
  return {
    shortLabel: hex,
    fullLabel: `Raw Keycode (${hex} / ${keycode})`,
    code: hex,
    category: "basic",
  };
}

function formatModMask(mod: number): string {
  const parts: string[] = [];
  const right = (mod & 0x10) !== 0;
  const pfx = right ? "R" : "";
  if (mod & 0x01) parts.push(`${pfx}Ctl`);
  if (mod & 0x02) parts.push(`${pfx}Sft`);
  if (mod & 0x04) parts.push(`${pfx}Alt`);
  if (mod & 0x08) parts.push(`${pfx}Gui`);
  return parts.join("+") || "Mod";
}
