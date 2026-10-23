/** "Anything else to pick up?" (§5.1 `more_pickups`): three one-tap answers, "No, that's all" the suggested one. */
import { Layers } from 'lucide-react';
import { Heading, Shell } from '../intakeShell';
import type { IntakeAnswerWire, IntakeStepEvent, MorePickupsWidgetSpec } from '../contract';
import { renderTxt } from '../intakeCopy';
import { chrome, NoticeLines, StepShortcuts, type IntakeUi } from '../intakeUi';
import { ChoiceButton } from './choiceKit';

type Choice = 'same_location' | 'another_location' | 'no';
const ORDER: { id: Choice; key: string; fb: string }[] = [
  { id: 'same_location', key: 'morePickups.same', fb: 'More from this site' },
  { id: 'another_location', key: 'morePickups.other', fb: 'Another site' },
  { id: 'no', key: 'morePickups.no', fb: "No, that's all" },
];

export function MorePickupsWidget({
  ui, event, spec, disabled, onAnswer, onExpress, onToSummary, onCancelEdit,
}: {
  ui: IntakeUi; event: IntakeStepEvent; spec: MorePickupsWidgetSpec; disabled: boolean;
  onAnswer: (wire: IntakeAnswerWire) => void;
  onExpress: () => void; onToSummary: () => void; onCancelEdit: () => void;
}) {
  const { T } = ui;
  // The gateway may send fewer choices (or its own labels); anything else falls back to the three of §5.1.
  const offered: NonNullable<MorePickupsWidgetSpec['choices']> = Array.isArray(spec.choices) && spec.choices.length > 0 ? spec.choices : ORDER.map((o) => ({ id: o.id }));
  return (
    <Shell T={T}>
      <Heading T={T} icon={<Layers size={17} aria-hidden="true" />} title={renderTxt(event.prompt)} hint={event.hint ? renderTxt(event.hint) : undefined} />
      <div className="vai-ik-choices" role="group" aria-label={renderTxt(event.prompt)} data-testid="intake-morepickups">
        {offered.map((c) => {
          const o = ORDER.find((x) => x.id === c.id);
          if (!o) return null;
          const label = c.label ? renderTxt(c.label) : chrome(ui, o.key, o.fb);
          return (
            <ChoiceButton
              key={c.id} ui={ui} testId={`intake-morepickups-${c.id}`} label={label}
              selected={c.id === 'no'} suggested={c.id === 'no'} disabled={disabled}
              onClick={() => onAnswer({ step: 'more_pickups', choice: c.id })}
            />
          );
        })}
      </div>
      <NoticeLines ui={ui} notices={event.notices} />
      <StepShortcuts ui={ui} event={event} disabled={disabled} onExpress={onExpress} onToSummary={onToSummary} onCancelEdit={onCancelEdit} />
    </Shell>
  );
}
