# QMK Keyboard Studio

Cross-platform Linux and Windows desktop app and CLI for QMK/VIA keyboards over Raw HID (`0xFF60:0x0061`). The app bundles the original **MAX102 VIA JSON** (`342D:E537`) and accepts **VIA v2/v3 keyboard definitions** for other keyboards.

See [the VIA definition guide](docs/KEYBOARD_SCHEMA_GUIDE.md) for supported layouts, lighting menus, and import behavior.

## Features

- Discovers connected QMK/VIA USB keyboards and matches their USB IDs to a VIA definition. Unknown keyboards require a matching VIA JSON; the app does not assume a generic layout.
- Keymap editor with drag-and-drop assignment, physical-key capture, modifier shortcuts, Mod-Tap, Layer-Tap, VIA custom keycodes, and physical layout options.
- Lighting studio generated from VIA lighting declarations, with standard QMK effect previews, brightness, speed, color, and independently selectable lighting groups.
- Live lighting color bars in Keymap and Key Tester, retaining selection and switch-test indicators.
- Macro editor with recording, delays, and hardware macro-buffer synchronization.
- Keyboard tester with OS events and raw hardware matrix polling. Event labels use the selected layer's mapped keycodes.
- Per-keyboard profiles, import/export, undo/redo, and a Linux `udev` helper.

Keyboard definitions use the standard VIA `layouts.keymap` format. The former Studio JSON format, custom command templates, bespoke per-key painting, and vendor-specific hardware-control definitions are no longer supported. Profile files remain separate from keyboard definitions.

## Development

```bash
npm install
npm run dev
npm run tauri dev
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

Build native release bundles with `npm run tauri build`.

## Linux USB access

Use **Fix Permissions (pkexec)** in the app, or install the bundled MAX102 rule:

```bash
sudo cp udev/99-weikav-max102.rules /etc/udev/rules.d/69-weikav-max102.rules
sudo udevadm control --reload-rules && sudo udevadm trigger
```

## CLI

```bash
./src-tauri/target/release/max102-tool list-devices
./src-tauri/target/release/max102-tool status
./src-tauri/target/release/max102-tool import-def my-keyboard-via.json
./src-tauri/target/release/max102-tool profile export my-profile.json
./src-tauri/target/release/max102-tool profile apply my-profile.json
./src-tauri/target/release/max102-tool rgb --mode 13 --brightness 5 --speed 3
```

Use `--device <vid:pid>` and `--definition <definition-id>` to select a keyboard explicitly. RGB mode IDs must be declared in its VIA lighting menu. The CLI's RGB options target standard QMK lighting controls; custom menu parameters are available in the app.
