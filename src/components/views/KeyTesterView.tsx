import React from "react";
import { Activity, RotateCcw, CheckCircle2 } from "lucide-react";
import { useKeyboardStore } from "../../store/useKeyboardStore";

interface KeyTesterViewProps {
  pressedCells: Set<string>;
  testedCells: Set<string>;
  recentEvents: { id: number; label: string; coord: string; time: string }[];
  hardwarePolling: boolean;
  setHardwarePolling: (enabled: boolean) => void;
  onResetTested: () => void;
}

export const KeyTesterView: React.FC<KeyTesterViewProps> = ({
  pressedCells,
  testedCells,
  recentEvents,
  hardwarePolling,
  setHardwarePolling,
  onResetTested,
}) => {
  const { activeLayoutKeys, activeDefinition } = useKeyboardStore();
  const totalPhysicalKeys = activeLayoutKeys.length;

  return (
    <div className="flex-1 flex flex-col gap-3 px-6 pb-5 min-h-0 overflow-hidden">
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Activity className="w-4 h-4 text-emerald-400" />
            Live Matrix & Switch Tester
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-300">Verified Switches:</span>
            <span className="font-mono font-bold text-emerald-400">
              {testedCells.size} / {totalPhysicalKeys}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs">
            <span className="text-slate-400">Currently Held:</span>
            <span className="font-mono font-bold text-amber-300">
              {pressedCells.size}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={hardwarePolling}
              onChange={(e) => setHardwarePolling(e.target.checked)}
              className="accent-emerald-500 rounded"
            />
            <span>Poll Raw Hardware Matrix State (0x02 / 0x03)</span>
          </label>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onResetTested();
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Tested History
          </button>
        </div>
      </div>

      {/* Event Stream Log */}
      <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col min-h-0 overflow-hidden">
        <div className="text-xs font-semibold text-slate-300 mb-2">
          Live Keystroke & Matrix Event Stream
        </div>
        <div className="flex-1 overflow-y-auto flex flex-wrap content-start gap-2">
          {recentEvents.length === 0 ? (
            <div className="text-xs text-slate-500 m-auto">
              Press any keys on your {activeDefinition.name} to test switch
              actuation and anti-ghosting / NKRO...
            </div>
          ) : (
            recentEvents.map((ev) => (
              <div
                key={ev.id}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center gap-2"
              >
                <span className="font-semibold text-emerald-400">
                  {ev.label}
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  [{ev.coord}]
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
