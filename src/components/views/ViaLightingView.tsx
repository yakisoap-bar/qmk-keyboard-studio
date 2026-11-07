import React from 'react';
import { Sparkles, Sliders } from 'lucide-react';
import { useKeyboardStore } from '../../store/useKeyboardStore';
import { defaultViaLightingValue, dropdownOptions, hexToHs, hsToHex, lightingControlVisible } from '../../utils/viaLighting';
import { getLightingPreview, lightingFamily, resolvePreviewEffect, selectPreviewControl, viaEffectControls } from '../../utils/lightingPreview';
import { LIGHTING_SWATCHES, LightingEffectGrid } from './LightingEffectGrid';
export const ViaLightingView: React.FC = () => {
    const { activeDefinition, profile, diagnostics, setViaLightingValue, lightingPreviewControlId, setLightingPreviewControlId } = useKeyboardStore();
    const controls = activeDefinition.viaLighting ?? [];
    const values = profile.via_lighting_values ?? {};
    const visible = controls.filter(c => lightingControlVisible(c.showIf, values));
    const selected = selectPreviewControl(visible, lightingPreviewControlId);
    const preview = getLightingPreview(activeDefinition, profile, selected?.id ?? null);
    const groupKey = (c: typeof controls[number]) => JSON.stringify([c.group, c.channel, c.arguments ?? []]);
    const groups = [...new Map(visible.map(c => [groupKey(c), c])).values()].map(first => viaEffectControls(visible).find(c => groupKey(c) === groupKey(first)) ?? first);
    const peers = visible.filter(c => selected && groupKey(c) === groupKey(selected));
    const modeControl = selected?.type === 'dropdown' ? selected : undefined;
    const options = dropdownOptions(modeControl?.options).map(o => {
        const effect = resolvePreviewEffect(o.label, lightingFamily(modeControl!));
        return { id: o.value, name: o.label, reactive: effect?.reactive, previewAvailable: Boolean(effect) };
    });
    const update = (id: string, value: number[]) => void setViaLightingValue(id, value);
    return <div className="flex-1 grid grid-cols-12 gap-4 px-6 pb-5 min-h-0 overflow-hidden">
    <section className="col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col min-h-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-200"><Sparkles className="w-4 h-4 text-emerald-400"/>Lighting Mode ({options.length} Modes)</h2>
        <span className="text-[11px] font-mono text-emerald-400 truncate">Active: {preview.label}</span>
      </div>
      {groups.length > 1 && <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-slate-800" aria-label="Lighting groups">
        {groups.map(c => <button type="button" key={groupKey(c)} aria-label={`Preview ${c.group}`} aria-pressed={selected && groupKey(c) === groupKey(selected)} onClick={() => setLightingPreviewControlId(c.id)} className={`px-3 py-1.5 rounded-lg text-xs border cursor-pointer ${selected && groupKey(c) === groupKey(selected) ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>{c.group}</button>)}
      </div>}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        <div className="pt-2 pb-1 px-2 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <span>{selected?.group ?? 'Lighting'} Effects</span><span className="text-emerald-400/80 normal-case">Live Preview + Key Readout</span>
        </div>
        <LightingEffectGrid effects={options} activeMode={preview.mode} onSelect={mode => modeControl && update(modeControl.id, [mode])}/>
        {!modeControl && <p className="px-2 text-xs text-slate-400">This lighting group does not declare an effect selector.</p>}
        {modeControl && preview.mode !== undefined && !options.some(o => o.id === preview.mode) && <p className="px-2 text-xs text-amber-400">Firmware mode {preview.mode} is not listed in this definition.</p>}
      </div>
    </section>
    <section className="col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col min-h-0">
      <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-100 border-b border-slate-800 pb-2.5 shrink-0"><Sliders className="w-4 h-4 text-emerald-400"/>{selected?.group ?? 'Global'} Parameters</h2>
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {peers.filter(c => c.id !== modeControl?.id).map(control => {
            const current = values[control.id];
            const value = (current ?? defaultViaLightingValue(control))[0];
            const low = Number(control.options?.[0] ?? 0), high = Number(control.options?.[1] ?? 255);
            const choices = dropdownOptions(control.options);
            const toggle = control.options?.length === 2 && control.options.every(v => typeof v === 'number') ? control.options as number[] : [0, 1];
            const color = hsToHex(current ?? defaultViaLightingValue(control));
            return <div key={control.id} className="space-y-2">
            <label htmlFor={control.id} className="text-xs text-slate-300 font-medium flex justify-between gap-2">
              {control.label}{control.type === 'range' && <span className="font-mono text-emerald-400">{value} / {high}{/brightness/i.test(control.label) ? ` (${Math.round(value / Math.max(1, high) * 100)}%)` : ''}</span>}
            </label>
            {diagnostics.connected && !current && <p className="text-xs text-amber-400">Could not read this setting from the firmware.</p>}
            {control.type === 'range' && <input id={control.id} type="range" min={low} max={high} step={1} value={Math.max(low, value)} onChange={e => update(control.id, [Number(e.target.value)])} className="w-full accent-emerald-500 cursor-pointer"/>}
            {control.type === 'dropdown' && <select id={control.id} value={current ? value : ''} onChange={e => update(control.id, [Number(e.target.value)])} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200">
              {!current && <option value="" disabled>Select a value</option>}{current && !choices.some(o => o.value === value) && <option value={value}>Firmware value {value}</option>}{choices.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>}
            {control.type === 'toggle' && <input id={control.id} type="checkbox" checked={value === toggle[1]} onChange={e => update(control.id, [toggle[e.target.checked ? 1 : 0]])} className="accent-emerald-500"/>}
            {control.type === 'color' && <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between"><span className="text-[11px] font-mono text-slate-400">{color.toUpperCase()}</span><input id={control.id} type="color" value={color} onChange={e => update(control.id, hexToHs(e.target.value))} className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"/></div>
              <div className="flex flex-wrap gap-1.5">{LIGHTING_SWATCHES.map(c => <button key={c} type="button" aria-label={`Set ${control.label} to ${c}`} onClick={() => update(control.id, hexToHs(c))} style={{ backgroundColor: c }} className="w-5 h-5 rounded-full border border-white/25 cursor-pointer hover:scale-110 transition"/>)}</div>
            </div>}
          </div>;
        })}
      </div>
      <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 leading-relaxed space-y-1 shrink-0">
        <p>{diagnostics.connected ? 'Changes apply to the keyboard and are saved automatically.' : 'Offline: changes are saved in the current profile.'}</p>
        <p>{preview.effect ? 'Preview approximates the effect using your keyboard layout.' : 'This effect has no standard preview. Its keyboard controls remain available.'}</p>
        {selected && lightingFamily(selected) === 'rgblight' && <p>Underglow is shown across the diagram; physical LED placement may differ.</p>}
      </div>
    </section>
  </div>;
};
