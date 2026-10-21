/**
 * "Which truck?" — the recommended truck is pre-selected (§8.3) and is one tap; "More options" opens the other types.
 * With no recommendation the types are listed straight away.
 *
 * What it posts (§5.1, §19.2): `{typeIds:[type], categoryIds}` where `categoryIds` is `[]` for a type picked without a
 * subtype (the gateway reads that as "the whole type"), and a subtype only when the shipper tapped it — never every subtype.
 * `fit` is read by strict equality (§19.4): TIGHT / OVERSIZED are neutral notes, TOO_SMALL a warning — and the truck stays
 * selectable. QA-1: a recommendation is never TOO_SMALL (§19.4); if one arrives that is, it is NOT recommended — no "Suggested"
 * tag, no "Recommended for …" line, not pre-selected: it is listed with the other trucks, with its warning, and the shipper
 * is told why nothing is suggested. One tap still answers (Publish is not gated on fit — the gate decides, §5.1). No recommendation + a `warning` is "no truck class holds this load" (`vehicle.tooBig`).
 * `capacity.weightKg` is the LOAD's weight (§19.3), which is what "Recommended for {kg} kg" says.
 */
import { useState } from 'react';
import { AlertTriangle, Truck } from 'lucide-react';
import { Heading, Shell } from '../intakeShell';
import { LINK_CLASS } from '../intakeStyles';
import type { IntakeAnswerWire, IntakeStepEvent, VehicleChoice, VehicleWidgetSpec } from '../contract';
import { renderTxt } from '../intakeCopy';
import { fitNote, fitOf, recommendationUsable, vehicleAnswer } from '../intakeModel';
import { chrome, NoticeLines, StepShortcuts, type IntakeUi } from '../intakeUi';
import { ChoiceButton } from './choiceKit';
import { TAP_CLASS } from '../tap';

/** One line under a truck: nothing for FITS / unknown, a neutral note for TIGHT / OVERSIZED, a warning for TOO_SMALL. */
function FitNote({ ui, fit, testId }: { ui: IntakeUi; fit: unknown; testId: string }) {
  const note = fitNote(fitOf(fit));
  if (!note) return null;
  const warn = note.tone === 'warning';
  const fallback = { 'vehicle.tight': 'Nearly full for this load.', 'vehicle.oversized': 'Bigger than this load needs.', 'vehicle.tooSmall': 'This truck type is too small for the load.' }[note.key];
  return (
    <p data-testid={testId} data-tone={note.tone} role={warn ? 'alert' : undefined} className={`vai-ik-note${warn ? ' vai-ik-note--warn' : ''}`} style={warn ? undefined : { color: ui.T.t3, paddingLeft: 44 }}>
      {warn && <AlertTriangle size={15} aria-hidden="true" />}
      <span>{chrome(ui, note.key, fallback)}</span>
    </p>
  );
}

export function VehicleWidget({
  ui, event, spec, disabled, onAnswer, onExpress, onToSummary, onCancelEdit,
}: {
  ui: IntakeUi; event: IntakeStepEvent; spec: VehicleWidgetSpec; disabled: boolean;
  onAnswer: (wire: IntakeAnswerWire) => void;
  onExpress: () => void; onToSummary: () => void; onCancelEdit: () => void;
}) {
  const { T } = ui;
  const [showMore, setShowMore] = useState(false);
  const recAny = spec.recommended;
  // The truck the gateway recommended — unless it is too small for the load, which makes it no recommendation at all.
  const rec = recommendationUsable(recAny) ? recAny : undefined;
  const tooSmall = recAny !== undefined && rec === undefined ? recAny : undefined;
  const tooSmallRec = tooSmall !== undefined;
  // The too-small truck stays pickable (§19.4): it joins the list with its own warning, once, with the fit the gateway gave it.
  const base = spec.alternatives.map((a) => (tooSmall && a.typeId === tooSmall.typeId ? { ...a, fit: a.fit ?? tooSmall.fit } : a));
  const others: VehicleChoice[] = [
    ...(tooSmall && !base.some((a) => a.typeId === tooSmall.typeId) ? [{ typeId: tooSmall.typeId, label: tooSmall.label, categories: [], fit: tooSmall.fit }] : []),
    ...base.filter((a) => a.typeId !== rec?.typeId),
  ];
  const listed = !rec || showMore;
  const recDetail = rec
    ? (rec.rationale
      ? renderTxt(rec.rationale)
      : spec.capacity ? chrome(ui, 'vehicle.recommended', 'Recommended for {{kg}} kg: {{truck}}', { kg: spec.capacity.weightKg, truck: rec.label }) : undefined)
    : undefined;
  return (
    <Shell T={T}>
      <Heading T={T} icon={<Truck size={17} aria-hidden="true" />} title={renderTxt(event.prompt)} hint={event.hint ? renderTxt(event.hint) : undefined} />
      <div className="vai-ik-choices" role="group" aria-label={renderTxt(event.prompt)} data-testid="intake-vehicle">
        {rec && (
          <ChoiceButton
            ui={ui} testId="intake-vehicle-recommended" label={rec.label} detail={recDetail}
            selected suggested disabled={disabled} onClick={() => onAnswer(vehicleAnswer(rec.typeId))}
          />
        )}
        {rec && <FitNote ui={ui} fit={rec.fit} testId="intake-vehicle-fit" />}
        {tooSmallRec && (
          <p data-testid="intake-vehicle-nosuggest" className="vai-ik-lead" style={{ marginBottom: 2 }}>
            {chrome(ui, 'vehicle.noFitSuggestion', 'No truck is suggested for this load: the closest type is too small. You can still pick one below.')}
          </p>
        )}
        {!rec && spec.warning !== undefined && (
          <p data-testid="intake-vehicle-toobig" role="alert" className="vai-ik-note vai-ik-note--warn">
            <AlertTriangle size={15} aria-hidden="true" />
            <span>{renderTxt(spec.warning) || chrome(ui, 'vehicle.tooBig', 'This load is too heavy for one truck. Split it, or check the weight.')}</span>
          </p>
        )}
        {listed && others.map((a) => (
          <div key={a.typeId} className="flex flex-col" style={{ gap: 6 }}>
            <ChoiceButton
              ui={ui} testId={`intake-vehicle-alt-${a.typeId}`} label={a.label}
              selected={false} disabled={disabled} onClick={() => onAnswer(vehicleAnswer(a.typeId))}
            />
            <FitNote ui={ui} fit={a.fit} testId={`intake-vehicle-alt-${a.typeId}-fit`} />
            {a.categories.length > 0 && (
              <div className="flex flex-wrap items-center" style={{ gap: 6, paddingLeft: 44 }} data-testid={`intake-vehicle-alt-${a.typeId}-subtypes`}>
                <span style={{ fontSize: 12.5, color: T.t2 }}>{chrome(ui, 'vehicle.narrow', 'Or only:')}</span>
                {a.categories.map((c) => (
                  <button
                    key={c.id} type="button" disabled={disabled} data-testid={`intake-vehicle-alt-${a.typeId}-cat-${c.id}`}
                    onClick={() => onAnswer(vehicleAnswer(a.typeId, [c.id], a.categories.map((x) => x.id)))}
                    className={`vai-ik-chip ${TAP_CLASS}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {rec && others.length > 0 && (
        <button
          type="button" disabled={disabled} onClick={() => setShowMore(!showMore)} data-testid="intake-vehicle-more" aria-expanded={showMore}
          style={{ marginTop: 12 }} className={LINK_CLASS}>
          {showMore ? chrome(ui, 'vehicle.less', 'Fewer options') : chrome(ui, 'vehicle.more', 'More options')}
        </button>
      )}
      <NoticeLines ui={ui} notices={event.notices} />
      <StepShortcuts ui={ui} event={event} disabled={disabled} onExpress={onExpress} onToSummary={onToSummary} onCancelEdit={onCancelEdit} />
    </Shell>
  );
}
