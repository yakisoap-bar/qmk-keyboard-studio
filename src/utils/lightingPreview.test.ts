import { describe, it, expect } from 'vitest';
import menus from '../data/viaLightingMenus.json';
import weikav from '../data/definitions/max102.json';
import { parseViaDefinition } from './kleParser';
import { createDefaultOfflineProfile } from '../store/useKeyboardStore';
import { createPreviewGeometry, getLightingPreview, previewColor, resolvePreviewEffect, type LightingPreview, type LightingFamily } from './lightingPreview';
const board = { name: 'Preview', matrix: { rows: 1, cols: 8 }, layouts: { keymap: [['0,7', '0,0', '0,4', '0,2', '0,6', '0,1', '0,5', '0,3']] } };
const definition = parseViaDefinition({ ...board, menus: ['qmk_rgb_matrix'] });
const geometry = createPreviewGeometry(definition.layouts.keys);
const base: LightingPreview = { label: '', brightness: .7, speed: 128, hue: 100, sat: 180 };
const frame = (name: string, family: LightingFamily = 'matrix', phase = 1.2, impulses = [{ row: 0, col: 0, time: 900, hits: 3 }]) => {
    const preview = { ...base, effect: resolvePreviewEffect(name, family) };
    return [...geometry.values()].map(point => previewColor({ point, geometry, preview, phase, now: 1000, impulses, held: new Set() }));
};
describe('standard QMK preview coverage', () => {
    const matrix = menus.qmk_rgb_matrix.content[0].content[1].options as string[];
    const under = menus.qmk_rgblight.content[0].content[1].options as string[];
    it.each(matrix)('renders RGB Matrix %s', name => {
        expect(resolvePreviewEffect(name)).toBeDefined();
        const colors = frame(name);
        expect(colors.every(c => /^#[0-9a-f]{6}$/.test(c))).toBe(true);
        expect(frame(name)).toEqual(colors);
    });
    it.each(under)('renders RGBLight %s without using matrix IDs', name => {
        expect(resolvePreviewEffect(name, 'rgblight')).toBeDefined();
        expect(frame(name, 'rgblight').every(c => /^#[0-9a-f]{6}$/.test(c))).toBe(true);
    });
    it.each(['Flower Blooming', 'Starlight', 'Starlight Smooth', 'Starlight Dual Hue', 'Starlight Dual Sat', 'Riverflow'])('renders newer QMK effect %s', name => {
        expect(resolvePreviewEffect(name)).toBeDefined();
        expect(frame(name).every(c => /^#[0-9a-f]{6}$/.test(c))).toBe(true);
    });
    it.each(['Band', 'Band Pinwheel', 'Band Spiral', 'Wave Left Right', 'Wave Up Down'])('renders LED Matrix %s', name => {
        expect(resolvePreviewEffect(name, 'mono_matrix')).toBeDefined();
        expect(frame(name, 'mono_matrix').every(c => c.slice(1, 3) === c.slice(3, 5) && c.slice(3, 5) === c.slice(5, 7))).toBe(true);
    });
    it('keeps static gradients static while speed changes their span', () => {
        expect(frame('Gradient Left/Right', 'matrix', 0)).toEqual(frame('Gradient Left/Right', 'matrix', 10));
        expect(new Set(frame('Gradient Left/Right')).size).toBeGreaterThan(1);
        expect(frame('Cycle Left/Right', 'matrix', 0)).not.toEqual(frame('Cycle Left/Right', 'matrix', 10));
    });
    it('distinguishes backlight breathing disabled from turning RGB off', () => {
        expect(frame('Off', 'backlight').some(c => c !== '#000000')).toBe(true);
        expect(frame('All Off').every(c => c === '#000000')).toBe(true);
        expect(frame('All Off', 'rgblight').every(c => c === '#000000')).toBe(true);
    });
    it('never invents a simulation from an unknown numeric mode', () => {
        expect(resolvePreviewEffect('Custom Pulse')).toBeUndefined();
        expect(resolvePreviewEffect('Close All')).toBeUndefined();
        const profile = createDefaultOfflineProfile('Test', definition);
        profile.via_lighting_values = { id_qmk_rgb_matrix_effect: [99] };
        expect(getLightingPreview(definition, profile, null).effect).toBeUndefined();
    });
    it('uses key positions rather than matrix column order', () => {
        expect(geometry.get('0,7')!.x).toBeLessThan(geometry.get('0,0')!.x);
        expect(geometry.get('0,3')!.x).toBe(1);
    });
    it('turns zero brightness fully off and honours low brightness', () => {
        const point = geometry.get('0,0')!;
        const render = (brightness: number) => previewColor({ point, geometry, preview: { ...base, brightness, effect: resolvePreviewEffect('Solid Color') }, phase: 0, now: 0, impulses: [], held: new Set() });
        expect(render(0)).toBe('#000000');
        expect(render(.01)).not.toBe(render(.1));
    });
});
describe('reactive lighting', () => {
    it('waits for actual presses or clicks and fades after release', () => {
        expect(frame('Solid Reactive Simple', 'matrix', 1, []).every(c => c === '#000000')).toBe(true);
        expect(frame('Solid Reactive Simple').some(c => c !== '#000000')).toBe(true);
        expect(frame('Solid Reactive Simple', 'matrix', 1, [{ row: 0, col: 0, time: -10000, hits: 1 }]).every(c => c === '#000000')).toBe(true);
    });
    it('keeps older hits in multi variants while single variants follow the newest', () => {
        const hits = [{ row: 0, col: 7, time: 900, hits: 1 }, { row: 0, col: 3, time: 950, hits: 1 }];
        expect(frame('Solid Reactive Wide', 'matrix', 1, hits)[0]).toBe('#000000');
        expect(frame('Solid Reactive Multi Wide', 'matrix', 1, hits)[0]).not.toBe('#000000');
    });
    it('heats more strongly after repeated presses', () => {
        expect(frame('Typing Heatmap', 'matrix', 1, [{ row: 0, col: 0, time: 900, hits: 1 }])).not.toEqual(frame('Typing Heatmap', 'matrix', 1, [{ row: 0, col: 0, time: 900, hits: 4 }]));
    });
});
describe('VIA preview state', () => {
    it('reads independent lighting groups and respects remapped custom IDs', () => {
        const def = parseViaDefinition({ ...board, menus: ['qmk_backlight_rgblight', { label: 'Lighting', content: [{ label: 'Logo', content: [
                                { label: 'Effect', type: 'dropdown', content: ['logo_mode', 0, 9], options: [['Breathing', 73], ['Custom Pulse', 1]] },
                                { label: 'Brightness', type: 'range', content: ['logo_brightness', 0, 10], options: [0, 100] },
                            ] }] }] });
        const profile = createDefaultOfflineProfile('Test', def);
        profile.via_lighting_values = { id_qmk_backlight_effect: [1], id_qmk_backlight_brightness: [50], id_qmk_rgblight_effect: [2], id_qmk_rgblight_brightness: [200], logo_mode: [73], logo_brightness: [30] };
        expect(getLightingPreview(def, profile, 'id_qmk_backlight_effect')).toMatchObject({ effect: { family: 'backlight', key: 'breathing' }, brightness: 50 / 255, sat: 0 });
        expect(getLightingPreview(def, profile, 'id_qmk_rgblight_effect')).toMatchObject({ effect: { family: 'rgblight', key: 'breathing' }, brightness: 200 / 255 });
        expect(getLightingPreview(def, profile, 'logo_mode')).toMatchObject({ mode: 73, effect: { key: 'breathing' }, brightness: .3 });
        profile.via_lighting_values.logo_mode = [1];
        expect(getLightingPreview(def, profile, 'logo_mode').effect).toBeUndefined();
    });
    it('matches the connected MAX102 reference state through an imported VIA menu', () => {
        const profile = createDefaultOfflineProfile('VIA', definition);
        profile.via_lighting_values = { id_qmk_rgb_matrix_effect: [35], id_qmk_rgb_matrix_brightness: [176], id_qmk_rgb_matrix_effect_speed: [51], id_qmk_rgb_matrix_color: [150, 160] };
        expect(getLightingPreview(definition, profile, null)).toMatchObject({ effect: { key: 'reactive_wide' }, mode: 35, brightness: 176 / 255, speed: 51, hue: 150, sat: 160 });
    });
});
