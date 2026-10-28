/** MS3-407: the welcome screen's "Continue your unfinished shipment" offer (gateway R1c). */
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { UnfinishedLoadBanner } from './UnfinishedLoadBanner';
import { unfinishedOf } from './unfinishedModel';
import { byTestId, click, render, textOf } from './intakeTestKit';

const t = (key: string) => ({
  'vagonai.empty.resumeTitle': 'Continue your unfinished shipment',
  'vagonai.empty.resumeUnnamed': 'You started creating a shipment and did not finish it.',
  'vagonai.empty.resumeContinue': 'Continue',
  'vagonai.empty.resumeDismiss': 'Not now',
}[key] ?? key);

function banner(states: unknown[], enabled = true) {
  const onContinue = vi.fn();
  const r = render(createElement(UnfinishedLoadBanner, { enabled, lang: 'en', t, onContinue, load: vi.fn() }), states);
  return { ...r, onContinue, text: textOf(r.tree) };
}

describe('MS3-407 - carry on after the browser was closed', () => {
  it('names the route and Continue opens that chat', () => {
    const b = banner([{ conversationId: 'c-1', route: 'Athens DC → Patras' }, false]);
    expect(b.text).toContain('Continue your unfinished shipment');
    expect(b.text).toContain('Athens DC → Patras');
    click(byTestId(b.tree, 'vai-resume-continue'));
    expect(b.onContinue).toHaveBeenCalledWith('c-1');
  });
  it('a load with no route yet still reads as a sentence', () => {
    expect(banner([{ conversationId: 'c-1', route: null }, false]).text).toContain('did not finish it');
  });
  it('Not now hides it; nothing found, dismissed or disabled shows nothing', () => {
    const b = banner([{ conversationId: 'c-1', route: null }, false]);
    click(byTestId(b.tree, 'vai-resume-dismiss'));
    expect(b.setCalls).toContainEqual({ index: 1, value: true });
    expect(byTestId(banner([null, false]).tree, 'vai-resume-intake')).toBeUndefined();
    expect(byTestId(banner([{ conversationId: 'c-1', route: null }, true]).tree, 'vai-resume-intake')).toBeUndefined();
    expect(byTestId(banner([{ conversationId: 'c-1', route: null }, false], false).tree, 'vai-resume-intake')).toBeUndefined();
  });
  it('reads the gateway answer defensively', () => {
    expect(unfinishedOf({ ok: true, intakeId: null })).toBeNull();
    expect(unfinishedOf({ ok: true, intakeId: 'i', conversationId: 'c', route: '  ' })).toEqual({ conversationId: 'c', route: null });
    expect(unfinishedOf({ ok: true, intakeId: 'i', conversationId: '', route: 'x' } as never)).toBeNull();
    expect(unfinishedOf(undefined)).toBeNull();
  });
});
