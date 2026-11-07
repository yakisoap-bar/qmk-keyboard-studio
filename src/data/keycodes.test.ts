import max102Via from "./definitions/max102.json";
import { describe, expect, it } from "vitest";
import {
  decodeKeycode,
  encodeKeycodeString,
  encodeLayerTap,
  encodeModCombo,
  encodeModTap,
} from "./keycodes";

describe("QMK/VIA Keycode Encoder & Decoder", () => {
  it("encodes and decodes basic keycodes", () => {
    expect(encodeKeycodeString("KC_ESC", 11)).toBe(41);
    expect(decodeKeycode(41, 11).shortLabel).toBe("Esc");
    expect(decodeKeycode(1, 11).code).toBe("KC_TRNS");
  });

  it("encodes and decodes layer keycodes across v11 and v12", () => {
    const mo1 = encodeKeycodeString("MO(1)", 11);
    expect(mo1).toBe(21025);
    expect(decodeKeycode(mo1, 11).code).toBe("MO(1)");
  });

  it("uses custom keycodes from the VIA definition", () => {
    const bt1 = encodeKeycodeString("CUSTOM(0)", 11);
    expect(bt1).toBe(32512);
    const decoded = decodeKeycode(bt1, 11, max102Via.customKeycodes);
    expect(decoded.shortLabel).toBe("DEV BT1");
    expect(decoded.category).toBe("custom");
  });

  it("encodes and decodes Mod+Key, Mod-Tap, and Layer-Tap", () => {
    const ctrlC = encodeModCombo(0x01, 6); // LCtrl + KC_C
    expect(decodeKeycode(ctrlC, 11).shortLabel).toBe("Ctl+C");

    const mt = encodeModTap(0x01, 41, 11); // Hold LCtrl, Tap Esc
    expect(decodeKeycode(mt, 11).shortLabel).toBe("MT(Ctl,Esc)");

    const lt = encodeLayerTap(1, 44, 11); // Hold Layer 1, Tap Space
    expect(decodeKeycode(lt, 11).shortLabel).toBe("LT1/Space");
  });
});
