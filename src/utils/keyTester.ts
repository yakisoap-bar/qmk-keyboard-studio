import { decodeKeycode } from "../data/keycodes";
import type { CustomKeycodeDef } from "./kleParser";

interface TesterKeymap {
  matrix: readonly number[];
  cols: number;
  protocolVersion: number;
  customKeycodes: CustomKeycodeDef[];
}

/** Use the selected layer's mapping for both OS and raw-matrix event labels. */
export function getTesterEventLabel(
  keymap: TesterKeymap,
  row: number,
  col: number
): string {
  const keycode = keymap.matrix[row * keymap.cols + col];
  if (keycode === undefined) return "Unmapped";
  const decoded = decodeKeycode(
    keycode,
    keymap.protocolVersion,
    keymap.customKeycodes
  );
  return decoded.shortLabel || "None";
}
