import { parseViaLighting, ViaLightingControl } from "./viaLighting";
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
export interface KeyboardDefinition {
    id: string;
    name: string;
    vendorId: number;
    productId: number;
    builtin?: boolean;
    viaLighting?: ViaLightingControl[];
    matrix: {
        rows: number;
        cols: number;
    };
    layouts: {
        width: number;
        height: number;
        labels: LayoutOptionLabel[];
        keys: LayoutKey[];
    };
    customKeycodes: CustomKeycodeDef[];
    source: Record<string, unknown>;
}
export function parseHexOrNumber(val: unknown, fallback = 0): number {
    if (typeof val === "number" && Number.isFinite(val)) {
        return val >>> 0;
    }
    if (typeof val === "string") {
        const trimmed = val.trim();
        if (/^0x[0-9a-fA-F]+$/i.test(trimmed)) {
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
    if (lower.includes("00ff") ||
        lower.includes("34d3") ||
        lower.includes("10b9") ||
        lower.includes("f43f") ||
        lower.includes("e11d") ||
        lower.includes("ff5") ||
        label.toLowerCase() === "esc") {
        return "accent";
    }
    if (lower === "#777777" || lower === "#555555" || lower === "#666666" || w >= 1.5) {
        return "mod";
    }
    return "alpha";
}
function defaultLegendForCoord(row: number, col: number, w: number): string {
    if (row === 0 && col === 0)
        return "Esc";
    if (w >= 5.5)
        return "Space";
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
        if (!Array.isArray(rowItems))
            continue;
        if (rowIdx === 0) {
            currX = currRx;
            currY = currRy;
        }
        else {
            currX = currRx;
            currY += 1;
        }
        for (const item of rowItems) {
            if (item && typeof item === "object" && !Array.isArray(item)) {
                const props = item as Record<string, unknown>;
                if (typeof props.r === "number")
                    currR = props.r;
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
                if (typeof props.x === "number")
                    currX += props.x;
                if (typeof props.y === "number")
                    currY += props.y;
                if (typeof props.w === "number")
                    nextW = props.w;
                if (typeof props.h === "number")
                    nextH = props.h;
                if (typeof props.c === "string")
                    currColorHex = props.c;
                if (typeof props.d === "boolean")
                    isDecal = props.d;
            }
            else if (typeof item === "string") {
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
export function getLayoutOptionChoice(bitmask: number, optOrList: ParsedLayoutOption | ParsedLayoutOption[], optionIndex?: number): number {
    const opt = Array.isArray(optOrList)
        ? optOrList.find((o) => o.index === (optionIndex ?? 0))
        : optOrList;
    if (!opt)
        return 0;
    const mask = (1 << opt.bitWidth) - 1;
    return (bitmask >>> opt.bitOffset) & mask;
}
export function setLayoutOptionChoice(bitmask: number, optOrList: ParsedLayoutOption | ParsedLayoutOption[], optionIndexOrChoice: number, maybeChoice?: number): number {
    const opt = Array.isArray(optOrList)
        ? optOrList.find((o) => o.index === optionIndexOrChoice)
        : optOrList;
    const choice = Array.isArray(optOrList) ? (maybeChoice ?? 0) : optionIndexOrChoice;
    if (!opt)
        return bitmask;
    const mask = ((1 << opt.bitWidth) - 1) << opt.bitOffset;
    const cleared = bitmask & ~mask;
    const clamped = choice & ((1 << opt.bitWidth) - 1);
    return (cleared | (clamped << opt.bitOffset)) >>> 0;
}
/**
 * Resolves the active physical keys for a definition given the current VIA `layoutOptions` bitmask,
 * normalizing coordinates so the active board starts at `(minX = 0, minY = 0)`.
 */
export function resolveActiveLayoutKeys(def: KeyboardDefinition, layoutOptionsBitmask = 0): LayoutKey[] {
    const parsedOpts = parseLayoutOptionLabels(def.layouts.labels || []);
    const choiceByOptionIdx = new Map<number, number>();
    for (const opt of parsedOpts) {
        choiceByOptionIdx.set(opt.index, getLayoutOptionChoice(layoutOptionsBitmask, opt));
    }
    const filtered = def.layouts.keys.filter((k) => {
        if (k.d)
            return false;
        if (k.optionIndex === undefined || k.optionIndex === null)
            return true;
        const activeChoice = choiceByOptionIdx.get(k.optionIndex) ?? 0;
        return (k.optionChoice ?? 0) === activeChoice;
    });
    if (filtered.length === 0)
        return [];
    let minX = Infinity;
    let minY = Infinity;
    for (const k of filtered) {
        if (k.x < minX)
            minX = k.x;
        if (k.y < minY)
            minY = k.y;
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
/**
 * Parses a VIA v2/v3 keyboard definition. Internal normalized objects are never imports.
 */
export function parseViaDefinition(raw: unknown, { builtin = false }: {
    builtin?: boolean;
} = {}): KeyboardDefinition {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        throw new Error("Expected a VIA keyboard definition object");
    const rawObj = raw as Record<string, unknown>;
    const layout = rawObj.layouts as Record<string, unknown> | undefined;
    if (!layout || !Array.isArray(layout.keymap) || layout.keys !== undefined || layout.multiLedKeys !== undefined || rawObj.capabilities !== undefined || rawObj.viaLighting !== undefined) {
        throw new Error("Only VIA JSON keyboard definitions with layouts.keymap are supported");
    }
    if (typeof rawObj.name !== "string" || !rawObj.name.trim())
        throw new Error("VIA definition requires a name");
    const dims = rawObj.matrix as Record<string, unknown> | undefined;
    if (!dims || ![dims.rows, dims.cols].every(n => typeof n === "number" && Number.isInteger(n) && n > 0 && n <= 255))
        throw new Error("VIA definition requires valid matrix rows and cols (1–255)");
    const name = rawObj.name.trim();
    const validUnsigned = (value: unknown, max: number) => {
        const number = typeof value === "number" ? value : typeof value === "string" && /^(0x[0-9a-f]+|[0-9]+)$/i.test(value.trim()) ? Number(value) : NaN;
        return Number.isInteger(number) && number >= 0 && number <= max;
    };
    for (const key of ["vendorId", "productId"]) {
        if (rawObj[key] !== undefined && !validUnsigned(rawObj[key], 65535))
            throw new Error("VIA USB IDs must fit in 16 bits");
    }
    if (rawObj.vendorProductId !== undefined && !validUnsigned(rawObj.vendorProductId, 0xffffffff))
        throw new Error("Invalid VIA vendorProductId");
    let vendorId = parseHexOrNumber(rawObj.vendorId, 0);
    let productId = parseHexOrNumber(rawObj.productId, 0);
    if (vendorId === 0 && productId === 0 && rawObj.vendorProductId !== undefined) {
        const vpid = parseHexOrNumber(rawObj.vendorProductId, 0);
        vendorId = (vpid >>> 16) & 0xffff;
        productId = vpid & 0xffff;
    }
    const id = slugifyDefinitionId(name, vendorId, productId);
    if (vendorId > 65535 || productId > 65535)
        throw new Error("VIA USB IDs must fit in 16 bits");
    const rawMatrix = (rawObj.matrix as Record<string, unknown>) || {};
    const rows = Math.max(1, parseHexOrNumber(rawMatrix.rows, 6));
    const cols = Math.max(1, parseHexOrNumber(rawMatrix.cols, 21));
    const rawLayouts = (rawObj.layouts as Record<string, unknown>) || {};
    const labels = Array.isArray(rawLayouts.labels)
        ? (rawLayouts.labels as LayoutOptionLabel[])
        : [];
    const keys = parseViaKleKeymap(rawLayouts.keymap as unknown[]);
    if (!keys.length || keys.some(k => k.row >= rows || k.col >= cols))
        throw new Error("VIA layout must contain valid coordinates within the matrix");
    let minX = Infinity;
    let minY = Infinity;
    let maxX = 0;
    let maxY = 0;
    for (const k of keys) {
        if (k.d)
            continue;
        if (k.x < minX)
            minX = k.x;
        if (k.y < minY)
            minY = k.y;
        if (k.x + k.w > maxX)
            maxX = k.x + k.w;
        if (k.y + k.h > maxY)
            maxY = k.y + k.h;
    }
    if (!Number.isFinite(minX))
        minX = 0;
    if (!Number.isFinite(minY))
        minY = 0;
    const width = Math.max(1, Number((maxX - minX).toFixed(4)));
    const height = Math.max(1, Number((maxY - minY).toFixed(4)));
    const customKeycodes: CustomKeycodeDef[] = Array.isArray(rawObj.customKeycodes)
        ? (rawObj.customKeycodes as Record<string, unknown>[]).map((ck, idx) => ({
            name: String(ck.name ?? `USER${idx}`),
            title: String(ck.title ?? ck.name ?? `Custom Key ${idx}`),
            shortName: String(ck.shortName ?? ck.name ?? `U${idx}`),
        }))
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
        },
        customKeycodes,
        viaLighting: parseViaLighting(rawObj),
        source: structuredClone(rawObj),
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
export function buildDomCodeToCoordMap(keys: LayoutKey[], boardWidth?: number): Record<string, {
    row: number;
    col: number;
}> {
    const map: Record<string, {
        row: number;
        col: number;
    }> = {};
    let maxX = boardWidth ?? 0;
    for (const k of keys) {
        if (k.x + k.w > maxX)
            maxX = k.x + k.w;
    }
    const numpadThresholdX = Math.max(14.5, maxX - 4.8);
    for (const k of keys) {
        if (k.d)
            continue;
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
