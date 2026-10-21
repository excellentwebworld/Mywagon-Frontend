/**
 * A step this build has no widget for yet (location, cargo, window, vehicle … belong to WP3b/WP3c) or that a newer
 * gateway invented: the text-only slice. It shows the step's own `fallbackText` — the question with numbered
 * options, written by the gateway — so the shipper can answer by typing (a normal chat turn) instead of seeing
 * nothing. Also the shape the Tuesday-20 slice ships for every step.
 */
import { MessageSquareText } from 'lucide-react';
import { Heading, Shell } from '../intakeShell';
import type { IntakeStepEvent } from '../contract';
import { renderTxt } from '../intakeCopy';
import { NoticeLines, StepShortcuts, type IntakeUi } from '../intakeUi';

export function TextStep({
  ui, event, disabled, onExpress, onToSummary, onCancelEdit,
}: {
  ui: IntakeUi; event: IntakeStepEvent; disabled: boolean;
  onExpress: () => void; onToSummary: () => void; onCancelEdit: () => void;
}) {
  const { T } = ui;
  const body = event.fallbackText.trim() || renderTxt(event.prompt);
  return (
    <Shell T={T}>
      <Heading T={T} icon={<MessageSquareText size={17} aria-hidden="true" />} title={renderTxt(event.prompt)} hint={event.hint ? renderTxt(event.hint) : undefined} />
      {body !== renderTxt(event.prompt) && (
        <p data-testid="intake-fallback-text" style={{ whiteSpace: 'pre-line', fontSize: 13.5, color: T.t2, lineHeight: 1.6 }}>{body}</p>
      )}
      <NoticeLines ui={ui} notices={event.notices} />
      <StepShortcuts ui={ui} event={event} disabled={disabled} onExpress={onExpress} onToSummary={onToSummary} onCancelEdit={onCancelEdit} />
    </Shell>
  );
}
