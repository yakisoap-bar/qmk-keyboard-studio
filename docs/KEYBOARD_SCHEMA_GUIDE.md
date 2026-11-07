# VIA keyboard definitions

The app accepts VIA v2/v3 keyboard-definition JSON. Its only bundled definition is
[`max102.json`](../src/data/definitions/max102.json), the original MAX102 VIA file
for USB `342D:E537`, with a `6×19` matrix and 101 physical key entries.

## Import a keyboard

Choose **Import VIA JSON** in the toolbar or Settings. A definition needs a name,
valid matrix dimensions, and a `layouts.keymap` KLE array whose key coordinates
fit inside that matrix. USB IDs accept hexadecimal strings or numbers.

```json
{
  "name": "Example Keyboard",
  "vendorId": "0xFEED",
  "productId": "0x6060",
  "matrix": { "rows": 1, "cols": 2 },
  "menus": ["qmk_rgb_matrix"],
  "layouts": { "keymap": [["0,0", "0,1"]] }
}
```

VIA `layouts.labels` and KLE option tags select physical layout variants. Standard
`customKeycodes` supply the labels for board-specific keycodes. The app derives
its display geometry from KLE; users do not supply normalized `layouts.keys`,
board dimensions, or custom capability blocks.

A VIA definition describes the keyboard layout and supported controls. Key
assignments are read from the connected keyboard. Coordinate-only definitions
do not provide a default keymap; offline profiles leave those mappings empty.

Connected keyboards must match the selected definition's USB IDs. Unknown
keyboards require their own VIA definition before hardware state is read or
written. There is no generic keyboard fallback.

## Lighting

The Backlighting tab uses VIA's `menus` declarations. Built-in menu names are:

- `qmk_rgb_matrix`: RGB Matrix backlighting.
- `qmk_rgblight`: RGBLight / underglow.
- `qmk_backlight`: monochrome brightness and breathing.
- `qmk_backlight_rgblight`: separate backlight and underglow groups.

VIA v2 `lighting` strings and `lighting.extends` support the same menu names.
V2 `underglowEffects` entries use their array position as the mode ID; their
second tuple value is a color count.

Custom top-level menus whose label contains `light` or `rgb` support byte-valued
`range`, `dropdown`, and `toggle` controls, plus hue/saturation `color` controls.
The `content` tuple specifies the value key, channel, value ID, and any additional
addressing bytes. Dropdown strings use zero-based IDs; `[label, value]` pairs
preserve explicit firmware IDs.

```json
{
  "label": "Effect",
  "type": "dropdown",
  "content": ["id_my_effect", 0, 12],
  "options": [["Off", 0], ["Breathing", 73]]
}
```

The firmware must implement these channels and values. The app reads settings
on connection and uses VIA custom-value get/set/save commands (`0x08`, `0x07`,
`0x09`) to edit them. Rejected commands report an error. Values are saved in
profiles; offline edits update the local profile.

`showIf` supports numeric control references, comparisons, `&&`, `||`, `!`, and
parentheses, including conditions around groups. Expressions are parsed without
executing JavaScript. Unsupported expressions stay hidden. Custom 16-bit numeric
controls, relational constraints, and legacy lighting protocols without VIA
custom-menu channels are not supported by this UI.

## Effect previews

The effect grid lists exactly the modes supplied by the definition. Recognized
standard QMK RGB Matrix, RGBLight, and monochrome backlight effects animate using
physical KLE key positions. Newer named effects include Flower Blooming, the
Starlight variants, and Riverflow. LED Matrix effect names are also recognized in
custom menus using `id_qmk_led_matrix_*` value keys.

Effect names and lighting families determine the simulation, so remapped custom
numeric IDs do not select unrelated animations. Unknown custom effects remain
selectable and display **Preview unavailable**. Only the firmware creates the
actual animation; adding a JSON mode does not implement one.

Physical keypresses and clicks in the Backlighting tab drive reactive previews.
Single-hit effects follow the newest press; multi-hit effects retain recent
presses. The typing heatmap responds to repeated hits. Preview colors appear as
animated bars in the Keymap and Key Tester tabs, with their existing interaction
indicators preserved.

These are approximations, not firmware emulation. VIA JSON does not supply LED
wiring order, LED flags, firmware random seeds, or exact effect timing. Underglow
is illustrated across the key diagram and may differ from physical LED placement.

## Persistence and supported formats

Imported definitions are saved as their original VIA JSON. Normalized geometry
and menu controls are internal app data, not another supported import format.
An imported VIA file with the same name and USB IDs replaces that definition in
the registry without adding a duplicate entry. Removing an imported MAX102
override restores the bundled VIA definition.

The previous Studio `capabilities` format, normalized layout imports, custom
command templates, per-key painting, multi-LED editing, and vendor-control
blocks have been removed. Older custom or normalized definition files are not
loaded; re-import the original VIA source. Existing files are not deleted.
Profiles still have their own import/export format for keymaps, macros, physical
layout choices, and VIA lighting values. Former vendor-specific lighting fields
are no longer applied.

References: [VIA definitions](https://caniusevia.com/docs/specification/),
[VIA custom UI](https://caniusevia.com/docs/custom_ui/),
[QMK RGB Matrix](https://docs.qmk.fm/features/rgb_matrix), and
[QMK RGBLight](https://docs.qmk.fm/features/rgblight).
