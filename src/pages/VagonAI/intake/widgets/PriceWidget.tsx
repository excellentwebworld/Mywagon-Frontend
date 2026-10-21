/**
 * "What price do you offer?" — the suggestion (lane › contract › AI) pre-filled; Set price, or "Decide later" unless the
 * price is non-negotiable (§5.1: a fixed price needs an amount). The amount rule is `intakeModel.parsePrice`.
 */
import { Euro } from 'lucide-react';
import type { IntakeStepEvent, PriceWidgetSpec } from '../contract';
import { renderTxt } from '../intakeCopy';
import { parsePrice } from '../intakeModel';
import { chrome, numberLocaleOf, type IntakeUi } from '../intakeUi';
import { formatInput, formatMoney } from '../numberFormat';
import { AmountStep } from './AmountStep';

export function PriceWidget({
  ui, event, spec, disabled, onAnswer, onExpress, onToSummary, onCancelEdit,
}: {
  ui: IntakeUi; event: IntakeStepEvent; spec: PriceWidgetSpec; disabled: boolean;
  onAnswer: (price: number | null) => void;
  onExpress: () => void; onToSummary: () => void; onCancelEdit: () => void;
}) {
  const canSkip = spec.canSkip !== false;
  const s = spec.suggested;
  const loc = numberLocaleOf(ui);
  const note = s ? (s.label ? renderTxt(s.label) : chrome(ui, 'price.suggested', 'Suggested: €{{price}}', { price: formatMoney(s.value, loc) })) : undefined;
  return (
    <AmountStep
      ui={ui} event={event} icon={<Euro size={16} aria-hidden="true" />} testPrefix="intake-price"
      initial={s ? formatInput(s.value, loc) : ''} parse={(raw) => parsePrice(raw, spec, loc)} note={note}
      setLabel={chrome(ui, 'price.set', 'Set price')} placeholder={chrome(ui, 'price.placeholder', 'Amount')}
      invalidText={chrome(ui, 'price.invalidFormat', 'Enter an amount above zero with up to 2 decimals, for example 1,234.50 or 12.5.')}
      skipLabel={canSkip ? chrome(ui, 'price.later', 'Decide later') : null}
      extra={canSkip ? undefined : chrome(ui, 'price.requiredFixed', 'A fixed price needs an amount.')}
      disabled={disabled} onSet={(v) => onAnswer(v)} onSkip={() => onAnswer(null)}
      onExpress={onExpress} onToSummary={onToSummary} onCancelEdit={onCancelEdit}
    />
  );
}
