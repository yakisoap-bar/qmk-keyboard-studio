# QMK Keyboard Studio

Standalone cross-platform (**Linux & Windows**) desktop application and CLI for customizing **QMK / VIA** mechanical keyboards over Raw HID (`Usage Page 0xFF60`, `Usage 0x0061`), with a complete declarative definition for the **Weikav / LEKU MAX102** (`USB VID 0x342D`, `PID 0xE537`), a **Generic Full-Size 104-Key QMK Fallback**, and support for importing any **VIA v2/v3 JSON** definition.

See [**`docs/KEYBOARD_SCHEMA_GUIDE.md`**](docs/KEYBOARD_SCHEMA_GUIDE.md) for full documentation on authoring keyboard definitions and declarative custom capabilities (per-key RGB templates, multi-LED switch zones, custom hardware controls, and custom keycodes).

## Features

- **Modular Multi-Keyboard QMK / VIA Engine**:
  - Auto-discovers all USB HID devices exposing `0xFF60:0x0061`.
  - Import any standard **VIA v2/v3 JSON** definition (including KLE 2D arrays and physical layout options like Split Backspace, ISO Enter, or Split Spacebar) or use the **Generic Full-Size 104-Key QMK Fallback**.
  - Profiles are automatically scoped per keyboard (`VID:PID` / definition ID).
- **Keymap & Layer Studio**: Customize all layers with instant search, drag-and-drop key assignment, physical key capture (`Press Key to Bind`), **Mod+Key shortcut builder**, **Mod-Tap (`MT`) / Layer-Tap (`LT`) builder**, **board-specific custom keys** (`customKeycodes`), VIA **layout options**, and raw 16-bit QMK hex codes.
- **Backlighting Studio**:
  - Real-time 30fps interactive simulation of built-in QMK RGB Matrix effects (including live keystroke reactive effects like *Solid Reactive Simple*, *Solid Reactive Cross*, and *Splash*).
  - Declarative **Custom Per-Key RGB Studio** with marquee drag selection, quick-selection groups, multi-LED switch zone splitting (e.g. 5-LED Spacebar on MAX102), and two-color gradient fills.
- **Hardware-Synced Macro Editor (`M0–M15`)**: Record live keystrokes + delays, edit steps, and read/write the QMK macro buffer without zero-delay corruption.
- **Live Switch Matrix Tester**: Combines OS key events and raw hardware matrix polling (`0x02 / 0x03`) with automatic layout coordinate mapping.
- **Declarative Custom Hardware Controls & Dynamic Linux `udev` Helper**: Renders board-defined controls (such as NKRO and Wireless Sleep Timeout) and generates `udev` rules for any connected QMK keyboard.

## Quick Start

### 1. Linux `udev` Rule (Non-Root HID Access)
Click **Fix Permissions (pkexec)** inside the app banner, or copy the rule for your keyboard:
```bash
sudo cp udev/99-weikav-max102.rules /etc/udev/rules.d/69-weikav-max102.rules
sudo udevadm control --reload-rules && sudo udevadm trigger
```

### 2. Development & Desktop App Build
```bash
# Run in development mode
npm run tauri dev

# Build native release bundles (.deb / .AppImage on Linux, .msi / .exe on Windows)
npm run tauri build
```

### 3. Headless CLI Usage
```bash
# List all connected QMK/VIA devices and installed definitions
./src-tauri/target/release/max102-tool list-devices

# Print live device & lighting status (optionally targeting --device <vid:pid>)
./src-tauri/target/release/max102-tool status

# Import a VIA JSON definition into the shared definition registry
./src-tauri/target/release/max102-tool import-def my-keyboard-via.json

# Export or apply a JSON profile
./src-tauri/target/release/max102-tool profile export my-profile.json
./src-tauri/target/release/max102-tool profile apply my-profile.json

# Change RGB mode, brightness, speed, or per-key color from scripts
./src-tauri/target/release/max102-tool rgb --mode 12 --brightness 5 --speed 3
./src-tauri/target/release/max102-tool rgb --mode custom --all-keys-color "#00ff88"
```
