import { describe, expect, it } from 'vitest';
import { feKey, historyText, interpolate, intakeKey, renderLocalisable, renderTxt } from './intakeCopy';
import { makeExists, makeT } from './intakeTestKit';
import * as fx from './fixtures/intakeFixtures';

describe('keys', () => {
  it('flattens .fix/.warn/.noSuggest to a camel-cased sibling (nested JSON cannot hold both)', () => {
    expect(feKey('error.stale.fix')).toBe('error.staleFix');
    expect(feKey('undo.failed.fix')).toBe('undo.failedFix');
    expect(feKey('x.y.warn')).toBe('x.yWarn');
    expect(feKey('gate.orders')).toBe('gate.orders');
    expect(intakeKey('gate.orders')).toBe('vagonai.shipment.intake.gate.orders');
  });
  it('interpolate fills {x} and {{x}} and leaves unknown slots visible', () => {
    expect(interpolate('Site: {name}', { name: 'A' })).toBe('Site: A');
    expect(interpolate('Site: {{name}} #{{n}}', { name: 'A', n: 2 })).toBe('Site: A #2');
    expect(interpolate('Site: {{name}}', {})).toBe('Site: {{name}}');
  });
});

describe('live text is shown as the gateway wrote it', () => {
  it('renderTxt returns .text, not a re-translation', () => {
    expect(renderTxt(fx.gateStep('el').prompt)).toBe('Πώς θέλεις να ξεκινήσεις;');
    expect(renderTxt(null)).toBe('');
  });
});

describe('history answers follow the app locale (v0.2 {key, params, fallbackText})', () => {
  const [gate, loc] = fx.history();
  it('re-renders from the FE locale, EN and EL', () => {
    expect(historyText(makeT('en'), loc!, makeExists('en'))).toBe('Site: Athens Distribution Centre');
    expect(historyText(makeT('el'), loc!, makeExists('el'))).toMatch(/Athens Distribution Centre/);
    expect(historyText(makeT('el'), loc!, makeExists('el'))).not.toBe('Site: Athens Distribution Centre');
  });
  it("a key from the gateway's own copy table (not the contract's) shows the stored snapshot", () => {
    expect(gate!.answer.key).toBe('history.gate.manual');
    expect(historyText(makeT('en'), gate!, makeExists('en'))).toBe('Entering it manually');
  });
  it('falls back to the stored snapshot for an unknown key', () => {
    const a = { key: 'brand.new.key', fallbackText: 'Snapshot text' };
    expect(renderLocalisable(makeT('en'), a, makeExists('en'))).toBe('Snapshot text');
    expect(renderLocalisable(makeT('en'), a)).toBe('Snapshot text'); // no exists(): the echoed key is detected
  });
  it('falls back when a param the template needs was not stored — never prints {{name}}', () => {
    const a = { key: 'history.location', fallbackText: 'Site: ?' };
    expect(renderLocalisable(makeT('en'), a, makeExists('en'))).toBe('Site: ?');
  });
  it('null in, empty out', () => {
    expect(renderLocalisable(makeT('en'), null)).toBe('');
  });
});
