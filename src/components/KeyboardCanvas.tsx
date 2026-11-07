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
const DUAL_SYMBOL_LEGENDS: Record<string, { top: string; base: string }> = {
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

function getKeyTopLegend(
  k: LayoutKey,
  activeShortLabel: string,
  numpadStartX: number
): string | null {
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

  if (normRaw === normActive) return null;

  if (k.x >= numpadStartX) {
    if (normActive === `n${normRaw}`) return null;
    if ((k.value === "÷" || k.value === "/") && normActive === "n/") return null;
    if ((k.value === "X" || k.value === "*") && normActive === "n*") return null;
    if (
      (k.value === "N.Lck" || k.value === "Num" || k.value === "NumLock") &&
      normActive === "nlk"
    )
      return null;
    if (
      (k.value === "N.Ent" || k.value === "Enter") &&
      normActive === "nent"
    )
      return null;
  }

  return k.value;
}

interface KeyPressImpulse {
  row: number;
  col: number;
  time: number;
}

function hsvToHex(hDeg: number, sPct: number, vUnit: number): string {
  const v = Math.max(0, Math.min(1, vUnit));
  if (v <= 0.02) return "#000000";
  const h = ((hDeg % 360) + 360) % 360;
  const s = Math.max(0, Math.min(1, sPct / 100));

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (h < 60) {
    r1 = c;
    g1 = x;
  } else if (h < 120) {
    r1 = x;
    g1 = c;
  } else if (h < 180) {
    g1 = c;
    b1 = x;
  } else if (h < 240) {
    g1 = x;
    b1 = c;
  } else if (h < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  const r = Math.round((r1 + m) * 255)
    .toString(16)
    .padStart(2, "0");
  const g = Math.round((g1 + m) * 255)
    .toString(16)
    .padStart(2, "0");
  const b = Math.round((b1 + m) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${r}${g}${b}`;
}

function scaleHexBrightness(hex: string, factor: number): string {
  const clean = hex.replace("#", "");
  if (clean.length < 6 || clean === "000000" || factor <= 0.02) return "#000000";
  const f = Math.max(0, Math.min(1, factor));
  const r = Math.round((parseInt(clean.slice(0, 2), 16) || 0) * f)
    .toString(16)
    .padStart(2, "0");
  const g = Math.round((parseInt(clean.slice(2, 4), 16) || 0) * f)
    .toString(16)
    .padStart(2, "0");
  const b = Math.round((parseInt(clean.slice(4, 6), 16) || 0) * f)
    .toString(16)
    .padStart(2, "0");
  return `#${r}${g}${b}`;
}

export const KeyboardCanvas: React.FC<KeyboardCanvasProps> = ({
  pressedCells,
  testedCells,
}) => {
  const {
    activeDefinition,
    activeLayoutKeys,
    activeTab,
    currentLayer,
    selectedKey,
    setSelectedKey,
    selectedRgbCells,
    setSelectedRgbCells,
    toggleRgbCellSelection,
    unifiedSpacebar,
    profile,
    assignKeycode,
  } = useKeyboardStore();

  const matrixRows = activeDefinition.matrix.rows;
  const matrixCols = activeDefinition.matrix.cols;
  const multiLedKeys = activeDefinition.layouts.multiLedKeys;
  const lightingSpec = activeDefinition.capabilities.lighting;
  const customModeId = lightingSpec?.perKeyRgb?.modeId ?? 45;
  const brightnessMax = lightingSpec?.brightnessMax ?? 180;
  const numpadStartX = Math.max(14.5, activeDefinition.layouts.width - 4.5);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dragBox, setDragBox] = useState<{
    startX: number;
    startY: number;
    currX: number;
    currY: number;
    additive: boolean;
  } | null>(null);

  // Real-time effect animation clock & live key press impulse history
  const [animTickMs, setAnimTickMs] = useState<number>(() => performance.now());
  const animPhaseRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const recentImpulsesRef = useRef<Map<string, KeyPressImpulse>>(new Map());
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
        const zone = multiLedKeys.find(
          (z) => z.switchRow === r && z.switchCol === c
        );
        if (zone) {
          for (const led of zone.ledCells) {
            recentImpulsesRef.current.set(`${led.row},${led.col}`, {
              row: led.row,
              col: led.col,
              time: now,
            });
          }
        } else {
          recentImpulsesRef.current.set(cellId, { row: r, col: c, time: now });
        }
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
  }, [pressedCells, multiLedKeys]);

  // Seed an initial demonstration impulse at board center when switching to a reactive effect
  useEffect(() => {
    const mode = profile.lighting.mode;
    const eff = lightingSpec?.effects.find((e) => e.id === mode);
    const isReactive =
      eff?.reactive || mode === 33 || mode === 37 || mode === 41;
    if (isReactive) {
      const now = performance.now();
      const centerR = Math.floor(matrixRows / 2);
      const centerC = Math.floor(matrixCols / 3);
      recentImpulsesRef.current.set(`${centerR},${centerC}`, {
        row: centerR,
        col: centerC,
        time: now,
      });
      setAnimTickMs(now);
    }
  }, [profile.lighting.mode, lightingSpec, matrixRows, matrixCols]);

  // Continuous 30fps animation loop for built-in effects and reactive key impulses
  useEffect(() => {
    let rafId = 0;
    let lastRender = performance.now();
    lastFrameTimeRef.current = lastRender;

    const step = (now: number) => {
      const dtSec = Math.min(0.1, (now - lastFrameTimeRef.current) / 1000);
      lastFrameTimeRef.current = now;
      const speedMult = Math.max(0.35, profile.lighting.speed / 128);
      animPhaseRef.current += dtSec * speedMult;

      const held = pressedCellsRef.current;
      for (const [k, imp] of recentImpulsesRef.current.entries()) {
        if (now - imp.time > 1800 && !held.has(k)) {
          recentImpulsesRef.current.delete(k);
        }
      }

      const isCustomMode = profile.lighting.mode === customModeId;
      const hasActiveImpulses =
        recentImpulsesRef.current.size > 0 || held.size > 0;
      if ((!isCustomMode || hasActiveImpulses) && now - lastRender >= 32) {
        lastRender = now;
        setAnimTickMs(now);
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [profile.lighting.mode, profile.lighting.speed, customModeId]);

  const bounds = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const k of activeLayoutKeys) {
      if (k.x < minX) minX = k.x;
      if (k.y < minY) minY = k.y;
      if (k.x + k.w > maxX) maxX = k.x + k.w;
      if (k.y + k.h > maxY) maxY = k.y + k.h;
    }
    if (!Number.isFinite(minX)) {
      minX = 0;
      minY = 0;
      maxX = 20.5;
      maxY = 6.25;
    }
    const widthUnits = Math.max(1, maxX - minX);
    const heightUnits = Math.max(1, maxY - minY);
    const unitPx = Math.min(
      50,
      Math.max(36, Math.floor((MAX_BOARD_INNER_WIDTH_PX + KEY_GAP_PX) / widthUnits))
    );
    return {
      minX,
      minY,
      widthUnits,
      heightUnits,
      unitPx,
    };
  }, [activeLayoutKeys]);

  const unitPx = bounds.unitPx;
  const boardWidthPx = Math.round(
    bounds.widthUnits * unitPx - KEY_GAP_PX + BOARD_PADDING_PX * 2
  );
  const boardHeightPx = Math.round(
    bounds.heightUnits * unitPx - KEY_GAP_PX + BOARD_PADDING_PX * 2
  );

  const selectedRgbSet = useMemo(
    () => new Set(selectedRgbCells),
    [selectedRgbCells]
  );

  const getCellRectPx = (
    k: LayoutKey,
    subIndex?: number,
    totalSubs?: number
  ) => {
    const baseLeft = (k.x - bounds.minX) * unitPx + BOARD_PADDING_PX;
    const baseTop = (k.y - bounds.minY) * unitPx + BOARD_PADDING_PX;
    const fullW = k.w * unitPx - KEY_GAP_PX;
    const fullH = k.h * unitPx - KEY_GAP_PX;
    if (subIndex !== undefined && totalSubs && totalSubs > 1) {
      const segW = fullW / totalSubs;
      return {
        left: baseLeft + subIndex * segW,
        top: baseTop,
        width: segW - 2,
        height: fullH,
      };
    }
    return { left: baseLeft, top: baseTop, width: fullW, height: fullH };
  };

  // Marquee drag selection on Lighting tab
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTab !== "lighting") return;
    if ((e.target as HTMLElement).closest("[data-key-interactive='true']"))
      return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    setDragBox({
      startX,
      startY,
      currX: startX,
      currY: startY,
      additive: e.ctrlKey || e.metaKey || e.shiftKey,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragBox || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDragBox({
      ...dragBox,
      currX: e.clientX - rect.left,
      currY: e.clientY - rect.top,
    });
  };

  const handlePointerUp = () => {
    if (!dragBox) return;
    const x1 = Math.min(dragBox.startX, dragBox.currX);
    const x2 = Math.max(dragBox.startX, dragBox.currX);
    const y1 = Math.min(dragBox.startY, dragBox.currY);
    const y2 = Math.max(dragBox.startY, dragBox.currY);

    if (Math.abs(x2 - x1) > 6 || Math.abs(y2 - y1) > 6) {
      const hitIds: string[] = [];
      for (const k of activeLayoutKeys) {
        const zone = multiLedKeys.find(
          (z) => z.switchRow === k.row && z.switchCol === k.col
        );
        if (!unifiedSpacebar && zone) {
          zone.ledCells.forEach((cell, idx) => {
            const r = getCellRectPx(k, idx, zone.ledCells.length);
            if (
              r.left < x2 &&
              r.left + r.width > x1 &&
              r.top < y2 &&
              r.top + r.height > y1
            ) {
              hitIds.push(`${cell.row},${cell.col}`);
            }
          });
        } else {
          const r = getCellRectPx(k);
          if (
            r.left < x2 &&
            r.left + r.width > x1 &&
            r.top < y2 &&
            r.top + r.height > y1
          ) {
            hitIds.push(`${k.row},${k.col}`);
          }
        }
      }
      if (dragBox.additive) {
        const merged = Array.from(new Set([...selectedRgbCells, ...hitIds]));
        setSelectedRgbCells(merged);
      } else {
        setSelectedRgbCells(hitIds);
      }
    }
    setDragBox(null);
  };

  const getRgbPreviewColor = (
    row: number,
    col: number,
    isModKey = false
  ): string => {
    if (!lightingSpec) return "#000000";
    const { mode, brightness, speed, hue, sat } = profile.lighting;
    if (brightness === 0) return "#000000";
    const valScale = Math.max(
      0.18,
      Math.min(1.0, brightness / Math.max(1, brightnessMax))
    );

    if (mode === customModeId && lightingSpec.perKeyRgb) {
      const cell = profile.per_key_rgb[row * matrixCols + col];
      return scaleHexBrightness(cell?.color || "#000000", valScale);
    }

    const baseH = (hue / 255) * 360;
    const baseS = (sat / 255) * 100;
    const phase = animPhaseRef.current;
    const now = animTickMs;

    const cx = (matrixCols - 1) / 2;
    const cy = (matrixRows - 1) / 2;
    const dx = col - cx;
    const dy = (row - cy) * 1.6;
    const dist = Math.hypot(dx, dy);
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const speedFactor = Math.max(0.4, speed / 128);

    const effDef = lightingSpec.effects.find((e) => e.id === mode);
    const sim = effDef?.simulation;

    switch (sim || mode) {
      case "solid":
      case 1:
        return hsvToHex(baseH, baseS, valScale);

      case "alphas_mods":
      case 2:
        return hsvToHex(isModKey ? (baseH + 38) % 360 : baseH, baseS, valScale);

      case "gradient_left_right":
      case 4:
        return hsvToHex(
          (baseH + (col / Math.max(1, matrixCols - 1)) * 110 + phase * 18) % 360,
          Math.max(70, baseS),
          valScale
        );

      case "breathing":
      case 5: {
        const breath = (Math.sin(phase * 2.5) + 1) * 0.5;
        return hsvToHex(baseH, baseS, (0.08 + 0.92 * breath) * valScale);
      }

      case "band_sat":
      case 6: {
        const bandPos = ((phase * 6.0) % (matrixCols + 5)) - 3;
        const factor = Math.max(0, 1 - Math.abs(col - bandPos) / 4.2);
        return hsvToHex(
          baseH,
          baseS * factor,
          (0.35 + 0.65 * factor) * valScale
        );
      }

      case "band_val":
      case 7: {
        const bandPos = ((phase * 6.0) % (matrixCols + 5)) - 3;
        const factor = Math.max(0.08, 1 - Math.abs(col - bandPos) / 4.0);
        return hsvToHex(baseH, baseS, factor * valScale);
      }

      case "band_pinwheel_val":
      case 9: {
        const wave =
          (Math.sin(((angleDeg * 2 + phase * 110) * Math.PI) / 180) + 1) * 0.5;
        return hsvToHex(baseH, baseS, (0.12 + 0.88 * wave) * valScale);
      }

      case "band_spiral_val":
      case 11: {
        const wave =
          (Math.sin(
            ((angleDeg + dist * 28 - phase * 120) * Math.PI) / 180
          ) +
            1) *
          0.5;
        return hsvToHex(baseH, baseS, (0.12 + 0.88 * wave) * valScale);
      }

      case "cycle_all":
      case 12:
        return hsvToHex((phase * 60) % 360, 95, valScale);

      case "cycle_left_right":
      case 13:
        return hsvToHex((col * 18 - phase * 90) % 360, 95, valScale);

      case "cycle_up_down":
      case 14:
        return hsvToHex((row * 45 - phase * 90) % 360, 95, valScale);

      case "rainbow_chevron":
      case 15:
        return hsvToHex(
          (Math.abs(row - cy) * 34 + col * 16 - phase * 95) % 360,
          95,
          valScale
        );

      case "cycle_out_in":
      case 16:
        return hsvToHex((dist * 24 + phase * 90) % 360, 95, valScale);

      case "cycle_out_in_dual":
      case 17: {
        const d1 = Math.hypot(col - matrixCols * 0.25, (row - cy) * 1.5);
        const d2 = Math.hypot(col - matrixCols * 0.75, (row - cy) * 1.5);
        return hsvToHex(
          (Math.min(d1, d2) * 32 + phase * 90) % 360,
          95,
          valScale
        );
      }

      case "cycle_pinwheel":
      case 18:
        return hsvToHex((angleDeg + 180 + phase * 85) % 360, 95, valScale);

      case "cycle_spiral":
      case 19:
        return hsvToHex(
          (angleDeg + 180 + dist * 25 - phase * 95) % 360,
          95,
          valScale
        );

      case "dual_beacon":
      case 20: {
        const w =
          (Math.sin(((angleDeg + phase * 80) * Math.PI) / 180) + 1) * 0.5;
        return hsvToHex(
          (baseH + w * 95) % 360,
          Math.max(75, baseS),
          valScale
        );
      }

      case "rainbow_beacon":
      case 21: {
        const w = Math.cos(((angleDeg + phase * 85) * Math.PI) / 180);
        return hsvToHex((baseH + w * 130 + phase * 50) % 360, 95, valScale);
      }

      case "rainbow_pinwheels":
      case 22:
        return hsvToHex((angleDeg * 2 + 360 + phase * 95) % 360, 95, valScale);

      case "raindrops":
      case 23: {
        const seed = (row * 37 + col * 101) % 97;
        const step = Math.floor(phase * 1.6 + seed * 0.13);
        const twinkle = 0.55 + 0.45 * Math.sin(phase * 3.5 + seed);
        const hDrop =
          (baseH + ((seed * 29 + step * 67) % 110) - 35 + 360) % 360;
        return hsvToHex(hDrop, Math.max(75, baseS), twinkle * valScale);
      }

      case "jellybean_raindrops":
      case 24: {
        const seed = (row * 43 + col * 89) % 113;
        const step = Math.floor(phase * 1.9 + seed * 0.17);
        const twinkle = 0.6 + 0.4 * Math.cos(phase * 3.2 + seed);
        return hsvToHex((seed * 53 + step * 83) % 360, 92, twinkle * valScale);
      }

      case "pixel_flow":
      case 29: {
        const idx = row * matrixCols + col;
        return hsvToHex((idx * 19 - phase * 150) % 360, 95, valScale);
      }

      case "digital_rain":
      case 32: {
        const colSeed = (col * 59 + 17) % 31;
        const fallRate = 2.0 + (colSeed % 5) * 0.35;
        const headRow = ((phase * fallRate + colSeed) % 9.0) - 1.5;
        const trail = headRow - row;
        if (trail >= 0 && trail < 0.75) {
          return hsvToHex(125, 35, valScale);
        }
        if (trail >= 0.75 && trail < 4.2) {
          const fade = 1 - (trail - 0.75) / 3.45;
          return hsvToHex(128, 95, Math.max(0.08, fade) * valScale);
        }
        return hsvToHex(128, 95, 0.06 * valScale);
      }

      case "reactive_simple":
      case 33: {
        const cellKey = `${row},${col}`;
        const held = pressedCellsRef.current;
        const parentZone = multiLedKeys.find((z) =>
          z.ledCells.some((lc) => lc.row === row && lc.col === col)
        );
        const isHeld =
          held.has(cellKey) ||
          (parentZone
            ? held.has(`${parentZone.switchRow},${parentZone.switchCol}`)
            : false);
        let intensity = isHeld ? 1.0 : 0.0;
        const imp = recentImpulsesRef.current.get(cellKey);
        if (imp && !isHeld) {
          const ageSec = ((now - imp.time) / 1000) * speedFactor;
          intensity = Math.max(0, 1 - ageSec / 0.95);
        }
        if (intensity <= 0.01) return "#000000";
        const hReact = (baseH + (1 - intensity) * 28) % 360;
        return hsvToHex(hReact, baseS, (0.15 + 0.85 * intensity) * valScale);
      }

      case "reactive_cross":
      case 37: {
        const held = pressedCellsRef.current;
        let bestPulse = 0;
        for (const [key, imp] of recentImpulsesRef.current.entries()) {
          if (imp.row !== row && imp.col !== col) continue;
          const armDist = Math.abs(row - imp.row) + Math.abs(col - imp.col);
          const parentZone = multiLedKeys.find((z) =>
            z.ledCells.some((lc) => lc.row === imp.row && lc.col === imp.col)
          );
          const isHeld =
            held.has(key) ||
            (parentZone
              ? held.has(`${parentZone.switchRow},${parentZone.switchCol}`)
              : false);
          const ageSec = ((now - imp.time) / 1000) * speedFactor;
          const waveFront = ageSec * 16.0;
          const wavePulse =
            Math.max(0, 1 - Math.abs(armDist - waveFront) / 2.6) *
            Math.max(0, 1 - ageSec / 1.15);
          const holdPulse = isHeld ? Math.max(0, 1 - armDist / 5.5) : 0;
          bestPulse = Math.max(bestPulse, wavePulse, holdPulse);
        }
        if (bestPulse <= 0.01) return "#000000";
        const hCross = (baseH + bestPulse * 35) % 360;
        return hsvToHex(hCross, baseS, (0.15 + 0.85 * bestPulse) * valScale);
      }

      case "splash":
      case 41: {
        const held = pressedCellsRef.current;
        let bestRing = 0;
        let splashHue = (phase * 40) % 360;
        for (const [key, imp] of recentImpulsesRef.current.entries()) {
          const rDist = Math.hypot(col - imp.col, (row - imp.row) * 1.45);
          const parentZone = multiLedKeys.find((z) =>
            z.ledCells.some((lc) => lc.row === imp.row && lc.col === imp.col)
          );
          const isHeld =
            held.has(key) ||
            (parentZone
              ? held.has(`${parentZone.switchRow},${parentZone.switchCol}`)
              : false);
          const ageSec = ((now - imp.time) / 1000) * speedFactor;
          const ringRadius = ageSec * 15.0;
          const ring =
            Math.max(0, 1 - Math.abs(rDist - ringRadius) / 2.5) *
            Math.max(0, 1 - ageSec / 1.3);
          const centerHold = isHeld && rDist < 2.2 ? 1 - rDist / 2.5 : 0;
          const strength = Math.max(ring, centerHold);
          if (strength > bestRing) {
            bestRing = strength;
            splashHue = (rDist * 30 - ageSec * 210 + imp.col * 20 + 360) % 360;
          }
        }
        if (bestRing <= 0.01) return "#000000";
        return hsvToHex(splashHue, 95, (0.15 + 0.85 * bestRing) * valScale);
      }

      default:
        return hsvToHex(baseH, baseS, valScale);
    }
  };

  const layerMatrix = profile.layers[currentLayer] || [];
  const firstMultiZone = multiLedKeys[0];

  return (
    <div className="w-full flex flex-col items-center justify-center py-2.5 px-6 select-none shrink-0">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ width: `${boardWidthPx}px`, height: `${boardHeightPx}px` }}
        className="relative rounded-2xl bg-slate-900/95 border-2 border-slate-800 shadow-2xl overflow-hidden shrink-0"
      >
        {/* Subtle indicator inside the physical gap between Esc (x=0..1) and F1 (x=2..3) when split multi-LED mode is active */}
        {!unifiedSpacebar && activeTab === "lighting" && firstMultiZone && (
          <div
            style={{
              left: `${1.0 * unitPx + BOARD_PADDING_PX}px`,
              top: `${BOARD_PADDING_PX}px`,
              width: `${1.0 * unitPx - KEY_GAP_PX}px`,
              height: `${1.0 * unitPx - KEY_GAP_PX}px`,
            }}
            className="absolute flex flex-col items-center justify-center text-[8px] leading-tight font-mono text-emerald-400/90 text-center pointer-events-none"
          >
            {(firstMultiZone.badgeText || "MULTI\nLED")
              .split("\n")
              .map((line, i) => (
                <span key={i}>{line}</span>
              ))}
          </div>
        )}

        {activeLayoutKeys.map((k, idx) => {
          const multiZone = multiLedKeys.find(
            (z) => z.switchRow === k.row && z.switchCol === k.col
          );

          // Render split multi-LED key zones when in Lighting tab and unifiedSpacebar is false
          if (activeTab === "lighting" && multiZone && !unifiedSpacebar) {
            const isSwitchHeld =
              pressedCells?.has(
                `${multiZone.switchRow},${multiZone.switchCol}`
              ) ?? false;
            const totalCells = multiZone.ledCells.length;
            return (
              <React.Fragment key={`multi-split-${multiZone.id}-${idx}`}>
                {multiZone.ledCells.map((led, sIdx) => {
                  const rect = getCellRectPx(k, sIdx, totalCells);
                  const cellId = `${led.row},${led.col}`;
                  const isSel = selectedRgbSet.has(cellId);
                  const ledColor = getRgbPreviewColor(led.row, led.col);
                  const isOff = ledColor.toLowerCase() === "#000000";

                  return (
                    <button
                      key={cellId}
                      type="button"
                      data-key-interactive="true"
                      onClick={(e) => {
                        const now = performance.now();
                        recentImpulsesRef.current.set(cellId, {
                          row: led.row,
                          col: led.col,
                          time: now,
                        });
                        setAnimTickMs(now);
                        toggleRgbCellSelection(
                          led.row,
                          led.col,
                          e.ctrlKey || e.metaKey || e.shiftKey
                        );
                      }}
                      style={{
                        left: `${rect.left}px`,
                        top: `${rect.top}px`,
                        width: `${rect.width}px`,
                        height: `${rect.height}px`,
                        backgroundColor: isSwitchHeld
                          ? `${isOff ? "#10b981" : ledColor}55`
                          : isOff
                          ? undefined
                          : `${ledColor}26`,
                        boxShadow: isSwitchHeld
                          ? `0 0 18px ${
                              isOff ? "#10b981" : ledColor
                            }aa, inset 0 0 12px ${
                              isOff ? "#10b981" : ledColor
                            }66`
                          : isOff
                          ? "none"
                          : `0 0 12px ${ledColor}55, inset 0 0 8px ${ledColor}44`,
                        borderColor: isSwitchHeld
                          ? "#ffffff"
                          : isSel
                          ? "#34d399"
                          : isOff
                          ? "#334155"
                          : ledColor,
                      }}
                      className={`absolute rounded-lg border-2 flex flex-col items-center justify-between p-1.5 transition cursor-pointer ${
                        isSwitchHeld
                          ? "scale-95 z-20 ring-2 ring-white/90"
                          : isSel
                          ? "ring-2 ring-emerald-400 bg-slate-800/95 z-10"
                          : "bg-slate-950/90 hover:bg-slate-900"
                      }`}
                      title={`${multiZone.label} ${led.label} (Row ${led.row}, Col ${led.col}) — ${ledColor}`}
                    >
                      <span className="text-[9px] font-mono text-slate-400">
                        {led.label}
                      </span>
                      <span
                        style={{
                          backgroundColor: isOff ? "#1e293b" : ledColor,
                        }}
                        className="w-4 h-2 rounded-full border border-white/20"
                      />
                      <span className="text-[9px] font-mono text-slate-500">
                        {led.row},{led.col}
                      </span>
                    </button>
                  );
                })}
              </React.Fragment>
            );
          }

          const rect = getCellRectPx(k);
          const cellId = `${k.row},${k.col}`;
          const kc = layerMatrix[k.row * matrixCols + k.col] ?? 0;
          const decoded = decodeKeycode(
            kc,
            profile.protocol_version,
            activeDefinition.customKeycodes
          );

          const isKeySelected =
            activeTab === "keymap" &&
            selectedKey?.row === k.row &&
            selectedKey?.col === k.col;
          const isRgbSelected =
            activeTab === "lighting" && selectedRgbSet.has(cellId);
          const isKeyPressed = pressedCells?.has(cellId) ?? false;
          const isTesterPressed = activeTab === "tester" && isKeyPressed;
          const isLightingPressed = activeTab === "lighting" && isKeyPressed;
          const isOtherTabPressed =
            activeTab !== "tester" && activeTab !== "lighting" && isKeyPressed;
          const isTested = testedCells?.has(cellId) ?? false;

          const rgbColor = getRgbPreviewColor(
            k.row,
            k.col,
            k.color === "mod" || k.color === "accent"
          );
          const rgbOff = rgbColor.toLowerCase() === "#000000";
          const activePressGlowColor = rgbOff ? "#10b981" : rgbColor;

          const keyToneClass =
            k.color === "accent"
              ? "bg-emerald-950/70"
              : k.color === "mod"
              ? "bg-slate-800/90"
              : "bg-slate-900/95";

          const topLegend = getKeyTopLegend(
            k,
            decoded.shortLabel,
            numpadStartX
          );
          const centerFontSizeClass =
            decoded.shortLabel.length >= 6 || unitPx < 46
              ? "text-[9.5px]"
              : decoded.shortLabel.length >= 5
              ? "text-[10px]"
              : "text-[11px]";

          const rotationTransform =
            k.r && Math.abs(k.r) > 0.01
              ? {
                  transform: `rotate(${k.r}deg)`,
                  transformOrigin: `${(k.rx - k.x) * unitPx}px ${
                    (k.ry - k.y) * unitPx
                  }px`,
                }
              : {};

          return (
            <button
              key={`${k.row}-${k.col}-${idx}`}
              type="button"
              data-key-interactive="true"
              onDragOver={(e) => {
                if (activeTab === "keymap") e.preventDefault();
              }}
              onDrop={(e) => {
                if (activeTab !== "keymap") return;
                e.preventDefault();
                const droppedCode = e.dataTransfer.getData(
                  "text/max102-keycode"
                );
                if (droppedCode) {
                  setSelectedKey({ row: k.row, col: k.col });
                  const encoded = encodeKeycodeString(
                    droppedCode,
                    profile.protocol_version
                  );
                  void assignKeycode(currentLayer, k.row, k.col, encoded);
                }
              }}
              onClick={(e) => {
                if (activeTab === "lighting") {
                  const now = performance.now();
                  if (multiZone) {
                    for (const led of multiZone.ledCells) {
                      recentImpulsesRef.current.set(`${led.row},${led.col}`, {
                        row: led.row,
                        col: led.col,
                        time: now,
                      });
                    }
                  } else {
                    recentImpulsesRef.current.set(cellId, {
                      row: k.row,
                      col: k.col,
                      time: now,
                    });
                  }
                  setAnimTickMs(now);
                  toggleRgbCellSelection(
                    k.row,
                    k.col,
                    e.ctrlKey || e.metaKey || e.shiftKey
                  );
                } else {
                  setSelectedKey({ row: k.row, col: k.col });
                }
              }}
              style={{
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                ...rotationTransform,
                backgroundColor:
                  activeTab === "lighting"
                    ? isLightingPressed
                      ? `${activePressGlowColor}55`
                      : !rgbOff
                      ? `${rgbColor}28`
                      : undefined
                    : undefined,
                boxShadow:
                  activeTab === "lighting"
                    ? isLightingPressed
                      ? `0 0 18px ${activePressGlowColor}aa, inset 0 0 12px ${activePressGlowColor}66`
                      : !rgbOff
                      ? `0 0 12px ${rgbColor}55, inset 0 0 8px ${rgbColor}35`
                      : undefined
                    : undefined,
                borderColor:
                  activeTab === "lighting"
                    ? isLightingPressed
                      ? "#ffffff"
                      : isRgbSelected
                      ? "#34d399"
                      : rgbOff
                      ? "#334155"
                      : rgbColor
                    : undefined,
              }}
              title={`[${k.row},${k.col}] Default: ${k.value} | Layer ${currentLayer}: ${decoded.fullLabel}`}
              className={`absolute rounded-lg border flex flex-col justify-between px-1 py-1 text-left transition cursor-pointer ${keyToneClass} ${
                isTesterPressed
                  ? "bg-emerald-500! text-slate-950! border-emerald-300 scale-95 z-20 shadow-lg shadow-emerald-500/40"
                  : isLightingPressed || isOtherTabPressed
                  ? "scale-95 z-20 ring-2 ring-white/90"
                  : isTested
                  ? "border-emerald-500/70 bg-emerald-950/60"
                  : isKeySelected || isRgbSelected
                  ? "ring-2 ring-emerald-400 border-emerald-400 z-10 bg-slate-800"
                  : "border-slate-700/80 hover:border-slate-500"
              }`}
            >
              {/* Top row: shifted symbol or original physical legend (only when different from center label) + RGB dot */}
              <div className="w-full min-h-[10px] flex items-center justify-between gap-0.5 leading-none px-0.5">
                <span
                  className={`text-[8.5px] font-medium leading-none truncate ${
                    isTesterPressed ? "text-slate-900" : "text-slate-400/85"
                  }`}
                >
                  {topLegend ?? ""}
                </span>
                {activeTab === "lighting" && (
                  <span
                    style={{ backgroundColor: rgbOff ? "#1e293b" : rgbColor }}
                    className="w-2 h-2 rounded-full border border-white/25 shrink-0"
                  />
                )}
              </div>

              {/* Center: Active Layer Keycode Label */}
              <div className="w-full flex items-center justify-center my-auto">
                <span
                  className={`${centerFontSizeClass} font-semibold tracking-tight text-center leading-none whitespace-nowrap ${
                    isTesterPressed
                      ? "text-slate-950 font-bold"
                      : decoded.code === "KC_TRNS"
                      ? "text-slate-500"
                      : decoded.category === "layer"
                      ? "text-amber-300"
                      : decoded.category === "macro"
                      ? "text-purple-300"
                      : decoded.category === "custom"
                      ? "text-cyan-300"
                      : "text-slate-100"
                  }`}
                >
                  {decoded.shortLabel}
                </span>
              </div>

              {/* Bottom bar: subtle RGB underglow indicator in Keymap view */}
              <div
                style={{
                  backgroundColor: rgbOff ? "transparent" : rgbColor,
                }}
                className="w-full h-0.5 rounded-full opacity-80"
              />
            </button>
          );
        })}

        {/* Marquee Selection Overlay */}
        {dragBox && (
          <div
            style={{
              left: `${Math.min(dragBox.startX, dragBox.currX)}px`,
              top: `${Math.min(dragBox.startY, dragBox.currY)}px`,
              width: `${Math.abs(dragBox.currX - dragBox.startX)}px`,
              height: `${Math.abs(dragBox.currY - dragBox.startY)}px`,
            }}
            className="absolute border border-emerald-400 bg-emerald-500/15 rounded pointer-events-none z-30"
          />
        )}
      </div>
    </div>
  );
};
