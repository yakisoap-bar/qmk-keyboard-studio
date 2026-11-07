import { createPreviewGeometry, getLightingPreview, previewColor, type PreviewImpulse } from "../utils/lightingPreview";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { LayoutKey, useKeyboardStore } from "../store/useKeyboardStore";
import { decodeKeycode, encodeKeycodeString } from "../data/keycodes";
interface KeyboardCanvasProps {
    pressedCells?: Set<string>;
    testedCells?: Set<string>;
}
const MAX_BOARD_INNER_WIDTH_PX = 1022; // 20.5 * 50 - 4
const KEY_GAP_PX = 4;
const BOARD_PADDING_PX = 16;
// Dual-legend keycaps where `rawVal` has both shifted and base symbols (e.g. "!1" -> top "!", base "1")
const DUAL_SYMBOL_LEGENDS: Record<string, {
    top: string;
    base: string;
}> = {
    "~`": { top: "~", base: "`" },
    "`~": { top: "~", base: "`" },
    "!1": { top: "!", base: "1" },
    "1!": { top: "!", base: "1" },
    "@2": { top: "@", base: "2" },
    "2@": { top: "@", base: "2" },
    "#3": { top: "#", base: "3" },
    "3#": { top: "#", base: "3" },
    "$4": { top: "$", base: "4" },
    "4$": { top: "$", base: "4" },
    "%5": { top: "%", base: "5" },
    "5%": { top: "%", base: "5" },
    "^6": { top: "^", base: "6" },
    "6^": { top: "^", base: "6" },
    "&7": { top: "&", base: "7" },
    "7&": { top: "&", base: "7" },
    "*8": { top: "*", base: "8" },
    "8*": { top: "*", base: "8" },
    "(9": { top: "(", base: "9" },
    "9(": { top: "(", base: "9" },
    ")0": { top: ")", base: "0" },
    "0)": { top: ")", base: "0" },
    "_-": { top: "_", base: "-" },
    "-_": { top: "_", base: "-" },
    "+=": { top: "+", base: "=" },
    "=+": { top: "+", base: "=" },
    "{[": { top: "{", base: "[" },
    "[{": { top: "{", base: "[" },
    "}]": { top: "}", base: "]" },
    "]}": { top: "}", base: "]" },
    "|\\": { top: "|", base: "\\" },
    "\\|": { top: "|", base: "\\" },
    "|、": { top: "|", base: "\\" },
    ";:": { top: ":", base: ";" },
    "\"'": { top: "\"", base: "'" },
    "'\"": { top: "\"", base: "'" },
    "“”": { top: "\"", base: "'" },
    ",<": { top: "<", base: "," },
    ".>": { top: ">", base: "." },
    "?/": { top: "?", base: "/" },
    "/?": { top: "?", base: "/" },
};
function getKeyTopLegend(k: LayoutKey, activeShortLabel: string, numpadStartX: number): string | null {
    const dual = DUAL_SYMBOL_LEGENDS[k.value];
    if (dual) {
        return activeShortLabel === dual.base ? dual.top : k.value;
    }
    // If the current keycode is transparent (▽), show the physical legend in the top-left corner
    if (activeShortLabel === "▽") {
        return k.value;
    }
    const normRaw = k.value.toLowerCase().replace(/[.\s]/g, "");
    const normActive = activeShortLabel.toLowerCase().replace(/[.\s]/g, "");
    if (normRaw === normActive)
        return null;
    if (k.x >= numpadStartX) {
        if (normActive === `n${normRaw}`)
            return null;
        if ((k.value === "÷" || k.value === "/") && normActive === "n/")
            return null;
        if ((k.value === "X" || k.value === "*") && normActive === "n*")
            return null;
        if ((k.value === "N.Lck" || k.value === "Num" || k.value === "NumLock") &&
            normActive === "nlk")
            return null;
        if ((k.value === "N.Ent" || k.value === "Enter") &&
            normActive === "nent")
            return null;
    }
    return k.value;
}
export const KeyboardCanvas: React.FC<KeyboardCanvasProps> = ({ pressedCells, testedCells, }) => {
    const { activeDefinition, lightingPreviewControlId, activeLayoutKeys, activeTab, currentLayer, selectedKey, setSelectedKey, profile, assignKeycode, } = useKeyboardStore();
    const matrixCols = activeDefinition.matrix.cols;
    const showLiveLighting = ["keymap", "tester", "lighting"].includes(activeTab);
    const preview = useMemo(() => getLightingPreview(activeDefinition, profile, lightingPreviewControlId), [activeDefinition, profile, lightingPreviewControlId]);
    const previewGeometry = useMemo(() => createPreviewGeometry(activeLayoutKeys), [activeLayoutKeys]);
    const numpadStartX = Math.max(14.5, activeDefinition.layouts.width - 4.5);
    // Real-time effect animation clock & live key press impulse history
    const [animTickMs, setAnimTickMs] = useState<number>(() => performance.now());
    const animPhaseRef = useRef<number>(0);
    const lastFrameTimeRef = useRef<number>(performance.now());
    const recentImpulsesRef = useRef<Map<string, PreviewImpulse>>(new Map());
    const pressedCellsRef = useRef<Set<string>>(new Set());
    const prevPressedCellsRef = useRef<Set<string>>(new Set());
    // Record live key presses from hardware matrix polling / OS events into the reactive impulse map on rising edge
    useEffect(() => {
        const current = pressedCells ?? new Set<string>();
        pressedCellsRef.current = current;
        const prev = prevPressedCellsRef.current;
        const now = performance.now();
        let changed = false;
        for (const cellId of current) {
            if (!prev.has(cellId)) {
                changed = true;
                const [r, c] = cellId.split(",").map(Number);
                recentImpulsesRef.current.set(cellId, { row: r, col: c, time: now, hits: Math.min(20, (recentImpulsesRef.current.get(cellId)?.hits ?? 0) + 1) });
            }
        }
        for (const cellId of prev) {
            if (!current.has(cellId)) {
                changed = true;
            }
        }
        prevPressedCellsRef.current = new Set(current);
        if (changed) {
            setAnimTickMs(now);
        }
    }, [pressedCells]);
    // Never carry reactions or elapsed animation time between keyboards/effects.
    useEffect(() => {
        recentImpulsesRef.current.clear();
        prevPressedCellsRef.current.clear();
        animPhaseRef.current = 0;
        setAnimTickMs(performance.now());
    }, [activeDefinition.id, preview.effect?.key, preview.control?.id]);
    // Continuous 30fps animation loop for built-in effects and reactive key impulses
    useEffect(() => {
        if (!showLiveLighting)
            return;
        let rafId = 0;
        let lastRender = performance.now();
        lastFrameTimeRef.current = lastRender;
        const step = (now: number) => {
            const dtSec = Math.min(0.1, (now - lastFrameTimeRef.current) / 1000);
            lastFrameTimeRef.current = now;
            const speedMult = 0.25 + preview.speed / 255 * 2;
            animPhaseRef.current += dtSec * speedMult;
            const held = pressedCellsRef.current;
            for (const [k, imp] of recentImpulsesRef.current.entries()) {
                if (now - imp.time > (preview.effect?.key === "typing_heatmap" ? 32000 : 8000) && !held.has(k)) {
                    recentImpulsesRef.current.delete(k);
                }
            }
            if (now - lastRender >= 32) {
                lastRender = now;
                setAnimTickMs(now);
            }
            rafId = requestAnimationFrame(step);
        };
        rafId = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafId);
    }, [showLiveLighting, preview.speed, preview.effect?.key, preview.control?.id]);
    const bounds = useMemo(() => {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const k of activeLayoutKeys) {
            if (k.x < minX)
                minX = k.x;
            if (k.y < minY)
                minY = k.y;
            if (k.x + k.w > maxX)
                maxX = k.x + k.w;
            if (k.y + k.h > maxY)
                maxY = k.y + k.h;
        }
        if (!Number.isFinite(minX)) {
            minX = 0;
            minY = 0;
            maxX = 20.5;
            maxY = 6.25;
        }
        const widthUnits = Math.max(1, maxX - minX);
        const heightUnits = Math.max(1, maxY - minY);
        const unitPx = Math.min(50, Math.max(36, Math.floor((MAX_BOARD_INNER_WIDTH_PX + KEY_GAP_PX) / widthUnits)));
        return {
            minX,
            minY,
            widthUnits,
            heightUnits,
            unitPx,
        };
    }, [activeLayoutKeys]);
    const unitPx = bounds.unitPx;
    const boardWidthPx = Math.round(bounds.widthUnits * unitPx - KEY_GAP_PX + BOARD_PADDING_PX * 2);
    const boardHeightPx = Math.round(bounds.heightUnits * unitPx - KEY_GAP_PX + BOARD_PADDING_PX * 2);
    const getCellRectPx = (k: LayoutKey) => ({
        left: (k.x - bounds.minX) * unitPx + BOARD_PADDING_PX,
        top: (k.y - bounds.minY) * unitPx + BOARD_PADDING_PX,
        width: k.w * unitPx - KEY_GAP_PX,
        height: k.h * unitPx - KEY_GAP_PX,
    });
    const getRgbPreviewColor = (row: number, col: number, isModKey = false): string => {
        const point = previewGeometry.get(`${row},${col}`);
        if (!point)
            return "#000000";
        return previewColor({ point: { ...point, modifier: isModKey }, geometry: previewGeometry, preview,
            phase: animPhaseRef.current, now: animTickMs, impulses: [...recentImpulsesRef.current.values()], held: pressedCellsRef.current });
    };
    const layerMatrix = profile.layers[currentLayer] || [];
    return (<div className="w-full flex flex-col items-center justify-center py-2.5 px-6 select-none shrink-0">
      <div style={{ width: `${boardWidthPx}px`, height: `${boardHeightPx}px` }} className="relative rounded-2xl bg-slate-900/95 border-2 border-slate-800 shadow-2xl overflow-hidden shrink-0">
        {activeLayoutKeys.map((k, idx) => {
            const rect = getCellRectPx(k);
            const cellId = `${k.row},${k.col}`;
            const kc = layerMatrix[k.row * matrixCols + k.col] ?? 0;
            const decoded = decodeKeycode(kc, profile.protocol_version, activeDefinition.customKeycodes);
            const isKeySelected = activeTab === "keymap" &&
                selectedKey?.row === k.row &&
                selectedKey?.col === k.col;
            const isKeyPressed = pressedCells?.has(cellId) ?? false;
            const isTesterPressed = activeTab === "tester" && isKeyPressed;
            const isLightingPressed = activeTab === "lighting" && isKeyPressed;
            const isOtherTabPressed = activeTab !== "tester" && activeTab !== "lighting" && isKeyPressed;
            const isTested = testedCells?.has(cellId) ?? false;
            const rgbColor = getRgbPreviewColor(k.row, k.col, k.color === "mod" || k.color === "accent");
            const rgbOff = rgbColor.toLowerCase() === "#000000";
            const activePressGlowColor = rgbOff ? "#10b981" : rgbColor;
            // Keymap and Tester show lighting only in the colour bar.
            const showKeyLighting = activeTab === "lighting";
            const keyToneClass = k.color === "accent"
                ? "bg-emerald-950/70"
                : k.color === "mod"
                    ? "bg-slate-800/90"
                    : "bg-slate-900/95";
            const topLegend = getKeyTopLegend(k, decoded.shortLabel, numpadStartX);
            const centerFontSizeClass = decoded.shortLabel.length >= 6 || unitPx < 46
                ? "text-[9.5px]"
                : decoded.shortLabel.length >= 5
                    ? "text-[10px]"
                    : "text-[11px]";
            const rotationTransform = k.r && Math.abs(k.r) > 0.01
                ? {
                    transform: `rotate(${k.r}deg)`,
                    transformOrigin: `${(k.rx - k.x) * unitPx}px ${(k.ry - k.y) * unitPx}px`,
                }
                : {};
            return (<button key={`${k.row}-${k.col}-${idx}`} type="button" data-key-interactive="true" onDragOver={(e) => {
                    if (activeTab === "keymap")
                        e.preventDefault();
                }} onDrop={(e) => {
                    if (activeTab !== "keymap")
                        return;
                    e.preventDefault();
                    const droppedCode = e.dataTransfer.getData("text/max102-keycode");
                    if (droppedCode) {
                        setSelectedKey({ row: k.row, col: k.col });
                        const encoded = encodeKeycodeString(droppedCode, profile.protocol_version);
                        void assignKeycode(currentLayer, k.row, k.col, encoded);
                    }
                }} onClick={(e) => {
                    if (activeTab === "lighting") {
                        const now = performance.now();
                        recentImpulsesRef.current.set(cellId, {
                            row: k.row, col: k.col, time: now,
                            hits: Math.min(20, (recentImpulsesRef.current.get(cellId)?.hits ?? 0) + 1),
                        });
                        setAnimTickMs(now);
                    }
                    else {
                        setSelectedKey({ row: k.row, col: k.col });
                    }
                }} style={{
                    left: `${rect.left}px`,
                    top: `${rect.top}px`,
                    width: `${rect.width}px`,
                    height: `${rect.height}px`,
                    ...rotationTransform,
                    backgroundColor: showKeyLighting
                        ? isKeyPressed
                            ? `${activePressGlowColor}55`
                            : !rgbOff
                                ? `${rgbColor}28`
                                : undefined
                        : undefined,
                    boxShadow: showKeyLighting
                        ? isKeyPressed
                            ? `0 0 18px ${activePressGlowColor}aa, inset 0 0 12px ${activePressGlowColor}66`
                            : !rgbOff
                                ? `0 0 12px ${rgbColor}55, inset 0 0 8px ${rgbColor}35`
                                : undefined
                        : undefined,
                    borderColor: showKeyLighting
                        ? isKeyPressed
                            ? "#ffffff"
                            : rgbOff
                                ? "#334155"
                                : rgbColor
                        : undefined,
                }} title={`[${k.row},${k.col}] Default: ${k.value} | Layer ${currentLayer}: ${decoded.fullLabel}`} className={`absolute rounded-lg border flex flex-col justify-between px-1 py-1 text-left transition cursor-pointer ${keyToneClass} ${isTesterPressed
                    ? "bg-emerald-500! text-slate-950! border-emerald-300 scale-95 z-20 shadow-lg shadow-emerald-500/40"
                    : isLightingPressed || isOtherTabPressed
                        ? "scale-95 z-20 ring-2 ring-white/90"
                        : isTested
                            ? "border-emerald-500/70 bg-emerald-950/60"
                            : isKeySelected
                                ? "ring-2 ring-emerald-400 border-emerald-400 z-10 bg-slate-800"
                                : "border-slate-700/80 hover:border-slate-500"}`}>
              {/* Top row: shifted symbol or original physical legend (only when different from center label) + RGB dot */}
              <div className="w-full min-h-[10px] flex items-center justify-between gap-0.5 leading-none px-0.5">
                <span className={`text-[8.5px] font-medium leading-none truncate ${isTesterPressed ? "text-slate-900" : "text-slate-400/85"}`}>
                  {topLegend ?? ""}
                </span>
                {activeTab === "lighting" && (<span style={{ backgroundColor: rgbOff ? "#1e293b" : rgbColor }} className="w-2 h-2 rounded-full border border-white/25 shrink-0"/>)}
              </div>

              {/* Center: Active Layer Keycode Label */}
              <div className="w-full flex items-center justify-center my-auto">
                <span className={`${centerFontSizeClass} font-semibold tracking-tight text-center leading-none whitespace-nowrap ${isTesterPressed
                    ? "text-slate-950 font-bold"
                    : decoded.code === "KC_TRNS"
                        ? "text-slate-500"
                        : decoded.category === "layer"
                            ? "text-amber-300"
                            : decoded.category === "macro"
                                ? "text-purple-300"
                                : decoded.category === "custom"
                                    ? "text-cyan-300"
                                    : "text-slate-100"}`}>
                  {decoded.shortLabel}
                </span>
              </div>

              {/* Bottom bar: subtle RGB underglow indicator in Keymap view */}
              <div style={{
                    backgroundColor: rgbOff ? "transparent" : rgbColor,
                }} className="w-full h-0.5 rounded-full opacity-80"/>
            </button>);
        })}


      </div>
    </div>);
};
