// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { addCustom, addRecent, loadSwatches, moveSwatch, normalizeColor, removeSwatch } from '../src/swatches';

describe('swatches: paleta compartida', () => {
  it('normaliza colores con y sin alfa', () => {
    expect(normalizeColor('#f00')).toBe('#ff0000');
    expect(normalizeColor('#AABBCC')).toBe('#aabbcc');
    expect(normalizeColor('#aabbcc80')).toBe('#aabbcc80');
    expect(normalizeColor('nope')).toBe('nope'); // addRecent/addCustom lo descartan
  });

  it('los recientes se deduplican, van delante y tienen tope', () => {
    const s = loadSwatches();
    for (let i = 0; i < 20; i++) addRecent(s, `#0000000${i % 10}`.slice(0, 7));
    const colors = s.recent.map((r) => r.color);
    expect(new Set(colors).size).toBe(colors.length);
    expect(colors.length).toBeLessThanOrEqual(12);
  });

  it('los personalizados no se borren solos: sobreviven a los recientes', () => {
    const s = loadSwatches();
    addCustom(s, '#123456');
    for (let i = 0; i < 30; i++) addRecent(s, `#00000${i}`.padEnd(7, '0'));
    expect(s.custom.some((c) => c.color === '#123456')).toBe(true);
  });

  it('moveSwatch reordena dentro de la misma lista', () => {
    const s = loadSwatches();
    s.custom = [];
    addCustom(s, '#000001');
    addCustom(s, '#000002');
    addCustom(s, '#000003');
    const before = s.custom.map((c) => c.color);
    expect(before).toEqual(['#000001', '#000002', '#000003']);
    moveSwatch(s, s.custom[0].id, s.custom[2].id, true);
    expect(s.custom.map((c) => c.color)).toEqual(['#000002', '#000003', '#000001']);
  });

  it('removeSwatch elimina sólo ese color', () => {
    const s = loadSwatches();
    s.custom = [];
    addCustom(s, '#000001');
    addCustom(s, '#000002');
    removeSwatch(s, s.custom[0].id);
    expect(s.custom.map((c) => c.color)).toEqual(['#000002']);
  });
});
