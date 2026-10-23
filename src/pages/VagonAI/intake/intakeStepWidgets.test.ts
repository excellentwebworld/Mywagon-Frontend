/**
 * WP3c — the terms-step widgets (vehicle, channel, tracking, negotiable, price, order value), one describe each:
 * what is on screen, which answer is pre-selected, that ONE tap posts the right wire answer, that a busy page disables
 * everything, and that Greek is Greek. Rendered through the real host view so the wiring is under test too.
 */
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { IntakeEvent, IntakeStepEvent } from './contract';
import * as fx from './fixtures/intakeFixtures';
import { IntakeWidgetHostView, type IntakeActions } from './IntakeWidgetHostView';
import { answerLabel, channelAnswer, channelDefaultOf, formatAmount, parseAmount, parseOrderValue, orderValueAnswerOf, parsePrice, PARTNERS_R4_LIVE, proposedPartnerIds, recommendationUsable, stepViewOf, trackingDefaultOf, vehicleAnswer } from './intakeModel';
import { renderLocalisable } from './intakeCopy';
import { allTestIds, byTestId, click, findAll, isDisabled, makeExists, makeT, makeUi, render, textOf, type Lang } from './intakeTestKit';

const actions = () => ({
  answer: vi.fn(), upload: vi.fn(), sendText: vi.fn(), finish: vi.fn(), undo: vi.fn(), discard: vi.fn(), newLoad: vi.fn(), open: vi.fn(), retry: vi.fn(),
}) as unknown as IntakeActions & Record<keyof IntakeActions, ReturnType<typeof vi.fn>>;

function host(event: IntakeEvent, o: { lang?: Lang; busy?: boolean; live?: boolean; states?: unknown[] } = {}) {
  const a = actions();
  const lang = o.lang ?? 'en';
  const r = render(createElement(IntakeWidgetHostView, {
    ui: makeUi(lang), exists: makeExists(lang), state: { kind: 'event', event }, live: o.live ?? true, busy: o.busy ?? false, canMeasureRoute: true, actions: a,
  }), o.states);
  return { ...r, a, text: textOf(r.tree), ids: allTestIds(r.tree), el: (id: string) => byTestId(r.tree, id) };
}
const noRawKeys = (text: string) => {
  expect(text).not.toMatch(/vagonai\.shipment/);
  expect(text).not.toMatch(/\{\{|\}\}/);
};
const typed = (h: ReturnType<typeof host>, id: string, value: string) => (h.el(id)!.props.onChange as (e: unknown) => void)({ target: { value } });

describe('Vehicle widget — the recommended truck is one tap', () => {
  const e = fx.vehicleStep();
  it('shows the recommendation selected and tagged, with the gateway\'s rationale', () => {
    const h = host(e);
    const rec = h.el('intake-vehicle-recommended')!;
    expect(rec.props['data-selected']).toBe('true');
    expect(h.ids).toContain('intake-vehicle-recommended-suggested');
    expect(h.text).toContain('Semi-trailer, curtain side');
    expect(h.text).toContain('Recommended for 1,200 kg');
    expect(h.text).toContain('Suggested');
    noRawKeys(h.text);
  });
  it('one tap on the recommendation posts its type with NO subtype (§19.2: [] = the whole type)', () => {
    const h = host(e);
    click(h.el('intake-vehicle-recommended'));
    expect(h.a.answer).toHaveBeenCalledTimes(1);
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'vehicle', typeIds: ['t_semi'], categoryIds: [] });
  });
  it('hides the other types behind "More options" and lists them without repeating the recommendation', () => {
    const closed = host(e);
    expect(closed.ids).not.toContain('intake-vehicle-alt-t_van');
    expect(closed.text).toContain('More options');
    const open = host(e, { states: [true] });
    expect(open.ids).toEqual(expect.arrayContaining(['intake-vehicle-alt-t_rigid', 'intake-vehicle-alt-t_van']));
    expect(open.ids).not.toContain('intake-vehicle-alt-t_semi');
    expect(open.text).toContain('Fewer options');
  });
  it('"More options" toggles the list', () => {
    const h = host(e);
    click(h.el('intake-vehicle-more'));
    expect(h.setCalls).toEqual([{ index: 0, value: true }]);
  });
  it('another type posts that type with NO subtype — never "every subtype it is listed with" (§19.2)', () => {
    const h = host(e, { states: [true] });
    click(h.el('intake-vehicle-alt-t_rigid'));
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'vehicle', typeIds: ['t_rigid'], categoryIds: [] });
  });
  it('a subtype is sent only when the shipper tapped it, and only with its own type', () => {
    const h = host(e, { states: [true] });
    expect(h.ids).toEqual(expect.arrayContaining(['intake-vehicle-alt-t_rigid-cat-c_box', 'intake-vehicle-alt-t_van-cat-c_van']));
    click(h.el('intake-vehicle-alt-t_rigid-cat-c_box'));
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'vehicle', typeIds: ['t_rigid'], categoryIds: ['c_box'] });
    // The model: a subtype that does not belong to the type is dropped, and duplicates collapse.
    expect(vehicleAnswer('t_rigid', ['c_curtain'], ['c_box'])).toEqual({ step: 'vehicle', typeIds: ['t_rigid'], categoryIds: [] });
    expect(vehicleAnswer('t_semi', ['c_box', 'c_box', 'c_curtain'], ['c_curtain', 'c_box'])).toEqual({ step: 'vehicle', typeIds: ['t_semi'], categoryIds: ['c_box', 'c_curtain'] });
    expect(vehicleAnswer('t_semi')).toEqual({ step: 'vehicle', typeIds: ['t_semi'], categoryIds: [] });
  });
  it('with no recommendation the types are listed straight away and nothing is pre-selected', () => {
    const h = host(fx.vehicleStep({ recommended: false }));
    expect(h.ids).not.toContain('intake-vehicle-recommended');
    expect(h.ids).not.toContain('intake-vehicle-more');
    expect(h.el('intake-vehicle-alt-t_van')!.props['data-selected']).toBe('false');
    expect(findAll(h.tree, (n) => n.props['data-selected'] === 'true')).toHaveLength(0);
  });
  it('a TOO_SMALL "recommendation" is not recommended (§19.4, QA-1): no tag, not pre-selected, listed with its warning, still selectable', () => {
    const small = fx.vehicleStep({ fit: 'TOO_SMALL' });
    const h = host(small);
    expect(h.ids).not.toContain('intake-vehicle-recommended');
    expect(h.ids.filter((i) => i.endsWith('-suggested'))).toEqual([]);
    expect(h.text).not.toContain('Recommended for');
    expect(h.text).not.toContain('Suggested');
    expect(findAll(h.tree, (n) => n.props['data-selected'] === 'true')).toHaveLength(0);
    expect(h.ids).not.toContain('intake-vehicle-more'); // nothing is hidden behind "More options": every truck is listed
    expect(h.text).toContain('No truck is suggested for this load');
    expect(h.el('intake-vehicle-alt-t_semi-fit')!.props['data-tone']).toBe('warning');
    expect(h.text).toContain('too small for the load');
    expect(isDisabled(h.el('intake-vehicle-alt-t_semi'))).toBe(false);
    click(h.el('intake-vehicle-alt-t_semi'));
    expect(h.a.answer).toHaveBeenCalledWith(small, { step: 'vehicle', typeIds: ['t_semi'], categoryIds: [] });
    expect(h.ids).toEqual(expect.arrayContaining(['intake-vehicle-alt-t_rigid', 'intake-vehicle-alt-t_van']));
  });
  it('the too-small truck is added to the list when the gateway left it out of the alternatives', () => {
    const e = fx.vehicleStep({ fit: 'TOO_SMALL' });
    const spec = (e as { widget: { alternatives: { typeId: string }[] } }).widget;
    const without = { ...e, widget: { ...spec, alternatives: spec.alternatives.filter((a) => a.typeId !== 't_semi') } } as IntakeStepEvent;
    const h = host(without);
    expect(h.ids).toContain('intake-vehicle-alt-t_semi');
    expect(h.el('intake-vehicle-alt-t_semi-fit')!.props['data-tone']).toBe('warning');
    expect(h.ids.filter((i) => i === 'intake-vehicle-alt-t_semi')).toHaveLength(1);
  });
  it('Greek: the same card says no truck is suggested, in Greek', () => {
    const h = host(fx.vehicleStep({ fit: 'TOO_SMALL' }), { lang: 'el' });
    expect(h.text).toContain('Δεν προτείνεται φορτηγό');
    expect(h.ids.filter((i) => i.endsWith('-suggested'))).toEqual([]);
  });
  it('a usable recommendation still carries the Suggested tag, even with a TIGHT / OVERSIZED note', () => {
    for (const fit of ['FITS', 'TIGHT', 'OVERSIZED']) {
      const h = host(fx.vehicleStep({ fit }));
      expect(h.ids, fit).toContain('intake-vehicle-recommended-suggested');
    }
    expect(recommendationUsable({ fit: 'TOO_SMALL' })).toBe(false);
    expect(recommendationUsable({ fit: 'FITS' })).toBe(true);
    expect(recommendationUsable({})).toBe(true); // an unmeasurable load has no fit — it is not "too small"
    expect(recommendationUsable(undefined)).toBe(false);
  });
  it('reads fit by strict equality on FITS / TIGHT / OVERSIZED / TOO_SMALL — nothing else earns a note', () => {
    expect(host(e).ids).not.toContain('intake-vehicle-fit'); // FITS: no badge
    expect(host(fx.vehicleStep({ fit: 'TIGHT' })).text).toContain('Nearly full for this load.');
    expect(host(fx.vehicleStep({ fit: 'TIGHT' })).el('intake-vehicle-fit')!.props['data-tone']).toBe('info');
    expect(host(fx.vehicleStep({ fit: 'OVERSIZED' })).text).toContain('Bigger than this load needs.');
    for (const bad of ['OK', 'too_small', 'small', 'SMALL', 'Too_Small', 'ok', 'too_big']) {
      expect(host(fx.vehicleStep({ fit: bad })).ids, bad).not.toContain('intake-vehicle-fit');
    }
  });
  it('shows a note on an alternative that carries a fit, and none when it carries none', () => {
    const withFit = host(fx.vehicleStep({ altFit: true }), { states: [true] });
    expect(withFit.text).toContain('Nearly full for this load.');
    expect(withFit.el('intake-vehicle-alt-t_van-fit')!.props['data-tone']).toBe('warning');
    expect(isDisabled(withFit.el('intake-vehicle-alt-t_van'))).toBe(false);
    expect(host(e, { states: [true] }).ids.filter((i) => i.endsWith('-fit'))).toEqual([]);
  });
  it('no recommendation and a warning is "no truck holds this load" (vehicle.tooBig) — not a fit value', () => {
    const big = fx.vehicleStep({ tooBig: true });
    expect(stepViewOf(big).kind).toBe('vehicle');
    const h = host(big);
    expect(h.text).toContain('too heavy for one truck');
    expect(h.ids).not.toContain('intake-vehicle-recommended');
    expect(host(fx.vehicleStep({ recommended: false })).ids).not.toContain('intake-vehicle-toobig');
    expect(host(e).ids).not.toContain('intake-vehicle-toobig');
    // §20: `warning` is a Txt — the gateway sends the text already in the shipper's language, and the widget shows it as it is.
    const bigEl = { ...big, widget: { ...(big.widget as object), warning: { key: 'vehicle.tooBig', text: 'Το φορτίο είναι πολύ βαρύ για ένα φορτηγό.' } } } as IntakeStepEvent;
    expect(host(bigEl, { lang: 'el' }).text).toContain('πολύ βαρύ για ένα φορτηγό');
  });
  it('the load\'s weight (capacity.weightKg) is what "Recommended for {kg} kg" says (§19.3)', () => {
    const w = e.widget as unknown as { recommended: Record<string, unknown> };
    const noRationale = { ...e, widget: { ...w, recommended: { ...w.recommended, rationale: undefined, truckCapacity: { maxWeightKg: 24000, maxPallets: 33 } } } } as IntakeStepEvent;
    const t = host(noRationale).text;
    expect(t).toContain('Recommended for 1200 kg');
    expect(t).not.toContain('24000'); // the truck's own limits are not rendered until the gateway sends them AND a design asks for it
  });
  it('falls back to the capacity sentence when the gateway sent no rationale', () => {
    const w = e.widget as unknown as { recommended: Record<string, unknown> };
    const noRationale = { ...e, widget: { ...w, recommended: { ...w.recommended, rationale: undefined } } } as IntakeStepEvent;
    expect(host(noRationale).text).toContain('Recommended for 1200 kg: Semi-trailer, curtain side');
  });
  it('is disabled while a request is in flight', () => {
    const h = host(e, { busy: true });
    expect(isDisabled(h.el('intake-vehicle-recommended'))).toBe(true);
    click(h.el('intake-vehicle-recommended'));
    expect(h.a.answer).not.toHaveBeenCalled();
  });
  it('is Greek in Greek', () => {
    const h = host(e, { lang: 'el' });
    expect(h.text).toContain('Προτεινόμενο');
    expect(h.text).toContain('Περισσότερες επιλογές');
  });
  it('a spec with nothing to pick from degrades to the text step, never an empty card', () => {
    const empty = { ...e, widget: { kind: 'vehicle', alternatives: [] } } as unknown as IntakeStepEvent;
    expect(stepViewOf(empty).kind).toBe('text');
    expect(vehicleAnswer('t', ['a'])).toEqual({ step: 'vehicle', typeIds: ['t'], categoryIds: ['a'] });
  });
});

describe('Channel widget — Private shows its partners right away (MS3-409)', () => {
  const ids = (n: number) => fx.PARTNERS.slice(0, n).map((p) => p.id);
  it('without a list: Private is pre-selected and "Send to all my partners" is one tap', () => {
    const e = fx.channelStep();
    const h = host(e);
    expect(h.el('intake-channel-private')!.props['data-selected']).toBe('true');
    expect(h.text).toContain('Private · my partners (12)');
    expect(h.text).toContain('Public marketplace');
    expect(h.el('intake-channel-public')!.props['data-selected']).toBe('false');
    expect(h.ids).not.toContain('intake-channel-publicbox');
    noRawKeys(h.text);
    click(h.el('intake-channel-all'));
    expect(h.a.answer).toHaveBeenCalledTimes(1);
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'channel', channel: 'private', partnerIds: [], allPartners: true });
  });
  it('with the list: it is shown under Private at once, every partner ticked, and one tap sends to all', () => {
    const e = fx.channelStep({ items: true });
    const h = host(e);
    expect(h.ids).toContain('intake-channel-pickbox');
    for (const id of ids(12)) expect(h.el(`intake-channel-pick-list-opt-${id}`)!.props['data-selected']).toBe('true');
    expect(h.text).toContain('Send to all 12 partners');
    click(h.el('intake-channel-pick-confirm'));
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'channel', channel: 'private', partnerIds: [], allPartners: true });
  });
  it('untick to narrow it: the exact partners left are sent', () => {
    const e = fx.channelStep({ items: true });
    const h = host(e);
    click(h.el('intake-channel-pick-list-opt-p_77'));
    expect(h.setCalls).toEqual([{ index: 1, value: ids(12).filter((id) => id !== 'p_77') }]);
    const two = host(e, { states: [false, ['p_77', 'p_101']] });
    expect(two.el('intake-channel-pick-list-opt-p_102')!.props['data-selected']).toBe('false');
    expect(two.text).toContain('Send to 2 partners');
    click(two.el('intake-channel-pick-confirm'));
    expect(two.a.answer).toHaveBeenCalledWith(e, { step: 'channel', channel: 'private', partnerIds: ['p_77', 'p_101'] });
  });
  it('Select all / Clear; nothing ticked means nothing to send', () => {
    const e = fx.channelStep({ items: true });
    const none = host(e, { states: [false, []] });
    expect(isDisabled(none.el('intake-channel-pick-confirm'))).toBe(true);
    expect(isDisabled(none.el('intake-channel-pick-none'))).toBe(true);
    click(none.el('intake-channel-pick-all'));
    expect(none.setCalls).toEqual([{ index: 1, value: ids(12) }]);
    const all = host(e);
    expect(isDisabled(all.el('intake-channel-pick-all'))).toBe(true);
    click(all.el('intake-channel-pick-none'));
    expect(all.setCalls).toEqual([{ index: 1, value: [] }]);
  });
  it('the AI-suggested partner is pre-ticked (with its reason) when the gateway proposes it instead of everyone', () => {
    const e = fx.channelStep({ items: true, suggested: true, defaultChoice: null });
    const h = host(e);
    expect(h.el('intake-channel-pick-list-opt-p_77')!.props['data-selected']).toBe('true');
    expect(h.el('intake-channel-pick-list-opt-p_101')!.props['data-selected']).toBe('false');
    expect(h.text).toContain('Suggested');
    expect(h.text).toContain('Your contract partner on Athens–Ioannina');
    expect(proposedPartnerIds(e.widget as never, fx.PARTNERS.slice(0, 12))).toEqual(['p_77']);
    expect(proposedPartnerIds(fx.channelStep({ items: true }).widget as never, fx.PARTNERS.slice(0, 3))).toEqual(ids(3));
  });
  it('without a list, a suggested partner keeps its one-tap "Only <name>", with the reason', () => {
    const e = fx.channelStep({ suggested: true });
    const h = host(e);
    expect(h.text).toContain('Only Hellas Freight');
    expect(h.text).toContain('Your contract partner on Athens–Ioannina');
    click(h.el('intake-channel-partner'));
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'channel', channel: 'private', partnerIds: ['p_77'] });
  });
  it('Public hides the list and asks before posting; Back brings the list back', () => {
    const e = fx.channelStep({ quota: true, items: true });
    const h = host(e);
    click(h.el('intake-channel-public'));
    expect(h.setCalls).toEqual([{ index: 0, value: true }]);
    expect(h.a.answer).not.toHaveBeenCalled();
    const open = host(e, { states: [true] });
    expect(open.ids).not.toContain('intake-channel-pickbox');
    expect(open.text).toContain('visible to every carrier on MYVAGON');
    expect(open.text).toContain('Public loads used: 3 of 10');
    expect(open.el('intake-channel-private')!.props['data-selected']).toBe('false');
    click(open.el('intake-channel-public-confirm'));
    expect(open.a.answer).toHaveBeenCalledWith(e, { step: 'channel', channel: 'public', partnerIds: [] });
    click(open.el('intake-channel-public-back'));
    expect(open.setCalls).toEqual([{ index: 0, value: false }]);
  });
  it('with no partners there is no private answer, an explanation, and Public still asks first', () => {
    const h = host(fx.channelStep({ partners: 0 }));
    expect(h.ids).not.toContain('intake-channel-private');
    expect(h.ids).not.toContain('intake-channel-all');
    expect(h.ids).not.toContain('intake-channel-public-back');
    expect(h.text).toContain('You have no partners yet');
    expect(h.a.answer).not.toHaveBeenCalled();
  });
  it('pre-selects Public only when the gateway proposed it, and still asks before posting', () => {
    const e = fx.channelStep({ proposal: 'public', items: true });
    const h = host(e);
    expect(h.el('intake-channel-public')!.props['data-selected']).toBe('true');
    expect(h.el('intake-channel-private')!.props['data-selected']).toBe('false');
    expect(h.ids).not.toContain('intake-channel-pickbox');
    expect(h.a.answer).not.toHaveBeenCalled();
    expect(channelDefaultOf(e.widget as never)).toBe('public');
  });
  it('above 50 partners with no list yet, "all my partners" is still the one tap', () => {
    const h = host(fx.channelStep({ partners: 80 }));
    expect(h.ids).not.toContain('intake-channel-pickbox');
    expect(h.ids).toContain('intake-channel-all');
    expect(PARTNERS_R4_LIVE).toBe(false);
  });
  it('a long list gets a search box, and it filters by name', () => {
    const e = fx.channelStep({ items: true });
    expect(host(e).ids).toContain('intake-channel-pick-search');
    const filtered = host(e, { states: [false, null, 'aegean'] });
    expect(filtered.ids).toContain('intake-channel-pick-list-opt-p_101');
    expect(filtered.ids).not.toContain('intake-channel-pick-list-opt-p_77');
    expect(host(e, { states: [false, null, 'zzzz'] }).text).toContain('Nothing matches.');
  });
  it('is disabled while a request is in flight', () => {
    const h = host(fx.channelStep({ items: true }), { busy: true });
    expect(isDisabled(h.el('intake-channel-private'))).toBe(true);
    expect(isDisabled(h.el('intake-channel-public'))).toBe(true);
    expect(isDisabled(h.el('intake-channel-pick-confirm'))).toBe(true);
  });
  it('is Greek in Greek', () => {
    const h = host(fx.channelStep({ items: true }), { lang: 'el' });
    expect(h.text).toContain('Ιδιωτικό · οι συνεργάτες μου (12)');
    expect(h.text).toContain('Δημόσια αγορά');
    expect(h.text).toContain('Αποστολή σε όλους τους 12 συνεργάτες');
    expect(host(fx.channelStep({ items: true }), { lang: 'el', states: [false, ['p_77']] }).text).toContain('Αποστολή σε 1 συνεργάτες');
  });
  it('builds the four answers', () => {
    expect(channelAnswer({ kind: 'all' })).toEqual({ step: 'channel', channel: 'private', partnerIds: [], allPartners: true });
    expect(channelAnswer({ kind: 'partner', partnerId: 'p' })).toEqual({ step: 'channel', channel: 'private', partnerIds: ['p'] });
    expect(channelAnswer({ kind: 'public' })).toEqual({ step: 'channel', channel: 'public', partnerIds: [] });
    expect(channelAnswer({ kind: 'partners', partnerIds: ['a', 'a', 'b'] })).toEqual({ step: 'channel', channel: 'private', partnerIds: ['a', 'b'] });
    expect(stepViewOf({ ...fx.channelStep(), widget: { kind: 'channel' } } as unknown as IntakeStepEvent).kind).toBe('text');
  });
});

describe('Channel widget — labels and copy', () => {
  const ids = (n: number) => fx.PARTNERS.slice(0, n).map((p) => p.id);
  it('answerLabel names the partners that were picked', () => {
    const e = fx.channelStep({ items: true });
    const l = answerLabel(e, channelAnswer({ kind: 'partners', partnerIds: ids(2) }));
    expect(l).toEqual({ key: 'history.channel', params: { who: 'Hellas Freight, Aegean Haulage' }, fallbackText: 'Send to: Hellas Freight, Aegean Haulage' });
    expect(channelAnswer({ kind: 'partners', partnerIds: ['a', 'a', 'b'] })).toEqual({ step: 'channel', channel: 'private', partnerIds: ['a', 'b'] });
  });
  it('why is a plain string, already localised; a Txt still renders', () => {
    const h = host(fx.channelStep({ suggested: true }));
    expect(h.text).toContain('Your contract partner on Athens–Ioannina');
    const e = fx.channelStep({ suggested: true });
    const w = e.widget as unknown as { suggested: Record<string, unknown> };
    const asTxt = { ...e, widget: { ...w, suggested: { ...w.suggested, why: fx.txt('channel.why', 'Because Txt') } } } as IntakeStepEvent;
    expect(host(asTxt).text).toContain('Because Txt');
  });
});

describe('Tracking widget — Yes/No with the consequence, default ON', () => {
  it('shows the question, the consequence and the default selected', () => {
    const e = fx.trackingStep(true);
    const h = host(e);
    expect(h.text).toContain('Require live navigation (GPS tracking)?');
    expect(h.text).toContain("the carrier can't mark it delivered by hand");
    expect(h.el('intake-tracking-yes')!.props['data-selected']).toBe('true');
    expect(h.el('intake-tracking-no')!.props['data-selected']).toBe('false');
    expect(h.ids).toContain('intake-tracking-yes-suggested');
    noRawKeys(h.text);
  });
  it('pre-selects the shipper\'s remembered answer when it was OFF', () => {
    const h = host(fx.trackingStep(false));
    expect(h.el('intake-tracking-no')!.props['data-selected']).toBe('true');
    expect(h.el('intake-tracking-yes')!.props['data-selected']).toBe('false');
    expect(trackingDefaultOf({ kind: 'tracking' })).toBe(true); // C9: no remembered answer ⇒ ON
  });
  it('one tap posts the answer — no Continue button', () => {
    const e = fx.trackingStep(true);
    const h = host(e);
    click(h.el('intake-tracking-yes'));
    click(h.el('intake-tracking-no'));
    expect(h.a.answer).toHaveBeenNthCalledWith(1, e, { step: 'tracking', tracking: true });
    expect(h.a.answer).toHaveBeenNthCalledWith(2, e, { step: 'tracking', tracking: false });
    expect(findAll(h.tree, (n) => n.type === 'button').filter((b) => !String(b.props['data-testid']).startsWith('intake-tracking-')
      && b.props['data-testid'] !== 'intake-express' && b.props['data-testid'] !== 'intake-to-summary')).toHaveLength(0);
  });
  it('uses its own consequence line when the gateway sent none', () => {
    const e = { ...fx.trackingStep(), widget: { kind: 'tracking', default: true } } as IntakeStepEvent;
    expect(host(e).text).toContain("The driver has to run the job in the app");
  });
  it('is skipped by the shortcuts: "Use defaults for the rest" and "Go to summary" post their own answers', () => {
    const e = fx.trackingStep();
    const h = host(e);
    click(h.el('intake-express'));
    click(h.el('intake-to-summary'));
    expect(h.a.answer).toHaveBeenNthCalledWith(1, e, { step: 'express', mode: 'defaults' });
    expect(h.a.answer).toHaveBeenNthCalledWith(2, e, { step: 'to_summary' });
  });
  it('is disabled while a request is in flight, and Greek in Greek', () => {
    expect(isDisabled(host(fx.trackingStep(), { busy: true }).el('intake-tracking-yes'))).toBe(true);
    const el = host(fx.trackingStep(), { lang: 'el' });
    expect(el.text).toContain('Ναι, με παρακολούθηση');
    expect(el.text).toContain('Όχι');
  });
});

describe('Negotiable widget — Yes (default) or fixed price', () => {
  const e = fx.negotiableStep();
  it('pre-selects Yes, negotiable', () => {
    const h = host(e);
    expect(h.text).toContain('Can carriers counter-offer on the price?');
    expect(h.el('intake-negotiable-yes')!.props['data-selected']).toBe('true');
    expect(h.el('intake-negotiable-no')!.props['data-selected']).toBe('false');
    noRawKeys(h.text);
  });
  it('one tap posts the answer', () => {
    const h = host(e);
    click(h.el('intake-negotiable-yes'));
    click(h.el('intake-negotiable-no'));
    expect(h.a.answer).toHaveBeenNthCalledWith(1, e, { step: 'negotiable', negotiable: true });
    expect(h.a.answer).toHaveBeenNthCalledWith(2, e, { step: 'negotiable', negotiable: false });
  });
  it('is disabled while busy, and Greek in Greek', () => {
    expect(isDisabled(host(e, { busy: true }).el('intake-negotiable-no'))).toBe(true);
    expect(host(e, { lang: 'el' }).text).toContain('Ναι, διαπραγματεύσιμη');
  });
});

describe('Price widget — suggestion pre-filled, Set price or Decide later', () => {
  it('pre-fills the suggestion and says where it came from', () => {
    const e = fx.priceStep();
    const h = host(e);
    expect(h.el('intake-price-input')!.props.value).toBe('640');
    expect(h.text).toContain('Suggested: €640');
    expect(h.text).toContain('Set price');
    expect(h.text).toContain('Decide later');
    expect(isDisabled(h.el('intake-price-set'))).toBe(false);
    noRawKeys(h.text);
  });
  it('Set price posts the number', () => {
    const e = fx.priceStep();
    const h = host(e);
    click(h.el('intake-price-set'));
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'price', price: 640 });
  });
  it('a typed amount (with a comma, as on a Greek keyboard) posts that amount', () => {
    const e = fx.priceStep();
    const h = host(e, { states: ['12,5'] });
    click(h.el('intake-price-set'));
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'price', price: 12.5 });
    typed(h, 'intake-price-input', '700');
    expect(h.setCalls).toEqual([{ index: 0, value: '700' }]);
  });
  it('Enter sets the price', () => {
    const e = fx.priceStep();
    const h = host(e);
    (h.el('intake-price-input')!.props.onKeyDown as (ev: unknown) => void)({ key: 'Enter', preventDefault: () => undefined, nativeEvent: { isComposing: false } });
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'price', price: 640 });
  });
  it('an unusable amount disables Set price and explains why', () => {
    for (const bad of ['0', '-5', '12.345', 'abc', '1,2.3', '12345678']) {
      const h = host(fx.priceStep(), { states: [bad] });
      expect(isDisabled(h.el('intake-price-set')), bad).toBe(true);
      expect(h.ids, bad).toContain('intake-price-invalid');
      expect(h.text).toContain('Enter an amount above 0 with up to 2 decimals, for example 1,234.50 or 12.5.');
      click(h.el('intake-price-set'));
      expect(h.a.answer).not.toHaveBeenCalled();
    }
  });
  it('an empty box disables Set price without scolding', () => {
    const h = host(fx.priceStep({ suggested: null }));
    expect(isDisabled(h.el('intake-price-set'))).toBe(true);
    expect(h.ids).not.toContain('intake-price-invalid');
  });
  it('Decide later posts null', () => {
    const e = fx.priceStep();
    const h = host(e);
    click(h.el('intake-price-skip'));
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'price', price: null });
  });
  it('a fixed price cannot be left for later: no skip, and the reason is shown', () => {
    const h = host(fx.priceStep({ suggested: null, canSkip: false }));
    expect(h.ids).not.toContain('intake-price-skip');
    expect(h.text).toContain('A fixed price needs an amount.');
  });
  it('is disabled while busy, and Greek in Greek', () => {
    const b = host(fx.priceStep(), { busy: true });
    expect(isDisabled(b.el('intake-price-input'))).toBe(true);
    expect(isDisabled(b.el('intake-price-set'))).toBe(true);
    expect(host(fx.priceStep(), { lang: 'el' }).text).toContain('Ορισμός τιμής');
  });
  it('the amount rules', () => {
    expect(parsePrice('640')).toEqual({ ok: true, value: 640 });
    expect(parsePrice(' €12,50 ')).toEqual({ ok: true, value: 12.5 });
    expect(parsePrice('0.5')).toEqual({ ok: true, value: 0.5 });
    expect(parsePrice('9999999.99')).toEqual({ ok: true, value: 9999999.99 });
    expect(parsePrice('10000000')).toEqual({ ok: false, reason: 'invalid' });
    expect(parsePrice('0')).toEqual({ ok: false, reason: 'invalid' });
    expect(parsePrice('')).toEqual({ ok: false, reason: 'empty' });
    expect(parsePrice('1.2.3')).toEqual({ ok: false, reason: 'invalid' });
    expect(parsePrice('123456', { maxIntDigits: 5 })).toEqual({ ok: false, reason: 'invalid' });
    expect(formatAmount(12.5)).toBe('12.5');
    expect(formatAmount(640)).toBe('640');
  });
});

describe('Order value widget — the sum of the orders pre-filled, Set value or Skip', () => {
  it('pre-fills the auto-sum and says so', () => {
    const e = fx.orderValueStep(1280.5);
    const h = host(e);
    expect(h.el('intake-ordervalue-input')!.props.value).toBe('1280.5');
    expect(h.text).toContain('Total of your orders: €1,280.50');
    expect(h.text).toContain('Skip');
    noRawKeys(h.text);
  });
  it('Set value posts the number; Skip posts null', () => {
    const e = fx.orderValueStep(1280.5);
    const h = host(e);
    click(h.el('intake-ordervalue-set'));
    click(h.el('intake-ordervalue-skip'));
    expect(h.a.answer).toHaveBeenNthCalledWith(1, e, { step: 'order_value', orderValue: 1280.5 });
    expect(h.a.answer).toHaveBeenNthCalledWith(2, e, { step: 'order_value', orderValue: null });
  });
  it('with no orders the box is empty; a blank value is a skip (§19.7), so Set value on it posts null', () => {
    const e = fx.orderValueStep(null);
    const h = host(e);
    expect(h.el('intake-ordervalue-input')!.props.value).toBe('');
    expect(isDisabled(h.el('intake-ordervalue-set'))).toBe(false);
    click(h.el('intake-ordervalue-set'));
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'order_value', orderValue: null });
    expect(h.text).not.toContain('Total of your orders');
  });
  it('zero is a skip (posts null); a negative value is refused (§19.7)', () => {
    const e = fx.orderValueStep(null);
    const zero = host(e, { states: ['0'] });
    click(zero.el('intake-ordervalue-set'));
    expect(zero.a.answer).toHaveBeenCalledWith(e, { step: 'order_value', orderValue: null });
    expect(parseOrderValue('-1').ok).toBe(false);
    expect(parseAmount('0', { maxIntDigits: 3, decimals: 2, allowZero: true }).ok).toBe(true);
    expect(host(e, { states: ['-3'] }).text).toContain('Enter an amount from 0 to 99,999,999.99 with up to 2 decimals, for example 1,234.50 or 12.5.');
  });
  it('accepts 0 to 99,999,999.99 with ≤ 2 decimals, a decimal comma included; refuses 9+ integer digits, a third decimal, or a thousands separator', () => {
    expect(parseOrderValue('99999999.99')).toEqual({ ok: true, value: 99999999.99 });
    expect(parseOrderValue('99.999.999,99')).toEqual({ ok: true, value: 99999999.99 }); // both marks ⇒ unambiguous, whatever the language
    expect(parseOrderValue('12,5')).toEqual({ ok: true, value: 12.5 });
    expect(parseOrderValue('')).toEqual({ ok: true, value: 0 });
    expect(parseOrderValue('0')).toEqual({ ok: true, value: 0 });
    expect(parseOrderValue('100000000').ok).toBe(false); // 9 integer digits — the old 12-digit cap let this through
    expect(parseOrderValue('999999999999').ok).toBe(false);
    expect(parseOrderValue('1.234').ok).toBe(false); // English: a decimal point ⇒ three decimals ⇒ refused, never guessed
    expect(parseOrderValue('1,200')).toEqual({ ok: true, value: 1200 }); // English: a comma is the thousands mark (QA-1)
    expect(orderValueAnswerOf(0)).toBeNull();
    expect(orderValueAnswerOf(12.5)).toBe(12.5);
  });
  it('is disabled while busy, and Greek in Greek', () => {
    expect(isDisabled(host(fx.orderValueStep(), { busy: true }).el('intake-ordervalue-set'))).toBe(true);
    const el = host(fx.orderValueStep(), { lang: 'el' });
    expect(el.text).toContain('Σύνολο των παραγγελιών σου: €1.280,50');
    expect(el.el('intake-ordervalue-input')!.props.value).toBe('1280,5');
    expect(el.text).toContain('Παράλειψη');
  });
});

describe('what a spent terms widget keeps as its answer line', () => {
  const t = makeT('en');
  const exists = makeExists('en');
  const line = (e: IntakeStepEvent, a: Parameters<typeof answerLabel>[1], tt = t, ex = exists) => renderLocalisable(tt, answerLabel(e, a), ex);
  it('reads like the gateway\'s own history', () => {
    expect(line(fx.trackingStep(), { step: 'tracking', tracking: true })).toBe('Yes, track it');
    expect(line(fx.trackingStep(), { step: 'tracking', tracking: false })).toBe('No');
    expect(line(fx.negotiableStep(), { step: 'negotiable', negotiable: false })).toBe('No, fixed price');
    expect(line(fx.priceStep(), { step: 'price', price: 640 })).toBe('Price: €640');
    expect(line(fx.priceStep(), { step: 'price', price: null })).toBe('Decide later');
    expect(line(fx.orderValueStep(), { step: 'order_value', orderValue: 12.5 })).toBe('Order value: €12.5');
    expect(line(fx.orderValueStep(), { step: 'order_value', orderValue: null })).toBe('Skip');
    expect(line(fx.vehicleStep(), vehicleAnswer('t_semi', ['c_box']))).toBe('Truck: Semi-trailer, curtain side');
    expect(line(fx.vehicleStep(), vehicleAnswer('t_van', ['c_van']))).toBe('Truck: Van');
    expect(line(fx.channelStep(), channelAnswer({ kind: 'all' }))).toBe('Private · all my partners (12)');
    expect(line(fx.channelStep(), channelAnswer({ kind: 'public' }))).toBe('Public marketplace');
    expect(line(fx.channelStep({ suggested: true }), channelAnswer({ kind: 'partner', partnerId: 'p_77' }))).toBe('Send to: Hellas Freight');
  });
  it('follows a language switch', () => {
    const el = makeT('el');
    const ex = makeExists('el');
    expect(line(fx.trackingStep(), { step: 'tracking', tracking: true }, el, ex)).toBe('Ναι, με παρακολούθηση');
    expect(line(fx.channelStep(), channelAnswer({ kind: 'all' }), el, ex)).toBe('Ιδιωτικό · όλοι οι συνεργάτες μου (12)');
  });
  it('a spent widget is read-only and shows the answer', () => {
    const e = fx.priceStep();
    const a = actions();
    const r = render(createElement(IntakeWidgetHostView, {
      ui: makeUi('en'), exists: makeExists('en'),
      state: { kind: 'event', event: e, answered: answerLabel(e, { step: 'price', price: 640 })! }, live: false, busy: false, canMeasureRoute: true, actions: a,
    }));
    expect(textOf(r.tree)).toContain('What price do you offer?');
    expect(textOf(r.tree)).toContain('Price: €640');
    expect(allTestIds(r.tree)).not.toContain('intake-price-set');
  });
});
