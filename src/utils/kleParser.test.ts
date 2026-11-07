import { describe, expect, it } from "vitest";
import max102Via from "../data/definitions/max102.json";
import { buildDomCodeToCoordMap, getLayoutOptionChoice, parseViaDefinition, parseLayoutOptionLabels, parseViaKleKeymap, resolveActiveLayoutKeys, setLayoutOptionChoice, } from "./kleParser";
import { buildKeycodeCatalog, decodeKeycode, encodeKeycodeString, } from "../data/keycodes";
import { createDefaultOfflineProfile } from "../store/useKeyboardStore";
describe("VIA KLE Parser & Modular Keyboard Definition Engine", () => {
    it("bundles only the original MAX102 VIA layout", () => {
        const def = parseViaDefinition(max102Via, { builtin: true });
        expect(def.id).toBe("max102-342d-e537");
        expect(def.name).toBe("MAX102");
        expect(def.vendorId).toBe(0x342d);
        expect(def.productId).toBe(0xe537);
        expect(def.matrix).toEqual({ rows: 6, cols: 19 });
        expect(def.layouts.keys).toHaveLength(101);
        expect(def.viaLighting).toHaveLength(4);
        expect(def.source).toEqual(max102Via);
        expect(parseViaDefinition(def.source).layouts.keys).toEqual(def.layouts.keys);
    });
    it("rejects custom and normalized JSON definitions", () => {
        const raw = { ...max102Via, capabilities: { lighting: {} } };
        expect(() => parseViaDefinition(raw)).toThrow("Only VIA JSON");
        expect(() => parseViaDefinition(parseViaDefinition(max102Via))).toThrow("Only VIA JSON");
        expect(() => parseViaDefinition({ ...max102Via, layouts: { keys: [] } })).toThrow("Only VIA JSON");
        for (const vendorId of [65536, -1, 1.5, "0x10000", "invalid"]) {
            expect(() => parseViaDefinition({ ...max102Via, vendorId })).toThrow("USB IDs");
        }
        expect(() => parseViaDefinition({ ...max102Via, matrix: { rows: 0, cols: 19 } })).toThrow("matrix");
        expect(() => parseViaDefinition({ ...max102Via, matrix: { rows: 1, cols: 1 } })).toThrow("coordinates");
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
        const def = parseViaDefinition(rawVia);
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
        const keys = parseViaKleKeymap([["0,0\n\n\n\n\n\n\n\n\nEsc", "0,1\n\n\n\n\n\n\n\n\nW", { w: 6.25 }, "0,2\n\n\n\n\n\n\n\n\nSpace"]]);
        const domMap = buildDomCodeToCoordMap(keys, 15);
        expect(domMap.Escape).toEqual({ row: 0, col: 0 });
        expect(domMap.KeyW).toEqual({ row: 0, col: 1 });
        expect(domMap.Space).toEqual({ row: 0, col: 2 });
    });
    it("builds dynamic keycode catalogs and decodes custom keycodes per definition", () => {
        const customDefs = [
            { name: "MY_CUSTOM_0", title: "First Custom Action", shortName: "CST0" },
        ];
        const catalog = buildKeycodeCatalog(customDefs, 4);
        expect(catalog.some((k) => k.code === "CUSTOM(0)" && k.name === "CST0")).toBe(true);
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
    it("does not invent key mappings for coordinate-only VIA labels", () => {
        const def = parseViaDefinition(max102Via);
        const profile = createDefaultOfflineProfile("Offline", def);
        expect(profile.rows).toBe(6);
        expect(profile.cols).toBe(19);
        expect(profile.layers[0][2 * 19 + 1]).toBe(0);
        expect(profile.via_lighting_values).toEqual({});
    });
});
