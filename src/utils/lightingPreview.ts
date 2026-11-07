import type { KeyboardDefinition, LayoutKey } from './kleParser';
import type { KeyboardProfile } from '../store/useKeyboardStore';
import menus from '../data/viaLightingMenus.json';
import { defaultViaLightingValue, dropdownOptions, lightingControlVisible, type ViaLightingControl } from './viaLighting';
export type LightingFamily = 'matrix' | 'rgblight' | 'backlight' | 'mono_matrix';
export interface PreviewEffect {
    key: string;
    family: LightingFamily;
    variant: number;
    reactive: boolean;
}
const normalize = (name: string) => name.toLowerCase().replace(/^rgb_matrix_|^rgblight_mode_|^led_matrix_/, '').replace(/[^a-z0-9]/g, '');
const matrixKeys = [
    'off', 'solid', 'alphas_mods', 'gradient_up_down', 'gradient_left_right', 'breathing',
    'band_sat', 'band_val', 'band_pinwheel_sat', 'band_pinwheel_val', 'band_spiral_sat', 'band_spiral_val',
    'cycle_all', 'cycle_left_right', 'cycle_up_down', 'rainbow_chevron', 'cycle_out_in', 'cycle_out_in_dual',
    'cycle_pinwheel', 'cycle_spiral', 'dual_beacon', 'rainbow_beacon', 'rainbow_pinwheels', 'raindrops',
    'jellybean_raindrops', 'hue_breathing', 'hue_pendulum', 'hue_wave', 'pixel_rain', 'pixel_flow',
    'pixel_fractal', 'typing_heatmap', 'digital_rain', 'reactive_simple', 'reactive',
    'reactive_wide', 'reactive_multiwide', 'reactive_cross', 'reactive_multicross', 'reactive_nexus',
    'reactive_multinexus', 'splash', 'multisplash', 'solid_splash', 'solid_multisplash',
];
const matrixNames = menus.qmk_rgb_matrix.content[0].content[1].options as string[];
const aliases = new Map<string, string>(matrixNames.map((name, i) => [normalize(name), matrixKeys[i]]));
for (const key of matrixKeys)
    aliases.set(normalize(key), key);
for (const key of ['flower_blooming', 'starlight', 'starlight_smooth', 'starlight_dual_hue', 'starlight_dual_sat', 'riverflow', 'wave_left_right', 'wave_up_down'])
    aliases.set(normalize(key), key);
for (const [name, key] of Object.entries({ none: 'off', staticlight: 'solid', solidcolor: 'solid', bandpinwheelsat: 'band_pinwheel_sat', bandpinwheelval: 'band_pinwheel_val', bandspiralsat: 'band_spiral_sat', bandspiralval: 'band_spiral_val', rainbowmovingchevron: 'rainbow_chevron', band: 'band_val', bandpinwheel: 'band_pinwheel_val', bandspiral: 'band_spiral_val' }))
    aliases.set(name, key);
for (const key of ['simple', '', 'wide', 'multiwide', 'cross', 'multicross', 'nexus', 'multinexus']) {
    aliases.set(`solidreactive${key}`, key ? `reactive_${key}` : 'reactive');
}
/** Resolve by semantic name, never by a custom dropdown's numeric firmware ID. */
export function resolvePreviewEffect(name: string, family: LightingFamily = 'matrix'): PreviewEffect | undefined {
    const n = normalize(name);
    let key: string | undefined, variant = 0;
    if (family === 'backlight')
        key = n === 'off' ? 'solid' : n === 'breathing' ? 'breathing' : undefined;
    else if (family === 'rgblight') {
        if (['alloff', 'off', 'none'].includes(n))
            key = 'off';
        else if (['solidcolor', 'staticlight', 'solid'].includes(n))
            key = 'solid';
        else if (n === 'christmas' || n === 'rgbtest' || n === 'alternating')
            key = n;
        else {
            const match = n.match(/^(breathing|rainbowmood|rainbowswirl|snake|knight|gradient|twinkle)(\d+)$/);
            if (match) {
                const max: Record<string, number> = { breathing: 4, rainbowmood: 3, rainbowswirl: 6, snake: 6, knight: 3, gradient: 10, twinkle: 6 };
                variant = Number(match[2]) - 1;
                if (variant >= 0 && variant < max[match[1]])
                    key = match[1];
            }
            else if (['breathing', 'rainbowmood', 'rainbowswirl', 'snake', 'knight', 'gradient', 'staticgradient', 'twinkle'].includes(n))
                key = n === 'staticgradient' ? 'gradient' : n;
        }
    }
    else
        key = aliases.get(n);
    if (!key)
        return undefined;
    return { key, family, variant, reactive: key.startsWith('reactive') || key.includes('splash') || key === 'typing_heatmap' };
}
export function lightingFamily(control: ViaLightingControl): LightingFamily {
    if (control.id.includes('qmk_led_matrix_'))
        return 'mono_matrix';
    if (control.id.includes('qmk_backlight_'))
        return 'backlight';
    if (control.id.includes('qmk_rgblight_'))
        return 'rgblight';
    return 'matrix';
}
export function viaEffectControls(controls: ViaLightingControl[]): ViaLightingControl[] {
    return controls.filter(c => c.type === 'dropdown' &&
        (c.value === 2 && c.id.startsWith('id_qmk_') || /effect|mode/i.test(c.label)));
}
export function selectPreviewControl(controls: ViaLightingControl[], id: string | null): ViaLightingControl | undefined {
    const effects = viaEffectControls(controls);
    return controls.find(c => c.id === id) ?? effects.find(c => c.id.includes('qmk_rgb_matrix')) ?? effects.find(c => c.id.includes('qmk_rgblight')) ?? effects[0] ?? controls[0];
}
export interface LightingPreview {
    effect?: PreviewEffect;
    label: string;
    mode?: number;
    brightness: number;
    speed: number;
    hue: number;
    sat: number;
    control?: ViaLightingControl;
}
export function getLightingPreview(def: KeyboardDefinition, profile: KeyboardProfile, selectedId: string | null): LightingPreview {
    const controls = def.viaLighting ?? [];
    if (controls.length) {
        const control = selectPreviewControl(controls.filter(c => lightingControlVisible(c.showIf, profile.via_lighting_values ?? {})), selectedId);
        const values = profile.via_lighting_values ?? {};
        const peers = controls.filter(c => control && c.group === control.group && c.channel === control.channel &&
            JSON.stringify(c.arguments ?? []) === JSON.stringify(control.arguments ?? []));
        const parameter = (type: string, pattern: RegExp) => peers.find(c => c.type === type && pattern.test(c.label));
        const brightness = parameter('range', /brightness|lightness/i);
        const speed = parameter('range', /speed/i);
        const color = peers.find(c => c.type === 'color');
        const toggle = peers.find(c => c.type === 'toggle' && /enable|power/i.test(c.label));
        const mode = control?.type === 'dropdown' ? values[control.id]?.[0] : undefined;
        const label = dropdownOptions(control?.options).find(o => o.value === mode)?.label ?? (mode === undefined ? 'Choose an effect' : `Firmware mode ${mode}`);
        const family = control ? lightingFamily(control) : 'matrix';
        const max = Number(brightness?.options?.[1] ?? 255);
        const visible = !control || lightingControlVisible(control.showIf, values);
        const enabled = !toggle || !values[toggle.id] || values[toggle.id][0] === Number(toggle.options?.[1] ?? 1);
        return { control, mode, label, effect: control && visible ? resolvePreviewEffect(label, family) : undefined,
            brightness: enabled ? (brightness ? (values[brightness.id] ?? defaultViaLightingValue(brightness))[0] : 180) / Math.max(1, max) : 0,
            speed: speed ? (values[speed.id] ?? defaultViaLightingValue(speed))[0] / Math.max(1, Number(speed.options?.[1] ?? 255)) * 255 : 128,
            hue: (family === 'backlight' || family === 'mono_matrix') ? 0 : color ? values[color.id]?.[0] ?? 120 : 120,
            sat: (family === 'backlight' || family === 'mono_matrix') ? 0 : color ? values[color.id]?.[1] ?? 255 : 255 };
    }
    return {label: "No lighting controls", brightness: 0, speed: 0, hue: 0, sat: 0};
}
export interface PreviewPoint {
    x: number;
    y: number;
    index: number;
    modifier: boolean;
}
export interface PreviewImpulse {
    row: number;
    col: number;
    time: number;
    hits?: number;
}
export function createPreviewGeometry(keys: LayoutKey[]): Map<string, PreviewPoint> {
    const points = keys.map(k => {
        const angle = k.r * Math.PI / 180;
        const x = k.x + k.w/2, y = k.y + k.h/2;
        return {id: `${k.row},${k.col}`, x: k.rx + (x-k.rx)*Math.cos(angle) - (y-k.ry)*Math.sin(angle),
            y: k.ry + (x-k.rx)*Math.sin(angle) + (y-k.ry)*Math.cos(angle), modifier: k.color === 'mod'};
    });
    const minX = Math.min(...points.map(p=>p.x)), minY = Math.min(...points.map(p=>p.y));
    const width = Math.max(1, Math.max(...points.map(p=>p.x))-minX), height = Math.max(1, Math.max(...points.map(p=>p.y))-minY);
    return new Map(points.map((p,index)=>[p.id,{x:(p.x-minX)/width,y:(p.y-minY)/height,index,modifier:p.modifier}]));
}
export function hsvToHex(h: number, s: number, v: number): string {
    h = ((h % 360) + 360) % 360 / 60;
    s = Math.max(0, Math.min(1, s / 100));
    v = Math.max(0, Math.min(1, v));
    const channel = (n: number) => Math.round(255 * v * (1 - s * Math.max(0, Math.min((n + h) % 6, 4 - (n + h) % 6, 1))));
    return '#' + [5, 3, 1].map(n => channel(n).toString(16).padStart(2, '0')).join('');
}
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const mod = (v: number, n: number) => ((v % n) + n) % n;
const wave = (v: number) => (Math.sin(v) + 1) / 2;
const noise = (seed: number) => mod(Math.sin(seed * 127.1 + 311.7) * 43758.5453, 1);
export interface PreviewFrame {
    point: PreviewPoint;
    geometry: Map<string, PreviewPoint>;
    preview: LightingPreview;
    phase: number;
    now: number;
    impulses: PreviewImpulse[];
    held: Set<string>;
}
/** Deterministic visual approximations using KLE positions; firmware LED wiring is not supplied by VIA. */
export function previewColor({ point: p, geometry, preview, phase: t, now, impulses, held }: PreviewFrame): string {
    const effect = preview.effect;
    if (!effect || preview.brightness <= 0 || effect.key === 'off')
        return '#000000';
    let h = preview.hue / 255 * 360, s = preview.sat / 255 * 100, v = 1;
    const { key, variant, family } = effect;
    const dx = p.x - .5, dy = (p.y - .5) * .45, dist = Math.hypot(dx, dy), angle = Math.atan2(dy, dx);
    const count = Math.max(1, geometry.size), position = p.index / count;
    const speed = .25 + preview.speed / 255 * 2, seed = p.index + 1;
    const ripple = (distance: number, age: number) => clamp(1 - Math.abs(distance - age * .6) / .12) * clamp(1 - age / 1.7);
    if (family === 'rgblight') {
        const rate = [1, 1.5, 2.5][variant % 3], direction = variant >= 3 ? -1 : 1;
        switch (key) {
            case 'solid': break;
            case 'breathing':
                v = wave(t * [1, 1.5, 2.5, 4][variant]);
                break;
            case 'rainbowmood':
                h = t * 45 * rate;
                break;
            case 'rainbowswirl':
                h = position * 360 - direction * t * 75 * rate;
                break;
            case 'snake': {
                const gap = mod(position - direction * t * .12 * rate, 1);
                v = clamp(1 - gap / .18);
                break;
            }
            case 'knight':
                v = clamp(1 - Math.abs(position - wave(t * rate)) / .15);
                break;
            case 'christmas':
                h = mod(Math.floor(p.index / 2) + Math.floor(t * 2), 2) ? 120 : 0;
                s = 100;
                break;
            case 'gradient':
                h += position * [360, 240, 180, 120, 90][Math.floor(variant / 2)] * (variant % 2 ? -1 : 1);
                break;
            case 'rgbtest':
                h = mod(Math.floor(t), 3) * 120;
                s = 100;
                break;
            case 'alternating':
                v = mod(p.index + Math.floor(t * 2), 2);
                break;
            case 'twinkle': {
                const epoch = Math.floor(t * rate * .5 + noise(seed));
                v = noise(seed + epoch * 173) > .6 ? Math.pow(wave(t * rate * 3 + seed), 3) : 0;
                if (variant >= 3) {
                    h = noise(seed + epoch) * 360;
                    s = 100;
                }
                break;
            }
        }
    }
    else
        switch (key) {
            case 'solid': break;
            case 'alphas_mods':
                h += p.modifier ? preview.speed / 255 * 360 : 0;
                break;
            case 'gradient_up_down':
                h += p.y * preview.speed / 255 * 180;
                break;
            case 'gradient_left_right':
                h += p.x * preview.speed / 255 * 180;
                break;
            case 'breathing':
                v = wave(t * 2.5);
                break;
            case 'wave_left_right':
                v = wave(p.x * 6 - t * 3);
                break;
            case 'wave_up_down':
                v = wave(p.y * 6 - t * 3);
                break;
            case 'band_sat':
                s *= clamp(1 - Math.abs(p.x - mod(t * .2, 1.4) + .2) / .2);
                break;
            case 'band_val':
                v = clamp(1 - Math.abs(p.x - mod(t * .2, 1.4) + .2) / .2);
                break;
            case 'band_pinwheel_sat':
                s *= wave(angle * 3 - t * 3);
                break;
            case 'band_pinwheel_val':
                v = wave(angle * 3 - t * 3);
                break;
            case 'band_spiral_sat':
                s *= wave(angle + dist * 16 - t * 3);
                break;
            case 'band_spiral_val':
                v = wave(angle + dist * 16 - t * 3);
                break;
            case 'cycle_all':
                h = t * 60;
                break;
            case 'cycle_left_right':
                h = p.x * 360 - t * 90;
                break;
            case 'cycle_up_down':
                h = p.y * 360 - t * 90;
                break;
            case 'rainbow_chevron':
                h = p.x * 360 + Math.abs(dy) * 400 - t * 90;
                break;
            case 'cycle_out_in':
                h = dist * 600 + t * 90;
                break;
            case 'cycle_out_in_dual':
                h = Math.min(Math.hypot(p.x - .25, dy), Math.hypot(p.x - .75, dy)) * 900 + t * 90;
                break;
            case 'cycle_pinwheel':
                h = angle * 180 / Math.PI + t * 90;
                break;
            case 'cycle_spiral':
                h = angle * 180 / Math.PI + dist * 500 - t * 90;
                break;
            case 'dual_beacon':
                h += Math.sin(angle + t) * 180;
                break;
            case 'rainbow_beacon':
                h = (dx * Math.sin(t) + dy * Math.cos(t)) * 720 + t * 30;
                break;
            case 'rainbow_pinwheels':
                h = Math.atan2(dy, p.x - (p.x < .5 ? .25 : .75)) * 180 / Math.PI + t * 90;
                break;
            case 'flower_blooming':
                h = Math.abs(dx) * 720 + dy * 360 - t * 90;
                break;
            case 'raindrops':
                h += noise(seed + Math.floor(t * .6 + noise(seed))) * 120 - 60;
                break;
            case 'jellybean_raindrops':
                h = noise(seed + Math.floor(t * .8 + noise(seed))) * 360;
                s = 30 + noise(seed * 3) * 70;
                break;
            case 'hue_breathing':
                h += wave(t * 2) * 45;
                break;
            case 'hue_pendulum':
                h += Math.sin(t * 2) * p.x * 90;
                break;
            case 'hue_wave':
                h += wave(p.x * 6 - t * 2) * 90;
                break;
            case 'pixel_rain': {
                const epoch = Math.floor(t * 3);
                h = noise(seed + epoch * 157) * 360;
                v = noise(seed + epoch * 31) > .8 ? 1 : 0;
                break;
            }
            case 'pixel_flow': {
                const offset = mod(p.index - t * 12, count);
                h = noise(Math.floor(offset / 4)) * 360;
                v = wave(offset * 2);
                break;
            }
            case 'pixel_fractal':
                v = clamp(1 - Math.abs(Math.abs(dx) - mod(t * .15 + noise(Math.floor(p.y * 8)) * .2, .6)) / .08);
                break;
            case 'digital_rain': {
                const gap = mod(t * (.35 + noise(seed - p.y * 10) * .15) - p.y + noise(Math.floor(p.x * 30)), 1.8);
                h = 125;
                s = gap < .06 ? 20 : 100;
                v = gap < .5 ? 1 - gap / .5 : 0;
                break;
            }
            case 'starlight':
            case 'starlight_smooth':
            case 'starlight_dual_hue':
            case 'starlight_dual_sat': {
                const epoch = Math.floor(t * .6 + noise(seed));
                v = key === 'starlight_smooth' ? Math.pow(wave(t + seed), 5) : noise(seed + epoch * 97) > .6 ? noise(seed + epoch * 59) : 0;
                if (key === 'starlight_dual_hue')
                    h += (noise(seed + epoch * 17) - .5) * 60;
                if (key === 'starlight_dual_sat')
                    s += (noise(seed + epoch * 17) - .5) * 60;
                break;
            }
            case 'riverflow':
                v = wave(t * 2 + p.x * 5 + p.y * 3);
                break;
            default: {
                // Single-hit variants use the newest event; multi variants combine recent hits.
                const single = ['reactive_wide', 'reactive_cross', 'reactive_nexus', 'splash', 'solid_splash'].includes(key);
                const recent = single ? impulses.slice().sort((a, b) => b.time - a.time).slice(0, 1) : impulses;
                let intensity = 0, ageOfBest = 0;
                for (const imp of recent) {
                    const q = geometry.get(`${imp.row},${imp.col}`);
                    if (!q)
                        continue;
                    const age = held.has(`${imp.row},${imp.col}`) ? 0 : Math.max(0, (now - imp.time) / 1000) * speed;
                    const d = Math.hypot(p.x - q.x, (p.y - q.y) * .45);
                    let pulse = 0;
                    const same = p.index === q.index;
                    const cross = Math.abs(p.x - q.x) < .025 || Math.abs(p.y - q.y) < .035;
                    if (key === 'reactive_simple' || key === 'reactive')
                        pulse = same ? clamp(1 - age / 1.2) : 0;
                    else if (key === 'typing_heatmap')
                        pulse = clamp((imp.hits ?? 1) * .22) * clamp(1 - age / 8) * clamp(1 - d / .13);
                    else if (key.includes('nexus'))
                        pulse = cross ? ripple(d, age) : 0;
                    else if (key.includes('cross'))
                        pulse = cross ? clamp(1 - d / .4) * clamp(1 - age / 1.2) : 0;
                    else if (key.includes('wide'))
                        pulse = clamp(1 - d / .23) * clamp(1 - age / 1.2);
                    else if (key.includes('splash'))
                        pulse = ripple(d, age);
                    if (pulse > intensity) {
                        intensity = pulse;
                        ageOfBest = age;
                    }
                }
                if (key === 'reactive') {
                    h += intensity * 90;
                    v = 1;
                }
                else if (key === 'typing_heatmap') {
                    h = 240 - intensity * 240;
                    s = 100;
                    v = intensity;
                }
                else {
                    v = intensity;
                    if (key.includes('splash') && !key.startsWith('solid'))
                        h = dist * 720 - ageOfBest * 180;
                    else if (key !== 'reactive_simple')
                        h += intensity * 45;
                }
            }
        }
    if (family === 'mono_matrix') {
        if (key === 'alphas_mods')
            v = p.modifier ? preview.speed / 255 : 1;
        else if (key.startsWith('cycle') || key === 'dual_beacon')
            v = wave(h * Math.PI / 180);
        s = 0;
    }
    return hsvToHex(h, s, clamp(v) * clamp(preview.brightness));
}
