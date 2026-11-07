import React, { useRef } from "react";
import {
  Keyboard,
  Sparkles,
  Terminal,
  Activity,
  Settings,
  Usb,
  Unplug,
  Undo2,
  Redo2,
  Save,
  Download,
  FileUp,
} from "lucide-react";
import { StudioTab, useKeyboardStore } from "../store/useKeyboardStore";

const TABS: {
  id: StudioTab;
  label: string;
  title: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "keymap",
    label: "Keymap",
    title: "Keymap & Layers",
    icon: <Keyboard className="w-3.5 h-3.5 shrink-0" />,
  },
  {
    id: "lighting",
    label: "Backlighting",
    title: "Backlighting Studio",
    icon: <Sparkles className="w-3.5 h-3.5 shrink-0" />,
  },
  {
    id: "macros",
    label: "Macros",
    title: "Macros (M0–M15)",
    icon: <Terminal className="w-3.5 h-3.5 shrink-0" />,
  },
  {
    id: "tester",
    label: "Key Tester",
    title: "Live Switch & Matrix Tester",
    icon: <Activity className="w-3.5 h-3.5 shrink-0" />,
  },
  {
    id: "settings",
    label: "Settings",
    title: "Hardware, Definitions & Profiles",
    icon: <Settings className="w-3.5 h-3.5 shrink-0" />,
  },
];

export const TopBar: React.FC = () => {
  const {
    activeDefinition,
    definitions,
    detectedDevices,
    diagnostics,
    isBusy,
    activeTab,
    setActiveTab,
    connectKeyboard,
    disconnectKeyboard,
    selectDeviceOrDefinition,
    importViaDefinition,
    undoStack,
    redoStack,
    undo,
    redo,
    savedProfiles,
    activeProfileIndex,
    switchSavedProfile,
    saveCurrentToProfileSlot,
    profile,
  } = useKeyboardStore();

  const viaInputRef = useRef<HTMLInputElement>(null);

  const handleExportCurrentProfile = () => {
    const json = JSON.stringify(profile, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}.${activeDefinition.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === "string") {
        void importViaDefinition(content);
      }
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  const handleSelectorChange = (val: string) => {
    if (val === "__import_via__") {
      viaInputRef.current?.click();
      return;
    }
    if (val.startsWith("usb:")) {
      const [, vidStr, pidStr, defId] = val.split(":");
      void selectDeviceOrDefinition({
        vendorId: parseInt(vidStr, 10),
        productId: parseInt(pidStr, 10),
        definitionId: defId || undefined,
      });
      return;
    }
    if (val.startsWith("def:")) {
      const defId = val.slice(4);
      void selectDeviceOrDefinition({ definitionId: defId });
    }
  };

  const vidHex = activeDefinition.vendorId
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  const pidHex = activeDefinition.productId
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");

  return (
    <header className="h-13 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 flex items-center justify-between gap-2.5 select-none shrink-0 whitespace-nowrap">
      {/* Brand, Keyboard Definition Switcher & Connection Badge */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex items-center gap-2"
          title={`${activeDefinition.name} (VID 0x${vidHex} : PID 0x${pidHex})`}
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs shadow-inner shrink-0">
            Q
          </div>
          <div className="hidden xl:block leading-tight">
            <div className="text-xs font-semibold tracking-tight text-slate-100 whitespace-nowrap">
              QMK Keyboard Studio
            </div>
            <div className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
              {vidHex}:{pidHex}
            </div>
          </div>
        </div>

        {/* Keyboard Definition / Device Selector */}
        <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-md border border-slate-800">
          <input
            ref={viaInputRef}
            type="file"
            accept=".json"
            onChange={handleViaFileChange}
            className="hidden"
          />
          <select
            aria-label="Keyboard Definition"
            value={`def:${activeDefinition.id}`}
            onChange={(e) => handleSelectorChange(e.target.value)}
            className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none max-w-[148px] truncate cursor-pointer"
            title={`Active Keyboard Definition: ${activeDefinition.name} (${activeDefinition.matrix.rows}×${activeDefinition.matrix.cols} matrix)`}
          >
            {detectedDevices.length > 0 && (
              <optgroup
                label="Connected USB Keyboards"
                className="bg-slate-900 text-emerald-300"
              >
                {detectedDevices.map((d) => (
                  <option
                    key={`usb-${d.vendorId}-${d.productId}`}
                    value={`usb:${d.vendorId}:${d.productId}:${
                      d.matchedDefinitionId || "generic-qmk-104"
                    }`}
                    className="bg-slate-900 text-slate-100"
                  >
                    ⚡ {d.productName} (
                    {d.vendorId.toString(16).toUpperCase().padStart(4, "0")}:
                    {d.productId.toString(16).toUpperCase().padStart(4, "0")})
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup
              label="Keyboard Definitions"
              className="bg-slate-900 text-slate-400"
            >
              {definitions.map((def) => (
                <option
                  key={def.id}
                  value={`def:${def.id}`}
                  className="bg-slate-900 text-slate-100"
                >
                  {def.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Add Keyboard" className="bg-slate-900 text-slate-400">
              <option
                value="__import_via__"
                className="bg-slate-900 text-emerald-300 font-semibold"
              >
                + Import VIA JSON...
              </option>
            </optgroup>
          </select>
          <button
            type="button"
            onClick={() => viaInputRef.current?.click()}
            title="Import VIA v2/v3 or QMK Studio Keyboard Definition (.json)"
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition cursor-pointer shrink-0"
          >
            <FileUp className="w-3.5 h-3.5" />
          </button>
        </div>

        {diagnostics.connected ? (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-emerald-400/90 font-mono text-[11px]">
                v{diagnostics.protocol_version}
              </span>
            </span>
            <button
              type="button"
              onClick={() => void disconnectKeyboard()}
              title="Switch to Offline Editing Mode"
              className="px-2 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Unplug className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden 2xl:inline">Offline</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="hidden 2xl:inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span>Offline</span>
            </span>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void connectKeyboard()}
              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 transition flex items-center gap-1.5 cursor-pointer shadow-sm whitespace-nowrap"
            >
              <Usb className="w-3.5 h-3.5 shrink-0" />
              <span>{isBusy ? "Connecting..." : "Connect"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800 shrink-0">
        {TABS.map((t) => {
          const hasLighting = Boolean(activeDefinition.capabilities.lighting);
          if (t.id === "lighting" && !hasLighting) {
            return null;
          }
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              title={t.title}
              onClick={() => setActiveTab(t.id)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                active
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Profile Selector & Undo/Redo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 bg-slate-950/70 px-2 py-1 rounded-md border border-slate-800">
          <select
            aria-label="Active Profile"
            value={activeProfileIndex}
            onChange={(e) => void switchSavedProfile(Number(e.target.value))}
            className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none pr-1 max-w-[125px] truncate cursor-pointer"
          >
            {savedProfiles.map((p, idx) => (
              <option
                key={idx}
                value={idx}
                className="bg-slate-900 text-slate-100"
              >
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => saveCurrentToProfileSlot()}
            title="Save changes to current profile slot"
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition cursor-pointer shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleExportCurrentProfile}
            title={`Export profile to .${activeDefinition.id}.json`}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={undoStack.length === 0}
            onClick={() => void undo()}
            title={`Undo (${undoStack.length})`}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 border border-slate-700 transition cursor-pointer shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={redoStack.length === 0}
            onClick={() => void redo()}
            title={`Redo (${redoStack.length})`}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 border border-slate-700 transition cursor-pointer shrink-0"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
