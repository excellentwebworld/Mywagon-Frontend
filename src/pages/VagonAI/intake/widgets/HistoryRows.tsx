/**
 * Read-only rows: what a spent widget leaves in the transcript. Nothing in here can be clicked — an earlier
 * card is a record, not a way to change the load (to change it, use Edit on the summary).
 */
import { AlertTriangle, Check, Info } from 'lucide-react';
import type { IntakeDiscardedEvent, IntakeDoneEvent, IntakeErrorEvent, IntakeStepEvent, IntakeSummaryEvent, LocalisableText } from '../contract';
import { renderTxt } from '../intakeCopy';
import { chrome, type IntakeUi } from '../intakeUi';
import '../intake.css';

const rowStyle = (ui: IntakeUi): React.CSSProperties => ({ color: ui.T.t2 });

function Row({ testId, children }: { ui: IntakeUi; testId: string; children: React.ReactNode }) {
  return (
    <p className="vai-ik-spent" data-testid={testId} data-readonly="true">
      <span className="vai-ik-spent-tick" aria-hidden="true"><Check size={11} strokeWidth={3} /></span>
      <span className="min-w-0" style={{ wordBreak: 'break-word' }}>{children}</span>
    </p>
  );
}

/** A past step: the question, then the shipper's answer. `answerText` is already rendered (live or from history). */
export function SpentStepRow({ ui, event, answerText }: { ui: IntakeUi; event: IntakeStepEvent; answerText: string }) {
  return (
    <Row ui={ui} testId="intake-spent-step">
      <span className="vai-ik-spent-q">{renderTxt(event.prompt)}</span>
      {answerText && <strong data-testid="intake-spent-answer">{answerText}</strong>}
    </Row>
  );
}

/** A restored history item (reopened chat): the answer alone — its question is not stored. */
export function HistoryAnswerRow({ ui, answerText }: { ui: IntakeUi; answerText: string }) {
  return <Row ui={ui} testId="intake-history-row"><strong>{answerText}</strong></Row>;
}

/**
 * A past summary: its title, then every row as label and value — the load stays on screen while the shipper edits one field
 * from it. Small and muted, and no Edit buttons: the live summary comes back after the edit.
 */
export function SpentSummaryRow({ ui, event }: { ui: IntakeUi; event: IntakeSummaryEvent }) {
  const notSet = chrome(ui, 'summary.notSet', 'Not set — needed to publish');
  return (
    <div className="vai-ik-spent vai-ik-spent--summary" data-testid="intake-spent-summary" data-readonly="true">
      <p className="vai-ik-spent-head">
        <span className="vai-ik-spent-tick" aria-hidden="true"><Check size={11} strokeWidth={3} /></span>
        <span className="min-w-0">{renderTxt(event.title)}</span>
      </p>
      <dl className="vai-ik-spent-rows">
        {event.rows.map((row) => (
          <div key={row.id} className="vai-ik-spent-row" data-testid={`intake-spent-row-${row.id}`} data-kind={row.kind}>
            <dt>{renderTxt(row.label)}</dt>
            <dd data-empty={!row.value || row.value === notSet ? 'true' : undefined}>{row.value || notSet}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function SpentDoneRow({ ui, event }: { ui: IntakeUi; event: IntakeDoneEvent }) {
  return <Row ui={ui} testId="intake-spent-done">{renderTxt(event.message)}</Row>;
}

/** A deliberate discard is a confirmation, not a failure: no error styling, no retry (§8.13). */
export function DiscardedNote({ ui, event }: { ui: IntakeUi; event: IntakeDiscardedEvent }) {
  return (
    <p className="vai-ik-spent" data-testid="intake-discarded" style={rowStyle(ui)}>
      <Info size={15} className="flex-shrink-0" style={{ color: ui.T.t3, marginTop: 1 }} aria-hidden="true" />
      <span>{renderTxt(event.message)}</span>
    </p>
  );
}

/** An `intake_error` frame: what happened, then how to fix it. Whether a retry is offered is the page's call. */
export function ErrorNote({ event }: { ui: IntakeUi; event: IntakeErrorEvent }) {
  return (
    <p className="vai-ik-note vai-ik-note--error" role="alert" data-testid="intake-error" data-code={event.code} style={{ maxWidth: 600 }}>
      <AlertTriangle size={15} aria-hidden="true" />
      <span>{event.fix ? `${renderTxt(event.message)} ${renderTxt(event.fix)}` : renderTxt(event.message)}</span>
    </p>
  );
}

export const answerTextOf = (a: LocalisableText | undefined, render: (a: LocalisableText) => string): string => (a ? render(a) : '');
