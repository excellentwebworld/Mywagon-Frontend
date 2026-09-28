/**
 * SelectionCards — the tap-instead-of-type disambiguation for Vagon AI.
 *
 * The shipment flow is the longest one in the product, and most of its length
 * was disambiguation: the shipper types "from Athens", four Athens sites match,
 * and settling which one costs a question, a typed answer, and sometimes a
 * second question. That repeated for the delivery site and again for the
 * product. An `options` event replaces each of those exchanges with one tap.
 *
 * Deliberately thin, because a card list that needs scrolling defeats the
 * purpose. Every card is built from a record the core API actually returned
 * during the turn, so a card can never name something the shipper does not have
 * — and every string arrives already written in their language, so there is
 * nothing here to translate.
 *
 * Three things this shows beyond the cards themselves, each closing a dead end
 * rather than decorating the list:
 *
 * - **What was searched for.** Four near-identical sites give no clue why those
 *   four came back, and the search term is usually the thing the shipper wants
 *   to correct.
 * - **That typing still works.** The picker is an offer, not a gate. Without
 *   saying so, a shipper whose site is not among the six sees creating a
 *   duplicate as the only way forward.
 * - **Which card they picked, in words.** A spent list styled only by dimming
 *   and an accent border reads ambiguously, and announces nothing.
 *
 * Some lists take more than one answer. A load can accept two trailer types and
 * go to five hauliers at once, so those arrive with `multiple: true` and are
 * rendered as checkboxes with a confirm button underneath: nothing is sent until
 * the shipper says they are done. Answering those one card per turn would be the
 * interrogation this whole component exists to remove.
 */
import { Fragment, useState } from 'react';
import { MapPin, Package, Plus, Check, Search, Truck, Globe, Users, Tag, FileText, Send, ChevronDown } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { CargoCapture, SelectionCapture, SelectionOption, SelectionRequest } from '../../hooks/useChat';
import type { ThemeTokens } from '../../utils/themes';
import { groupSelectionOptions, initialExpandedGroups, isSectionOpen } from './selectionGroups';

interface Props {
  request: SelectionRequest;
  T: ThemeTokens;
  /**
   * Always an array: a single tap and a multi-select confirm are one request.
   * `cargo` rides along when the list carried a capture form and it was filled in.
   */
  onChoose: (optionIds: string[], cargo?: CargoCapture) => void;
  /** True while a turn is streaming — the list is still readable, just not tappable. */
  disabled?: boolean;
  /** Set once this list has been answered; marks the cards the shipper picked. */
  chosenIds?: string[];
}

type Tone = 'neutral' | 'info' | 'warning';

/**
 * Badge colours as translucent fills rather than the flat STATUS_COLORS pairs,
 * whose light backgrounds only work on a light theme. `warning` carries the
 * reason a card is greyed out, so it has to stay legible in both.
 */
function badgeStyle(tone: Tone, T: ThemeTokens, isDark: boolean): { background: string; color: string } {
  if (tone === 'warning') return { background: 'rgba(245,158,11,0.16)', color: isDark ? '#FBBF24' : '#B45309' };
  if (tone === 'info') return { background: 'rgba(14,165,233,0.14)', color: isDark ? '#7DD3FC' : '#0369A1' };
  return { background: T.sa, color: T.t2 };
}

/**
 * The action card creates a record instead of choosing one, so it always sits at
 * the bottom: a shipper who taps it by reflex has started an interview they did
 * not want. The gateway already sends it last — this only keeps that true.
 */
function actionLast(options: SelectionOption[]): SelectionOption[] {
  return [...options].sort((a, b) => Number(a.kind === 'action') - Number(b.kind === 'action'));
}

/**
 * The cargo form under a chosen product.
 *
 * Rendered beside the card rather than inside it, because a card is a `<button>`
 * and a select inside a button is neither valid nor operable. Attached to the
 * chosen card by position and by a shared accent border, so it reads as part of
 * the same answer.
 *
 * Everything it displays comes from the gateway: the labels are already in the
 * shipper's language and the two vocabularies are MYVAGON's own cargo-line
 * enums. Nothing is translated here and nothing is invented here.
 */
function CargoForm({
  capture, defaults, T, disabled, onSubmit,
}: {
  capture: SelectionCapture;
  defaults?: SelectionOption['captureDefaults'];
  T: ThemeTokens;
  disabled: boolean;
  onSubmit: (cargo?: CargoCapture) => void;
}) {
  const [qty, setQty] = useState('');
  const [weight, setWeight] = useState('');
  /**
   * Both units start EMPTY when the product does not record one.
   *
   * Not for tidiness. `Tonnes` and `Kgs` are the first two entries of a list, and
   * defaulting to either turns an unchecked field into a thousand-fold error on
   * the cargo line — which is the same reason the gateway refuses to read a bare
   * "12.5" off a product as a weight. A shipper who has to pick has picked; a
   * shipper shown a plausible default has not.
   */
  const [unit, setUnit] = useState(() => defaults?.qty_unit ?? '');
  const [weightUnit, setWeightUnit] = useState(() => defaults?.weight_unit ?? '');
  /**
   * Whether the shipper has typed a weight of their own.
   *
   * Until they have, a quantity fills the weight in from the product's recorded
   * weight per unit — which is the arithmetic the assistant used to offer in
   * prose ("12 cases at 12.5 kg each — 150 kg in total?"). Once they have typed
   * one, nothing overwrites it: a total the shipper corrected is the fact, and
   * the per-unit figure on a product is frequently out of date.
   */
  const [weightTouched, setWeightTouched] = useState(false);

  const perUnit = defaults?.weight_per_unit;

  const changeQty = (next: string) => {
    setQty(next);
    if (weightTouched || !perUnit) return;
    const parsed = Number(next);
    if (!next.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      setWeight('');
      return;
    }
    // Rounded to three places: 12 × 12.5 must read as 150, not 150.00000000000003.
    setWeight(String(Math.round(parsed * perUnit * 1000) / 1000));
  };

  const qtyValue = Number(qty);
  const weightValue = Number(weight);
  const complete = Boolean(qty.trim()) && Number.isFinite(qtyValue) && qtyValue > 0
    && Boolean(weight.trim()) && Number.isFinite(weightValue) && weightValue > 0
    && Boolean(unit) && Boolean(weightUnit);
  // A form left blank is not an error. The gateway falls back to asking for the
  // quantity and the weight, which is exactly what it did before this existed.
  const partial = (Boolean(qty.trim()) || Boolean(weight.trim())) && !complete;

  const fieldStyle = {
    height: 30, borderRadius: 8, border: `1px solid ${T.bd}`, background: T.sf,
    color: T.t1, fontSize: 12.5, padding: '0 8px', minWidth: 0,
  } as const;
  /**
   * Marks the field still holding the form back.
   *
   * The submit button is disabled while the line is half-filled, and a disabled
   * button with no reason is a dead end — so the reason is shown on the field
   * itself. A colour rather than a sentence, because every word on these cards
   * arrives from the gateway already translated and this one would not.
   */
  const flag = (filled: boolean) => (partial && !filled
    ? { ...fieldStyle, border: '1px solid rgba(245,158,11,0.9)' }
    : fieldStyle);
  const labelStyle = {
    fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em',
    textTransform: 'uppercase', color: T.t3, marginBottom: 3,
  } as const;

  return (
    <div
      className="rounded-lg"
      style={{
        marginTop: 6, padding: '10px 12px', border: `1px solid ${T.ac}`,
        background: T.sa,
      }}
    >
      <div className="flex flex-wrap" style={{ gap: 8 }}>
        <div className="flex flex-col" style={{ flex: '1 1 120px', minWidth: 110 }}>
          <label style={labelStyle} htmlFor="vagonai-cargo-qty">{capture.labels.qty}</label>
          <input
            id="vagonai-cargo-qty"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={qty}
            disabled={disabled}
            onChange={(e) => changeQty(e.target.value)}
            style={flag(Boolean(qty.trim()))}
          />
        </div>
        <div className="flex flex-col" style={{ flex: '1 1 130px', minWidth: 120 }}>
          <label style={labelStyle} htmlFor="vagonai-cargo-unit">{capture.labels.unit}</label>
          <select
            id="vagonai-cargo-unit"
            value={unit}
            disabled={disabled}
            onChange={(e) => setUnit(e.target.value)}
            style={flag(Boolean(unit))}
          >
            {/* No label to translate, and no unit it could be mistaken for. */}
            <option value="">—</option>
            {capture.units.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col" style={{ flex: '1 1 120px', minWidth: 110 }}>
          <label style={labelStyle} htmlFor="vagonai-cargo-weight">{capture.labels.weight}</label>
          <input
            id="vagonai-cargo-weight"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={weight}
            disabled={disabled}
            onChange={(e) => { setWeightTouched(true); setWeight(e.target.value); }}
            style={flag(Boolean(weight.trim()))}
          />
        </div>
        <div className="flex flex-col" style={{ flex: '1 1 110px', minWidth: 100 }}>
          <label style={labelStyle} htmlFor="vagonai-cargo-weight-unit">{capture.labels.weightUnit}</label>
          <select
            id="vagonai-cargo-weight-unit"
            value={weightUnit}
            disabled={disabled}
            onChange={(e) => setWeightUnit(e.target.value)}
            style={flag(Boolean(weightUnit))}
          >
            <option value="">—</option>
            {capture.weightUnits.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center mt-2" style={{ gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={disabled || partial}
          onClick={() => onSubmit(
            complete
              ? { qty: qtyValue, unit, weight: weightValue, weight_unit: weightUnit }
              : undefined,
          )}
          className="rounded-lg"
          style={{
            height: 32, padding: '0 14px', border: 'none', background: T.ac, color: '#fff',
            fontSize: 13, fontWeight: 700,
            cursor: disabled || partial ? 'default' : 'pointer',
            opacity: disabled || partial ? 0.5 : 1,
          }}
        >
          {capture.labels.submit}
        </button>
        <span style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.4 }}>{capture.labels.hint}</span>
      </div>
    </div>
  );
}

export default function SelectionCards({ request, T, onChoose, disabled, chosenIds }: Props) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  // Keyboard focus is tracked alongside hover and styled identically. Inline
  // styles cannot express :focus-visible, and without this a shipper tabbing
  // through the list gets no indication of where they are — the list would be
  // operable by keyboard but not navigable by it.
  const [active, setActive] = useState<string | null>(null);
  /**
   * What is ticked on a multi-select list, before it is sent.
   *
   * Local because nothing has been answered yet — a half-ticked list is not a
   * turn, and putting it in the transcript would make the shipper's own message
   * change under them as they clicked.
   */
  const [ticked, setTicked] = useState<string[]>([]);
  // An answered list stays on screen as the record of what was picked, so it is
  // shown inert rather than removed — and nothing on it can be tapped twice.
  const answered = (chosenIds?.length ?? 0) > 0;
  const spent = disabled || answered;
  const hasRecords = request.options.some((option) => option.kind === 'record');
  // An action card is an escape hatch out of the list ("I'll set my own price"),
  // so it answers immediately even here — ticking it alongside three carriers
  // would be asking for two contradictory things at once.
  const multi = request.multiple === true;
  /**
   * The list asks for more than a choice, so a tap opens a form instead of
   * answering. Only the product list does this today.
   */
  const capture = request.capture;
  /**
   * Which card's form is open. Not an answer: nothing has been sent, and tapping
   * a different product moves the form rather than choosing twice.
   */
  const [staged, setStaged] = useState<string | null>(null);
  /**
   * Which collapsible sections are open.
   *
   * Only GROUPED lists collapse — truck types, which arrive as "Trailers",
   * "Rigid trucks" and so on. Seeded from the groups actually present, so every
   * section starts open.
   *
   * A list with no groups is not in here and must never be looked up in here:
   * that lookup is the bug this was extracted for. See `isSectionOpen`.
   */
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => initialExpandedGroups(request.options),
  );

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <div style={{ marginTop: 8, maxWidth: 560 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: T.t1, marginBottom: 2 }}>{request.title}</div>

      {/*
        What the lookup actually searched on. The gateway sends `query` precisely
        so this can be shown; the client used to discard it.
      */}
      {request.query && hasRecords && (
        <div
          className="flex items-center gap-1"
          style={{ fontSize: 11.5, color: T.t3, marginTop: 3, marginBottom: 6 }}
        >
          <Search size={11} className="flex-shrink-0" />
          <span style={{ wordBreak: 'break-word' }}>
            {t('vagonai.select.matchedOn', { query: request.query })}
          </span>
        </div>
      )}

      {request.hint && (
        <div style={{ fontSize: 12, color: T.t3, marginBottom: 8, lineHeight: 1.45 }}>{request.hint}</div>
      )}

      <div className="flex flex-col" style={{ gap: 6 }}>
        {(() => {
          const options = actionLast(request.options);
          // Grouping and the open/closed decision both live in ./selectionGroups,
          // where they can be asserted without rendering React - vitest runs in
          // `environment: 'node'` here, so a bug in this loop is otherwise
          // invisible to the suite. See selectionGroups.test.ts.
          return groupSelectionOptions(options).flatMap(({ name: groupName, options: groupItems }, groupIndex) => {
            const isGrouped = groupName !== null;
            const groupKey = groupName ?? 'ungrouped';
            // An ungrouped list has no header to collapse it with, so it is
            // always open. Asking `expandedGroups` about it was the bug: that set
            // holds the group names that exist, an ungrouped list is not one of
            // them, so every location, product and ERP-order list rendered its
            // heading, its "Matched on ..." line and its "tap one" hint - and
            // then no rows at all.
            const isGroupExpanded = isSectionOpen(groupName, expandedGroups);
            const groupSelectedCount = groupItems.filter(opt => {
              if (answered) return (chosenIds ?? []).includes(opt.id);
              return multi ? ticked.includes(opt.id) : false;
            }).length;

            return [
              isGrouped && (
                <button
                  key={`group-${groupKey}`}
                  type="button"
                  onClick={() => !spent && toggleGroup(groupKey)}
                  disabled={spent}
                  className="rounded-lg"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '10px 12px',
                    marginTop: groupIndex > 0 ? 4 : 0,
                    border: `1px solid ${T.bd}`,
                    background: T.sa,
                    cursor: spent ? 'default' : 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                    color: T.t1,
                  }}
                >
                  <ChevronDown
                    size={16}
                    className="flex-shrink-0"
                    style={{
                      transform: isGroupExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 0.2s',
                      color: T.t2,
                    }}
                  />
                  <Truck size={13} className="flex-shrink-0" style={{ color: T.t3 }} />
                  <span style={{ flex: 1, textAlign: 'left' }}>{groupKey}</span>
                  {multi && groupSelectedCount > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: T.ac,
                        color: '#fff',
                      }}
                    >
                      {groupSelectedCount}
                    </span>
                  )}
                </button>
              ),
              isGroupExpanded && groupItems.map((option, optIndex) => {
                const locked = spent || option.disabled;
                const isAction = option.kind === 'action';
                const chosen = answered
                  ? (chosenIds ?? []).includes(option.id)
                  : multi && !isAction
                    ? ticked.includes(option.id)
                    : !isAction && staged === option.id;
                const lit = chosen || (!locked && active === option.id);
                const tick = () => setTicked((prev) => (
                  prev.includes(option.id) ? prev.filter((id) => id !== option.id) : [...prev, option.id]
                ));
                const staging = Boolean(capture) && !isAction && !locked;

                return (
                  <Fragment key={option.id}>
                  <div style={isGrouped ? { paddingLeft: 20, borderLeft: `2px solid ${T.bd}` } : undefined}>
                  <button
                    type="button"
                    onClick={() => {
                      if (multi && !isAction) return tick();
                      // With a form attached, the tap picks the product and the form
                      // asks the rest. Answering on the tap would send the cargo line
                      // without the two numbers that make it one.
                      if (staging) return setStaged(option.id);
                      return onChoose([option.id]);
                    }}
                    disabled={locked}
                    aria-pressed={multi && !isAction ? chosen : undefined}
                    onMouseEnter={() => setActive(option.id)}
                    onMouseLeave={() => setActive((a) => (a === option.id ? null : a))}
                    onFocus={() => setActive(option.id)}
                    onBlur={() => setActive((a) => (a === option.id ? null : a))}
                    className="rounded-lg"
                    style={{
                      textAlign: 'left',
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${lit ? T.ac : T.bd}`,
                      borderStyle: isAction ? 'dashed' : 'solid',
                      background: isAction ? 'transparent' : T.sf,
                      opacity: locked && !chosen ? 0.5 : 1,
                      cursor: locked ? 'default' : 'pointer',
                      // Thickens the existing border rather than adding an outline ring:
                      // the cards sit 6px apart, and a ring at that spacing reads as two
                      // cards touching.
                      boxShadow: lit ? `inset 0 0 0 1px ${T.ac}` : 'none',
                    }}
                  >
                    <div className="flex items-center gap-1.5" style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>
                      <span className="flex-shrink-0" style={{ color: chosen ? T.ac : T.t3 }}>
                        {chosen && multi ? <Check size={13} />
                          : isAction ? <Plus size={13} />
                            : request.kind === 'location' ? <MapPin size={13} />
                              : request.kind === 'truck_match' || request.kind === 'vehicle_type' ? <Truck size={13} />
                                : request.kind === 'shipment_channel' ? <Globe size={13} />
                                  : request.kind === 'partner' ? <Users size={13} />
                                    : request.kind === 'price_option' ? <Tag size={13} />
                                      : request.kind === 'erp_order' ? <FileText size={13} />
                                        : request.kind === 'tracking_recipient' ? <Send size={13} />
                                          : <Package size={13} />}
                      </span>
                      <span className="min-w-0" style={{ wordBreak: 'break-word' }}>{option.title}</span>
                      {/*
                        Names the pick in words as well as by the tick and the accent
                        border. Dimmed-but-not-chosen and chosen-but-dimmed look alike
                        at a glance, and neither is announced to a screen reader.
                      */}
                      {chosen && answered && (
                        <span
                          className="flex-shrink-0"
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            color: T.ac,
                            border: `1px solid ${T.ac}`,
                            borderRadius: 999,
                            padding: '0 5px',
                          }}
                        >
                          {t('vagonai.select.chosen')}
                        </span>
                      )}
                    </div>
                    {option.subtitle && (
                      <div style={{ fontSize: 12, color: T.t2, lineHeight: 1.45 }}>{option.subtitle}</div>
                    )}
                    {option.lines?.map((line) => (
                      <div key={line} style={{ fontSize: 12, color: T.t3, lineHeight: 1.45 }}>{line}</div>
                    ))}
                    {option.badges?.length ? (
                      <div className="flex flex-wrap" style={{ gap: 4, marginTop: 6 }}>
                        {option.badges.map((badge) => (
                          <span
                            key={badge.label}
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: 999,
                              ...badgeStyle(badge.tone, T, isDark),
                            }}
                          >
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                  {capture && staged === option.id && !spent && (
                    <CargoForm
                      capture={capture}
                      defaults={option.captureDefaults}
                      T={T}
                      disabled={Boolean(disabled)}
                      onSubmit={(cargo) => onChoose([option.id], cargo)}
                    />
                  )}
                  </div>
                  </Fragment>
                );
              }),
            ];
          });
        })()}
      </div>

      {/*
        Nothing is sent on a multi-select list until this is pressed. The count is
        on the button rather than beside it because the button is what the shipper
        is deciding about: "Continue with 3" answers "have I ticked everything?"
        without them having to recount the list.
      */}
      {multi && !spent && (
        <button
          type="button"
          onClick={() => onChoose(ticked)}
          disabled={ticked.length === 0}
          className="rounded-lg"
          style={{
            marginTop: 8, height: 32, padding: '0 14px', border: 'none',
            background: T.ac, color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: ticked.length === 0 ? 'default' : 'pointer',
            opacity: ticked.length === 0 ? 0.5 : 1,
          }}
        >
          {t('vagonai.select.confirmMany', { count: ticked.length })}
        </button>
      )}

      {/*
        The composer stays live and the gateway accepts a typed answer to any
        picker, so saying so costs one line and removes the dead end where the
        site the shipper wants is not among the six.
      */}
      {!spent && (
        <div style={{ fontSize: 11.5, color: T.t3, marginTop: 7 }}>{t('vagonai.select.typeInstead')}</div>
      )}
    </div>
  );
}
