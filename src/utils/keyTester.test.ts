import { describe, expect, it } from "vitest";
import { encodeKeycodeString, encodeLayerTap, encodeModTap } from "../data/keycodes";
import { parseViaDefinition } from "./kleParser";
import { getTesterEventLabel } from "./keyTester";

const keymap = (matrix: number[], protocolVersion = 12) => ({
  matrix, protocolVersion, cols: 3, customKeycodes: [],
});

describe("keyboard tester mapped event labels", () => {
  it("labels coordinate-only VIA keys using their current mapping", () => {
    const definition = parseViaDefinition({
      name: "VIA Board", matrix: { rows: 2, cols: 3 },
      layouts: { keymap: [["1,2"]] },
    });
    expect(definition.layouts.keys[0].value).toBe("1,2");
    const mapping = keymap([0, 0, 0, 0, 0, encodeKeycodeString("KC_A", 12)]);
    expect(getTesterEventLabel(mapping, 1, 2)).toBe("A");
    mapping.matrix[5] = encodeKeycodeString("KC_ESC", 12);
    expect(getTesterEventLabel(mapping, 1, 2)).toBe("Esc");
  });

  it("uses the selected layer mapping and preserves transparent and empty mappings", () => {
    expect(getTesterEventLabel(keymap([4]), 0, 0)).toBe("A");
    expect(getTesterEventLabel(keymap([5]), 0, 0)).toBe("B");
    expect(getTesterEventLabel(keymap([1]), 0, 0)).toBe("▽");
    expect(getTesterEventLabel(keymap([0]), 0, 0)).toBe("None");
    expect(getTesterEventLabel(keymap([]), 0, 0)).toBe("Unmapped");
  });

  it.each([11, 12])("decodes layer and tap mappings with VIA protocol %i", version => {
    const mapping = keymap([
      encodeKeycodeString("MO(1)", version),
      encodeLayerTap(2, 44, version),
      encodeModTap(1, 41, version),
    ], version);
    expect(getTesterEventLabel(mapping, 0, 0)).toBe("MO(1)");
    expect(getTesterEventLabel(mapping, 0, 1)).toBe("LT2/Space");
    expect(getTesterEventLabel(mapping, 0, 2)).toBe("MT(Ctl,Esc)");
  });

  it("uses custom keycode labels from the active VIA definition", () => {
    const mapping = {
      ...keymap([encodeKeycodeString("CUSTOM(0)", 12)]),
      customKeycodes: [{ name: "My Action", title: "Custom action", shortName: "Action" }],
    };
    expect(getTesterEventLabel(mapping, 0, 0)).toBe("Action");
  });
});
