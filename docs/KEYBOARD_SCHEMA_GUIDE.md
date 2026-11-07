**Keyboard Definition Schema & Authoring Guide**  
This application uses a **declarative, data-driven Keyboard Definition schema** to support any QMK/VIA mechanical keyboard over Raw HID (`Usage Page 0xFF60`, `Usage 0x0061`).  
No keyboard has special-case logic hardcoded in Rust or TypeScript. Every hardware layout, custom keycode, lighting protocol, per-key RGB command template, multi-LED switch zone, and custom hardware control is defined purely in JSON.  
  
---  
**1. Where Keyboard Definitions Live**  
- **Bundled Definitions**: Located in [`src/data/definitions/`:](../src/data/definitions/ "../src/data/definitions/")  
  - [`weikav_max102.json`: Complete definition for the Weikav / LEKU MAX102 (`0x342D:0xE537`) including 25 built-in effects, Mode 45 per-key RGB, 5-LED spacebar zone, NKRO toggle, and sleep timeout control.](../src/data/definitions/weikav_max102.json "../src/data/definitions/weikav_max102.json")  
  - [`generic_104.json`: Generic Full-Size 104-Key QMK Fallback layout (`6×21` matrix, standard VIA RGB Matrix).](../src/data/definitions/generic_104.json "../src/data/definitions/generic_104.json")  
- **User-Imported Definitions**:  
  - Imported via the TopBar (**Device Switcher → Import VIA JSON...**), the **Hardware & Profiles** tab, or the CLI (`--import-def <path.json>`).  
  - Persisted automatically to `<app_data_dir>/definitions/<id>.json` (`~/.local/share/max102-tool/definitions/` on Linux, `%APPDATA%` on Windows) so both the desktop GUI and headless CLI share all imported keyboards.  
  
---  
**2. Two Ways to Author a Keyboard Definition**  
**Option A: Standard VIA v2 / v3 JSON (Zero-Config Import)**  
Any standard VIA keyboard definition JSON works out of the box:  
```  
{  
   "name": "Example QMK 75%",  
   "vendorId": "0x1234",  
   "productId": "0x5678",  
   "matrix": { "rows": 6, "cols": 15 },  
   "lighting": "qmk_rgb_matrix",  
   "layouts": {  
     "labels": [  
       "Split Backspace",  
       ["Bottom Row", "ANSI", "Tsangan"]  
     ],  
     "keymap": [  
       [  
         { "c": "#777777" },  
         "0,0\n\n\n\n\n\n\n\n\nEsc",  
         { "x": 0.25, "c": "#cccccc" },  
         "0,1\n\n\n\n\n\n\n\n\nF1"  
       ]  
     ]  
   }  
 }  
   
```  
***How the Studio Normalizer Parses VIA KLE*** *`layouts.keymap`****:***  
- **Top-left legend (newline index `0`)**: `"row,col"` matrix switch coordinate (required for non-decal keys).  
- **Bottom-right legend (newline index `3`)**: Optional `"optionIdx,choiceIdx"` linking the key to a physical layout option in `layouts.labels` (e.g., `"0,1"` for Split Backspace enabled).  
- **Center / top legends (newline indices `9`, `1`, `8`, etc.)**: Physical keycap label rendered on the board and used to automatically build the `DOM_CODE_TO_DEFAULT_COORD` lookup table for the Key Tester.  
- **KLE Property Objects**: `{ x, y, w, h, x2, y2, w2, h2, r, rx, ry, c, d }` adjust key position, width/height in `1U` units, rotation (`r` degrees around `rx, ry`), keycap color role (`#777777` → `"mod"`, accent hex → `"accent"`, `#cccccc` → `"alpha"`), and decal flag (`d: true`).  
- **Standard VIA Lighting Presets**: Setting `"lighting": "qmk_rgb_matrix"` or `"qmk_rgblight"` automatically populates `capabilities.lighting` with the standard QMK/VIA `channel 0x03` / `channel 0x02` command templates and standard QMK RGB effect catalog.  
  
---  
**Option B: Pre-Normalized Studio JSON (**`layouts.keys`**)**  
Instead of a raw 2D KLE array, you can specify explicit 1U coordinates (`1.0 = 1U`) in `layouts.keys`:  
```  
{  
   "id": "my-custom-qmk-board",  
   "name": "My Custom QMK Board",  
   "vendorId": "0x342D",  
   "productId": "0xE537",  
   "matrix": { "rows": 6, "cols": 19 },  
   "layouts": {  
     "width": 20.5,  
     "height": 6.25,  
     "labels": [],  
     "keys": [  
       {  
         "row": 0,  
         "col": 0,  
         "x": 0.0,  
         "y": 0.0,  
         "w": 1.0,  
         "h": 1.0,  
         "r": 0,  
         "rx": 0,  
         "ry": 0,  
         "d": false,  
         "value": "Esc",  
         "color": "accent"  
       }  
     ]  
   }  
 }  
   
```  
  
---  
**3. Declarative Packet Templates & Placeholders**  
All Raw HID commands send a 32-byte payload (prefixed with Report ID `0x00`) and read a 32-byte response. Command templates are arrays of byte literals (`0..255` or hex strings `"0x00".."0xFF"`) and/or runtime placeholders:  
  
|  |  |  |  
| - | - | - |  
| **Placeholder** |  **Runtime Value Substituted** |  **Used In** |  
| `"$row"` |  Matrix row index (`0..rows-1`) |  `perKeyRgb.get`, `perKeyRgb.set` |  
| `"$col"` |  Matrix column index (`0..cols-1`) |  `perKeyRgb.get`, `perKeyRgb.set` |  
| `"$val"` |  8-bit unsigned value (`0..255`) |  `setBrightness`, `setMode`, `setSpeed`, `customControls.set` |  
| `"$hue"` |  8-bit QMK HSV Hue (`0..255`) |  `setColor`, `perKeyRgb.set` |  
| `"$sat"` |  8-bit QMK HSV Saturation (`0..255`) |  `setColor`, `perKeyRgb.set` |  
| `"$hi"` |  High byte of a 16-bit value |  16-bit custom controls |  
| `"$lo"` |  Low byte of a 16-bit value |  16-bit custom controls |  
  
   
**Template Structures**  
- **Write Template (`CommandTemplate`)**:  
-   
```  
{ "cmd": [7, 3, 1, "$val"] }  
   
```  
- **Single-Byte Read Template (`ReadTemplate`)**:  
-   
```  
{  
   "cmd": [2, 3, 2],  
   "valueIndex": 3,  
   "fallbackCmd": [8, 3, 2],  
   "fallbackValueIndex": 3  
 }  
   
```  
-   
 If the primary command returns `0xFF` (unhandled by firmware) or fails, the engine automatically falls back to `fallbackCmd` and extracts `response[fallbackValueIndex]`.  
- **Dual-Byte Color Read Template (`ColorReadTemplate`)**:  
-   
```  
{  
   "cmd": [2, 3, 4],  
   "hueIndex": 3,  
   "satIndex": 4,  
   "fallbackCmd": [8, 3, 4],  
   "fallbackHueIndex": 3,  
   "fallbackSatIndex": 4  
 }  
   
```  
  
---  
**4. Defining Special Keyboard-Specific Functionalities**  
Both standard VIA JSONs (`layouts.keymap`) and pre-normalized JSONs (`layouts.keys`) can include any combination of the following special capability blocks:  
**4.1 Global RGB Matrix & Real-Time Effect Simulation (**`capabilities.lighting`**)**  
```  
"capabilities": {  
   "lighting": {  
     "brightnessMax": 180,  
     "brightnessStep": 36,  
     "speedMin": 51,  
     "speedMax": 255,  
     "speedStep": 51,  
     "getBrightness": { "cmd": [8, 3, 1], "valueIndex": 3 },  
     "setBrightness": { "cmd": [7, 3, 1, "$val"] },  
     "getMode": {  
       "cmd": [2, 3, 2], "valueIndex": 3,  
       "fallbackCmd": [8, 3, 2], "fallbackValueIndex": 3  
     },  
     "setMode": { "cmd": [7, 3, 2, "$val"] },  
     "getSpeed": { "cmd": [8, 3, 3], "valueIndex": 3 },  
     "setSpeed": { "cmd": [7, 3, 3, "$val"] },  
     "getColor": {  
       "cmd": [2, 3, 4], "hueIndex": 3, "satIndex": 4,  
       "fallbackCmd": [8, 3, 4], "fallbackHueIndex": 3, "fallbackSatIndex": 4  
     },  
     "setColor": { "cmd": [7, 3, 4, "$hue", "$sat"] },  
     "save": { "cmd": [9, 3] },  
     "effects": [  
       { "name": "Alphas Mods", "id": 2, "simulation": "alphas_mods" },  
       { "name": "Cycle All", "id": 12, "simulation": "cycle_all" },  
       { "name": "Solid Reactive Simple", "id": 33, "simulation": "reactive_simple", "reactive": true },  
       { "name": "Solid Reactive Cross", "id": 37, "simulation": "reactive_cross", "reactive": true },  
       { "name": "Splash", "id": 41, "simulation": "splash", "reactive": true }  
     ]  
   }  
 }  
   
```  
Available `simulation` shaders for `effects`:  
- `"solid"`, `"alphas_mods"`, `"gradient_left_right"`, `"breathing"`, `"band_sat"`, `"band_val"`, `"band_pinwheel_val"`, `"band_spiral_val"`  
- `"cycle_all"`, `"cycle_left_right"`, `"cycle_up_down"`, `"rainbow_chevron"`, `"cycle_out_in"`, `"cycle_out_in_dual"`, `"cycle_pinwheel"`, `"cycle_spiral"`, `"dual_beacon"`, `"rainbow_beacon"`, `"rainbow_pinwheels"`  
- `"raindrops"`, `"jellybean_raindrops"`, `"pixel_flow"`, `"digital_rain"`  
- Live keystroke reactive (`"reactive": true`): `"reactive_simple"`, `"reactive_cross"`, `"splash"`  
  
---  
**4.2 Custom Per-Key RGB Addressing (**`capabilities.lighting.perKeyRgb`**)**  
For keyboards that support direct per-key RGB read/write over Raw HID (such as Mode `45` on Weikav boards):  
```  
"perKeyRgb": {  
   "modeId": 45,  
   "interPacketDelayMs": 4,  
   "get": {  
     "cmd": [8, 0, 3, 0, "$row", "$col"],  
     "satIndex": 6,  
     "hueIndex": 7  
   },  
   "set": {  
     "cmd": [7, 0, 3, 0, "$row", "$col", "$sat", "$hue"]  
   },  
   "save": {  
     "cmd": [7, 0, 2, 0]  
   }  
 }  
   
```  
When `perKeyRgb` is present, the Backlighting Studio automatically enables the **Custom Per-Key Backlighting Studio** mode, marquee selection, quick-selection groups, color brush, and gradient generator.  
  
---  
**4.3 Multi-LED Switch Zones (**`layouts.multiLedKeys`**)**  
When a single physical switch has multiple addressable RGB LEDs underneath it (e.g. a 5-LED Spacebar where the switch is at `[5, 6]` and LEDs are at `[5, 4..8]`), declare it in `layouts.multiLedKeys`:  
```  
"multiLedKeys": [  
   {  
     "id": "spacebar-5led",  
     "label": "5-LED Spacebar Split",  
     "badgeText": "5-LED SPACE",  
     "switchRow": 5,  
     "switchCol": 6,  
     "ledCells": [  
       { "row": 5, "col": 4, "label": "LED 1" },  
       { "row": 5, "col": 5, "label": "LED 2" },  
       { "row": 5, "col": 6, "label": "LED 3" },  
       { "row": 5, "col": 7, "label": "LED 4" },  
       { "row": 5, "col": 8, "label": "LED 5" }  
     ]  
   }  
 ]  
   
```  
- **Unified Mode**: Painting the switch at `(switchRow, switchCol)` writes the color to all `ledCells` in the zone.  
- **Split Mode**: Toggling the split switch in the Backlighting Studio subdivides the keycap on the canvas into individually selectable LED segments (`LED 1` … `LED N`).  
- **Reactive Simulation**: Pressing the physical switch `(switchRow, switchCol)` triggers reactive lighting impulses across all `ledCells`.  
  
---  
**4.4 Custom Hardware Controls (**`capabilities.customControls`**)**  
To expose board-specific hardware settings (e.g. **NKRO / Anti-Ghosting**, **Wireless Sleep Timer**, **Polling Rate**, **Debounce Time**, or **Win/Mac Mode**), add entries to `capabilities.customControls`:  
```  
"customControls": [  
   {  
     "id": "nkro",  
     "title": "N-Key Rollover (NKRO / Anti-Ghosting)",  
     "description": "Toggle between 6-Key Rollover (boot mode) and full N-Key Rollover over USB.",  
     "kind": "toggle",  
     "defaultValue": 1,  
     "get": { "cmd": [33, 0], "valueIndex": 3 },  
     "set": { "cmd": [33, 1, "$val"] }  
   },  
   {  
     "id": "sleep_timeout",  
     "title": "Wireless & Matrix Idle Sleep Timer",  
     "description": "Configure how long the keyboard waits while idle before turning off RGB LEDs and entering deep sleep.",  
     "kind": "select",  
     "defaultValue": 5,  
     "options": [  
       { "label": "1 Minute", "value": 1 },  
       { "label": "3 Minutes", "value": 3 },  
       { "label": "5 Minutes", "value": 5 },  
       { "label": "10 Minutes", "value": 10 },  
       { "label": "20 Minutes", "value": 20 },  
       { "label": "30 Minutes", "value": 30 },  
       { "label": "Never Sleep", "value": 0 }  
     ],  
     "set": { "cmd": [7, 0, 1, "$val"] }  
   }  
 ]  
   
```  
The **Hardware & Profiles** tab renders a control card for each item in `customControls`, queries initial hardware state on connect (when `get` is defined), and sends the `set` command template when modified.  
  
---  
**4.5 Custom Keycodes (**`customKeycodes`**)**  
Entries in `customKeycodes` map sequentially to QMK `USER00..USER15` (`0x5F80 + idx` in VIA v11, `0x7E00 + idx` in VIA v12+):  
```  
"customKeycodes": [  
   { "name": "Bluetooth Host 1", "title": "Bluetooth Host 1", "shortName": "BT1" },  
   { "name": "Bluetooth Host 2", "title": "Bluetooth Host 2", "shortName": "BT2" },  
   { "name": "Bluetooth Host 3", "title": "Bluetooth Host 3", "shortName": "BT3" },  
   { "name": "Battery Level", "title": "Show battery level", "shortName": "Batt" }  
 ]  
   
```  
When present, these keycodes appear in the **Board Custom** category of the Keymap Picker and display their `shortName` on the keyboard canvas.  
