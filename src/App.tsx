import React, { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TopBar } from "./components/TopBar";
import { PermissionBanner } from "./components/PermissionBanner";
import { KeyboardCanvas } from "./components/KeyboardCanvas";
import { KeymapView } from "./components/views/KeymapView";
import { LightingView } from "./components/views/LightingView";
import { MacroView } from "./components/views/MacroView";
import { KeyTesterView } from "./components/views/KeyTesterView";
import { SettingsView } from "./components/views/SettingsView";
import { useKeyboardStore } from "./store/useKeyboardStore";
import { encodeKeycodeString } from "./data/keycodes";
import { X } from "lucide-react";

const DOM_CODE_TO_QMK: Record<string, string> = {
  Escape: "KC_ESC",
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
  PrintScreen: "KC_PSCR",
  ScrollLock: "KC_SLCK",
  Pause: "KC_PAUS",
  Home: "KC_HOME",
  End: "KC_END",
  PageUp: "KC_PGUP",
  PageDown: "KC_PGDN",
  Delete: "KC_DEL",
  LaunchApp2: "KC_CALC",
  AudioVolumeMute: "KC_MUTE",
  VolumeMute: "KC_MUTE",
  AudioVolumeDown: "KC_VOLD",
  VolumeDown: "KC_VOLD",
  AudioVolumeUp: "KC_VOLU",
  VolumeUp: "KC_VOLU",
  Backquote: "KC_GRV",
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
  Minus: "KC_MINS",
  Equal: "KC_EQL",
  Backspace: "KC_BSPC",
  NumLock: "KC_NLCK",
  NumpadDivide: "KC_PSLS",
  NumpadMultiply: "KC_PAST",
  NumpadSubtract: "KC_PMNS",
  Tab: "KC_TAB",
  KeyQ: "KC_Q",
  KeyW: "KC_W",
  KeyE: "KC_E",
  KeyR: "KC_R",
  KeyT: "KC_T",
  KeyY: "KC_Y",
  KeyU: "KC_U",
  KeyI: "KC_I",
  KeyO: "KC_O",
  KeyP: "KC_P",
  BracketLeft: "KC_LBRC",
  BracketRight: "KC_RBRC",
  Backslash: "KC_BSLS",
  Numpad7: "KC_P7",
  Numpad8: "KC_P8",
  Numpad9: "KC_P9",
  NumpadAdd: "KC_PPLS",
  CapsLock: "KC_CAPS",
  KeyA: "KC_A",
  KeyS: "KC_S",
  KeyD: "KC_D",
  KeyF: "KC_F",
  KeyG: "KC_G",
  KeyH: "KC_H",
  KeyJ: "KC_J",
  KeyK: "KC_K",
  KeyL: "KC_L",
  Semicolon: "KC_SCLN",
  Quote: "KC_QUOT",
  Enter: "KC_ENT",
  Numpad4: "KC_P4",
  Numpad5: "KC_P5",
  Numpad6: "KC_P6",
  ShiftLeft: "KC_LSFT",
  KeyZ: "KC_Z",
  KeyX: "KC_X",
  KeyC: "KC_C",
  KeyV: "KC_V",
  KeyB: "KC_B",
  KeyN: "KC_N",
  KeyM: "KC_M",
  Comma: "KC_COMM",
  Period: "KC_DOT",
  Slash: "KC_SLSH",
  ShiftRight: "KC_RSFT",
  ArrowUp: "KC_UP",
  Numpad1: "KC_P1",
  Numpad2: "KC_P2",
  Numpad3: "KC_P3",
  ControlLeft: "KC_LCTL",
  MetaLeft: "KC_LGUI",
  AltLeft: "KC_LALT",
  Space: "KC_SPC",
  AltRight: "KC_RALT",
  MetaRight: "KC_RGUI",
  ContextMenu: "KC_APP",
  ControlRight: "KC_RCTL",
  ArrowLeft: "KC_LEFT",
  ArrowDown: "KC_DOWN",
  ArrowRight: "KC_RGHT",
  Numpad0: "KC_P0",
  NumpadDecimal: "KC_PDOT",
  NumpadEnter: "KC_PENT",
};

function isTextEntryElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable)
    return true;
  if (tag === "INPUT") {
    const type = ((el as HTMLInputElement).type || "text").toLowerCase();
    return ![
      "range",
      "color",
      "checkbox",
      "radio",
      "button",
      "submit",
      "reset",
    ].includes(type);
  }
  return false;
}

export const App: React.FC = () => {
  const {
    activeDefinition,
    activeLayoutKeys,
    domCodeMap,
    activeTab,
    currentLayer,
    profile,
    diagnostics,
    statusBanner,
    clearStatusBanner,
    connectKeyboard,
    undo,
    redo,
  } = useKeyboardStore();

  const matrixCols = activeDefinition.matrix.cols;

  // Key Tester state (separated into OS key events vs live hardware matrix scan so released keys never latch)
  const [osPressedCells, setOsPressedCells] = useState<Set<string>>(new Set());
  const [hwPressedCells, setHwPressedCells] = useState<Set<string>>(new Set());
  const osPressedRef = useRef<Set<string>>(new Set());
  const hwPressedRef = useRef<Set<string>>(new Set());
  const prevHwPressedRef = useRef<Set<string>>(new Set());
  const lastLoggedKeyTimeRef = useRef<Map<string, number>>(new Map());
  const [testedCells, setTestedCells] = useState<Set<string>>(new Set());
  const [recentEvents, setRecentEvents] = useState<
    { id: number; label: string; coord: string; time: string }[]
  >([]);
  const [hardwarePolling, setHardwarePolling] = useState(true);

  const pressedCells = useMemo(
    () => new Set([...osPressedCells, ...hwPressedCells]),
    [osPressedCells, hwPressedCells]
  );

  // Keep a ref to current layer keymap so keydown/keyup can resolve remapped keys without re-binding listeners
  const activeLayerKeymapRef = useRef<{
    matrix: number[];
    protocolVersion: number;
    cols: number;
    layoutKeys: typeof activeLayoutKeys;
    domMap: typeof domCodeMap;
  }>({
    matrix: profile.layers[currentLayer] || [],
    protocolVersion: profile.protocol_version,
    cols: matrixCols,
    layoutKeys: activeLayoutKeys,
    domMap: domCodeMap,
  });
  useEffect(() => {
    activeLayerKeymapRef.current = {
      matrix: profile.layers[currentLayer] || [],
      protocolVersion: profile.protocol_version,
      cols: matrixCols,
      layoutKeys: activeLayoutKeys,
      domMap: domCodeMap,
    };
  }, [
    profile.layers,
    currentLayer,
    profile.protocol_version,
    matrixCols,
    activeLayoutKeys,
    domCodeMap,
  ]);

  useEffect(() => {
    void connectKeyboard();
  }, [connectKeyboard]);

  // Global Ctrl+Z / Ctrl+Y shortcuts for Undo / Redo (except when in tester or recording macros)
  useEffect(() => {
    if (activeTab === "tester" || activeTab === "macros") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTextEntryElement(e.target)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) void redo();
        else void undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        void redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTab, undo, redo]);

  // Live OS + Hardware Matrix Key Readout (active across Tester, Backlighting, Keymap, Settings)
  useEffect(() => {
    if (activeTab === "macros") {
      osPressedRef.current = new Set();
      hwPressedRef.current = new Set();
      prevHwPressedRef.current = new Set();
      setOsPressedCells(new Set());
      setHwPressedCells(new Set());
      return;
    }

    const resolvePhysicalCoord = (
      e: KeyboardEvent
    ): { row: number; col: number } | undefined => {
      const { matrix, protocolVersion, cols, layoutKeys, domMap } =
        activeLayerKeymapRef.current;
      const defaultCoord = domMap[e.code];
      const qmkName = DOM_CODE_TO_QMK[e.code];
      if (qmkName) {
        const targetCode = encodeKeycodeString(qmkName, protocolVersion);
        if (targetCode > 0 && matrix.length > 0) {
          if (
            defaultCoord &&
            matrix[defaultCoord.row * cols + defaultCoord.col] === targetCode
          ) {
            return defaultCoord;
          }
          const remappedKey = layoutKeys.find(
            (k) => matrix[k.row * cols + k.col] === targetCode
          );
          if (remappedKey) {
            return { row: remappedKey.row, col: remappedKey.col };
          }
        }
      }
      return defaultCoord;
    };

    const onDown = (e: KeyboardEvent) => {
      if (isTextEntryElement(e.target)) {
        return;
      }
      if (activeTab === "tester") {
        e.preventDefault();
        if (
          document.activeElement instanceof HTMLElement &&
          document.activeElement.tagName === "BUTTON"
        ) {
          document.activeElement.blur();
        }
      } else if (
        activeTab === "lighting" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        if (
          document.activeElement instanceof HTMLElement &&
          (document.activeElement.tagName === "BUTTON" ||
            document.activeElement.tagName === "INPUT")
        ) {
          document.activeElement.blur();
        }
      }

      if (e.repeat) return;
      const coord = resolvePhysicalCoord(e);
      if (!coord) return;
      const cellId = `${coord.row},${coord.col}`;

      // Synchronously deduplicate against already-held OS keys
      if (osPressedRef.current.has(cellId)) {
        return;
      }
      osPressedRef.current.add(cellId);

      setOsPressedCells((prev) => {
        if (prev.has(cellId)) return prev;
        const next = new Set(prev);
        next.add(cellId);
        return next;
      });

      const now = performance.now();
      const lastLogged = lastLoggedKeyTimeRef.current.get(cellId) ?? -Infinity;
      const alreadyLoggedByHw =
        hwPressedRef.current.has(cellId) || now - lastLogged < 180;
      lastLoggedKeyTimeRef.current.set(cellId, now);

      if (activeTab === "tester" && !alreadyLoggedByHw) {
        setTestedCells((prev) => {
          if (prev.has(cellId)) return prev;
          return new Set(prev).add(cellId);
        });
        const keyDef = activeLayerKeymapRef.current.layoutKeys.find(
          (k) => k.row === coord.row && k.col === coord.col
        );
        setRecentEvents((prev) => [
          {
            id: Date.now() + Math.random(),
            label: keyDef?.value || e.code,
            coord: cellId,
            time: new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 39),
        ]);
      }
    };

    const onUp = (e: KeyboardEvent) => {
      if (activeTab === "tester") {
        e.preventDefault();
      } else if (
        activeTab === "lighting" &&
        !isTextEntryElement(e.target) &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
      }
      const coord = resolvePhysicalCoord(e);
      const defaultCoord = activeLayerKeymapRef.current.domMap[e.code];
      if (coord) {
        osPressedRef.current.delete(`${coord.row},${coord.col}`);
      }
      if (defaultCoord) {
        osPressedRef.current.delete(`${defaultCoord.row},${defaultCoord.col}`);
      }
      setOsPressedCells((prev) => {
        let changed = false;
        const next = new Set(prev);
        if (coord) {
          const id1 = `${coord.row},${coord.col}`;
          if (next.delete(id1)) changed = true;
        }
        if (defaultCoord) {
          const id2 = `${defaultCoord.row},${defaultCoord.col}`;
          if (next.delete(id2)) changed = true;
        }
        return changed ? next : prev;
      });
    };

    const onBlur = () => {
      osPressedRef.current = new Set();
      setOsPressedCells((prev) => (prev.size === 0 ? prev : new Set()));
    };

    window.addEventListener("keydown", onDown, { capture: true });
    window.addEventListener("keyup", onUp, { capture: true });
    window.addEventListener("blur", onBlur);

    let cancelled = false;
    let inFlight = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const enableHwPoll =
      (activeTab === "tester" || activeTab === "lighting") && hardwarePolling;

    if (!enableHwPoll) {
      hwPressedRef.current = new Set();
      prevHwPressedRef.current = new Set();
      setHwPressedCells((prev) => (prev.size === 0 ? prev : new Set()));
    } else if (diagnostics.connected && "__TAURI_INTERNALS__" in window) {
      interval = setInterval(async () => {
        if (inFlight || cancelled) return;
        inFlight = true;
        try {
          const hwPressed = await invoke<[number, number][]>(
            "poll_matrix_state_cmd"
          );
          if (cancelled) return;
          const curKeys = activeLayerKeymapRef.current.layoutKeys;
          const validIds = hwPressed
            .filter(([r, c]) => curKeys.some((k) => k.row === r && k.col === c))
            .map(([r, c]) => `${r},${c}`);
          const nextHwSet = new Set(validIds);
          hwPressedRef.current = nextHwSet;
          setHwPressedCells((prev) => {
            if (
              prev.size === nextHwSet.size &&
              validIds.every((id) => prev.has(id))
            ) {
              return prev;
            }
            return nextHwSet;
          });

          if (activeTab === "tester" && validIds.length > 0) {
            setTestedCells((prev) => new Set([...prev, ...validIds]));
            const now = performance.now();
            const newlyPressed = validIds.filter((id) => {
              if (prevHwPressedRef.current.has(id)) return false;
              if (osPressedRef.current.has(id)) return false;
              const lastLogged =
                lastLoggedKeyTimeRef.current.get(id) ?? -Infinity;
              return now - lastLogged > 350;
            });
            if (newlyPressed.length > 0) {
              const newEntries = newlyPressed.map((cellId) => {
                lastLoggedKeyTimeRef.current.set(cellId, now);
                const [r, c] = cellId.split(",").map(Number);
                const keyDef = curKeys.find((k) => k.row === r && k.col === c);
                return {
                  id: Date.now() + Math.random(),
                  label: keyDef?.value || cellId,
                  coord: cellId,
                  time: new Date().toLocaleTimeString(),
                };
              });
              setRecentEvents((prev) => [...newEntries, ...prev].slice(0, 40));
            }
          }
          prevHwPressedRef.current = nextHwSet;
        } catch {
          // ignore polling transient errors
        } finally {
          inFlight = false;
        }
      }, 65);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onDown, { capture: true });
      window.removeEventListener("keyup", onUp, { capture: true });
      window.removeEventListener("blur", onBlur);
      if (interval) clearInterval(interval);
    };
  }, [activeTab, hardwarePolling, diagnostics.connected]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      <TopBar />
      <PermissionBanner />

      {/* Status Toast / Notification Strip */}
      {statusBanner && (
        <div
          className={`px-4 py-1.5 text-xs flex items-center justify-between border-b shrink-0 ${
            statusBanner.type === "error"
              ? "bg-rose-500/15 border-rose-500/30 text-rose-200"
              : statusBanner.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
              : "bg-slate-900 border-slate-800 text-slate-300"
          }`}
        >
          <span>{statusBanner.text}</span>
          <button
            type="button"
            onClick={clearStatusBanner}
            aria-label="Dismiss notification"
            className="p-0.5 rounded hover:bg-white/10 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab !== "macros" && (
          <KeyboardCanvas
            pressedCells={pressedCells}
            testedCells={activeTab === "tester" ? testedCells : undefined}
          />
        )}

        {activeTab === "keymap" && <KeymapView />}
        {activeTab === "lighting" && <LightingView />}
        {activeTab === "macros" && <MacroView />}
        {activeTab === "tester" && (
          <KeyTesterView
            pressedCells={pressedCells}
            testedCells={testedCells}
            recentEvents={recentEvents}
            hardwarePolling={hardwarePolling}
            setHardwarePolling={setHardwarePolling}
            onResetTested={() => {
              osPressedRef.current = new Set();
              hwPressedRef.current = new Set();
              lastLoggedKeyTimeRef.current = new Map();
              setOsPressedCells(new Set());
              setHwPressedCells(new Set());
              setTestedCells(new Set());
              setRecentEvents([]);
            }}
          />
        )}
        {activeTab === "settings" && <SettingsView />}
      </main>
    </div>
  );
};

export default App;
