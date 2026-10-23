/**
 * "Require live navigation (GPS tracking)?" — two answers, the default pre-selected (§8.8: the shipper's last answer, else ON),
 * and the consequence in plain words. A tap is the answer. Customer e-mails (`spec.customers`) are not asked here: open question Q-tracking.
 */
import { Navigation } from 'lucide-react';
import { Heading, Shell } from '../intakeShell';
import type { IntakeStepEvent, TrackingWidgetSpec } from '../contract';
import { renderTxt } from '../intakeCopy';
import { trackingDefaultOf } from '../intakeModel';
import { chrome, NoticeLines, StepShortcuts, type IntakeUi } from '../intakeUi';
import { ChoiceButton } from './choiceKit';

export function TrackingWidget({
  ui, event, spec, disabled, onAnswer, onExpress, onToSummary, onCancelEdit,
}: {
  ui: IntakeUi; event: IntakeStepEvent; spec: TrackingWidgetSpec; disabled: boolean;
  onAnswer: (tracking: boolean) => void;
  onExpress: () => void; onToSummary: () => void; onCancelEdit: () => void;
}) {
  const { T } = ui;
  const on = trackingDefaultOf(spec);
  const consequence = spec.consequence
    ? renderTxt(spec.consequence)
    : chrome(ui, 'tracking.hint', "The driver has to run the job in the app, so the carrier can't mark it delivered by hand.");
  return (
    <Shell T={T}>
      <Heading T={T} icon={<Navigation size={17} aria-hidden="true" />} title={renderTxt(event.prompt)} hint={event.hint && renderTxt(event.hint) !== consequence ? renderTxt(event.hint) : undefined} />
      <p data-testid="intake-tracking-consequence" className="vai-ik-lead">{consequence}</p>
      <div className="vai-ik-choices" role="group" aria-label={renderTxt(event.prompt)} data-testid="intake-tracking">
        <ChoiceButton ui={ui} testId="intake-tracking-yes" label={chrome(ui, 'tracking.yes', 'Yes, track it')} selected={on} suggested={on} disabled={disabled} onClick={() => onAnswer(true)} />
        <ChoiceButton ui={ui} testId="intake-tracking-no" label={chrome(ui, 'tracking.no', 'No')} selected={!on} suggested={!on} disabled={disabled} onClick={() => onAnswer(false)} />
      </div>
      <NoticeLines ui={ui} notices={event.notices} />
      <StepShortcuts ui={ui} event={event} disabled={disabled} onExpress={onExpress} onToSummary={onToSummary} onCancelEdit={onCancelEdit} />
    </Shell>
  );
}
