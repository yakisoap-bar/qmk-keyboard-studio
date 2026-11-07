import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import max102Via from "../data/definitions/max102.json";
import { encodeKeycodeString } from "../data/keycodes";
import { buildDomCodeToCoordMap, KeyboardDefinition, LayoutKey, parseViaDefinition, parseLayoutOptionLabels, resolveActiveLayoutKeys, setLayoutOptionChoice, } from "../utils/kleParser";
export type { LayoutKey, KeyboardDefinition };
export interface DetectedQmkDevice {
    vendorId: number;
    productId: number;
    productName: string;
    hidrawPath: string | null;
    matchedDefinitionId: string | null;
    isUnknownDevice: boolean;
    permissionDenied: boolean;
}
export interface MacroStep {
    action: "keydown" | "keyup";
    code: string;
    key: string;
    delay: number;
}
export interface MacroSlot {
    index: number;
    name: string;
    steps: MacroStep[];
}
export interface KeyboardProfile {
    schema_version: number;
    name: string;
    device_name: string;
    definition_id?: string;
    vendor_id?: number;
    product_id?: number;
    protocol_version: number;
    layers_count: number;
    rows: number;
    cols: number;
    layout_options?: number;
    layers: number[][];
    macros: MacroSlot[];
    via_lighting_values?: Record<string, number[]>;
}
export interface ConnectionDiagnostics {
    connected: boolean;
    usb_detected: boolean;
    permission_denied: boolean;
    hidraw_path: string | null;
    product_name: string;
    vendor_id: number;
    product_id: number;
    definition_id?: string;
    is_unknown_device?: boolean;
    protocol_version: number;
    layers_count: number;
    message: string;
}
export type StudioTab = "keymap" | "lighting" | "macros" | "tester" | "settings";
export const BUNDLED_DEFINITIONS: KeyboardDefinition[] = [
    parseViaDefinition(max102Via, { builtin: true }),
];
export const DEFAULT_DEFINITION: KeyboardDefinition = BUNDLED_DEFINITIONS[0];
const isTauriRuntime = (): boolean => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>, fallback?: T): Promise<T> {
    if (!isTauriRuntime()) {
        if (fallback !== undefined)
            return fallback;
        throw new Error("Tauri runtime not detected (running in browser preview)");
    }
    return invoke<T>(cmd, args);
}
const DEFAULT_LABEL_TO_CODE: Record<string, string> = {
    esc: "KC_ESC",
    escape: "KC_ESC",
    f1: "KC_F1",
    f2: "KC_F2",
    f3: "KC_F3",
    f4: "KC_F4",
    f5: "KC_F5",
    f6: "KC_F6",
    f7: "KC_F7",
    f8: "KC_F8",
    f9: "KC_F9",
    f10: "KC_F10",
    f11: "KC_F11",
    f12: "KC_F12",
    print: "KC_PSCR",
    prtsc: "KC_PSCR",
    pscr: "KC_PSCR",
    scroll: "KC_SLCK",
    scrlk: "KC_SLCK",
    slck: "KC_SLCK",
    pause: "KC_PAUS",
    paus: "KC_PAUS",
    break: "KC_PAUS",
    ins: "KC_INS",
    insert: "KC_INS",
    del: "KC_DEL",
    delete: "KC_DEL",
    home: "KC_HOME",
    end: "KC_END",
    pgup: "KC_PGUP",
    pageup: "KC_PGUP",
    pgdn: "KC_PGDN",
    pagedown: "KC_PGDN",
    "`": "KC_GRV",
    "~": "KC_GRV",
    "~`": "KC_GRV",
    "`~": "KC_GRV",
    "1": "KC_1",
    "!1": "KC_1",
    "1!": "KC_1",
    "2": "KC_2",
    "@2": "KC_2",
    "2@": "KC_2",
    "3": "KC_3",
    "#3": "KC_3",
    "3#": "KC_3",
    "4": "KC_4",
    "$4": "KC_4",
    "4$": "KC_4",
    "5": "KC_5",
    "%5": "KC_5",
    "5%": "KC_5",
    "6": "KC_6",
    "^6": "KC_6",
    "6^": "KC_6",
    "7": "KC_7",
    "&7": "KC_7",
    "7&": "KC_7",
    "8": "KC_8",
    "*8": "KC_8",
    "8*": "KC_8",
    "9": "KC_9",
    "(9": "KC_9",
    "9(": "KC_9",
    "0": "KC_0",
    ")0": "KC_0",
    "0)": "KC_0",
    "-": "KC_MINS",
    "_-": "KC_MINS",
    "-_": "KC_MINS",
    "=": "KC_EQL",
    "+=": "KC_EQL",
    "=+": "KC_EQL",
    backspace: "KC_BSPC",
    bksp: "KC_BSPC",
    bspc: "KC_BSPC",
    tab: "KC_TAB",
    q: "KC_Q",
    w: "KC_W",
    e: "KC_E",
    r: "KC_R",
    t: "KC_T",
    y: "KC_Y",
    u: "KC_U",
    i: "KC_I",
    o: "KC_O",
    p: "KC_P",
    "[": "KC_LBRC",
    "{[": "KC_LBRC",
    "[{": "KC_LBRC",
    "{(": "KC_LBRC",
    "]": "KC_RBRC",
    "}]": "KC_RBRC",
    "]}": "KC_RBRC",
    "})": "KC_RBRC",
    "|": "KC_BSLS",
    "\\": "KC_BSLS",
    "|\\": "KC_BSLS",
    "\\|": "KC_BSLS",
    capslock: "KC_CAPS",
    caps: "KC_CAPS",
    a: "KC_A",
    s: "KC_S",
    d: "KC_D",
    f: "KC_F",
    g: "KC_G",
    h: "KC_H",
    j: "KC_J",
    k: "KC_K",
    l: "KC_L",
    ";": "KC_SCLN",
    ";:": "KC_SCLN",
    ":;": "KC_SCLN",
    "'": "KC_QUOT",
    "\"'": "KC_QUOT",
    "'\"": "KC_QUOT",
    "\"\"": "KC_QUOT",
    enter: "KC_ENT",
    return: "KC_ENT",
    ent: "KC_ENT",
    lshift: "KC_LSFT",
    lshft: "KC_LSFT",
    lsft: "KC_LSFT",
    z: "KC_Z",
    x: "KC_X",
    c: "KC_C",
    v: "KC_V",
    b: "KC_B",
    n: "KC_N",
    m: "KC_M",
    ",": "KC_COMM",
    ",<": "KC_COMM",
    "<,": "KC_COMM",
    ".": "KC_DOT",
    ".>": "KC_DOT",
    ">.": "KC_DOT",
    "?": "KC_SLSH",
    "/": "KC_SLSH",
    "?/": "KC_SLSH",
    "/?": "KC_SLSH",
    rshift: "KC_RSFT",
    rshft: "KC_RSFT",
    rsft: "KC_RSFT",
    "↑": "KC_UP",
    up: "KC_UP",
    lctl: "KC_LCTL",
    lctrl: "KC_LCTL",
    lwin: "KC_LGUI",
    lgui: "KC_LGUI",
    lcmd: "KC_LGUI",
    lalt: "KC_LALT",
    lopt: "KC_LALT",
    space: "KC_SPC",
    spc: "KC_SPC",
    ralt: "KC_RALT",
    ropt: "KC_RALT",
    rwin: "KC_RGUI",
    rgui: "KC_RGUI",
    rcmd: "KC_RGUI",
    menu: "KC_APP",
    app: "KC_APP",
    fn: "MO(1)",
    rctl: "KC_RCTL",
    rctrl: "KC_RCTL",
    "←": "KC_LEFT",
    left: "KC_LEFT",
    "↓": "KC_DOWN",
    down: "KC_DOWN",
    "→": "KC_RGHT",
    right: "KC_RGHT",
    "n.lck": "KC_NLCK",
    nlk: "KC_NLCK",
    num: "KC_NLCK",
    numlock: "KC_NLCK",
    "÷": "KC_PSLS",
    "*": "KC_PAST",
    "+": "KC_PPLS",
    "n.ent": "KC_PENT",
    nent: "KC_PENT",
};
function resolveDefaultKeycodeString(label: string, isNumpad: boolean): string {
    const trimmed = label.trim();
    const lower = trimmed.toLowerCase();
    if (isNumpad) {
        if (trimmed >= "0" && trimmed <= "9")
            return `KC_P${trimmed}`;
        if (trimmed === ".")
            return "KC_PDOT";
        if (trimmed === "-")
            return "KC_PMNS";
        if (trimmed === "+")
            return "KC_PPLS";
        if (trimmed === "/" || trimmed === "÷")
            return "KC_PSLS";
        if (trimmed === "*" || lower === "x")
            return "KC_PAST";
        if (lower === "enter" || lower === "n.ent" || lower === "nent")
            return "KC_PENT";
        if (lower === "n.lck" || lower === "nlk" || lower === "num" || lower === "numlock")
            return "KC_NLCK";
    }
    return DEFAULT_LABEL_TO_CODE[lower] || "KC_NO";
}
export function createDefaultOfflineProfile(name = "Default Profile", def: KeyboardDefinition = DEFAULT_DEFINITION): KeyboardProfile {
    const rows = def.matrix.rows;
    const cols = def.matrix.cols;
    const cells = rows * cols;
    const layer0 = new Array<number>(cells).fill(0);
    const numpadStartX = Math.max(14.5, def.layouts.width - 4.5);
    const visibleKeys = resolveActiveLayoutKeys(def, 0);
    for (const k of visibleKeys) {
        const idx = k.row * cols + k.col;
        if (idx >= cells)
            continue;
        const codeStr = resolveDefaultKeycodeString(k.value, k.x >= numpadStartX);
        layer0[idx] = encodeKeycodeString(codeStr, 11);
    }
    const layerTrns = new Array<number>(cells).fill(1);
    const macros: MacroSlot[] = Array.from({ length: 16 }, (_, i) => ({
        index: i,
        name: `M${i}`,
        steps: [],
    }));
    return {
        schema_version: 2,
        name,
        device_name: def.name,
        definition_id: def.id,
        vendor_id: def.vendorId,
        product_id: def.productId,
        protocol_version: 11,
        layers_count: 4,
        rows,
        cols,
        layout_options: 0,
        layers: [layer0, [...layerTrns], [...layerTrns], [...layerTrns]],
        macros,
        via_lighting_values: {},
    };
}
function cloneProfile(p: KeyboardProfile): KeyboardProfile {
    return JSON.parse(JSON.stringify(p)) as KeyboardProfile;
}
const USER_DEFINITIONS_STORAGE_KEY = "qmk_studio_via_definitions_v2";
function profileStorageKey(defId: string): string {
    return `qmk_studio_profiles_v2_${defId}`;
}
function activeProfileIndexKey(defId: string): string {
    return `qmk_studio_active_profile_idx_${defId}`;
}
function loadUserDefinitionsFromStorage(): KeyboardDefinition[] {
    try {
        const raw = localStorage.getItem(USER_DEFINITIONS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.flatMap(d => { try {
                    return [parseViaDefinition(d, { builtin: false })];
                }
                catch {
                    return [];
                } });
            }
        }
    }
    catch {
        // ignore storage errors
    }
    return [];
}
function persistUserDefinitionsToStorage(defs: KeyboardDefinition[]) {
    try {
        const userOnly = defs.filter((d) => !d.builtin);
        localStorage.setItem(USER_DEFINITIONS_STORAGE_KEY, JSON.stringify(userOnly.map(d => d.source)));
    }
    catch {
        // ignore
    }
}
function loadStoredProfilesForDef(def: KeyboardDefinition): KeyboardProfile[] {
    try {
        const key = profileStorageKey(def.id);
        let raw = localStorage.getItem(key);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const expectedCells = def.matrix.rows * def.matrix.cols;
                const validProfiles = parsed.filter((p: KeyboardProfile) => p.rows === def.matrix.rows &&
                    p.cols === def.matrix.cols &&
                    Array.isArray(p.layers) &&
                    Array.isArray(p.layers[0]) &&
                    p.layers[0].length === expectedCells);
                if (validProfiles.length > 0) {
                    return validProfiles.map((p: KeyboardProfile) => ({
                        ...p,
                        definition_id: p.definition_id || def.id,
                        layout_options: p.layout_options ?? 0,
                    }));
                }
            }
        }
    }
    catch {
        // ignore storage errors
    }
    return [
        createDefaultOfflineProfile("Profile 1 — Standard", def),
        createDefaultOfflineProfile("Profile 2 — Gaming", def),
        createDefaultOfflineProfile("Profile 3 — Lighting", def),
    ];
}
function loadStoredActiveProfileIndexForDef(defId: string, maxLen: number): number {
    try {
        const key = activeProfileIndexKey(defId);
        let raw = localStorage.getItem(key);
        if (raw !== null) {
            const idx = parseInt(raw, 10);
            if (!Number.isNaN(idx) && idx >= 0 && idx < maxLen) {
                return idx;
            }
        }
    }
    catch {
        // ignore storage errors
    }
    return 0;
}
function persistProfilesForDef(defId: string, profiles: KeyboardProfile[], activeIdx?: number) {
    try {
        localStorage.setItem(profileStorageKey(defId), JSON.stringify(profiles));
        if (activeIdx !== undefined) {
            localStorage.setItem(activeProfileIndexKey(defId), String(activeIdx));
        }
    }
    catch {
        // ignore storage errors
    }
}
let connectInFlightPromise: Promise<void> | null = null;
interface KeyboardStoreState {
    // Multi-device & Definition Registry
    activeDefinition: KeyboardDefinition;
    definitions: KeyboardDefinition[];
    detectedDevices: DetectedQmkDevice[];
    activeLayoutKeys: LayoutKey[];
    domCodeMap: Record<string, {
        row: number;
        col: number;
    }>;
    diagnostics: ConnectionDiagnostics;
    isBusy: boolean;
    statusBanner: {
        type: "info" | "success" | "error";
        text: string;
    } | null;
    activeTab: StudioTab;
    currentLayer: number;
    selectedKey: {
        row: number;
        col: number;
    } | null;
    capturePhysicalKeyMode: boolean;
    lightingPreviewControlId: string | null;
    // Profile & Undo/Redo state
    profile: KeyboardProfile;
    savedProfiles: KeyboardProfile[];
    activeProfileIndex: number;
    undoStack: KeyboardProfile[];
    redoStack: KeyboardProfile[];
    // Actions
    setActiveTab: (tab: StudioTab) => void;
    setCurrentLayer: (layer: number) => void;
    setSelectedKey: (coord: {
        row: number;
        col: number;
    } | null) => void;
    setCapturePhysicalKeyMode: (enabled: boolean) => void;
    setLightingPreviewControlId: (id: string | null) => void;
    clearStatusBanner: () => void;
    // Device & Definition Registry Actions
    refreshDevicesAndDefinitions: () => Promise<void>;
    selectDeviceOrDefinition: (opts: {
        vendorId?: number;
        productId?: number;
        definitionId?: string;
    }) => Promise<void>;
    importViaDefinition: (jsonText: string) => Promise<void>;
    removeDefinition: (definitionId: string) => Promise<void>;
    setLayoutOption: (optionIndex: number, choice: number) => Promise<void>;
    // Hardware & State Mutations
    connectKeyboard: () => Promise<void>;
    disconnectKeyboard: () => Promise<void>;
    installLinuxUdevRule: () => Promise<void>;
    assignKeycode: (layer: number, row: number, col: number, keycode: number) => Promise<void>;
    copyLayer: (fromLayer: number, toLayer: number) => Promise<void>;
    resetLayerToTransparent: (layer: number) => Promise<void>;
    setViaLightingValue: (controlId: string, value: number[]) => Promise<void>;
    updateMacroSlot: (slot: MacroSlot, syncToHardware?: boolean) => Promise<void>;
    saveAllMacrosToHardware: () => Promise<void>;
    factoryResetKeyboard: () => Promise<void>;
    // Undo / Redo
    undo: () => Promise<void>;
    redo: () => Promise<void>;
    // Profile management
    switchSavedProfile: (index: number) => Promise<void>;
    saveCurrentToProfileSlot: (name?: string) => void;
    createNewProfileSlot: (name: string) => void;
    deleteProfileSlot: (index: number) => void;
    importProfileJson: (jsonText: string) => Promise<void>;
}
export const useKeyboardStore = create<KeyboardStoreState>((set, get) => {
    const initialUserDefs = loadUserDefinitionsFromStorage();
    const initialDefs = [...new Map([...BUNDLED_DEFINITIONS, ...initialUserDefs].map(d => [d.id, d])).values()];
    const initialDef = initialDefs.find(d => d.id === DEFAULT_DEFINITION.id) ?? DEFAULT_DEFINITION;
    const initialProfiles = loadStoredProfilesForDef(initialDef);
    const initialActiveIndex = loadStoredActiveProfileIndexForDef(initialDef.id, initialProfiles.length);
    const initialProfile = cloneProfile(initialProfiles[initialActiveIndex]);
    const initialLayoutKeys = resolveActiveLayoutKeys(initialDef, initialProfile.layout_options ?? 0);
    const initialDomCodeMap = buildDomCodeToCoordMap(initialLayoutKeys, initialDef.layouts.width);
    const pushUndoSnapshot = () => {
        const current = cloneProfile(get().profile);
        set((s) => ({
            undoStack: [...s.undoStack.slice(-29), current],
            redoStack: [],
        }));
    };
    const commitProfileState = (updater: (prev: KeyboardProfile) => KeyboardProfile, extra?: Partial<KeyboardStoreState>) => {
        set((s) => {
            const def = extra?.activeDefinition ?? s.activeDefinition;
            const updated = updater(cloneProfile(s.profile));
            const slotName = s.savedProfiles[s.activeProfileIndex]?.name || updated.name;
            updated.name = slotName;
            updated.definition_id = def.id;
            const nextSaved = s.savedProfiles.map((p, idx) => idx === s.activeProfileIndex ? cloneProfile(updated) : p);
            persistProfilesForDef(def.id, nextSaved, s.activeProfileIndex);
            const nextLayoutKeys = resolveActiveLayoutKeys(def, updated.layout_options ?? 0);
            const nextDomMap = buildDomCodeToCoordMap(nextLayoutKeys, def.layouts.width);
            return {
                ...extra,
                profile: updated,
                savedProfiles: nextSaved,
                activeLayoutKeys: nextLayoutKeys,
                domCodeMap: nextDomMap,
            };
        });
    };
    const applyDefinitionSwitch = (nextDef: KeyboardDefinition, hardwareProfile?: KeyboardProfile, diagnostics?: ConnectionDiagnostics, bannerText?: string) => {
        const storedProfiles = loadStoredProfilesForDef(nextDef);
        const activeIdx = loadStoredActiveProfileIndexForDef(nextDef.id, storedProfiles.length);
        const activeProfile = hardwareProfile
            ? {
                ...hardwareProfile,
                name: storedProfiles[activeIdx]?.name || hardwareProfile.name,
                definition_id: nextDef.id,
            }
            : cloneProfile(storedProfiles[activeIdx]);
        if (hardwareProfile) {
            storedProfiles[activeIdx] = cloneProfile(activeProfile);
            persistProfilesForDef(nextDef.id, storedProfiles, activeIdx);
        }
        const activeLayoutKeys = resolveActiveLayoutKeys(nextDef, activeProfile.layout_options ?? 0);
        const domCodeMap = buildDomCodeToCoordMap(activeLayoutKeys, nextDef.layouts.width);
        const firstKey = activeLayoutKeys[0]
            ? { row: activeLayoutKeys[0].row, col: activeLayoutKeys[0].col }
            : { row: 0, col: 0 };
        set((s) => {
            // If switching to a keyboard without lighting capabilities while on the lighting tab, return to keymap tab
            const nextTab = s.activeTab === "lighting" && !nextDef.viaLighting?.length
                ? "keymap"
                : s.activeTab;
            return {
                activeDefinition: nextDef,
                lightingPreviewControlId: null,
                activeLayoutKeys,
                domCodeMap,
                profile: activeProfile,
                savedProfiles: storedProfiles,
                activeProfileIndex: activeIdx,
                selectedKey: firstKey,
                undoStack: [],
                redoStack: [],
                activeTab: nextTab,
                isBusy: false,
                ...(diagnostics ? { diagnostics } : {}),
                ...(bannerText
                    ? {
                        statusBanner: {
                            type: diagnostics?.permission_denied
                                ? "error"
                                : diagnostics?.connected
                                    ? "success"
                                    : "info",
                            text: bannerText,
                        },
                    }
                    : {}),
            };
        });
    };
    return {
        activeDefinition: initialDef,
        definitions: initialDefs,
        detectedDevices: [],
        activeLayoutKeys: initialLayoutKeys,
        domCodeMap: initialDomCodeMap,
        diagnostics: {
            connected: false,
            usb_detected: false,
            permission_denied: false,
            hidraw_path: null,
            product_name: initialDef.name,
            vendor_id: initialDef.vendorId,
            product_id: initialDef.productId,
            definition_id: initialDef.id,
            is_unknown_device: false,
            protocol_version: 11,
            layers_count: 4,
            message: "Ready to connect",
        },
        isBusy: false,
        statusBanner: null,
        activeTab: "keymap",
        currentLayer: 0,
        selectedKey: { row: 0, col: 0 },
        capturePhysicalKeyMode: false,
        lightingPreviewControlId: null,
        profile: initialProfile,
        savedProfiles: initialProfiles,
        activeProfileIndex: initialActiveIndex,
        undoStack: [],
        redoStack: [],
        setActiveTab: (tab) => set({ activeTab: tab, capturePhysicalKeyMode: false }),
        setCurrentLayer: (layer) => set({ currentLayer: layer }),
        setSelectedKey: (coord) => set({ selectedKey: coord }),
        setCapturePhysicalKeyMode: (enabled) => set({ capturePhysicalKeyMode: enabled }),
        setLightingPreviewControlId: (id) => set({ lightingPreviewControlId: id }),
        clearStatusBanner: () => set({ statusBanner: null }),
        refreshDevicesAndDefinitions: async () => {
            try {
                const res = await safeInvoke<{
                    devices: DetectedQmkDevice[];
                    definitions: KeyboardDefinition[];
                    activeDefinition: KeyboardDefinition;
                }>("list_devices_and_definitions_cmd", undefined, {
                    devices: [],
                    definitions: get().definitions,
                    activeDefinition: get().activeDefinition,
                });
                const normalizedDefs = [...res.definitions];
                const localUserDefs = loadUserDefinitionsFromStorage();
                for (const ud of localUserDefs) {
                    if (!normalizedDefs.some((d) => d.id === ud.id)) {
                        normalizedDefs.push(ud);
                    }
                }
                set({
                    detectedDevices: res.devices,
                    definitions: normalizedDefs,
                });
            }
            catch {
                // ignore in offline browser preview
            }
        },
        selectDeviceOrDefinition: async ({ vendorId, productId, definitionId }) => {
            set({ isBusy: true });
            try {
                const currentDefs = get().definitions;
                const targetDef = (definitionId
                    ? currentDefs.find((d) => d.id === definitionId)
                    : undefined) ||
                    (vendorId !== undefined && productId !== undefined
                        ? currentDefs.find((d) => d.vendorId === vendorId && d.productId === productId)
                        : undefined) ||
                    get().activeDefinition;
                const res = await safeInvoke<{
                    diagnostics: ConnectionDiagnostics;
                    profile: KeyboardProfile;
                    definition: KeyboardDefinition;
                }>("select_device_or_definition_cmd", {
                    vendorId: vendorId ?? null,
                    productId: productId ?? null,
                    definitionId: definitionId ?? null,
                }, {
                    diagnostics: {
                        connected: false,
                        usb_detected: false,
                        permission_denied: false,
                        hidraw_path: null,
                        product_name: targetDef.name,
                        vendor_id: targetDef.vendorId,
                        product_id: targetDef.productId,
                        definition_id: targetDef.id,
                        is_unknown_device: false,
                        protocol_version: 11,
                        layers_count: 4,
                        message: `Offline Mode (${targetDef.name})`,
                    },
                    profile: createDefaultOfflineProfile("Default Profile", targetDef),
                    definition: targetDef,
                });
                const resolvedDef = res.definition;
                applyDefinitionSwitch(resolvedDef, res.diagnostics.connected ? res.profile : undefined, res.diagnostics, res.diagnostics.connected
                    ? `Connected to ${res.diagnostics.product_name} (Protocol v${res.diagnostics.protocol_version})`
                    : `Switched active keyboard definition to ${resolvedDef.name}`);
                await get().refreshDevicesAndDefinitions();
            }
            catch (err) {
                set({
                    isBusy: false,
                    statusBanner: { type: "error", text: String(err) },
                });
            }
        },
        importViaDefinition: async (jsonText) => {
            set({ isBusy: true });
            try {
                const localParsed = parseViaDefinition(JSON.parse(jsonText), {
                    builtin: false,
                });
                const savedDef = await safeInvoke<KeyboardDefinition>("import_definition_cmd", { jsonContent: jsonText }, localParsed);
                const normalized = savedDef;
                const nextDefs = [
                    ...get().definitions.filter((d) => d.id !== normalized.id),
                    normalized,
                ];
                persistUserDefinitionsToStorage(nextDefs);
                set({ definitions: nextDefs });
                await get().selectDeviceOrDefinition({ definitionId: normalized.id });
                set({
                    isBusy: false,
                    statusBanner: {
                        type: "success",
                        text: `Imported keyboard definition "${normalized.name}" (${normalized.layouts.keys.length} keys)`,
                    },
                });
            }
            catch (err) {
                set({
                    isBusy: false,
                    statusBanner: {
                        type: "error",
                        text: `Failed importing VIA definition: ${String(err)}`,
                    },
                });
            }
        },
        removeDefinition: async (definitionId) => {
            const target = get().definitions.find((d) => d.id === definitionId);
            if (!target || target.builtin)
                return;
            try {
                const fallbackDefs = [...new Map([...BUNDLED_DEFINITIONS, ...get().definitions.filter(d => d.id !== definitionId)].map(d => [d.id, d])).values()];
                const nextDefs = await safeInvoke<KeyboardDefinition[]>("remove_definition_cmd", { definitionId }, fallbackDefs);
                persistUserDefinitionsToStorage(nextDefs);
                set({ definitions: nextDefs });
                if (get().activeDefinition.id === definitionId) {
                    await get().selectDeviceOrDefinition({
                        definitionId: DEFAULT_DEFINITION.id,
                    });
                }
                set({
                    statusBanner: {
                        type: "info",
                        text: `Removed VIA definition "${target.name}"`,
                    },
                });
            }
            catch (err) {
                set({ statusBanner: { type: "error", text: String(err) } });
            }
        },
        setLayoutOption: async (optionIndex, choice) => {
            const { activeDefinition, profile } = get();
            const labels = parseLayoutOptionLabels(activeDefinition.layouts.labels);
            const nextMask = setLayoutOptionChoice(profile.layout_options ?? 0, labels, optionIndex, choice);
            pushUndoSnapshot();
            commitProfileState((next) => {
                next.layout_options = nextMask;
                return next;
            });
            try {
                await safeInvoke("set_layout_options_cmd", { layoutOptions: nextMask }, undefined);
            }
            catch (err) {
                set({ statusBanner: { type: "error", text: String(err) } });
            }
        },
        connectKeyboard: async () => {
            if (connectInFlightPromise) {
                return connectInFlightPromise;
            }
            connectInFlightPromise = (async () => {
                set({ isBusy: true });
                try {
                    await get().refreshDevicesAndDefinitions();
                    const curDef = get().activeDefinition;
                    const res = await safeInvoke<{
                        diagnostics: ConnectionDiagnostics;
                        profile: KeyboardProfile;
                        definition: KeyboardDefinition;
                    }>("connect_keyboard", undefined, {
                        diagnostics: {
                            connected: false,
                            usb_detected: false,
                            permission_denied: false,
                            hidraw_path: null,
                            product_name: `${curDef.name} (Offline)`,
                            vendor_id: curDef.vendorId,
                            product_id: curDef.productId,
                            definition_id: curDef.id,
                            is_unknown_device: false,
                            protocol_version: 11,
                            layers_count: 4,
                            message: "Running in offline preview mode",
                        },
                        profile: get().profile,
                        definition: curDef,
                    });
                    const resolvedDef = res.definition ?? curDef;
                    if (res.diagnostics.connected) {
                        applyDefinitionSwitch(resolvedDef, res.profile, res.diagnostics, `Connected to ${res.diagnostics.product_name} (Protocol v${res.diagnostics.protocol_version})`);
                    }
                    else {
                        set({
                            diagnostics: res.diagnostics,
                            isBusy: false,
                            statusBanner: res.diagnostics.permission_denied
                                ? { type: "error", text: res.diagnostics.message }
                                : { type: "info", text: res.diagnostics.message },
                        });
                    }
                }
                catch (err) {
                    set({
                        isBusy: false,
                        statusBanner: { type: "error", text: String(err) },
                    });
                }
                finally {
                    connectInFlightPromise = null;
                }
            })();
            return connectInFlightPromise;
        },
        disconnectKeyboard: async () => {
            try {
                const diag = await safeInvoke<ConnectionDiagnostics>("disconnect_keyboard");
                set({
                    diagnostics: diag,
                    statusBanner: { type: "info", text: "Switched to Offline Mode" },
                });
            }
            catch {
                set((s) => ({
                    diagnostics: {
                        ...s.diagnostics,
                        connected: false,
                        message: "Offline Mode",
                    },
                }));
            }
        },
        installLinuxUdevRule: async () => {
            set({ isBusy: true });
            try {
                const msg = await safeInvoke<string>("install_udev_rules");
                set({
                    statusBanner: { type: "success", text: msg },
                });
                await get().connectKeyboard();
            }
            catch (err) {
                set({
                    isBusy: false,
                    statusBanner: {
                        type: "error",
                        text: `Failed installing udev rule: ${String(err)}`,
                    },
                });
            }
        },
        assignKeycode: async (layer, row, col, keycode) => {
            pushUndoSnapshot();
            commitProfileState((next) => {
                if (next.layers[layer]) {
                    next.layers[layer][row * next.cols + col] = keycode;
                }
                return next;
            });
            try {
                await safeInvoke<number>("set_single_key", { layer, row, col, keycode }, keycode);
            }
            catch (err) {
                set({
                    statusBanner: {
                        type: "error",
                        text: `Failed setting key: ${String(err)}`,
                    },
                });
            }
        },
        copyLayer: async (fromLayer, toLayer) => {
            if (fromLayer === toLayer)
                return;
            pushUndoSnapshot();
            commitProfileState((next) => {
                next.layers[toLayer] = [...next.layers[fromLayer]];
                return next;
            });
            try {
                await safeInvoke("write_all_layers", { layers: get().profile.layers }, undefined);
                set({
                    statusBanner: {
                        type: "success",
                        text: `Copied Layer ${fromLayer} to Layer ${toLayer}`,
                    },
                });
            }
            catch (err) {
                set({ statusBanner: { type: "error", text: String(err) } });
            }
        },
        resetLayerToTransparent: async (layer) => {
            pushUndoSnapshot();
            const fillVal = layer === 0 ? 0 : 1; // Layer 0 -> KC_NO, Fn Layers -> KC_TRNS
            commitProfileState((next) => {
                next.layers[layer] = new Array<number>(next.rows * next.cols).fill(fillVal);
                return next;
            });
            try {
                await safeInvoke("write_all_layers", { layers: get().profile.layers }, undefined);
                set({
                    statusBanner: {
                        type: "info",
                        text: `Cleared Layer ${layer} to ${layer === 0 ? "KC_NO" : "KC_TRNS (▽)"}`,
                    },
                });
            }
            catch (err) {
                set({ statusBanner: { type: "error", text: String(err) } });
            }
        },
        setViaLightingValue: async (controlId, value) => {
            const definitionId = get().activeDefinition.id;
            const previous = get().profile.via_lighting_values?.[controlId];
            pushUndoSnapshot();
            commitProfileState(next => {
                next.via_lighting_values = { ...next.via_lighting_values, [controlId]: value };
                return next;
            });
            if (!get().diagnostics.connected)
                return;
            try {
                await safeInvoke("set_via_lighting_cmd", { controlId, value }, undefined);
            }
            catch (err) {
                if (get().activeDefinition.id !== definitionId)
                    return;
                commitProfileState(next => {
                    if (previous)
                        next.via_lighting_values![controlId] = previous;
                    else
                        delete next.via_lighting_values![controlId];
                    return next;
                });
                set({ statusBanner: { type: "error", text: String(err) } });
            }
        },
        updateMacroSlot: async (slot, syncToHardware = false) => {
            commitProfileState((next) => {
                const idx = next.macros.findIndex((m) => m.index === slot.index);
                if (idx >= 0)
                    next.macros[idx] = slot;
                else
                    next.macros.push(slot);
                return next;
            });
            if (syncToHardware) {
                await get().saveAllMacrosToHardware();
            }
        },
        saveAllMacrosToHardware: async () => {
            set({ isBusy: true });
            try {
                await safeInvoke("save_macros_cmd", { macros: get().profile.macros }, undefined);
                set({
                    isBusy: false,
                    statusBanner: {
                        type: "success",
                        text: "Macros written to keyboard EEPROM",
                    },
                });
            }
            catch (err) {
                set({
                    isBusy: false,
                    statusBanner: {
                        type: "error",
                        text: `Failed saving macros: ${String(err)}`,
                    },
                });
            }
        },
        factoryResetKeyboard: async () => {
            set({ isBusy: true });
            try {
                const curDef = get().activeDefinition;
                const restored = await safeInvoke<KeyboardProfile>("factory_reset_cmd", undefined, createDefaultOfflineProfile("Factory Restored", curDef));
                commitProfileState(() => restored, {
                    undoStack: [],
                    redoStack: [],
                    isBusy: false,
                    statusBanner: {
                        type: "success",
                        text: "Keyboard EEPROM reset to factory defaults",
                    },
                });
            }
            catch (err) {
                set({
                    isBusy: false,
                    statusBanner: {
                        type: "error",
                        text: `Factory reset failed: ${String(err)}`,
                    },
                });
            }
        },
        undo: async () => {
            const { undoStack, profile } = get();
            if (undoStack.length === 0)
                return;
            const prev = undoStack[undoStack.length - 1];
            const currentCopy = cloneProfile(profile);
            set((s) => ({
                profile: prev,
                undoStack: s.undoStack.slice(0, -1),
                redoStack: [...s.redoStack, currentCopy],
            }));
            try {
                await safeInvoke("apply_profile_cmd", { profile: prev }, undefined);
            }
            catch {
                // ignore in offline mode
            }
        },
        redo: async () => {
            const { redoStack, profile } = get();
            if (redoStack.length === 0)
                return;
            const next = redoStack[redoStack.length - 1];
            const currentCopy = cloneProfile(profile);
            set((s) => ({
                profile: next,
                redoStack: s.redoStack.slice(0, -1),
                undoStack: [...s.undoStack, currentCopy],
            }));
            try {
                await safeInvoke("apply_profile_cmd", { profile: next }, undefined);
            }
            catch {
                // ignore in offline mode
            }
        },
        switchSavedProfile: async (index) => {
            const { savedProfiles, activeDefinition } = get();
            if (index < 0 || index >= savedProfiles.length)
                return;
            const target = cloneProfile(savedProfiles[index]);
            persistProfilesForDef(activeDefinition.id, savedProfiles, index);
            const nextLayoutKeys = resolveActiveLayoutKeys(activeDefinition, target.layout_options ?? 0);
            const nextDomMap = buildDomCodeToCoordMap(nextLayoutKeys, activeDefinition.layouts.width);
            set({
                activeProfileIndex: index,
                profile: target,
                activeLayoutKeys: nextLayoutKeys,
                domCodeMap: nextDomMap,
                isBusy: true,
            });
            try {
                await safeInvoke("apply_profile_cmd", { profile: target }, undefined);
                set({
                    isBusy: false,
                    statusBanner: {
                        type: "success",
                        text: `Loaded profile "${target.name}"`,
                    },
                });
            }
            catch (err) {
                set({
                    isBusy: false,
                    statusBanner: { type: "error", text: String(err) },
                });
            }
        },
        saveCurrentToProfileSlot: (name) => {
            const { savedProfiles, activeProfileIndex, profile, activeDefinition } = get();
            const updated = cloneProfile(profile);
            if (name && name.trim())
                updated.name = name.trim();
            const nextList = savedProfiles.map((p, idx) => idx === activeProfileIndex ? updated : p);
            persistProfilesForDef(activeDefinition.id, nextList, activeProfileIndex);
            set({
                profile: updated,
                savedProfiles: nextList,
                statusBanner: {
                    type: "success",
                    text: `Saved profile "${updated.name}"`,
                },
            });
        },
        createNewProfileSlot: (name) => {
            const { savedProfiles, profile, activeDefinition } = get();
            const copy = cloneProfile(profile);
            copy.name = name.trim() || `Profile ${savedProfiles.length + 1}`;
            const nextList = [...savedProfiles, copy];
            const nextIdx = nextList.length - 1;
            persistProfilesForDef(activeDefinition.id, nextList, nextIdx);
            set({
                savedProfiles: nextList,
                activeProfileIndex: nextIdx,
                profile: copy,
                statusBanner: {
                    type: "success",
                    text: `Created profile "${copy.name}"`,
                },
            });
        },
        deleteProfileSlot: (index) => {
            const { savedProfiles, activeProfileIndex, activeDefinition } = get();
            if (savedProfiles.length <= 1)
                return;
            const nextList = savedProfiles.filter((_, i) => i !== index);
            const nextIdx = Math.min(activeProfileIndex, nextList.length - 1);
            persistProfilesForDef(activeDefinition.id, nextList, nextIdx);
            set({
                savedProfiles: nextList,
                activeProfileIndex: nextIdx,
                profile: cloneProfile(nextList[nextIdx]),
            });
        },
        importProfileJson: async (jsonText) => {
            try {
                const parsed = JSON.parse(jsonText);
                const { activeDefinition } = get();
                // Check if the user accidentally selected a VIA keyboard definition JSON in the profile importer
                if (parsed && parsed.layouts && parsed.layouts.keymap) {
                    await get().importViaDefinition(jsonText);
                    return;
                }
                if (parsed && Array.isArray(parsed.layers)) {
                    const imported = parsed as KeyboardProfile;
                    const nextList = [...get().savedProfiles, cloneProfile(imported)];
                    const nextIdx = nextList.length - 1;
                    persistProfilesForDef(activeDefinition.id, nextList, nextIdx);
                    set({
                        profile: imported,
                        savedProfiles: nextList,
                        activeProfileIndex: nextIdx,
                    });
                    await safeInvoke("apply_profile_cmd", { profile: imported }, undefined);
                    set({
                        statusBanner: {
                            type: "success",
                            text: `Imported and applied profile "${imported.name}"`,
                        },
                    });
                    return;
                }
                throw new Error("Unrecognized profile JSON schema");
            }
            catch (err) {
                set({
                    statusBanner: {
                        type: "error",
                        text: `Failed importing profile: ${String(err)}`,
                    },
                });
            }
        },
    };
});
