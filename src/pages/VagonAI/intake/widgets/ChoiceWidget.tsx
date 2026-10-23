/**
 * Gate ("From my orders" / "Manually") and the upload offer: one question, tap an answer, done.
 * There is no Continue button — the tap IS the answer (CONTRACT.md §8.3: "gate · pre-selected: none").
 */
import { ArrowRight, ChevronRight, ClipboardList, Layers, Pencil, Split, Upload } from 'lucide-react';
import { Heading, Shell } from '../intakeShell';
import type { IntakeStepEvent, Txt } from '../contract';
import { renderTxt } from '../intakeCopy';
import { NoticeLines, StepShortcuts, type IntakeUi } from '../intakeUi';
import { TAP_CLASS } from '../tap';

export interface ChoiceItem { id: string; label: Txt }

const ICONS: Record<string, React.ReactNode> = {
  orders: <ClipboardList size={18} aria-hidden="true" />,
  manual: <Pencil size={18} aria-hidden="true" />,
  upload: <Upload size={18} aria-hidden="true" />,
  continue: <ArrowRight size={18} aria-hidden="true" />,
  combined: <Layers size={18} aria-hidden="true" />,
  per_order: <Split size={18} aria-hidden="true" />,
};

export function ChoiceWidget({
  ui, event, options, disabled, onChoose, onExpress, onToSummary, onCancelEdit,
}: {
  ui: IntakeUi; event: IntakeStepEvent; options: ChoiceItem[]; disabled: boolean;
  onChoose: (id: string) => void;
  onExpress: () => void; onToSummary: () => void; onCancelEdit: () => void;
}) {
  const { T } = ui;
  return (
    <Shell T={T}>
      <Heading T={T} icon={ICONS[options[0]?.id ?? ''] ?? <ArrowRight size={17} aria-hidden="true" />} title={renderTxt(event.prompt)} hint={event.hint ? renderTxt(event.hint) : undefined} />
      <div className="vai-ik-choices" role="group" aria-label={renderTxt(event.prompt)} data-testid={`intake-choice-${event.step}`}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            onClick={() => onChoose(o.id)}
            data-testid={`intake-choice-${o.id}`}
            className={`vai-ik-choice ${TAP_CLASS}`}
          >
            <span className="vai-ik-choice-icon" aria-hidden="true">{ICONS[o.id] ?? <ArrowRight size={18} aria-hidden="true" />}</span>
            <span className="vai-ik-choice-body">{renderTxt(o.label)}</span>
            <ChevronRight size={16} className="vai-ik-choice-go" aria-hidden="true" />
          </button>
        ))}
      </div>
      <NoticeLines ui={ui} notices={event.notices} />
      <StepShortcuts ui={ui} event={event} disabled={disabled} onExpress={onExpress} onToSummary={onToSummary} onCancelEdit={onCancelEdit} />
    </Shell>
  );
}
