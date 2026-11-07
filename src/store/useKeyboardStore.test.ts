import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import max102 from '../data/definitions/max102.json';
beforeEach(() => {
    vi.resetModules();
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
    });
});
afterEach(() => vi.unstubAllGlobals());
describe('VIA definition registry', () => {
    it('starts with only the original MAX102 VIA definition', async () => {
        const { BUNDLED_DEFINITIONS, useKeyboardStore } = await import('./useKeyboardStore');
        expect(BUNDLED_DEFINITIONS).toHaveLength(1);
        expect(useKeyboardStore.getState().definitions.map(d => d.id)).toEqual(['max102-342d-e537']);
        expect(BUNDLED_DEFINITIONS[0].source).toEqual(max102);
    });
    it('persists original VIA JSON and reloads imported definitions', async () => {
        const { useKeyboardStore } = await import('./useKeyboardStore');
        const raw = { ...max102, name: 'Another VIA Keyboard', vendorId: '0xFEED', productId: '0x6060' };
        await useKeyboardStore.getState().importViaDefinition(JSON.stringify(raw));
        expect(useKeyboardStore.getState().definitions).toHaveLength(2);
        const saved = JSON.parse(localStorage.getItem('qmk_studio_via_definitions_v2')!);
        expect(saved).toEqual([raw]);
        expect(saved[0].layouts.keys).toBeUndefined();
        vi.resetModules();
        const reloaded = await import('./useKeyboardStore');
        expect(reloaded.useKeyboardStore.getState().definitions).toHaveLength(2);
        expect(reloaded.useKeyboardStore.getState().definitions[1].source).toEqual(raw);
    });
    it('rejects custom JSON without changing the active definition', async () => {
        const { useKeyboardStore } = await import('./useKeyboardStore');
        const original = useKeyboardStore.getState().activeDefinition;
        await useKeyboardStore.getState().importViaDefinition(JSON.stringify({ ...max102, capabilities: { lighting: {} } }));
        expect(useKeyboardStore.getState().activeDefinition).toBe(original);
        expect(useKeyboardStore.getState().definitions).toHaveLength(1);
        expect(useKeyboardStore.getState().statusBanner?.type).toBe('error');
    });
    it('restores the bundled VIA definition after removing an imported override', async () => {
        const { useKeyboardStore } = await import('./useKeyboardStore');
        await useKeyboardStore.getState().importViaDefinition(JSON.stringify(max102));
        expect(useKeyboardStore.getState().definitions).toHaveLength(1);
        expect(useKeyboardStore.getState().activeDefinition.builtin).toBe(false);
        await useKeyboardStore.getState().removeDefinition('max102-342d-e537');
        expect(useKeyboardStore.getState().definitions).toHaveLength(1);
        expect(useKeyboardStore.getState().activeDefinition.builtin).toBe(true);
        expect(JSON.parse(localStorage.getItem('qmk_studio_via_definitions_v2')!)).toEqual([]);
    });
});
