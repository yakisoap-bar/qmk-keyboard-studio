import { describe, it, expect } from 'vitest';
import { parseViaLighting, dropdownOptions, lightingControlVisible, hexToHs, hsToHex } from './viaLighting';
import { parseViaDefinition } from './kleParser';

const board = {name: 'Test', matrix: {rows:1, cols:1}, layouts: {keymap:[['0,0']]}};

describe('VIA lighting imports', () => {
  it('uses separate backlight and underglow channels without inventing RGB controls', () => {
    const controls = parseViaLighting({menus:['qmk_backlight_rgblight']});
    expect(controls.map(c => [c.type,c.channel,c.value])).toEqual([
      ['range',1,1], ['dropdown',1,2], ['range',2,1], ['dropdown',2,2], ['range',2,3], ['color',2,4],
    ]);
    expect(dropdownOptions(controls[1].options)).toEqual([{label:'Off',value:0},{label:'Breathing',value:1}]);
    expect(dropdownOptions(controls[3].options)[2]).toEqual({label:'Breathing 1',value:2});
  });
  it('preserves custom effect IDs and extra addressing bytes through normalization and reload', () => {
    const raw = {...board, menus:[{label:'Lighting',content:[{label:'Logo',content:[
      {label:'Mode',type:'dropdown',options:[['Off',0],['Custom Pulse',73]],content:['logo_mode',0,12,4]},
      {showIf:'{logo_mode} == 73',content:[{label:'Colour',type:'color',content:['logo_color',0,13]}]},
    ]}]}]};
    const def = parseViaDefinition(raw);
    expect(def.viaLighting?.[0]).toMatchObject({channel:0,value:12,arguments:[4],group:'Logo'});
    expect(dropdownOptions(def.viaLighting?.[0].options)).toEqual([{label:'Off',value:0},{label:'Custom Pulse',value:73}]);
    expect(parseViaDefinition(JSON.parse(JSON.stringify(def.source))).viaLighting).toEqual(def.viaLighting);
    expect(lightingControlVisible(def.viaLighting?.[1].showIf, {logo_mode:[73]})).toBe(true);
    expect(lightingControlVisible(def.viaLighting?.[1].showIf, {logo_mode:[0]})).toBe(false);
  });
  it('reads v2 effect tuples as label and colour count, rather than IDs', () => {
    const controls = parseViaLighting({lighting:{extends:'qmk_rgblight',underglowEffects:[['Off',0],['Solid',1],['Custom',1]]}});
    expect(controls[1].channel).toBe(2);
    expect(dropdownOptions(controls[1].options)).toEqual([{label:'Off',value:0},{label:'Solid',value:1},{label:'Custom',value:2}]);
  });
  it('does not guess capabilities for unknown declarations or unrelated menus', () => {
    for (const lighting of [undefined, false, 'none', 'vendor_custom', {}]) {
      const def = parseViaDefinition({...board,lighting});
      expect(def.viaLighting).toEqual([]);
      }
    expect(parseViaLighting({menus:['qmk_audio']})).toEqual([]);
  });
  it('ignores invalid commands and unsupported wide numeric settings', () => {
    expect(parseViaLighting({menus:[{label:'Lighting',content:[
      {type:'range',content:['bad',0,256]},
      {type:'range',content:['wide',0,1],options:[0,1000]},
      {type:'range',content:['bad_arg',0,1,-1]},
    ]}]})).toEqual([]);
  });
});

describe('lighting values', () => {
  it('evaluates nested conditions without running definition code', () => {
    const values = {effect:[5],enabled:[1]};
    expect(lightingControlVisible('({effect} >= 2 && {effect} != 4) || !{enabled}', values)).toBe(true);
    expect(lightingControlVisible('{effect} < 2 || ({enabled} == 0 && {effect} == 5)',values)).toBe(false);
    expect(lightingControlVisible('globalThis.alert(1)',values)).toBe(false);
    expect(lightingControlVisible('({effect} > 0',values)).toBe(false);
  });
  it('encodes colour as hue and saturation, including white at zero saturation', () => {
    expect(hexToHs('#ff0000')).toEqual([0,255]);
    expect(hexToHs('#00ff00')).toEqual([85,255]);
    expect(hexToHs('#ffffff')).toEqual([0,0]);
    expect(hsToHex([0,0])).toBe('#ffffff');
    expect(hsToHex([170,255])).toBe('#0000ff');
    expect(hsToHex(hexToHs('#ff0000'))).toBe('#ff0000');
  });
});
