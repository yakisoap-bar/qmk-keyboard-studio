import React, { useEffect, useState } from "react";
import {
  CircleDot,
  Square,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Plus,
  Clock,
} from "lucide-react";
import {
  MacroSlot,
  MacroStep,
  useKeyboardStore,
} from "../../store/useKeyboardStore";

export const MacroView: React.FC = () => {
  const { profile, isBusy, updateMacroSlot, saveAllMacrosToHardware } =
    useKeyboardStore();

  const [selectedSlotIdx, setSelectedSlotIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [useFixedDelay, setUseFixedDelay] = useState(true);
  const [fixedDelayMs, setFixedDelayMs] = useState(15);
  const [selectedStepIdx, setSelectedStepIdx] = useState<number | null>(null);

  const currentSlot: MacroSlot = profile.macros[selectedSlotIdx] || {
    index: selectedSlotIdx,
    name: `M${selectedSlotIdx}`,
    steps: [],
  };

  useEffect(() => {
    if (!isRecording) return;
    let lastTime = performance.now();

    const handleKeyEvent = (e: KeyboardEvent) => {
      if (e.repeat) return;
      e.preventDefault();
      e.stopPropagation();

      const now = performance.now();
      const elapsed = Math.max(0, Math.round(now - lastTime));
      lastTime = now;

      const step: MacroStep = {
        action: e.type === "keyup" ? "keyup" : "keydown",
        code: e.code,
        key: e.key.length === 1 ? e.key.toUpperCase() : e.code,
        delay: useFixedDelay ? fixedDelayMs : elapsed,
      };

      const latestSlot =
        useKeyboardStore.getState().profile.macros[selectedSlotIdx] || currentSlot;
      void updateMacroSlot({
        ...latestSlot,
        steps: [...latestSlot.steps, step],
      });
    };

    window.addEventListener("keydown", handleKeyEvent, { capture: true });
    window.addEventListener("keyup", handleKeyEvent, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyEvent, { capture: true });
      window.removeEventListener("keyup", handleKeyEvent, { capture: true });
    };
  }, [isRecording, selectedSlotIdx, useFixedDelay, fixedDelayMs, currentSlot, updateMacroSlot]);

  const updateSteps = (nextSteps: MacroStep[]) => {
    void updateMacroSlot({
      ...currentSlot,
      steps: nextSteps,
    });
  };

  const handleStepDelayChange = (idx: number, delay: number) => {
    const next = currentSlot.steps.map((s, i) =>
      i === idx ? { ...s, delay: Math.max(0, delay) } : s
    );
    updateSteps(next);
  };

  const handleMoveStep = (dir: -1 | 1) => {
    if (selectedStepIdx === null) return;
    const target = selectedStepIdx + dir;
    if (target < 0 || target >= currentSlot.steps.length) return;
    const next = [...currentSlot.steps];
    const [item] = next.splice(selectedStepIdx, 1);
    next.splice(target, 0, item);
    updateSteps(next);
    setSelectedStepIdx(target);
  };

  const handleDeleteStep = (idx: number) => {
    updateSteps(currentSlot.steps.filter((_, i) => i !== idx));
    if (selectedStepIdx === idx) setSelectedStepIdx(null);
  };

  const handleAddKeyTap = () => {
    updateSteps([
      ...currentSlot.steps,
      { action: "keydown", code: "KeyA", key: "A", delay: fixedDelayMs },
      { action: "keyup", code: "KeyA", key: "A", delay: 0 },
    ]);
  };

  return (
    <div className="flex-1 grid grid-cols-12 gap-4 px-6 py-4 min-h-0 overflow-hidden">
      {/* Left Sidebar: 16 Macro Slots */}
      <div className="col-span-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-100">
            Macro Slots (M0–M15)
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            16 Slots
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {profile.macros.map((m, idx) => {
            const active = selectedSlotIdx === idx;
            return (
              <button
                key={m.index}
                type="button"
                onClick={() => {
                  setIsRecording(false);
                  setSelectedSlotIdx(idx);
                  setSelectedStepIdx(null);
                }}
                className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                  active
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-slate-950/50 hover:bg-slate-800 text-slate-300 border border-slate-800/70"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-emerald-400">
                    M{idx}
                  </span>
                  <span className="truncate">{m.name}</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                  {m.steps.length} steps
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-800">
          <button
            type="button"
            disabled={isBusy || isRecording}
            onClick={() => void saveAllMacrosToHardware()}
            className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            {isBusy ? "Writing Macros..." : "Write All Macros to Keyboard"}
          </button>
        </div>
      </div>

      {/* Right Panel: Macro Sequence Recorder & Step Table */}
      <div className="col-span-9 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col min-h-0 overflow-hidden">
        {/* Recorder Toolbar */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-emerald-400 font-mono">
              MACRO({selectedSlotIdx})
            </span>
            <input
              type="text"
              value={currentSlot.name}
              onChange={(e) =>
                void updateMacroSlot({ ...currentSlot, name: e.target.value })
              }
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="checkbox"
                checked={useFixedDelay}
                onChange={(e) => setUseFixedDelay(e.target.checked)}
                className="accent-emerald-500 rounded"
              />
              <span>Fixed Delay (ms):</span>
            </label>
            <input
              type="number"
              min={0}
              max={5000}
              disabled={!useFixedDelay}
              value={fixedDelayMs}
              onChange={(e) => setFixedDelayMs(Number(e.target.value) || 0)}
              className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-100 disabled:opacity-40"
            />

            <button
              type="button"
              onClick={() => setIsRecording(!isRecording)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                isRecording
                  ? "bg-rose-500 text-white animate-pulse"
                  : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-3.5 h-3.5" />
                  Stop Recording
                </>
              ) : (
                <>
                  <CircleDot className="w-3.5 h-3.5" />
                  Start Keystroke Recording
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleAddKeyTap}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Step
            </button>
          </div>
        </div>

        {/* Step Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {currentSlot.steps.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
              <p>
                Macro <strong>M{selectedSlotIdx}</strong> has no steps yet.
              </p>
              <p>
                Click <strong>Start Keystroke Recording</strong> and press keys on your keyboard, or click <strong>Add Step</strong>.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-3 w-14">#</th>
                  <th className="py-2 px-3">Action</th>
                  <th className="py-2 px-3">Key / Code</th>
                  <th className="py-2 px-3 w-40">Delay After (ms)</th>
                  <th className="py-2 px-3 w-20 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {currentSlot.steps.map((step, idx) => {
                  const selected = selectedStepIdx === idx;
                  return (
                    <tr
                      key={idx}
                      onClick={() => setSelectedStepIdx(idx)}
                      className={`cursor-pointer transition ${
                        selected ? "bg-emerald-500/15" : "hover:bg-slate-800/50"
                      }`}
                    >
                      <td className="py-2 px-3 font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={step.action}
                          onChange={(e) => {
                            const next = currentSlot.steps.map((s, i) =>
                              i === idx
                                ? { ...s, action: e.target.value as "keydown" | "keyup" }
                                : s
                            );
                            updateSteps(next);
                          }}
                          className={`px-2 py-0.5 rounded font-medium text-xs bg-slate-950 border border-slate-800 ${
                            step.action === "keydown"
                              ? "text-emerald-300"
                              : "text-amber-300"
                          }`}
                        >
                          <option value="keydown">Key Press (Down)</option>
                          <option value="keyup">Key Release (Up)</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-200">
                        {step.key} <span className="text-slate-500">({step.code})</span>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min={0}
                          max={9999}
                          value={step.delay}
                          onChange={(e) =>
                            handleStepDelayChange(idx, Number(e.target.value) || 0)
                          }
                          className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-slate-100"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStep(idx);
                          }}
                          className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom Step Reorder Controls */}
        <div className="px-4 py-2.5 border-t border-slate-800 flex items-center justify-between text-xs bg-slate-950/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={selectedStepIdx === null || selectedStepIdx === 0}
              onClick={() => handleMoveStep(-1)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              Move Up
            </button>
            <button
              type="button"
              disabled={
                selectedStepIdx === null ||
                selectedStepIdx >= currentSlot.steps.length - 1
              }
              onClick={() => handleMoveStep(1)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              Move Down
            </button>
          </div>

          <button
            type="button"
            disabled={currentSlot.steps.length === 0}
            onClick={() => updateSteps([])}
            className="px-3 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-35 text-rose-300 border border-rose-500/30 flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Macro M{selectedSlotIdx}
          </button>
        </div>
      </div>
    </div>
  );
};
