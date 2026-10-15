import { describe, expect, it, vi } from 'vitest';
import { History } from '../src/history';

const counterCmd = (n: { v: number }) => ({ label: 'inc', do: () => n.v++, undo: () => n.v-- });

describe('History: estado para los botones deshacer/rehacer', () => {
  it('canUndo/canRedo reflejan las pilas', () => {
    const h = new History();
    const n = { v: 0 };
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
    h.run(counterCmd(n));
    expect(n.v).toBe(1);
    expect(h.canUndo()).toBe(true);
    expect(h.canRedo()).toBe(false);
    h.undo();
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(true);
    h.redo();
    expect(h.canUndo()).toBe(true);
    expect(h.canRedo()).toBe(false);
  });

  it('onChange avisa en cada mutación de pila (run, record, undo, redo, clear)', () => {
    const h = new History();
    const spy = vi.fn();
    h.onChange(spy);
    const n = { v: 0 };
    h.run(counterCmd(n));
    h.record(counterCmd(n));
    h.undo();
    h.redo();
    h.clear();
    expect(spy).toHaveBeenCalledTimes(5);
    expect(h.canUndo()).toBe(false);
  });

  it('run limpia la pila de rehacer', () => {
    const h = new History();
    const n = { v: 0 };
    h.run(counterCmd(n));
    h.undo();
    expect(h.canRedo()).toBe(true);
    h.run(counterCmd(n));
    expect(h.canRedo()).toBe(false);
  });
});
