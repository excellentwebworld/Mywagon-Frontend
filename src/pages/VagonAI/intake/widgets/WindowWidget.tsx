/**
 * "When?" (§5.1 `window`): a date, from-time pre-filled with 08:00, optional to-time, and the gateway's presets as one-tap
 * time ranges. Continue posts ONE answer. A past date is allowed with a visible warning (never blocks).
 * MS3-408: "Any time" is an answer too — no slot; on a drop-off the day may stay open as well.
 * Hook order: [0] date, [1] from, [2] to, [3] anyTime.
 */
import { useState } from 'react';
import { AlertTriangle, CalendarClock, Clock, Infinity as AnyIcon } from 'lucide-react';
import { Heading, Shell } from '../intakeShell';
import { TapButton as Button } from '../intakeUi';
import { inputStyle } from '../intakeStyles';
import type { IntakeAnswerWire, IntakeStepEvent, WindowWidgetSpec } from '../contract';
import { renderTxt } from '../intakeCopy';
import { chrome, NoticeLines, StepShortcuts, type IntakeUi } from '../intakeUi';
import { anyTimeAnswer, isPastDate, windowAnswer, windowDraftOf, windowIssues, windowText, type WindowDraft } from '../windowModel';
import { TAP_CLASS } from '../tap';

export function WindowWidget({
  ui, event, spec, disabled, onAnswer, today, onExpress, onToSummary, onCancelEdit,
}: {
  ui: IntakeUi; event: IntakeStepEvent; spec: WindowWidgetSpec; disabled: boolean;
  onAnswer: (wire: IntakeAnswerWire, shown?: string) => void;
  /** `YYYY-MM-DD`; tests pin it. */
  today?: string;
  onExpress: () => void; onToSummary: () => void; onCancelEdit: () => void;
}) {
  const { T } = ui;
  const init = windowDraftOf(spec);
  const [date, setDate] = useState(init.date);
  const [timeFrom, setFrom] = useState(init.timeFrom);
  const [timeTo, setTo] = useState(init.timeTo);
  const [anyTime, setAnyTime] = useState(spec.anyTime === true);
  const draft: WindowDraft = { date, timeFrom, timeTo };
  // An older gateway sends no `anyTimeLabel`: the toggle is then not offered (it would post a field that gateway refuses).
  const anyTimeOffered = !!spec.anyTimeLabel;
  const needsDate = spec.anyTimeNeedsDate !== false;
  const issues = anyTime ? [] : windowIssues(draft);
  const wire = anyTime ? anyTimeAnswer(event.stopKey, date, needsDate) : windowAnswer(event.stopKey, draft);
  const anyLabel = spec.anyTimeLabel ? renderTxt(spec.anyTimeLabel) : chrome(ui, 'window.anyTime', 'Any time');
  const shown = anyTime ? [date, anyLabel.toLowerCase()].filter(Boolean).join(', ') : windowText(draft);
  const past = isPastDate(date, spec.minDate, today);
  const presets = (spec.presets ?? []).filter((p) => typeof p.from === 'string' && typeof p.to === 'string');
  const fieldStyle = (bad: boolean) => ({ ...inputStyle(T, { invalid: bad }), minHeight: 40, fontVariantNumeric: 'tabular-nums' as const });
  return (
    <Shell T={T}>
      <Heading T={T} icon={<CalendarClock size={17} aria-hidden="true" />} title={renderTxt(event.prompt)} hint={event.hint ? renderTxt(event.hint) : undefined} />
      <div className="grid" style={{ gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }} data-testid="intake-window">
        <label className="vai-ik-field">
          <span className="vai-ik-label">{chrome(ui, 'window.date', 'Date')}</span>
          <input
            type="date" value={date} disabled={disabled} data-testid="intake-window-date"
            onChange={(e) => setDate(e.target.value)} aria-label={chrome(ui, 'window.date', 'Date')} aria-invalid={date !== '' && issues.includes('date')}
            style={fieldStyle(date !== '' && issues.includes('date'))}
          />
        </label>
        {!anyTime && (
          <>
            <label className="vai-ik-field">
              <span className="vai-ik-label">{chrome(ui, 'window.from', 'From')}</span>
              <input type="time" value={timeFrom} disabled={disabled} data-testid="intake-window-from" onChange={(e) => setFrom(e.target.value)} style={fieldStyle(issues.includes('timeFrom'))} />
            </label>
            <label className="vai-ik-field">
              <span className="vai-ik-label">{chrome(ui, 'window.to', 'To')}</span>
              <input type="time" value={timeTo} disabled={disabled} data-testid="intake-window-to" onChange={(e) => setTo(e.target.value)} style={fieldStyle(issues.includes('timeTo') || issues.includes('order'))} />
            </label>
          </>
        )}
      </div>
      {(presets.length > 0 || anyTimeOffered) && (
        <div className="flex flex-wrap items-center" style={{ gap: 6, marginTop: 12 }} role="group" aria-label={chrome(ui, 'window.presets', 'Common times')}>
          {anyTimeOffered && (
            <button
              type="button" disabled={disabled} aria-pressed={anyTime} data-testid="intake-window-anytime"
              onClick={() => setAnyTime(!anyTime)} className={`vai-ik-chip ${TAP_CLASS}`}
            >
              <AnyIcon size={13} aria-hidden="true" />
              {anyLabel}
            </button>
          )}
          {presets.map((p) => {
            const on = !anyTime && timeFrom === p.from && timeTo === p.to;
            return (
              <button
                key={`${p.from}-${p.to}`} type="button" disabled={disabled} aria-pressed={on} data-testid={`intake-window-preset-${p.from.replace(':', '')}-${p.to.replace(':', '')}`}
                onClick={() => { setAnyTime(false); setFrom(p.from); setTo(p.to); }} className={`vai-ik-chip ${TAP_CLASS}`}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                <Clock size={13} aria-hidden="true" />
                {p.from}–{p.to}
              </button>
            );
          })}
        </div>
      )}
      {anyTime && spec.anyTimeHint && <p data-testid="intake-window-anytime-hint" className="vai-ik-why" style={{ marginTop: 10 }}>{renderTxt(spec.anyTimeHint)}</p>}
      {past && <p role="status" data-testid="intake-window-past" className="vai-ik-note vai-ik-note--warn" style={{ marginTop: 12 }}><AlertTriangle size={15} aria-hidden="true" /><span>{chrome(ui, 'window.pastDate', 'This date is in the past. You can save a draft, but to publish choose a new date.')}</span></p>}
      {issues.includes('order') && <p role="alert" data-testid="intake-window-order" className="vai-ik-inline-error">{chrome(ui, 'window.timeOrder', 'The end time must be after the start time.')}</p>}
      <div className="vai-ik-actions">
        <Button T={T} disabled={disabled || wire === null} onClick={() => { if (wire) onAnswer(wire, shown); }} data-testid="intake-window-continue">{chrome(ui, 'window.continue', 'Continue')}</Button>
      </div>
      <NoticeLines ui={ui} notices={event.notices} />
      <StepShortcuts ui={ui} event={event} disabled={disabled} onExpress={onExpress} onToSummary={onToSummary} onCancelEdit={onCancelEdit} />
    </Shell>
  );
}
