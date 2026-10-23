/**
 * Locale parity for `vagonai.shipment.intake.*`: EN and EL have the same keys and the same {{placeholders}},
 * and every key the widget code asks for exists in both. Run on the real en.json / el.json.
 */
import { describe, expect, it } from 'vitest';
import { INTAKE_I18N_ROOT, feKey } from './intakeCopy';
import { LOCALES } from './intakeTestKit';

type Tree = { [k: string]: string | Tree };
const intake = (l: 'en' | 'el'): Tree => ((LOCALES[l] as unknown as { vagonai: { shipment: { intake: Tree } } }).vagonai.shipment.intake);

function flat(t: Tree, p = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(t)) {
    if (typeof v === 'string') out[`${p}${k}`] = v;
    else Object.assign(out, flat(v, `${p}${k}.`));
  }
  return out;
}
const slots = (s: string): string[] => [...s.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]!).sort();

describe('vagonai.shipment.intake — EN/EL parity', () => {
  const en = flat(intake('en'));
  const el = flat(intake('el'));
  it('is mounted at the documented root', () => {
    expect(INTAKE_I18N_ROOT).toBe('vagonai.shipment.intake');
    expect(Object.keys(en).length).toBeGreaterThan(50);
  });
  it('has exactly the same keys in both languages', () => {
    expect(Object.keys(el).sort()).toEqual(Object.keys(en).sort());
  });
  it('has the same {{placeholders}} in every pair', () => {
    for (const k of Object.keys(en)) expect(slots(el[k]!), k).toEqual(slots(en[k]!));
  });
  it('has no empty strings, and Greek is actually Greek', () => {
    for (const [k, v] of Object.entries(el)) {
      expect(v.trim().length, k).toBeGreaterThan(0);
      expect(en[k]!.trim().length, k).toBeGreaterThan(0);
    }
    const greek = Object.values(el).filter((v) => /[Α-Ωα-ω]/.test(v)).length;
    expect(greek / Object.keys(el).length).toBeGreaterThan(0.95);
  });
  it('the contract\'s dotted key channel.public.warn maps to channel.publicWarn, next to the leaf channel.public — no collision (§18.1)', () => {
    expect(feKey('channel.public.warn')).toBe('channel.publicWarn');
    expect(typeof en['channel.public']).toBe('string');
    expect(typeof en['channel.publicWarn']).toBe('string');
    expect(Object.keys(en).filter((k) => k.startsWith('channel.public.'))).toEqual([]);
  });
  it('is not fully nested-colliding: a key is a sentence or a parent, never both', () => {
    // JSON.parse already guarantees this for the file; this guards the generator rule feKey().
    expect(feKey('undo.failed.fix')).not.toBe('undo.failed');
  });
});

describe('every key the code asks for exists in both languages', () => {
  const sources = import.meta.glob('./**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const asked = new Set<string>();
  for (const [file, src] of Object.entries(sources)) {
    if (/\.test\.ts$|intakeTestKit|fixtures\//.test(file)) continue;
    for (const m of src.matchAll(/chrome\(\s*ui\s*,\s*'([A-Za-z][\w.]*)'/g)) asked.add(m[1]!);
    for (const m of src.matchAll(/t\('vagonai\.shipment\.intake\.([A-Za-z][\w.]*)'/g)) asked.add(m[1]!);
  }
  it('found the chrome keys in the widget code', () => {
    expect(asked.size).toBeGreaterThan(15);
  });
  const en = flat(intake('en'));
  const el = flat(intake('el'));
  it('exist in EN and EL', () => {
    // The code asks with the gateway's own key (`channel.public.warn`); the JSON stores the camel-case sibling (`channel.publicWarn`, §18.1).
    for (const k of asked) {
      expect(en[feKey(k)], `en: ${k}`).toBeTypeOf('string');
      expect(el[feKey(k)], `el: ${k}`).toBeTypeOf('string');
    }
  });
  it('the options a spent widget can keep as its answer exist in EN and EL (history re-render)', () => {
    const keys = [
      // The contract's history keys (§11.2). The gateway also stores keys from its own copy table (`history.gate.manual`,
      // `history.tracking`, … — see `history()` in the fixtures) that this build has no string for yet: those rows show their snapshot.
      ...['history.orders', 'history.location', 'history.cargo', 'history.window', 'history.vehicle', 'history.channel', 'history.price', 'history.orderValue', 'history.express'],
      ...['gate.orders', 'gate.manual', 'upload.yes', 'upload.no', 'describe.stepByStep', 'cancel.yes', 'cancel.no', 'cancel.yesNew', 'cancel.noKeep'],
    ];
    for (const k of keys) {
      expect(en[feKey(k)], `en: ${k}`).toBeTypeOf('string');
      expect(el[feKey(k)], `el: ${k}`).toBeTypeOf('string');
    }
  });
});
