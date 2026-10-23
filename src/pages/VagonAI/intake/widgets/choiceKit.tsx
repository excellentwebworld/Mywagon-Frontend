/**
 * The one control the terms widgets share: a full-width answer button. Tapping it IS the answer (no Continue), and the
 * pre-selected smart default is drawn selected and tagged "Suggested" so the shipper sees what one tap would give them.
 * A radio dot says "one of these"; the chevron says a tap moves on. Drawn by `intake.css` (`.vai-ik-choice`).
 * Hook-free, like every intake widget.
 */
import { Check, ChevronRight } from 'lucide-react';
import type { ThemeTokens } from '../../../../utils/themes';
import { chrome, type IntakeUi } from '../intakeUi';
import { TAP_CLASS } from '../tap';

/**
 * The "Suggested" tag is the one cue that says what a single tap will do (there is no Continue), so it must be seen (QA-1):
 * 12 px bold, the primary text colour (`t1`: ≥ 4.5:1 on the selected and unselected backgrounds, light and dark — WCAG AA),
 * in an accent-outlined pill. It was 11 px, medium weight, in the muted `t3` grey.
 */
export const SUGGESTED_TAG_STYLE = (T: ThemeTokens): React.CSSProperties => ({
  fontSize: 12, fontWeight: 700, lineHeight: 1.3, color: T.t1, flexShrink: 0, whiteSpace: 'nowrap',
  border: `1px solid ${T.ac}`, borderRadius: 999, padding: '2px 9px', background: T.sf,
});

export function ChoiceButton({
  ui, testId, label, detail, selected, suggested, disabled, onClick,
}: {
  ui: IntakeUi; testId: string; label: string; detail?: string;
  /** Drawn as the current / pre-selected answer. */
  selected: boolean;
  /** Also carries the "Suggested" tag (the default the gateway or the shipper's habit picked). */
  suggested?: boolean;
  disabled: boolean; onClick: () => void;
}) {
  const { T } = ui;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      data-selected={selected ? 'true' : 'false'}
      aria-pressed={selected}
      className={`vai-ik-choice ${TAP_CLASS}`}
    >
      <span className="vai-ik-radio" aria-hidden="true">
        {selected ? <Check size={12} strokeWidth={3} /> : null}
      </span>
      <span className="vai-ik-choice-body">
        {label}
        {detail && <span className="vai-ik-choice-detail" data-testid={`${testId}-detail`}>{detail}</span>}
      </span>
      {suggested && (
        <span data-testid={`${testId}-suggested`} className="vai-ik-choice-tag" style={SUGGESTED_TAG_STYLE(T)}>
          {chrome(ui, 'choice.suggested', 'Suggested')}
        </span>
      )}
      <ChevronRight size={16} className="vai-ik-choice-go" aria-hidden="true" />
    </button>
  );
}
