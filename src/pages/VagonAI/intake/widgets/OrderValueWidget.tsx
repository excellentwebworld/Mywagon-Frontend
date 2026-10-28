/** "What is the total order value?" — the sum of the attached orders pre-filled when there is one; Set value, or Skip.
 *  0 to 99,999,999.99, ≤ 2 decimals (§19.7). A blank or 0 value is a skip: it posts `null`. */
import { Receipt } from 'lucide-react';
import type { IntakeStepEvent, OrderValueWidgetSpec } from '../contract';
import { orderValueAnswerOf, parseOrderValue } from '../intakeModel';
import { chrome, numberLocaleOf, type IntakeUi } from '../intakeUi';
import { formatInput, formatMoney } from '../numberFormat';
import { AmountStep } from './AmountStep';

export function OrderValueWidget({
  ui, event, spec, disabled, onAnswer, onExpress, onToSummary, onCancelEdit,
}: {
  ui: IntakeUi; event: IntakeStepEvent; spec: OrderValueWidgetSpec; disabled: boolean;
  onAnswer: (orderValue: number | null) => void;
  onExpress: () => void; onToSummary: () => void; onCancelEdit: () => void;
}) {
  const loc = numberLocaleOf(ui);
  const auto = typeof spec.autoSum === 'number' ? spec.autoSum : null;
  return (
    <AmountStep
      ui={ui} event={event} icon={<Receipt size={16} aria-hidden="true" />} testPrefix="intake-ordervalue"
      initial={auto !== null ? formatInput(auto, loc) : ''} parse={(raw) => parseOrderValue(raw, loc)}
      note={auto ? chrome(ui, 'orderValue.auto', 'Total of your orders: €{{value}}', { value: formatMoney(auto, loc) }) : undefined}
      setLabel={chrome(ui, 'orderValue.set', 'Set value')} placeholder={chrome(ui, 'orderValue.placeholder', 'Amount')}
      invalidText={chrome(ui, 'orderValue.invalidFormat', 'Enter an amount from 0 to 99,999,999.99 with up to 2 decimals, for example 1,234.50 or 12.5.')}
      skipLabel={spec.canSkip === false ? null : chrome(ui, 'orderValue.skip', 'Skip')}
      disabled={disabled} onSet={(v) => onAnswer(orderValueAnswerOf(v))} onSkip={() => onAnswer(null)}
      onExpress={onExpress} onToSummary={onToSummary} onCancelEdit={onCancelEdit}
    />
  );
}
