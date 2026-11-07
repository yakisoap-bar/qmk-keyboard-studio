export interface LayoutKey {
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  rx: number;
  ry: number;
  d: boolean;
  value: string;
  color: string;
  optionIndex?: number | null;
  optionChoice?: number | null;
}

export interface MultiLedCell {
  row: number;
  col: number;
  label: string;
}

export interface MultiLedKeyZone {
  id: string;
  label: string;
  badgeText?: string;
  switchRow: number;
  switchCol: number;
  ledCells: MultiLedCell[];
}

export type LayoutOptionLabel = string | string[];

export interface ParsedLayoutOption {
  index: number;
  name: string;
  label: string;
  kind: "toggle" | "select";
  choices: string[];
  bitOffset: number;
  bitWidth: number;
}

export interface CustomKeycodeDef {
  name: string;
  title: string;
  shortName: string;
}

export interface CommandTemplate {
  cmd: (number | string)[];
}

export interface ReadTemplate {
  cmd: (number | string)[];
  valueIndex: number;
  fallbackCmd?: (number | string)[];
  fallbackValueIndex?: number;
}

export interface ColorReadTemplate {
  cmd: (number | string)[];
  hueIndex: number;
  satIndex: number;
  fallbackCmd?: (number | string)[];
  fallbackHueIndex?: number;
  fallbackSatIndex?: number;
}

export interface RgbEffectDef {
  name: string;
  id: number;
  simulation: string;
  reactive?: boolean;
}

export interface PerKeyRgbSpec {
  modeId: number;
  interPacketDelayMs?: number;
  get: ColorReadTemplate;
  set: CommandTemplate;
  save?: CommandTemplate;
}

export interface LightingCapabilitySpec {
  brightnessMax: number;
  brightnessStep: number;
  speedMin: number;
  speedMax: number;
  speedStep: number;
  getBrightness: ReadTemplate;
  setBrightness: CommandTemplate;
  getMode: ReadTemplate;
  setMode: CommandTemplate;
  getSpeed: ReadTemplate;
  setSpeed: CommandTemplate;
  getColor: ColorReadTemplate;
  setColor: CommandTemplate;
  save: CommandTemplate;
  effects: RgbEffectDef[];
  perKeyRgb?: PerKeyRgbSpec | null;
}

export interface CustomControlOption {
  label: string;
  value: number;
}

export interface CustomControlSpec {
  id: string;
  title: string;
  description?: string;
  kind: "toggle" | "select";
  defaultValue: number;
  options?: CustomControlOption[];
  get?: ReadTemplate | null;
  set: CommandTemplate;
  save?: CommandTemplate | null;
}

export interface KeyboardDefinition {
  id: string;
  name: string;
  vendorId: number;
  productId: number;
  builtin?: boolean;
  matrix: {
    rows: number;
    cols: number;
  };
  layouts: {
    width: number;
    height: number;
    labels: LayoutOptionLabel[];
    keys: LayoutKey[];
    multiLedKeys: MultiLedKeyZone[];
  };
  customKeycodes: CustomKeycodeDef[];
  capabilities: {
    lighting: LightingCapabilitySpec | null;
    customControls: CustomControlSpec[];
  };
}

export const STANDARD_QMK_RGB_EFFECTS: RgbEffectDef[] = [
  { name: "Solid Color", id: 1, simulation: "solid", reactive: false },
  { name: "Alphas Mods", id: 2, simulation: "alphas_mods", reactive: false },
  { name: "Gradient Up Down", id: 3, simulation: "cycle_up_down", reactive: false },
  { name: "Gradient Left Right", id: 4, simulation: "gradient_left_right", reactive: false },
  { name: "Breathing", id: 5, simulation: "breathing", reactive: false },
  { name: "Band Sat", id: 6, simulation: "band_sat", reactive: false },
  { name: "Band Val", id: 7, simulation: "band_val", reactive: false },
  { name: "Band Pinwheel Val", id: 9, simulation: "band_pinwheel_val", reactive: false },
  { name: "Band Spiral Val", id: 11, simulation: "band_spiral_val", reactive: false },
  { name: "Cycle All", id: 12, simulation: "cycle_all", reactive: false },
  { name: "Cycle Left Right", id: 13, simulation: "cycle_left_right", reactive: false },
  { name: "Cycle Up Down", id: 14, simulation: "cycle_up_down", reactive: false },
  { name: "Rainbow Moving Chevron", id: 15, simulation: "rainbow_chevron", reactive: false },
  { name: "Cycle Out In", id: 16, simulation: "cycle_out_in", reactive: false },
  { name: "Cycle Out In Dual", id: 17, simulation: "cycle_out_in_dual", reactive: false },
  { name: "Cycle Pinwheel", id: 18, simulation: "cycle_pinwheel", reactive: false },
  { name: "Cycle Spiral", id: 19, simulation: "cycle_spiral", reactive: false },
  { name: "Dual Beacon", id: 20, simulation: "dual_beacon", reactive: false },
  { name: "Rainbow Beacon", id: 21, simulation: "rainbow_beacon", reactive: false },
  { name: "Rainbow Pinwheels", id: 22, simulation: "rainbow_pinwheels", reactive: false },
  { name: "Raindrops", id: 23, simulation: "raindrops", reactive: false },
  { name: "Jellybean Raindrops", id: 24, simulation: "jellybean_raindrops", reactive: false },
  { name: "Pixel Flow", id: 29, simulation: "pixel_flow", reactive: false },
  { name: "Digital Rain", id: 32, simulation: "digital_rain", reactive: false },
  { name: "Solid Reactive Simple", id: 33, simulation: "reactive_simple", reactive: true },
  { name: "Solid Reactive Cross", id: 37, simulation: "reactive_cross", reactive: true },
  { name: "Splash", id: 41, simulation: "splash", reactive: true },
];

const EFFECT_NAME_TO_SIMULATION: Record<string, { simulation: string; reactive: boolean }> = {
  "solid color": { simulation: "solid", reactive: false },
  "alphas mods": { simulation: "alphas_mods", reactive: false },
  "gradient up down": { simulation: "cycle_up_down", reactive: false },
  "gradient left right": { simulation: "gradient_left_right", reactive: false },
  breathing: { simulation: "breathing", reactive: false },
  "band sat": { simulation: "band_sat", reactive: false },
  "band val": { simulation: "band_val", reactive: false },
  "band pinwheel val": { simulation: "band_pinwheel_val", reactive: false },
  "band spiral val": { simulation: "band_spiral_val", reactive: false },
  "cycle all": { simulation: "cycle_all", reactive: false },
  "cycle left right": { simulation: "cycle_left_right", reactive: false },
  "cycle up down": { simulation: "cycle_up_down", reactive: false },
  "rainbow moving chevron": { simulation: "rainbow_chevron", reactive: false },
  "cycle out in": { simulation: "cycle_out_in", reactive: false },
  "cycle out in dual": { simulation: "cycle_out_in_dual", reactive: false },
  "cycle pinwheel": { simulation: "cycle_pinwheel", reactive: false },
  "cycle spiral": { simulation: "cycle_spiral", reactive: false },
  "dual beacon": { simulation: "dual_beacon", reactive: false },
  "rainbow beacon": { simulation: "rainbow_beacon", reactive: false },
  "rainbow pinwheels": { simulation: "rainbow_pinwheels", reactive: false },
  raindrops: { simulation: "raindrops", reactive: false },
  "jellybean raindrops": { simulation: "jellybean_raindrops", reactive: false },
  "pixel flow": { simulation: "pixel_flow", reactive: false },
  "digital rain": { simulation: "digital_rain", reactive: false },
  "solid reactive simple": { simulation: "reactive_simple", reactive: true },
  "solid reactive": { simulation: "reactive_simple", reactive: true },
  "solid reactive cross": { simulation: "reactive_cross", reactive: true },
  splash: { simulation: "splash", reactive: true },
  multisplash: { simulation: "splash", reactive: true },
};

export function parseHexOrNumber(val: unknown, fallback = 0): number {
  if (typeof val === "number" && Number.isFinite(val)) {
    return val >>> 0;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
      return parseInt(trimmed.slice(2), 16) >>> 0;
    }
    if (/^\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10) >>> 0;
    }
  }
  return fallback;
}

export function formatHexId(val: number): string {
  return `0x${(val & 0xffff).toString(16).toUpperCase().padStart(4, "0")}`;
}

export function slugifyDefinitionId(name: string, vid: number, pid: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = `${(vid & 0xffff).toString(16).padStart(4, "0")}-${(pid & 0xffff)
    .toString(16)
    .padStart(4, "0")}`;
  return base ? `${base}-${suffix}` : `qmk-${suffix}`;
}

function classifyKleColor(hexColor: string, w: number, label: string): string {
  const lower = hexColor.toLowerCase();
  if (
    lower.includes("00ff") ||
    lower.includes("34d3") ||
    lower.includes("10b9") ||
    lower.includes("f43f") ||
    lower.includes("e11d") ||
    lower.includes("ff5") ||
    label.toLowerCase() === "esc"
  ) {
    return "accent";
  }
  if (lower === "#777777" || lower === "#555555" || lower === "#666666" || w >= 1.5) {
    return "mod";
  }
  return "alpha";
}

function defaultLegendForCoord(row: number, col: number, w: number): string {
  if (row === 0 && col === 0) return "Esc";
  if (w >= 5.5) return "Space";
  return `${row},${col}`;
}

/**
 * Parses a standard VIA v2/v3 `layouts.keymap` 2D KLE array into normalized `LayoutKey` objects.
 */
export function parseViaKleKeymap(keymap: unknown[]): LayoutKey[] {
  const keys: LayoutKey[] = [];
  let currX = 0;
  let currY = 0;
  let nextW = 1;
  let nextH = 1;
  let currR = 0;
  let currRx = 0;
  let currRy = 0;
  let currColorHex = "#cccccc";
  let isDecal = false;

  for (let rowIdx = 0; rowIdx < keymap.length; rowIdx++) {
    const rowItems = keymap[rowIdx];
    if (!Array.isArray(rowItems)) continue;

    if (rowIdx === 0) {
      currX = currRx;
      currY = currRy;
    } else {
      currX = currRx;
      currY += 1;
    }

    for (const item of rowItems) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const props = item as Record<string, unknown>;
        if (typeof props.r === "number") currR = props.r;
        if (typeof props.rx === "number") {
          currRx = props.rx;
          currX = currRx;
          currY = currRy;
        }
        if (typeof props.ry === "number") {
          currRy = props.ry;
          currX = currRx;
          currY = currRy;
        }
        if (typeof props.x === "number") currX += props.x;
        if (typeof props.y === "number") currY += props.y;
        if (typeof props.w === "number") nextW = props.w;
        if (typeof props.h === "number") nextH = props.h;
        if (typeof props.c === "string") currColorHex = props.c;
        if (typeof props.d === "boolean") isDecal = props.d;
      } else if (typeof item === "string") {
        if (!isDecal) {
          const parts = item.split("\n");
          const topLeft = (parts[0] || "").trim();
          const coordMatch = topLeft.match(/^(\d+)\s*,\s*(\d+)$/);

          if (coordMatch) {
            const row = parseInt(coordMatch[1], 10);
            const col = parseInt(coordMatch[2], 10);

            let optionIndex: number | null = null;
            let optionChoice: number | null = null;
            const bottomRight = (parts[3] || "").trim();
            const optMatch = bottomRight.match(/^(\d+)\s*,\s*(\d+)$/);
            if (optMatch) {
              optionIndex = parseInt(optMatch[1], 10);
              optionChoice = parseInt(optMatch[2], 10);
            }

            // Pick any explicit legend from remaining KLE label slots
            let label = "";
            for (const slotIdx of [9, 8, 6, 4, 2, 1, 10, 11]) {
              if (parts[slotIdx] && parts[slotIdx].trim().length > 0) {
                label = parts[slotIdx].trim();
                break;
              }
            }
            if (!label) {
              label = defaultLegendForCoord(row, col, nextW);
            }

            keys.push({
              row,
              col,
              x: Number(currX.toFixed(4)),
              y: Number(currY.toFixed(4)),
              w: Number(nextW.toFixed(4)),
              h: Number(nextH.toFixed(4)),
              r: currR,
              rx: currRx,
              ry: currRy,
              d: false,
              value: label,
              color: classifyKleColor(currColorHex, nextW, label),
              optionIndex,
              optionChoice,
            });
          }
        }

        currX += nextW;
        nextW = 1;
        nextH = 1;
        isDecal = false;
      }
    }
  }

  return keys;
}

/**
 * Parses VIA `layouts.labels` into structured option descriptors with bit offsets.
 */
export function parseLayoutOptionLabels(labels: LayoutOptionLabel[]): ParsedLayoutOption[] {
  const parsed: ParsedLayoutOption[] = [];
  const rawMeta = labels.map((entry, index) => {
    if (typeof entry === "string") {
      return {
        index,
        name: entry,
        label: entry,
        kind: "toggle" as const,
        choices: ["Off", "On"],
        bitWidth: 1,
      };
    }
    const [title, ...choices] = entry;
    const validChoices = choices.length >= 2 ? choices : ["Default", "Alt"];
    const bitWidth = Math.max(1, Math.ceil(Math.log2(validChoices.length)));
    const resolvedTitle = title || `Option ${index + 1}`;
    return {
      index,
      name: resolvedTitle,
      label: resolvedTitle,
      kind: "select" as const,
      choices: validChoices,
      bitWidth,
    };
  });

  // Pack from right (LSB = last option) per VIA specification
  let runningBitOffset = 0;
  for (let i = rawMeta.length - 1; i >= 0; i--) {
    parsed[i] = {
      ...rawMeta[i],
      bitOffset: runningBitOffset,
    };
    runningBitOffset += rawMeta[i].bitWidth;
  }

  return parsed;
}

export function getLayoutOptionChoice(
  bitmask: number,
  optOrList: ParsedLayoutOption | ParsedLayoutOption[],
  optionIndex?: number
): number {
  const opt = Array.isArray(optOrList)
    ? optOrList.find((o) => o.index === (optionIndex ?? 0))
    : optOrList;
  if (!opt) return 0;
  const mask = (1 << opt.bitWidth) - 1;
  return (bitmask >>> opt.bitOffset) & mask;
}

export function setLayoutOptionChoice(
  bitmask: number,
  optOrList: ParsedLayoutOption | ParsedLayoutOption[],
  optionIndexOrChoice: number,
  maybeChoice?: number
): number {
  const opt = Array.isArray(optOrList)
    ? optOrList.find((o) => o.index === optionIndexOrChoice)
    : optOrList;
  const choice = Array.isArray(optOrList) ? (maybeChoice ?? 0) : optionIndexOrChoice;
  if (!opt) return bitmask;
  const mask = ((1 << opt.bitWidth) - 1) << opt.bitOffset;
  const cleared = bitmask & ~mask;
  const clamped = choice & ((1 << opt.bitWidth) - 1);
  return (cleared | (clamped << opt.bitOffset)) >>> 0;
}

/**
 * Resolves the active physical keys for a definition given the current VIA `layoutOptions` bitmask,
 * normalizing coordinates so the active board starts at `(minX = 0, minY = 0)`.
 */
export function resolveActiveLayoutKeys(
  def: KeyboardDefinition,
  layoutOptionsBitmask = 0
): LayoutKey[] {
  const parsedOpts = parseLayoutOptionLabels(def.layouts.labels || []);
  const choiceByOptionIdx = new Map<number, number>();
  for (const opt of parsedOpts) {
    choiceByOptionIdx.set(opt.index, getLayoutOptionChoice(layoutOptionsBitmask, opt));
  }

  const filtered = def.layouts.keys.filter((k) => {
    if (k.d) return false;
    if (k.optionIndex === undefined || k.optionIndex === null) return true;
    const activeChoice = choiceByOptionIdx.get(k.optionIndex) ?? 0;
    return (k.optionChoice ?? 0) === activeChoice;
  });

  if (filtered.length === 0) return [];

  let minX = Infinity;
  let minY = Infinity;
  for (const k of filtered) {
    if (k.x < minX) minX = k.x;
    if (k.y < minY) minY = k.y;
  }

  if (Math.abs(minX) < 1e-4 && Math.abs(minY) < 1e-4) {
    return filtered;
  }

  return filtered.map((k) => ({
    ...k,
    x: Number((k.x - minX).toFixed(4)),
    y: Number((k.y - minY).toFixed(4)),
    rx: k.r !== 0 ? Number((k.rx - minX).toFixed(4)) : 0,
    ry: k.r !== 0 ? Number((k.ry - minY).toFixed(4)) : 0,
  }));
}

function hydrateStandardViaLighting(rawLighting: unknown): LightingCapabilitySpec | null {
  if (!rawLighting) return null;

  let extendsType = "";
  let customEffects: RgbEffectDef[] | null = null;
  let speedMin = 0;
  let speedMax = 255;
  let speedStep = 51;
  let brightnessMax = 255;
  let brightnessStep = 51;

  if (typeof rawLighting === "string") {
    extendsType = rawLighting.toLowerCase();
  } else if (typeof rawLighting === "object") {
    const obj = rawLighting as Record<string, unknown>;
    if (typeof obj.extends === "string") {
      extendsType = obj.extends.toLowerCase();
    } else {
      extendsType = "qmk_rgb_matrix";
    }
    if (Array.isArray(obj.underglowEffects)) {
      customEffects = obj.underglowEffects
        .filter((e): e is [string, number] => Array.isArray(e) && typeof e[0] === "string")
        .map(([name, id], idx) => {
          const numId = typeof id === "number" ? id : idx + 1;
          const mapped = EFFECT_NAME_TO_SIMULATION[name.toLowerCase()] || {
            simulation: "cycle_all",
            reactive: false,
          };
          return {
            name,
            id: numId,
            simulation: mapped.simulation,
            reactive: mapped.reactive,
          };
        });
    }
    if (obj.speed && typeof obj.speed === "object") {
      const sp = obj.speed as Record<string, unknown>;
      if (typeof sp.min === "number") speedMin = sp.min;
      if (typeof sp.max === "number") speedMax = sp.max;
      if (typeof sp.step === "number") speedStep = sp.step;
    }
    if (obj.lightness && typeof obj.lightness === "object") {
      const lt = obj.lightness as Record<string, unknown>;
      if (typeof lt.max === "number") brightnessMax = lt.max;
      if (typeof lt.step === "number") brightnessStep = lt.step;
    }
  }

  if (extendsType === "none" || extendsType === "false") {
    return null;
  }

  // Channel 0x02 = qmk_rgblight, Channel 0x03 = qmk_rgb_matrix (default)
  const channel = extendsType.includes("rgblight") && !customEffects ? 2 : 3;

  return {
    brightnessMax,
    brightnessStep,
    speedMin,
    speedMax,
    speedStep,
    getBrightness: {
      cmd: [8, channel, 1],
      valueIndex: 3,
      fallbackCmd: [2, channel, 1],
      fallbackValueIndex: 3,
    },
    setBrightness: { cmd: [7, channel, 1, "$val"] },
    getMode: {
      cmd: [2, channel, 2],
      valueIndex: 3,
      fallbackCmd: [8, channel, 2],
      fallbackValueIndex: 3,
    },
    setMode: { cmd: [7, channel, 2, "$val"] },
    getSpeed: {
      cmd: [8, channel, 3],
      valueIndex: 3,
      fallbackCmd: [2, channel, 3],
      fallbackValueIndex: 3,
    },
    setSpeed: { cmd: [7, channel, 3, "$val"] },
    getColor: {
      cmd: [2, channel, 4],
      hueIndex: 3,
      satIndex: 4,
      fallbackCmd: [8, channel, 4],
      fallbackHueIndex: 3,
      fallbackSatIndex: 4,
    },
    setColor: { cmd: [7, channel, 4, "$hue", "$sat"] },
    save: { cmd: [9, channel] },
    effects:
      customEffects && customEffects.length > 0
        ? customEffects
        : STANDARD_QMK_RGB_EFFECTS,
    perKeyRgb: null,
  };
}

/**
 * Normalizes either a standard VIA v2/v3 JSON definition or a Studio JSON definition
 * into the unified `KeyboardDefinition` structure.
 */
export function normalizeKeyboardDefinition(
  raw: Record<string, unknown> | KeyboardDefinition,
  builtinOrOpts: boolean | { builtin?: boolean } = false
): KeyboardDefinition {
  const rawObj = raw as Record<string, unknown>;
  const builtin =
    typeof builtinOrOpts === "boolean"
      ? builtinOrOpts
      : Boolean(builtinOrOpts?.builtin ?? rawObj.builtin ?? false);
  const name = typeof rawObj.name === "string" && rawObj.name.trim() ? rawObj.name.trim() : "QMK Keyboard";

  let vendorId = parseHexOrNumber(rawObj.vendorId, 0);
  let productId = parseHexOrNumber(rawObj.productId, 0);
  if (vendorId === 0 && productId === 0 && rawObj.vendorProductId !== undefined) {
    const vpid = parseHexOrNumber(rawObj.vendorProductId, 0);
    vendorId = (vpid >>> 16) & 0xffff;
    productId = vpid & 0xffff;
  }

  const id =
    typeof rawObj.id === "string" && rawObj.id.trim()
      ? rawObj.id.trim()
      : slugifyDefinitionId(name, vendorId, productId);

  const rawMatrix = (rawObj.matrix as Record<string, unknown>) || {};
  const rows = Math.max(1, parseHexOrNumber(rawMatrix.rows, 6));
  const cols = Math.max(1, parseHexOrNumber(rawMatrix.cols, 21));

  const rawLayouts = (rawObj.layouts as Record<string, unknown>) || {};
  const labels = Array.isArray(rawLayouts.labels)
    ? (rawLayouts.labels as LayoutOptionLabel[])
    : [];

  let keys: LayoutKey[] = [];
  if (Array.isArray(rawLayouts.keys)) {
    keys = (rawLayouts.keys as Record<string, unknown>[]).map((k) => ({
      row: Number(k.row ?? 0),
      col: Number(k.col ?? 0),
      x: Number(k.x ?? 0),
      y: Number(k.y ?? 0),
      w: Number(k.w ?? 1),
      h: Number(k.h ?? 1),
      r: Number(k.r ?? 0),
      rx: Number(k.rx ?? 0),
      ry: Number(k.ry ?? 0),
      d: Boolean(k.d ?? false),
      value: String(k.value ?? ""),
      color: String(k.color ?? "alpha"),
      optionIndex:
        typeof k.optionIndex === "number" ? k.optionIndex : null,
      optionChoice:
        typeof k.optionChoice === "number" ? k.optionChoice : null,
    }));
  } else if (Array.isArray(rawLayouts.keymap)) {
    keys = parseViaKleKeymap(rawLayouts.keymap);
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = 0;
  let maxY = 0;
  for (const k of keys) {
    if (k.d) continue;
    if (k.x < minX) minX = k.x;
    if (k.y < minY) minY = k.y;
    if (k.x + k.w > maxX) maxX = k.x + k.w;
    if (k.y + k.h > maxY) maxY = k.y + k.h;
  }
  if (!Number.isFinite(minX)) minX = 0;
  if (!Number.isFinite(minY)) minY = 0;

  const width =
    typeof rawLayouts.width === "number" && rawLayouts.width > 0
      ? rawLayouts.width
      : Math.max(1, Number((maxX - minX).toFixed(4)));
  const height =
    typeof rawLayouts.height === "number" && rawLayouts.height > 0
      ? rawLayouts.height
      : Math.max(1, Number((maxY - minY).toFixed(4)));

  const multiLedKeys: MultiLedKeyZone[] = Array.isArray(rawLayouts.multiLedKeys)
    ? (rawLayouts.multiLedKeys as MultiLedKeyZone[])
    : [];

  const customKeycodes: CustomKeycodeDef[] = Array.isArray(rawObj.customKeycodes)
    ? (rawObj.customKeycodes as Record<string, unknown>[]).map((ck, idx) => ({
        name: String(ck.name ?? `USER${idx}`),
        title: String(ck.title ?? ck.name ?? `Custom Key ${idx}`),
        shortName: String(ck.shortName ?? ck.name ?? `U${idx}`),
      }))
    : [];

  const rawCaps = (rawObj.capabilities as Record<string, unknown>) || {};
  let lighting: LightingCapabilitySpec | null = null;
  if (rawCaps.lighting && typeof rawCaps.lighting === "object") {
    lighting = rawCaps.lighting as LightingCapabilitySpec;
  } else if (rawObj.lighting !== undefined) {
    lighting = hydrateStandardViaLighting(rawObj.lighting);
  }

  const customControls: CustomControlSpec[] = Array.isArray(rawCaps.customControls)
    ? (rawCaps.customControls as CustomControlSpec[])
    : [];

  return {
    id,
    name,
    vendorId,
    productId,
    builtin,
    matrix: { rows, cols },
    layouts: {
      width,
      height,
      labels,
      keys,
      multiLedKeys,
    },
    customKeycodes,
    capabilities: {
      lighting,
      customControls,
    },
  };
}

const LEGEND_TO_DOM_CODE: Record<string, string> = {
  esc: "Escape",
  escape: "Escape",
  f1: "F1",
  f2: "F2",
  f3: "F3",
  f4: "F4",
  f5: "F5",
  f6: "F6",
  f7: "F7",
  f8: "F8",
  f9: "F9",
  f10: "F10",
  f11: "F11",
  f12: "F12",
  ins: "Insert",
  insert: "Insert",
  print: "PrintScreen",
  prtsc: "PrintScreen",
  pscr: "PrintScreen",
  scroll: "ScrollLock",
  scrlk: "ScrollLock",
  pause: "Pause",
  home: "Home",
  end: "End",
  pgup: "PageUp",
  pageup: "PageUp",
  pgdn: "PageDown",
  pagedown: "PageDown",
  del: "Delete",
  delete: "Delete",
  "`": "Backquote",
  "~`": "Backquote",
  "`~": "Backquote",
  "!1": "Digit1",
  "@2": "Digit2",
  "#3": "Digit3",
  "$4": "Digit4",
  "%5": "Digit5",
  "^6": "Digit6",
  "&7": "Digit7",
  "*8": "Digit8",
  "(9": "Digit9",
  ")0": "Digit0",
  "_-": "Minus",
  "-_": "Minus",
  "+=": "Equal",
  "=+": "Equal",
  bksp: "Backspace",
  backspace: "Backspace",
  tab: "Tab",
  q: "KeyQ",
  w: "KeyW",
  e: "KeyE",
  r: "KeyR",
  t: "KeyT",
  y: "KeyY",
  u: "KeyU",
  i: "KeyI",
  o: "KeyO",
  p: "KeyP",
  "{[": "BracketLeft",
  "[{": "BracketLeft",
  "[": "BracketLeft",
  "}]": "BracketRight",
  "]}": "BracketRight",
  "]": "BracketRight",
  "|\\": "Backslash",
  "\\|": "Backslash",
  "\\": "Backslash",
  "|、": "Backslash",
  caps: "CapsLock",
  capslock: "CapsLock",
  a: "KeyA",
  s: "KeyS",
  d: "KeyD",
  f: "KeyF",
  g: "KeyG",
  h: "KeyH",
  j: "KeyJ",
  k: "KeyK",
  l: "KeyL",
  ";:": "Semicolon",
  ":;": "Semicolon",
  ";": "Semicolon",
  "\"'": "Quote",
  "'\"": "Quote",
  "“”": "Quote",
  "'": "Quote",
  enter: "Enter",
  return: "Enter",
  ent: "Enter",
  lshft: "ShiftLeft",
  lshift: "ShiftLeft",
  z: "KeyZ",
  x: "KeyX",
  c: "KeyC",
  v: "KeyV",
  b: "KeyB",
  n: "KeyN",
  m: "KeyM",
  ",<": "Comma",
  "<,": "Comma",
  ",": "Comma",
  ".>": "Period",
  ">.": "Period",
  "?/": "Slash",
  "/?": "Slash",
  "/": "Slash",
  rshft: "ShiftRight",
  rshift: "ShiftRight",
  "↑": "ArrowUp",
  up: "ArrowUp",
  "←": "ArrowLeft",
  left: "ArrowLeft",
  "↓": "ArrowDown",
  down: "ArrowDown",
  "→": "ArrowRight",
  right: "ArrowRight",
  lctl: "ControlLeft",
  lctrl: "ControlLeft",
  lwin: "MetaLeft",
  lgui: "MetaLeft",
  lcmd: "MetaLeft",
  lalt: "AltLeft",
  lopt: "AltLeft",
  space: "Space",
  spc: "Space",
  ralt: "AltRight",
  ropt: "AltRight",
  rwin: "MetaRight",
  rgui: "MetaRight",
  menu: "ContextMenu",
  app: "ContextMenu",
  rctl: "ControlRight",
  rctrl: "ControlRight",
  "n.lck": "NumLock",
  nlk: "NumLock",
  numlock: "NumLock",
  "÷": "NumpadDivide",
  "n.ent": "NumpadEnter",
  nent: "NumpadEnter",
};

/**
 * Automatically builds a `DOM_CODE -> { row, col }` lookup map from any keyboard definition's
 * active physical keys so the Key Tester and Backlighting live key readout work on any layout.
 */
export function buildDomCodeToCoordMap(
  keys: LayoutKey[],
  boardWidth?: number
): Record<string, { row: number; col: number }> {
  const map: Record<string, { row: number; col: number }> = {};

  let maxX = boardWidth ?? 0;
  for (const k of keys) {
    if (k.x + k.w > maxX) maxX = k.x + k.w;
  }
  const numpadThresholdX = Math.max(14.5, maxX - 4.8);

  for (const k of keys) {
    if (k.d) continue;
    const raw = k.value.trim();
    const lower = raw.toLowerCase();
    const isNumpadCluster = k.x >= numpadThresholdX;

    if (isNumpadCluster) {
      if (raw === "0") {
        map.Numpad0 = { row: k.row, col: k.col };
        continue;
      }
      if (raw === "1") {
        map.Numpad1 = { row: k.row, col: k.col };
        continue;
      }
      if (raw === "2") {
        map.Numpad2 = { row: k.row, col: k.col };
        continue;
      }
      if (raw === "3") {
        map.Numpad3 = { row: k.row, col: k.col };
        continue;
      }
      if (raw === "4") {
        map.Numpad4 = { row: k.row, col: k.col };
        continue;
      }
      if (raw === "5") {
        map.Numpad5 = { row: k.row, col: k.col };
        continue;
      }
      if (raw === "6") {
        map.Numpad6 = { row: k.row, col: k.col };
        continue;
      }
      if (raw === "7") {
        map.Numpad7 = { row: k.row, col: k.col };
        continue;
      }
      if (raw === "8") {
        map.Numpad8 = { row: k.row, col: k.col };
        continue;
      }
      if (raw === "9") {
        map.Numpad9 = { row: k.row, col: k.col };
        continue;
      }
      if (raw === ".") {
        map.NumpadDecimal = { row: k.row, col: k.col };
        continue;
      }
      if (raw === "+") {
        map.NumpadAdd = { row: k.row, col: k.col };
        continue;
      }
      if (raw === "-") {
        map.NumpadSubtract = { row: k.row, col: k.col };
        continue;
      }
      if (lower === "x" || raw === "*") {
        map.NumpadMultiply = { row: k.row, col: k.col };
        continue;
      }
      if (raw === "/" || raw === "÷") {
        map.NumpadDivide = { row: k.row, col: k.col };
        continue;
      }
    }

    // Disambiguate Left vs Right Shift / Ctrl / Alt / Win if labeled generically ("Shift", "Ctrl", "Alt")
    if (lower === "shift") {
      const code = k.x < 6 ? "ShiftLeft" : "ShiftRight";
      map[code] = { row: k.row, col: k.col };
      continue;
    }
    if (lower === "ctrl" || lower === "control") {
      const code = k.x < 6 ? "ControlLeft" : "ControlRight";
      map[code] = { row: k.row, col: k.col };
      continue;
    }
    if (lower === "alt" || lower === "opt" || lower === "option") {
      const code = k.x < 6 ? "AltLeft" : "AltRight";
      map[code] = { row: k.row, col: k.col };
      continue;
    }
    if (lower === "win" || lower === "gui" || lower === "cmd" || lower === "super") {
      const code = k.x < 6 ? "MetaLeft" : "MetaRight";
      map[code] = { row: k.row, col: k.col };
      continue;
    }

    // Single digit 0..9 on top row
    if (/^[0-9]$/.test(raw) && !isNumpadCluster) {
      map[`Digit${raw}`] = { row: k.row, col: k.col };
      continue;
    }

    const direct = LEGEND_TO_DOM_CODE[lower];
    if (direct && !map[direct]) {
      map[direct] = { row: k.row, col: k.col };
    }
  }

  return map;
}
