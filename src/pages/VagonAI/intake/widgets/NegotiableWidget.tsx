/** "Can carriers counter-offer on the price?" — Yes (pre-selected, §8.3) or fixed price. A tap is the answer. */
import { Tag } from 'lucide-react';
import { Heading, Shell } from '../intakeShell';
import type { IntakeStepEvent, NegotiableWidgetSpec } from '../contract';
import { renderTxt } from '../intakeCopy';
import { chrome, NoticeLines, StepShortcuts, type IntakeUi } from '../intakeUi';
import { ChoiceButton } from './choiceKit';

export function NegotiableWidget({
  ui, event, disabled, onAnswer, onExpress, onToSummary, onCancelEdit,
}: {
  ui: IntakeUi; event: IntakeStepEvent; spec: NegotiableWidgetSpec; disabled: boolean;
  onAnswer: (negotiable: boolean) => void;
  onExpress: () => void; onToSummary: () => void; onCancelEdit: () => void;
}) {
  const { T } = ui;
  return (
    <Shell T={T}>
      <Heading T={T} icon={<Tag size={17} aria-hidden="true" />} title={renderTxt(event.prompt)} hint={event.hint ? renderTxt(event.hint) : undefined} />
      <div className="vai-ik-choices" role="group" aria-label={renderTxt(event.prompt)} data-testid="intake-negotiable">
        <ChoiceButton ui={ui} testId="intake-negotiable-yes" label={chrome(ui, 'negotiable.yes', 'Yes, negotiable')} selected suggested disabled={disabled} onClick={() => onAnswer(true)} />
        <ChoiceButton ui={ui} testId="intake-negotiable-no" label={chrome(ui, 'negotiable.no', 'No, fixed price')} selected={false} disabled={disabled} onClick={() => onAnswer(false)} />
      </div>
      <NoticeLines ui={ui} notices={event.notices} />
      <StepShortcuts ui={ui} event={event} disabled={disabled} onExpress={onExpress} onToSummary={onToSummary} onCancelEdit={onCancelEdit} />
    </Shell>
  );
}
