/**
 * "Discard this load?" — the confirmation the gateway asks for a typed "cancel" or a new load while one is open
 * (CONTRACT.md §9.2). Nothing is written either way; the yes-label already says "start the new one" when facts wait.
 */
import { Trash2 } from 'lucide-react';
import { Heading, Shell } from '../intakeShell';
import { TapButton as Button } from '../intakeUi';
import type { ConfirmDiscardWidgetSpec, IntakeStepEvent } from '../contract';
import { renderTxt } from '../intakeCopy';
import { NoticeLines, type IntakeUi } from '../intakeUi';

export function ConfirmDiscardWidget({
  ui, event, spec, disabled, onAnswer,
}: {
  ui: IntakeUi; event: IntakeStepEvent; spec: ConfirmDiscardWidgetSpec; disabled: boolean; onAnswer: (confirm: boolean) => void;
}) {
  const { T } = ui;
  return (
    <Shell T={T}>
      <Heading T={T} tone="warn" icon={<Trash2 size={17} aria-hidden="true" />} title={renderTxt(event.prompt)} hint={event.hint ? renderTxt(event.hint) : undefined} />
      <div className="vai-ik-actions" style={{ marginTop: 4 }} role="group" aria-label={renderTxt(event.prompt)}>
        <Button T={T} variant="danger" disabled={disabled} onClick={() => onAnswer(true)} data-testid="intake-discard-yes">{renderTxt(spec.yes)}</Button>
        <Button T={T} variant="ghost" disabled={disabled} onClick={() => onAnswer(false)} data-testid="intake-discard-no">{renderTxt(spec.no)}</Button>
      </div>
      <NoticeLines ui={ui} notices={event.notices} />
    </Shell>
  );
}
