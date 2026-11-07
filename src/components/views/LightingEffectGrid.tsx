import React from 'react';
export const LIGHTING_SWATCHES = ['#00ff88', '#00e5ff', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#ffffff'];
export interface LightingEffectOption {
    id: number;
    name: string;
    reactive?: boolean;
    previewAvailable?: boolean;
}
export const LightingEffectGrid: React.FC<{
    effects: LightingEffectOption[];
    activeMode?: number;
    onSelect: (mode: number) => void;
    compact?: boolean;
}> = ({ effects, activeMode, onSelect, compact }) => <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-3'} gap-1.5`}>
  {effects.map(effect => <button key={effect.id} type="button" onClick={() => onSelect(effect.id)} aria-pressed={activeMode === effect.id} title={`${effect.name} (#${effect.id})${effect.previewAvailable === false ? ' — Preview unavailable' : effect.reactive ? ' — Reactive to live keystrokes' : ''}`} className={`px-2.5 py-2 rounded-lg text-left text-xs font-medium flex items-center justify-between gap-1 transition cursor-pointer ${activeMode === effect.id ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-950/50 hover:bg-slate-800/80 text-slate-300 border border-slate-800/80'}`}>
    <span className="truncate">{effect.name}</span><span className="flex items-center gap-1 shrink-0">
      {effect.reactive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" title="Reactive to live keystrokes"/>}
      {effect.previewAvailable === false && <span className="text-[10px] text-slate-500" aria-label="Preview unavailable">—</span>}
      <span className="text-[10px] font-mono text-slate-500">#{effect.id}</span>
    </span>
  </button>)}
</div>;
