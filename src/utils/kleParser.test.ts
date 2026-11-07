import { describe, expect, it } from "vitest";
import weikavRaw from "../data/definitions/weikav_max102.json";
import genericRaw from "../data/definitions/generic_104.json";
import {
  buildDomCodeToCoordMap,
  getLayoutOptionChoice,
  normalizeKeyboardDefinition,
  parseLayoutOptionLabels,
  parseViaKleKeymap,
  resolveActiveLayoutKeys,
  setLayoutOptionChoice,
} from "./kleParser";
import {
  buildKeycodeCatalog,
  decodeKeycode,
  encodeKeycodeString,
} from "../data/keycodes";
import { createDefaultOfflineProfile } from "../store/useKeyboardStore";

describe("VIA KLE Parser & Modular Keyboard Definition Engine", () => {
  it("normalizes bundled weikav_max102.json and generic_104.json definitions", () => {
    const weikav = normalizeKeyboardDefinition(weikavRaw, { builtin: true });
    expect(weikav.id).toBe("weikav-max102");
    expect(weikav.vendorId).toBe(0x342d);
    expect(weikav.productId).toBe(0xe537);
    expect(weikav.matrix).toEqual({ rows: 6, cols: 19 });
    expect(weikav.layouts.keys.length).toBe(101);
    expect(weikav.layouts.multiLedKeys.length).toBe(1);
    expect(weikav.layouts.multiLedKeys[0].ledCells.length).toBe(5);
    expect(weikav.capabilities.lighting?.perKeyRgb?.modeId).toBe(45);
    expect(weikav.capabilities.customControls.length).toBe(2);

    const generic = normalizeKeyboardDefinition(genericRaw, { builtin: true });
    expect(generic.id).toBe("generic-qmk-104");
    expect(generic.matrix).toEqual({ rows: 6, cols: 21 });
    expect(generic.layouts.keys.length).toBe(104);
    expect(generic.capabilities.lighting).not.toBeNull();
    expect(generic.capabilities.lighting?.perKeyRgb ?? null).toBeNull();
  });

  it("parses standard VIA 2D KLE keymap arrays with layout option tags and decals", () => {
    const sampleKle = [
      [
        { c: "#777777" },
        "0,0\n\n\n\n\n\n\n\n\nEsc",
        { c: "#cccccc" },
        "0,1\n\n\n\n\n\n\n\n\n1!",
        { d: true },
        "Decal Spacer",
        { w: 2 },
        "0,13\n\n\n0,0\n\n\n\n\n\nBksp",
      ],
      [
        { y: -1, x: 3 },
        "0,12\n\n\n0,1\n\n\n\n\n\n\\",
        "0,13\n\n\n0,1\n\n\n\n\n\nDel",
      ],
    ];

    const parsed = parseViaKleKeymap(sampleKle);
    expect(parsed.length).toBe(5); // Decal is skipped
    expect(parsed[0]).toMatchObject({
      row: 0,
      col: 0,
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      value: "Esc",
      color: "accent",
    });
    expect(parsed[2]).toMatchObject({
      row: 0,
      col: 13,
      w: 2,
      value: "Bksp",
      optionIndex: 0,
      optionChoice: 0,
    });
    expect(parsed[3]).toMatchObject({
      row: 0,
      col: 12,
      optionIndex: 0,
      optionChoice: 1,
    });
  });

  it("packs and unpacks VIA layoutOptions bitmasks and filters active keys", () => {
    const rawVia = {
      name: "Custom 60%",
      vendorId: "0xFEED",
      productId: "0x6060",
      matrix: { rows: 5, cols: 14 },
      layouts: {
        labels: [
          "Split Backspace",
          ["Bottom Row", "ANSI", "Tsangan", "WKL"],
        ],
        keymap: [
          [
            "0,0\n\n\n\n\n\n\n\n\nEsc",
            { w: 2 },
            "0,13\n\n\n0,0\n\n\n\n\n\nBksp",
          ],
          [
            { y: -1, x: 1 },
            "0,12\n\n\n0,1\n\n\n\n\n\n`",
            "0,13\n\n\n0,1\n\n\n\n\n\nBksp",
          ],
        ],
      },
    };

    const def = normalizeKeyboardDefinition(rawVia);
    const descriptors = parseLayoutOptionLabels(def.layouts.labels);
    expect(descriptors).toHaveLength(2);
    expect(descriptors[0].bitWidth).toBe(1);
    expect(descriptors[1].bitWidth).toBe(2);

    // Default mask = 0 -> Split Backspace = 0 (2U Backspace visible -> 2 keys total)
    const keysDefault = resolveActiveLayoutKeys(def, 0);
    expect(keysDefault).toHaveLength(2);

    // Enable Split Backspace (option 0 = 1) -> 3 keys total
    const maskSplit = setLayoutOptionChoice(0, descriptors, 0, 1);
    expect(getLayoutOptionChoice(maskSplit, descriptors, 0)).toBe(1);
    const keysSplit = resolveActiveLayoutKeys(def, maskSplit);
    expect(keysSplit).toHaveLength(3);

    // Set Bottom Row (option 1 = 2 "WKL") while keeping Split Backspace = 1
    const maskBoth = setLayoutOptionChoice(maskSplit, descriptors, 1, 2);
    expect(getLayoutOptionChoice(maskBoth, descriptors, 0)).toBe(1);
    expect(getLayoutOptionChoice(maskBoth, descriptors, 1)).toBe(2);
  });

  it("builds DOM event.code to matrix coordinate map from layout legends", () => {
    const weikav = normalizeKeyboardDefinition(weikavRaw, { builtin: true });
    const domMap = buildDomCodeToCoordMap(
      weikav.layouts.keys,
      weikav.layouts.width
    );
    expect(domMap.Escape).toEqual({ row: 0, col: 0 });
    expect(domMap.Space).toEqual({ row: 5, col: 6 });
    expect(domMap.KeyW).toEqual({ row: 2, col: 2 });
    expect(domMap.Numpad7).toEqual({ row: 2, col: 15 });
  });

  it("builds dynamic keycode catalogs and decodes custom keycodes per definition", () => {
    const customDefs = [
      { name: "MY_CUSTOM_0", title: "First Custom Action", shortName: "CST0" },
    ];
    const catalog = buildKeycodeCatalog(customDefs, 4);
    expect(catalog.some((k) => k.code === "CUSTOM(0)" && k.name === "CST0")).toBe(
      true
    );

    const kc = encodeKeycodeString("CUSTOM(0)", 11);
    const decoded = decodeKeycode(kc, 11, customDefs);
    expect(decoded.code).toBe("CUSTOM(0)");
    expect(decoded.shortLabel).toBe("CST0");
    expect(decoded.fullLabel).toBe("MY_CUSTOM_0 — First Custom Action");

    // Standard generic QMK definition with no customKeycodes falls back to USER00..USER15
    const genericCatalog = buildKeycodeCatalog([], 4);
    expect(genericCatalog.some((k) => k.code === "USER00")).toBe(true);
    const u0 = encodeKeycodeString("USER00", 12);
    expect(u0).toBe(0x7e00);
  });

  it("maps all 104 keys in generic_104.json to standard non-zero HID keycodes with zero custom mappings", () => {
    const generic = normalizeKeyboardDefinition(genericRaw, { builtin: true });
    const profile = createDefaultOfflineProfile("Default", generic);
    expect(profile.rows).toBe(6);
    expect(profile.cols).toBe(21);

    for (const k of generic.layouts.keys) {
      const idx = k.row * profile.cols + k.col;
      const kc = profile.layers[0][idx];
      expect(
        kc,
        `Key "${k.value}" at [${k.row},${k.col}] should map to a standard basic HID keycode`
      ).toBeGreaterThan(0);
      expect(
        kc,
        `Key "${k.value}" at [${k.row},${k.col}] should not map to a custom or layer keycode`
      ).toBeLessThanOrEqual(0xe7);
    }
  });
});
