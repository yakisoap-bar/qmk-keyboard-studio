import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Radio,
  Code2,
  Copy,
  RotateCcw,
  Layers,
  Wand2,
  SlidersHorizontal,
} from "lucide-react";
import { useKeyboardStore } from "../../store/useKeyboardStore";
import {
  BASIC_KEYCODE_VALUES,
  buildKeycodeCatalog,
  decodeKeycode,
  encodeKeycodeString,
  encodeLayerTap,
  encodeModCombo,
  encodeModTap,
  KeycodeEntry,
  MOD_BITS,
} from "../../data/keycodes";
import {
  getLayoutOptionChoice,
  parseLayoutOptionLabels,
} from "../../utils/kleParser";

type PickerCategory =
  | "all"
  | "basic"
  | "navigation"
  | "numpad"
  | "media"
  | "layer"
  | "macro"
  | "custom"
  | "lighting"
  | "mouse"
  | "builder";

const DOM_EVENT_TO_QMK_CODE: Record<string, string> = {
  KeyA: "KC_A",
  KeyB: "KC_B",
  KeyC: "KC_C",
  KeyD: "KC_D",
  KeyE: "KC_E",
  KeyF: "KC_F",
  KeyG: "KC_G",
  KeyH: "KC_H",
  KeyI: "KC_I",
  KeyJ: "KC_J",
  KeyK: "KC_K",
  KeyL: "KC_L",
  KeyM: "KC_M",
  KeyN: "KC_N",
  KeyO: "KC_O",
  KeyP: "KC_P",
  KeyQ: "KC_Q",
  KeyR: "KC_R",
  KeyS: "KC_S",
  KeyT: "KC_T",
  KeyU: "KC_U",
  KeyV: "KC_V",
  KeyW: "KC_W",
  KeyX: "KC_X",
  KeyY: "KC_Y",
  KeyZ: "KC_Z",
  Digit1: "KC_1",
  Digit2: "KC_2",
  Digit3: "KC_3",
  Digit4: "KC_4",
  Digit5: "KC_5",
  Digit6: "KC_6",
  Digit7: "KC_7",
  Digit8: "KC_8",
  Digit9: "KC_9",
  Digit0: "KC_0",
  Enter: "KC_ENT",
  Escape: "KC_ESC",
  Backspace: "KC_BSPC",
  Tab: "KC_TAB",
  Space: "KC_SPC",
  Minus: "KC_MINS",
  Equal: "KC_EQL",
  BracketLeft: "KC_LBRC",
  BracketRight: "KC_RBRC",
  Backslash: "KC_BSLS",
  Semicolon: "KC_SCLN",
  Quote: "KC_QUOT",
  Backquote: "KC_GRV",
  Comma: "KC_COMM",
  Period: "KC_DOT",
  Slash: "KC_SLSH",
  CapsLock: "KC_CAPS",
  F1: "KC_F1",
  F2: "KC_F2",
  F3: "KC_F3",
  F4: "KC_F4",
  F5: "KC_F5",
  F6: "KC_F6",
  F7: "KC_F7",
  F8: "KC_F8",
  F9: "KC_F9",
  F10: "KC_F10",
  F11: "KC_F11",
  F12: "KC_F12",
  Insert: "KC_INS",
  Delete: "KC_DEL",
  Home: "KC_HOME",
  End: "KC_END",
  PageUp: "KC_PGUP",
  PageDown: "KC_PGDN",
  ArrowUp: "KC_UP",
  ArrowDown: "KC_DOWN",
  ArrowLeft: "KC_LEFT",
  ArrowRight: "KC_RGHT",
  ControlLeft: "KC_LCTL",
  ShiftLeft: "KC_LSFT",
  AltLeft: "KC_LALT",
  MetaLeft: "KC_LGUI",
  ControlRight: "KC_RCTL",
  ShiftRight: "KC_RSFT",
  AltRight: "KC_RALT",
  MetaRight: "KC_RGUI",
};

export const KeymapView: React.FC = () => {
  const {
    activeDefinition,
    activeLayoutKeys,
    currentLayer,
    setCurrentLayer,
    selectedKey,
    setSelectedKey,
    capturePhysicalKeyMode,
    setCapturePhysicalKeyMode,
    profile,
    assignKeycode,
    copyLayer,
    resetLayerToTransparent,
    setLayoutOption,
  } = useKeyboardStore();

  const matrixCols = activeDefinition.matrix.cols;
  const layoutLabels = useMemo(
    () => parseLayoutOptionLabels(activeDefinition.layouts.labels),
    [activeDefinition.layouts.labels]
  );

  const keycodeCatalog = useMemo(
    () =>
      buildKeycodeCatalog(
        activeDefinition.customKeycodes,
        profile.layers_count || 4
      ),
    [activeDefinition.customKeycodes, profile.layers_count]
  );

  const categories = useMemo(
    (): { id: PickerCategory; label: string }[] => [
      { id: "basic", label: "Basic" },
      { id: "navigation", label: "Fn & Nav" },
      { id: "numpad", label: "Numpad" },
      { id: "media", label: "Media & OS" },
      { id: "layer", label: "Layers" },
      { id: "macro", label: "Macros" },
      {
        id: "custom",
        label:
          activeDefinition.customKeycodes.length > 0
            ? "Device Custom"
            : "User / Custom",
      },
      { id: "lighting", label: "RGB & Hardware" },
      { id: "mouse", label: "Mouse" },
      { id: "builder", label: "Combo / Tap-Hold Builder" },
    ],
    [activeDefinition.customKeycodes.length]
  );

  const [category, setCategory] = useState<PickerCategory>("basic");
  const [searchQuery, setSearchQuery] = useState("");
  const [rawInputExpr, setRawInputExpr] = useState("");

  // Builder state
  const [builderMode, setBuilderMode] = useState<
    "combo" | "mod_tap" | "layer_tap"
  >("combo");
  const [selectedMods, setSelectedMods] = useState<number[]>([0x01]);
  const [builderTargetLayer, setBuilderTargetLayer] = useState<number>(1);
  const [builderBaseCode, setBuilderBaseCode] = useState<string>("KC_C");

  const rawDialogRef = useRef<HTMLDialogElement>(null);

  const selectedKeyDef = useMemo(
    () =>
      activeLayoutKeys.find(
        (k) => k.row === selectedKey?.row && k.col === selectedKey?.col
      ),
    [activeLayoutKeys, selectedKey]
  );

  const currentKeycodeVal = useMemo(() => {
    if (!selectedKey) return 0;
    return (
      profile.layers[currentLayer]?.[
        selectedKey.row * matrixCols + selectedKey.col
      ] ?? 0
    );
  }, [profile.layers, currentLayer, selectedKey, matrixCols]);

  const decodedCurrent = useMemo(
    () =>
      decodeKeycode(
        currentKeycodeVal,
        profile.protocol_version,
        activeDefinition.customKeycodes
      ),
    [
      currentKeycodeVal,
      profile.protocol_version,
      activeDefinition.customKeycodes,
    ]
  );

  // Physical key press capture listener
  useEffect(() => {
    if (!capturePhysicalKeyMode || !selectedKey) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const mapped = DOM_EVENT_TO_QMK_CODE[e.code];
      if (mapped) {
        const kc = encodeKeycodeString(mapped, profile.protocol_version);
        void assignKeycode(currentLayer, selectedKey.row, selectedKey.col, kc);
        setCapturePhysicalKeyMode(false);
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () =>
      window.removeEventListener("keydown", handler, { capture: true });
  }, [
    capturePhysicalKeyMode,
    selectedKey,
    currentLayer,
    profile.protocol_version,
    assignKeycode,
    setCapturePhysicalKeyMode,
  ]);

  // Attach closedby="any" light-dismiss fallback per modern-web-guidance
  useEffect(() => {
    const dialog = rawDialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;
    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isInside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isInside) dialog.close();
    };
    dialog.addEventListener("click", handleBackdropClick);
    return () => dialog.removeEventListener("click", handleBackdropClick);
  }, []);

  const filteredKeycodes = useMemo((): KeycodeEntry[] => {
    const q = searchQuery.trim().toLowerCase();
    return keycodeCatalog.filter((item) => {
      if (q) {
        return (
          item.name.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          (item.title && item.title.toLowerCase().includes(q))
        );
      }
      if (category === "all") return true;
      return item.category === category;
    });
  }, [keycodeCatalog, category, searchQuery]);

  const advanceToNextKey = () => {
    if (!selectedKey) return;
    const idx = activeLayoutKeys.findIndex(
      (k) => k.row === selectedKey.row && k.col === selectedKey.col
    );
    if (idx >= 0 && idx + 1 < activeLayoutKeys.length) {
      const next = activeLayoutKeys[idx + 1];
      setSelectedKey({ row: next.row, col: next.col });
    }
  };

  const handlePickKeycode = (codeStr: string) => {
    if (!selectedKey) return;
    const kc = encodeKeycodeString(codeStr, profile.protocol_version);
    void assignKeycode(currentLayer, selectedKey.row, selectedKey.col, kc);
  };

  const handleApplyBuilderKeycode = () => {
    if (!selectedKey) return;
    const baseByte = BASIC_KEYCODE_VALUES[builderBaseCode] ?? 4;
    const modMask = selectedMods.reduce((acc, m) => acc | m, 0) || 0x01;
    let kc = 0;
    if (builderMode === "combo") {
      kc = encodeModCombo(modMask, baseByte);
    } else if (builderMode === "mod_tap") {
      kc = encodeModTap(modMask, baseByte, profile.protocol_version);
    } else {
      kc = encodeLayerTap(
        builderTargetLayer,
        baseByte,
        profile.protocol_version
      );
    }
    void assignKeycode(currentLayer, selectedKey.row, selectedKey.col, kc);
  };

  const openRawKeycodeModal = () => {
    setRawInputExpr(
      `0x${currentKeycodeVal.toString(16).toUpperCase().padStart(4, "0")}`
    );
    rawDialogRef.current?.showModal();
  };

  const handleRawKeycodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKey) return;
    const kc = encodeKeycodeString(rawInputExpr, profile.protocol_version);
    void assignKeycode(currentLayer, selectedKey.row, selectedKey.col, kc);
    rawDialogRef.current?.close();
  };

  return (
    <div className="flex-1 flex flex-col gap-3 px-6 pb-5 min-h-0 overflow-hidden">
      {/* Top Toolbar: Layer Selector, VIA Layout Options & Selected Key Inspector */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2 shrink-0 whitespace-nowrap">
        {/* Layer Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mr-1">
            <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Layer:</span>
          </span>
          {Array.from({ length: profile.layers_count }, (_, l) => (
            <button
              key={l}
              type="button"
              onClick={() => setCurrentLayer(l)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                currentLayer === l
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              }`}
            >
              {l === 0 ? "L0 (Main)" : `Fn ${l}`}
            </button>
          ))}

          <div className="h-5 w-px bg-slate-800 mx-0.5" />

          {currentLayer > 0 && (
            <button
              type="button"
              onClick={() => void copyLayer(0, currentLayer)}
              title="Copy all bindings from Layer 0 into this layer"
              className="px-2.5 py-1 rounded-md text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition cursor-pointer"
            >
              <Copy className="w-3 h-3 shrink-0" />
              <span>Copy L0</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => void resetLayerToTransparent(currentLayer)}
            title="Reset all keys on this layer"
            className="px-2.5 py-1 rounded-md text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 shrink-0" />
            <span>Clear</span>
          </button>

          {/* VIA Physical Layout Options (if defined by keyboard schema) */}
          {layoutLabels.length > 0 && (
            <>
              <div className="h-5 w-px bg-slate-800 mx-0.5" />
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                {layoutLabels.map((opt) => {
                  const curChoice = getLayoutOptionChoice(
                    profile.layout_options ?? 0,
                    layoutLabels,
                    opt.index
                  );
                  if (opt.choices.length <= 2) {
                    return (
                      <label
                        key={opt.index}
                        className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={curChoice !== 0}
                          onChange={(e) =>
                            void setLayoutOption(
                              opt.index,
                              e.target.checked ? 1 : 0
                            )
                          }
                          className="accent-emerald-500 rounded cursor-pointer"
                        />
                        <span>{opt.name}</span>
                      </label>
                    );
                  }
                  return (
                    <div
                      key={opt.index}
                      className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800"
                    >
                      <span>{opt.name}:</span>
                      <select
                        value={curChoice}
                        onChange={(e) =>
                          void setLayoutOption(
                            opt.index,
                            Number(e.target.value)
                          )
                        }
                        className="bg-transparent text-emerald-300 font-medium focus:outline-none cursor-pointer"
                      >
                        {opt.choices.map((ch, cIdx) => (
                          <option
                            key={cIdx}
                            value={cIdx}
                            className="bg-slate-900 text-slate-100"
                          >
                            {ch}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Selected Key Inspector */}
        {selectedKey && (
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
              <span className="font-mono text-slate-400">
                [{selectedKey.row},{selectedKey.col}]
              </span>
              <span className="font-semibold text-slate-200">
                {selectedKeyDef?.value || "Key"}
              </span>
              <span className="text-slate-600">→</span>
              <span className="font-semibold text-emerald-400 max-w-[140px] truncate">
                {decodedCurrent.fullLabel}
              </span>
              <code className="text-[11px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                0x
                {currentKeycodeVal
                  .toString(16)
                  .toUpperCase()
                  .padStart(4, "0")}
              </code>
            </div>

            <button
              type="button"
              onClick={() =>
                setCapturePhysicalKeyMode(!capturePhysicalKeyMode)
              }
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 border transition cursor-pointer ${
                capturePhysicalKeyMode
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-pulse"
                  : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
              }`}
            >
              <Radio className="w-3.5 h-3.5 shrink-0" />
              <span>
                {capturePhysicalKeyMode ? "Listening..." : "Press to Bind"}
              </span>
            </button>

            <button
              type="button"
              onClick={openRawKeycodeModal}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 shrink-0" />
              <span>Any / Hex</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Keycode Picker Panel */}
      <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col min-h-0 overflow-hidden">
        {/* Category Tabs + Search Bar */}
        <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-1 flex-wrap">
            {categories.map((cat) => {
              const active = !searchQuery && category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCategory(cat.id);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    active
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search keycodes (e.g. Vol, BT1, F13)..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/60 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Picker Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {category === "builder" && !searchQuery ? (
            <div className="max-w-3xl mx-auto bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <Wand2 className="w-4 h-4 text-emerald-400" />
                  Advanced QMK Shortcut & Tap-Hold Keycode Builder
                </div>
                <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  {[
                    { id: "combo", label: "Modifier + Key Shortcut" },
                    { id: "mod_tap", label: "Mod-Tap MT(Mod, Key)" },
                    { id: "layer_tap", label: "Layer-Tap LT(Layer, Key)" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setBuilderMode(m.id as typeof builderMode)}
                      className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                        builderMode === m.id
                          ? "bg-emerald-500 text-slate-950 font-semibold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {builderMode === "layer_tap" ? (
                  <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
                    <div className="text-xs font-medium text-slate-300 mb-2">
                      Hold Action — Target Layer (0–{profile.layers_count - 1}):
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {Array.from(
                        { length: profile.layers_count },
                        (_, l) => l
                      ).map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setBuilderTargetLayer(l)}
                          className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${
                            builderTargetLayer === l
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          Layer {l}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
                    <div className="text-xs font-medium text-slate-300 mb-2">
                      {builderMode === "combo"
                        ? "Modifiers to Hold Together:"
                        : "Hold Action — Modifier(s):"}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {MOD_BITS.slice(0, 4).map((m) => {
                        const active = selectedMods.includes(m.modBit);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() =>
                              setSelectedMods((prev) =>
                                prev.includes(m.modBit)
                                  ? prev.filter((x) => x !== m.modBit)
                                  : [...prev, m.modBit]
                              )
                            }
                            className={`px-2.5 py-1 rounded text-xs font-medium border cursor-pointer ${
                              active
                                ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                                : "bg-slate-800 border-slate-700 text-slate-400"
                            }`}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
                  <div className="text-xs font-medium text-slate-300 mb-2">
                    {builderMode === "combo"
                      ? "Primary Key:"
                      : "Tap Action — Basic Key:"}
                  </div>
                  <select
                    value={builderBaseCode}
                    onChange={(e) => setBuilderBaseCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                  >
                    {keycodeCatalog
                      .filter(
                        (k) =>
                          (k.category === "basic" ||
                            k.category === "navigation" ||
                            k.category === "numpad") &&
                          BASIC_KEYCODE_VALUES[k.code] !== undefined &&
                          BASIC_KEYCODE_VALUES[k.code] <= 255
                      )
                      .map((k) => (
                        <option key={k.code} value={k.code}>
                          {k.name} ({k.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleApplyBuilderKeycode}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition cursor-pointer"
                >
                  Assign to Selected Key [{selectedKey?.row ?? 0},
                  {selectedKey?.col ?? 0}]
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filteredKeycodes.map((item) => {
                const isAssigned = decodedCurrent.code === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/max102-keycode", item.code);
                    }}
                    onClick={() => {
                      handlePickKeycode(item.code);
                      advanceToNextKey();
                    }}
                    title={
                      item.title ||
                      `${item.name} (${item.code}) — Click to assign or drag onto a key`
                    }
                    className={`min-w-[54px] h-11 px-3 rounded-lg border text-xs font-medium flex flex-col items-center justify-center transition cursor-pointer ${
                      isAssigned
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm"
                        : "bg-slate-950/90 hover:bg-slate-800 border-slate-800 hover:border-slate-600 text-slate-200"
                    }`}
                  >
                    <span className="leading-tight">{item.name}</span>
                    <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                      {item.code}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Native <dialog> for Any / Raw 16-bit QMK Keycode Entry */}
      <dialog
        ref={rawDialogRef}
        {...({
          closedby: "any",
        } as React.DialogHTMLAttributes<HTMLDialogElement>)}
        aria-labelledby="raw-keycode-dialog-title"
        className="m-auto rounded-xl bg-slate-900 border border-slate-700 text-slate-100 p-5 shadow-2xl w-96 backdrop:bg-black/60 backdrop:backdrop-blur-xs"
      >
        <h2
          id="raw-keycode-dialog-title"
          className="text-sm font-semibold text-slate-100"
        >
          Assign Raw QMK Keycode or Expression
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Enter a 16-bit hex value (e.g.{" "}
          <code className="font-mono text-emerald-400">0x5221</code>), decimal
          integer, or QMK keycode name (e.g.{" "}
          <code className="font-mono text-emerald-400">MO(1)</code>,{" "}
          <code className="font-mono text-emerald-400">CUSTOM(11)</code>).
        </p>
        <form
          onSubmit={handleRawKeycodeSubmit}
          className="mt-4 flex flex-col gap-3"
        >
          <input
            type="text"
            autoFocus
            value={rawInputExpr}
            onChange={(e) => setRawInputExpr(e.target.value)}
            placeholder="0x0029 or KC_ESC"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
          />
          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={() => rawDialogRef.current?.close()}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer"
            >
              Apply Keycode
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
};
