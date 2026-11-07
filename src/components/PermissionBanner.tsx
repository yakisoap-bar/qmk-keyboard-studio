import React, { useState } from "react";
import { ShieldAlert, Check, Copy, Wrench } from "lucide-react";
import { useKeyboardStore } from "../store/useKeyboardStore";

export const PermissionBanner: React.FC = () => {
  const { diagnostics, activeDefinition, isBusy, installLinuxUdevRule } =
    useKeyboardStore();
  const [copied, setCopied] = useState(false);

  if (!diagnostics.permission_denied) return null;

  const vidHex = (diagnostics.vendor_id || activeDefinition.vendorId || 0x342d)
    .toString(16)
    .padStart(4, "0");
  const pidHex = (diagnostics.product_id || activeDefinition.productId || 0xe537)
    .toString(16)
    .padStart(4, "0");

  const manualCmd = `printf 'KERNEL=="hidraw*", ATTRS{idVendor}=="${vidHex}", ATTRS{idProduct}=="${pidHex}", GROUP="plugdev", MODE="0666", TAG+="uaccess"\\nSUBSYSTEM=="usb", ATTR{idVendor}=="${vidHex}", ATTR{idProduct}=="${pidHex}", GROUP="plugdev", MODE="0666", TAG+="uaccess"\\n' | sudo tee /etc/udev/rules.d/69-qmk-via-studio.rules && sudo udevadm control --reload-rules && sudo udevadm trigger && sudo chmod 0666 /dev/hidraw*`;

  const handleCopy = () => {
    void navigator.clipboard.writeText(manualCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-4 text-xs text-amber-200 shrink-0">
      <div className="flex items-center gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
        <div>
          <span className="font-semibold">Linux HID Permission Required:</span>{" "}
          Your {diagnostics.product_name || activeDefinition.name} ({vidHex}:
          {pidHex}) was detected at{" "}
          <code className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 font-mono">
            {diagnostics.hidraw_path || "/dev/hidraw*"}
          </code>
          , but non-root access is blocked. Click{" "}
          <strong>Fix Permissions</strong> to install the{" "}
          <code className="font-mono">udev</code> rule via PolicyKit (
          <code className="font-mono">pkexec</code>).
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleCopy}
          className="px-2.5 py-1 rounded bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? "Copied CLI Command" : "Copy sudo Command"}
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void installLinuxUdevRule()}
          className="px-3 py-1 rounded bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
        >
          <Wrench className="w-3.5 h-3.5" />
          Fix Permissions (pkexec)
        </button>
      </div>
    </div>
  );
};
