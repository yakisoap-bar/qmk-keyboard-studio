import React, { useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  Clock,
  FolderOpen,
  Download,
  Plus,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Cpu,
  FileUp,
} from "lucide-react";
import { useKeyboardStore } from "../../store/useKeyboardStore";

export const SettingsView: React.FC = () => {
  const {
    activeDefinition,
    definitions,
    diagnostics,
    profile,
    savedProfiles,
    activeProfileIndex,
    setCustomControlValue,
    selectDeviceOrDefinition,
    importViaDefinition,
    removeDefinition,
    switchSavedProfile,
    saveCurrentToProfileSlot,
    createNewProfileSlot,
    deleteProfileSlot,
    importProfileJson,
    factoryResetKeyboard,
  } = useKeyboardStore();

  const [newProfileName, setNewProfileName] = useState("");
  const [renameText, setRenameText] = useState(profile.name);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defInputRef = useRef<HTMLInputElement>(null);
  const resetDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setRenameText(profile.name);
  }, [profile.name]);

  // Fallback for closedby="any" on <dialog> per modern-web-guidance
  useEffect(() => {
    const dialog = resetDialogRef.current;
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

  const handleImportProfileFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === "string") {
        void importProfileJson(content);
      }
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  const handleImportDefFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleExportProfile = () => {
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

  const vidHex = (diagnostics.vendor_id || activeDefinition.vendorId)
    .toString(16)
    .padStart(4, "0");
  const pidHex = (diagnostics.product_id || activeDefinition.productId)
    .toString(16)
    .padStart(4, "0");
  const customControls = activeDefinition.capabilities.customControls || [];

  const resolveControlValue = (ctrlId: string, defaultValue: number): number => {
    if (profile.custom_control_values?.[ctrlId] !== undefined) {
      return profile.custom_control_values[ctrlId];
    }
    if (ctrlId === "nkro") return profile.nkro_enabled ? 1 : 0;
    if (ctrlId === "sleep_timeout") return profile.lighting.sleep_timeout;
    return defaultValue;
  };

  return (
    <div className="flex-1 grid grid-cols-12 gap-4 px-6 pb-5 min-h-0 overflow-y-auto">
      {/* Left Column: Hardware Controls & Keyboard Definitions Manager */}
      <div className="col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4">
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Hardware & Firmware Configuration
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Device:{" "}
              <span className="text-slate-200 font-medium">
                {diagnostics.product_name}
              </span>{" "}
              • USB ID{" "}
              <code className="font-mono text-emerald-400">
                {vidHex}:{pidHex}
              </code>{" "}
              • Matrix{" "}
              <code className="font-mono text-emerald-400">
                {activeDefinition.matrix.rows}×{activeDefinition.matrix.cols}
              </code>{" "}
              • Protocol{" "}
              <code className="font-mono text-emerald-400">
                v{profile.protocol_version}
              </code>
            </p>
          </div>

          {/* Declarative Custom Hardware Controls */}
          {customControls.length > 0 ? (
            <div className="space-y-2.5">
              {customControls.map((ctrl) => {
                const currentVal = resolveControlValue(
                  ctrl.id,
                  ctrl.defaultValue
                );
                return (
                  <div
                    key={ctrl.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        {ctrl.kind === "select" ? (
                          <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        {ctrl.title}
                      </div>
                      {ctrl.description && (
                        <div className="text-[11px] text-slate-400">
                          {ctrl.description}
                        </div>
                      )}
                    </div>

                    {ctrl.kind === "select" && ctrl.options ? (
                      <select
                        value={currentVal}
                        onChange={(e) =>
                          void setCustomControlValue(
                            ctrl.id,
                            Number(e.target.value)
                          )
                        }
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 cursor-pointer shrink-0"
                      >
                        {ctrl.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="checkbox"
                        checked={currentVal !== 0}
                        onChange={(e) =>
                          void setCustomControlValue(
                            ctrl.id,
                            e.target.checked ? 1 : 0
                          )
                        }
                        className="w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-400">
              Standard QMK/VIA device active ({activeDefinition.name}). Custom
              vendor hardware controls can be declared in the keyboard
              definition JSON under{" "}
              <code className="font-mono text-emerald-400">
                capabilities.customControls
              </code>
              .
            </div>
          )}

          {/* Keyboard Definitions Registry */}
          <div className="pt-2 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Registered Keyboard Definitions ({definitions.length})
              </div>
              <div>
                <input
                  ref={defInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportDefFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => defInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <FileUp className="w-3.5 h-3.5 text-emerald-400" />
                  Import VIA JSON
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {definitions.map((def) => {
                const isSelected = def.id === activeDefinition.id;
                const dVid = def.vendorId
                  .toString(16)
                  .toUpperCase()
                  .padStart(4, "0");
                const dPid = def.productId
                  .toString(16)
                  .toUpperCase()
                  .padStart(4, "0");
                return (
                  <div
                    key={def.id}
                    className={`px-3 py-2 rounded-lg border flex items-center justify-between text-xs ${
                      isSelected
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                        : "bg-slate-950/60 border-slate-800 text-slate-300"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        void selectDeviceOrDefinition({ definitionId: def.id })
                      }
                      className="flex-1 text-left font-medium cursor-pointer"
                    >
                      {def.name}
                      <span className="text-[10px] font-mono text-slate-400 ml-2">
                        ({dVid}:{dPid} • {def.layouts.keys.length} keys •{" "}
                        {def.builtin ? "Bundled" : "Imported"})
                      </span>
                    </button>
                    {!def.builtin && (
                      <button
                        type="button"
                        onClick={() => void removeDefinition(def.id)}
                        className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer"
                        title="Remove imported definition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Factory Reset Box */}
        <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Factory Reset Keyboard EEPROM
            </div>
            <div className="text-[11px] text-slate-400">
              Restores all keymap layers, macros, and RGB settings on the
              keyboard to factory defaults.
            </div>
          </div>
          <button
            type="button"
            onClick={() => resetDialogRef.current?.showModal()}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 flex items-center gap-1.5 shrink-0 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Factory Reset
          </button>
        </div>
      </div>

      {/* Right Column: Profile Library & Import/Export */}
      <div className="col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Profile Library & JSON Import / Export
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Profiles are scoped to{" "}
                <span className="text-emerald-400 font-medium">
                  {activeDefinition.name}
                </span>
                .
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportProfileFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                Import JSON
              </button>
              <button
                type="button"
                onClick={handleExportProfile}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Export JSON
              </button>
            </div>
          </div>

          {/* Active Profile Rename */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100"
            />
            <button
              type="button"
              onClick={() => saveCurrentToProfileSlot(renameText)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer"
            >
              Save Current Slot
            </button>
          </div>

          {/* Saved Profile Slots List */}
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {savedProfiles.map((p, idx) => {
              const active = idx === activeProfileIndex;
              return (
                <div
                  key={idx}
                  className={`px-3.5 py-2.5 rounded-lg border flex items-center justify-between text-xs ${
                    active
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                      : "bg-slate-950/60 border-slate-800 text-slate-300"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void switchSavedProfile(idx)}
                    className="flex-1 text-left font-medium cursor-pointer"
                  >
                    {p.name}{" "}
                    <span className="text-[10px] font-mono text-slate-400 ml-2">
                      (RGB Mode #{p.lighting.mode})
                    </span>
                  </button>
                  {savedProfiles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => deleteProfileSlot(idx)}
                      className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer"
                      title="Delete profile slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Create New Profile Slot */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <input
            type="text"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            placeholder="New profile name..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100"
          />
          <button
            type="button"
            onClick={() => {
              createNewProfileSlot(newProfileName);
              setNewProfileName("");
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            Duplicate as New Slot
          </button>
        </div>
      </div>

      {/* Native <dialog> Confirmation for Factory EEPROM Reset */}
      <dialog
        ref={resetDialogRef}
        {...({
          closedby: "any",
        } as React.DialogHTMLAttributes<HTMLDialogElement>)}
        aria-labelledby="factory-reset-dialog-title"
        className="m-auto rounded-xl bg-slate-900 border border-rose-500/40 text-slate-100 p-5 shadow-2xl w-96 backdrop:bg-black/65 backdrop:backdrop-blur-xs"
      >
        <h2
          id="factory-reset-dialog-title"
          className="text-sm font-semibold text-rose-300 flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          Confirm Factory EEPROM Reset
        </h2>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          This will send command{" "}
          <code className="font-mono text-rose-300">0x0A (EEPROM_RESET)</code>{" "}
          to your {diagnostics.product_name}, erasing custom keybinds and
          per-key lighting on the keyboard.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            autoFocus
            onClick={() => resetDialogRef.current?.close()}
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              resetDialogRef.current?.close();
              void factoryResetKeyboard();
            }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 hover:bg-rose-400 text-white cursor-pointer"
          >
            Reset Keyboard EEPROM
          </button>
        </div>
      </dialog>
    </div>
  );
};
