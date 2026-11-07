import builtins from '../data/viaLightingMenus.json';

export interface ViaLightingControl {
  id: string;
  label: string;
  group: string;
  type: 'range' | 'dropdown' | 'toggle' | 'color';
  channel: number;
  value: number;
  arguments?: number[];
  options?: unknown[];
  showIf?: string;
}

/** VIA v3 custom menus, and v2 lighting declarations using modern VIA channels. */
export function parseViaLighting(raw: Record<string, unknown>): ViaLightingControl[] {
  let menus = raw.menus;
  if (!Array.isArray(menus)) {
    const lighting = raw.lighting;
    const name = typeof lighting === 'string' ? lighting :
      lighting && typeof lighting === 'object' ? (lighting as Record<string, unknown>).extends : null;
    if (typeof name !== 'string' || !(name in builtins)) return [];
    const menu = structuredClone(builtins[name as keyof typeof builtins]);
    // v2 underglowEffects tuples contain [label, color-count], NOT effect IDs.
    if (lighting && typeof lighting === 'object') {
      const effects = (lighting as Record<string, unknown>).underglowEffects;
      if (Array.isArray(effects)) {
        for (const group of menu.content) {
          for (const control of group.content) {
            if (control.type === 'dropdown' && control.content[1] === 2) {
              (control as { options?: unknown[] }).options = effects.map(e => Array.isArray(e) ? e[0] : e);
            }
          }
        }
      }
    }
    menus = [menu];
  }
  const result: ViaLightingControl[] = [];
  function walk(node: unknown, group: string, conditions: string[]) {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    const nextConditions = typeof n.showIf === 'string' ? [...conditions, n.showIf] : conditions;
    if (typeof n.type === 'string' && ['range','dropdown','toggle','color'].includes(n.type)) {
      const c = n.content;
      if (!Array.isArray(c) || c.length < 3 || c.length > 29 || typeof c[0] !== 'string' ||
        !c.slice(1).every(v => Number.isInteger(v) && v >= 0 && v <= 255)) return;
      if (n.type !== 'color' && Array.isArray(n.options) && n.options.some(o =>
        (typeof o === 'number' && o > 255) || (Array.isArray(o) && typeof o[1] === 'number' && o[1] > 255))) return;
      result.push({ id: c[0], label: String(n.label ?? c[0]), group,
        type: n.type as ViaLightingControl['type'], channel: c[1], value: c[2], arguments: c.slice(3),
        options: Array.isArray(n.options) ? n.options : undefined,
        showIf: nextConditions.length ? nextConditions.map(c => `(${c})`).join(' && ') : undefined });
    } else if (Array.isArray(n.content)) {
      n.content.forEach(child => walk(child, String(n.label ?? group), nextConditions));
    }
  }
  for (const entry of menus as unknown[]) {
    const menu = typeof entry === 'string' ? builtins[entry as keyof typeof builtins] : entry;
    if (menu && typeof menu === 'object' && /light|rgb/i.test(String((menu as {label?: unknown}).label))) {
      walk(menu, 'Lighting', []);
    }
  }
  return result.filter((c, i) => result.findIndex(other => other.id === c.id) === i);
}

export function dropdownOptions(options: unknown[] = []): {label: string; value: number}[] {
  return options.flatMap((option, index) => {
    const label = Array.isArray(option) ? option[0] : option;
    const value = Array.isArray(option) ? option[1] : index;
    return typeof label === 'string' && Number.isInteger(value) && value >= 0 && value <= 255
      ? [{label, value}] : [];
  });
}

/** Small expression parser; never executes expressions supplied by a definition. */
export function lightingControlVisible(expression: string | undefined, values: Record<string, number[]>): boolean {
  if (!expression) return true;
  const tokens = expression.match(/\{[^}]+\}|\d+|===|!==|==|!=|<=|>=|&&|\|\||[()!<>]/g) ?? [];
  if (tokens.join('') !== expression.replace(/\s/g, '')) return false;
  let at = 0;
  function atom(): number | boolean {
    const token = tokens[at++];
    if (token === '!') return !atom();
    if (token === '(') { const value = or(); if (tokens[at++] !== ')') throw Error(); return value; }
    if (token?.startsWith('{')) return values[token.slice(1,-1)]?.[0] ?? 0;
    if (token && /^\d+$/.test(token)) return Number(token);
    throw Error();
  }
  function compare(): number | boolean {
    const left = atom(), op = tokens[at];
    if (!['==','===','!=','!==','<','>','<=','>='].includes(op)) return left;
    at++; const right = atom();
    switch (op) {
      case '==': case '===': return Number(left) === Number(right);
      case '!=': case '!==': return Number(left) !== Number(right);
      case '<': return Number(left) < Number(right);
      case '>': return Number(left) > Number(right);
      case '<=': return Number(left) <= Number(right);
      default: return Number(left) >= Number(right);
    }
  }
  function and(): number | boolean { let value = compare(); while(tokens[at] === '&&') { at++; const right = compare(); value = Boolean(value) && Boolean(right); } return value; }
  function or(): number | boolean { let value = and(); while(tokens[at] === '||') { at++; const right = and(); value = Boolean(value) || Boolean(right); } return value; }
  try { const value = or(); return at === tokens.length && Boolean(value); } catch { return false; }
}

export function hsToHex([h = 0, s = 0]: number[]): string {
  const hue = h / 255 * 6, sat = s / 255;
  const x = (n: number) => Math.round(255 * (1 - sat * Math.max(0, Math.min(n, 4 - n, 1))));
  return '#' + [5,3,1].map(n => x((n + hue) % 6).toString(16).padStart(2,'0')).join('');
}
export function hexToHs(hex: string): number[] {
  const rgb = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16) / 255);
  const max = Math.max(...rgb), min = Math.min(...rgb), d = max-min;
  const [r,g,b] = rgb;
  const h = !d ? 0 : max === r ? ((g-b)/d+6)%6 : max === g ? (b-r)/d+2 : (r-g)/d+4;
  return [Math.round(h/6*255), Math.round((max ? d/max : 0)*255)];
}

/** Presentation defaults for offline controls; never sent until the user edits them. */
export function defaultViaLightingValue(control: ViaLightingControl): number[] {
  if (control.type === 'color') return [120,255];
  const low = Number(control.options?.[0] ?? 0), high = Number(control.options?.[1] ?? 255);
  if (control.type === 'range' && /brightness|lightness/i.test(control.label)) return [Math.max(low,Math.round(high*.7))];
  if (control.type === 'range' && /speed/i.test(control.label)) return [Math.max(low,Math.round(high*.5))];
  return [0];
}
