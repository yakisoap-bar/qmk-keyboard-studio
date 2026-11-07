import React, { useState } from "react";
import {
  Sparkles,
  Palette,
  Sliders,
  SplitSquareVertical,
  PowerOff,
  CheckSquare,
  Blend,
} from "lucide-react";
import { useKeyboardStore } from "../../store/useKeyboardStore";

const PRESET_SWATCHES = [
  "#00ff88",
  "#00e5ff",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#ffffff",
];

export const LightingView: React.FC = () => {
  const {
    activeDefinition,
    profile,
    selectedRgbCells,
    unifiedSpacebar,
    setUnifiedSpacebar,
    activeColor,
    setActiveColor,
    selectRgbGroup,
    setLightingMode,
    setLightingBrightness,
    setLightingSpeed,
    setLightingEffectColor,
    paintSelectedRgbCells,
    applyGradientToSelectedRgbCells,
  } = useKeyboardStore();

  const [gradStart, setGradStart] = useState("#00ff88");
  const [gradEnd, setGradEnd] = useState("#3b82f6");

  const lightingSpec = activeDefinition.capabilities.lighting;
  if (!lightingSpec) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 pb-5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 text-center max-w-md space-y-2">
          <Sparkles className="w-6 h-6 text-slate-500 mx-auto" />
          <div className="text-sm font-semibold text-slate-200">
            No Backlighting Capability Declared
          </div>
          <p className="text-xs text-slate-400">
            The active keyboard definition ({activeDefinition.name}) does not
            declare RGB lighting commands.
          </p>
        </div>
      </div>
    );
  }

  const perKeySpec = lightingSpec.perKeyRgb;
  const hasPerKey = Boolean(perKeySpec);
  const customModeId = perKeySpec?.modeId ?? 45;
  const isCustomMode = hasPerKey && profile.lighting.mode === customModeId;

  const bStep = Math.max(1, lightingSpec.brightnessStep || 36);
  const bMaxLevels = Math.max(
    1,
    Math.round((lightingSpec.brightnessMax || 180) / bStep)
  );
  const brightnessLevel = Math.min(
    bMaxLevels,
    Math.round(profile.lighting.brightness / bStep)
  );

  const sStep = Math.max(1, lightingSpec.speedStep || 51);
  const sMaxLevels = Math.max(
    1,
    Math.round((lightingSpec.speedMax || 255) / sStep)
  );
  const speedLevel = Math.max(
    1,
    Math.min(sMaxLevels, Math.round(profile.lighting.speed / sStep))
  );

  const effects = lightingSpec.effects || [];
  const multiLedKeys = activeDefinition.layouts.multiLedKeys || [];
  const firstMultiZone = multiLedKeys[0];

  return (
    <div className="flex-1 grid grid-cols-12 gap-4 px-6 pb-5 min-h-0 overflow-hidden">
      {/* Left Column: Lighting Mode List */}
      <div
        className={`${
          hasPerKey ? "col-span-4" : "col-span-7"
        } bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col min-h-0 overflow-hidden`}
      >
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Lighting Mode ({effects.length + (hasPerKey ? 1 : 0)} Modes)
          </div>
          <span className="text-[11px] font-mono text-emerald-400">
            Active:{" "}
            {isCustomMode
              ? `Custom Per-Key (${customModeId})`
              : `Mode #${profile.lighting.mode}`}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {hasPerKey && (
            <button
              type="button"
              onClick={() => void setLightingMode(customModeId)}
              className={`w-full px-3 py-2.5 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                isCustomMode
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm"
                  : "bg-slate-950/60 hover:bg-slate-800 text-slate-200 border border-slate-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-400" />
                <span>Custom Per-Key Backlighting Studio</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                ID {customModeId}
              </span>
            </button>
          )}

          <div className="pt-2 pb-1 px-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Built-In Matrix Effects</span>
            <span className="text-emerald-400/80 font-mono normal-case">
              Live Preview + Key Readout
            </span>
          </div>

          <div
            className={`grid ${
              hasPerKey ? "grid-cols-2" : "grid-cols-3"
            } gap-1.5`}
          >
            {effects.map((eff) => {
              const active = profile.lighting.mode === eff.id;
              const isReactive =
                eff.reactive ||
                eff.id === 33 ||
                eff.id === 37 ||
                eff.id === 41;
              return (
                <button
                  key={eff.id}
                  type="button"
                  onClick={() => void setLightingMode(eff.id)}
                  title={
                    isReactive
                      ? `${eff.name} (#${eff.id}) — Reactive to live physical keystrokes`
                      : `${eff.name} (#${eff.id})`
                  }
                  className={`px-2.5 py-2 rounded-lg text-left text-xs font-medium flex items-center justify-between gap-1 transition cursor-pointer ${
                    active
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-slate-950/50 hover:bg-slate-800/80 text-slate-300 border border-slate-800/80"
                  }`}
                >
                  <span className="truncate">{eff.name}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    {isReactive && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                        title="Reactive to live keystrokes"
                      />
                    )}
                    <span className="text-[10px] font-mono text-slate-500">
                      #{eff.id}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Middle Column: Per-Key RGB Multi-Select & Brush Studio (if supported by definition) */}
      {hasPerKey && (
        <div className="col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3 overflow-y-auto">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                Per-Key RGB Selection & Paint Studio
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 font-mono text-[11px]">
                  {selectedRgbCells.length} selected
                </span>
              </div>

              {/* Multi-LED Zone Split Toggle (e.g. 5-LED Spacebar) */}
              {firstMultiZone && (
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  <SplitSquareVertical className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{firstMultiZone.label} Split</span>
                  <input
                    type="checkbox"
                    checked={!unifiedSpacebar}
                    onChange={(e) => setUnifiedSpacebar(!e.target.checked)}
                    className="accent-emerald-500 rounded cursor-pointer"
                  />
                </label>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Click keys on the diagram above,{" "}
              <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300">
                Ctrl
              </kbd>
              -click to toggle individual keys, drag a marquee box across any
              region, or use the quick-group buttons below:
            </p>

            {/* Quick Selection Group Pills */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "all", label: "All Keys" },
                { id: "alphas", label: "Alphas" },
                { id: "mods", label: "Modifiers" },
                { id: "fn_row", label: "F-Row" },
                { id: "wasd", label: "WASD" },
                { id: "arrows", label: "Arrows" },
                { id: "numpad", label: "Numpad" },
                { id: "invert", label: "Invert" },
                { id: "none", label: "Clear Selection" },
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() =>
                    selectRgbGroup(g.id as Parameters<typeof selectRgbGroup>[0])
                  }
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-600 transition cursor-pointer"
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Paint Color & Swatches */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    aria-label="Per-Key Paint Color"
                    value={activeColor}
                    onChange={(e) => {
                      setActiveColor(e.target.value);
                      if (selectedRgbCells.length > 0) {
                        void paintSelectedRgbCells(e.target.value);
                      }
                    }}
                    className="w-9 h-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      Active Key Color
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {activeColor.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={selectedRgbCells.length === 0}
                    onClick={() => void paintSelectedRgbCells(activeColor)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 transition cursor-pointer"
                  >
                    Paint Selected ({selectedRgbCells.length})
                  </button>
                  <button
                    type="button"
                    disabled={selectedRgbCells.length === 0}
                    onClick={() => void paintSelectedRgbCells("#000000")}
                    title="Turn off LEDs on selected keys"
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                  >
                    <PowerOff className="w-3.5 h-3.5 text-rose-400" />
                    LED Off
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                {PRESET_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => {
                      setActiveColor(swatch);
                      if (selectedRgbCells.length > 0) {
                        void paintSelectedRgbCells(swatch);
                      }
                    }}
                    style={{ backgroundColor: swatch }}
                    className={`w-6 h-6 rounded-full border transition cursor-pointer ${
                      activeColor.toLowerCase() === swatch
                        ? "ring-2 ring-white scale-110 border-white"
                        : "border-white/25 hover:scale-105"
                    }`}
                    title={`Apply ${swatch}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Two-Color Gradient Generator */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Blend className="w-3.5 h-3.5 text-emerald-400" />
                Gradient Fill (
                {selectedRgbCells.length > 0 ? "Selected Keys" : "Entire Board"}
                )
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Gradient Start Color"
                  value={gradStart}
                  onChange={(e) => setGradStart(e.target.value)}
                  className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                />
                <span className="text-xs text-slate-500">→</span>
                <input
                  type="color"
                  aria-label="Gradient End Color"
                  value={gradEnd}
                  onChange={(e) => setGradEnd(e.target.value)}
                  className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    void applyGradientToSelectedRgbCells(
                      gradStart,
                      gradEnd,
                      "horizontal"
                    )
                  }
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  Left → Right
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void applyGradientToSelectedRgbCells(
                      gradStart,
                      gradEnd,
                      "vertical"
                    )
                  }
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  Top → Bottom
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Right Column: Global Brightness, Speed & Effect Color Sliders */}
      <div
        className={`${
          hasPerKey ? "col-span-3" : "col-span-5"
        } bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between`}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-100 border-b border-slate-800 pb-2.5">
            <Sliders className="w-4 h-4 text-emerald-400" />
            Global Matrix Parameters
          </div>

          {/* Brightness Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Brightness</span>
              <span className="font-mono text-emerald-400">
                Level {brightnessLevel} / {bMaxLevels} (
                {Math.round((brightnessLevel / bMaxLevels) * 100)}%)
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={bMaxLevels}
              step={1}
              value={brightnessLevel}
              onChange={(e) =>
                void setLightingBrightness(
                  Math.min(
                    lightingSpec.brightnessMax,
                    Number(e.target.value) * bStep
                  )
                )
              }
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Speed Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">
                Animation Speed
              </span>
              <span className="font-mono text-emerald-400">
                Level {speedLevel} / {sMaxLevels}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={sMaxLevels}
              step={1}
              value={speedLevel}
              onChange={(e) =>
                void setLightingSpeed(
                  Math.min(
                    lightingSpec.speedMax,
                    Math.max(
                      lightingSpec.speedMin,
                      Number(e.target.value) * sStep
                    )
                  )
                )
              }
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Global Effect Color */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">
                Effect Primary Color
              </span>
              <input
                type="color"
                aria-label="Global Effect Color"
                value={profile.lighting.color_hex}
                onChange={(e) => void setLightingEffectColor(e.target.value)}
                className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_SWATCHES.slice(0, 8).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => void setLightingEffectColor(c)}
                  style={{ backgroundColor: c }}
                  className="w-5 h-5 rounded-full border border-white/25 cursor-pointer hover:scale-110 transition"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
          Changes preview immediately in keyboard RAM and commit automatically
          to flash with wear-leveling debounce.
        </div>
      </div>
    </div>
  );
};
