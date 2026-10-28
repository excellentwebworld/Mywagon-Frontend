/**
 * "Do you have an order number for this load?" (MS3-405): optional on the manual path. Type it and add it, or skip.
 * A number that is already an order comes back with `exists`: link the load to that order, or type another one — the
 * same order is never filed twice.
 * Hook order: [0] the typed number.
 */
import { useState } from 'react';
import { Hash, Link2 } from 'lucide-react';
import { Heading, Shell } from '../intakeShell';
import { TapButton as Button } from '../intakeUi';
import { inputStyle } from '../intakeStyles';
import type { IntakeAnswerWire, IntakeStepEvent, OrderNumberWidgetSpec } from '../contract';
import { renderTxt } from '../intakeCopy';
import { chrome, NoticeLines, StepShortcuts, type IntakeUi } from '../intakeUi';
import { orderNumberOf } from '../intakeModel';

export function OrderNumberWidget({
  ui, event, spec, disabled, onAnswer, onExpress, onToSummary, onCancelEdit,
}: {
  ui: IntakeUi; event: IntakeStepEvent; spec: OrderNumberWidgetSpec; disabled: boolean;
  onAnswer: (wire: IntakeAnswerWire) => void;
  onExpress: () => void; onToSummary: () => void; onCancelEdit: () => void;
}) {
  const { T } = ui;
  const [raw, setRaw] = useState(spec.value ?? '');
  const max = spec.maxLength ?? 100;
  const number = orderNumberOf(raw, max);
  const taken = spec.exists && number !== null && number === spec.exists.number ? spec.exists : undefined;
  const submit = () => { if (!disabled && number !== null && !taken) onAnswer({ step: 'order_number', orderNumber: number }); };
  return (
    <Shell T={T}>
      <Heading T={T} icon={<Hash size={17} aria-hidden="true" />} title={renderTxt(event.prompt)} hint={event.hint ? renderTxt(event.hint) : undefined} />
      <input
        type="text"
        value={raw}
        maxLength={max}
        disabled={disabled}
        onChange={(e) => setRaw(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
        placeholder={spec.placeholder ? renderTxt(spec.placeholder) : chrome(ui, 'orderNumber.placeholder', 'Order number')}
        aria-label={renderTxt(event.prompt)}
        data-testid="intake-ordernumber-input"
        style={{ ...inputStyle(T, { invalid: !!taken }), height: 44, width: '100%' }}
      />
      {taken && (
        <div data-testid="intake-ordernumber-exists" style={{ marginTop: 10 }}>
          <p className="vai-ik-note vai-ik-note--warn"><span>{renderTxt(taken.text)}</span></p>
          <div className="vai-ik-actions">
            <Button
              T={T} icon={<Link2 size={14} aria-hidden="true" />} disabled={disabled} data-testid="intake-ordernumber-link"
              onClick={() => onAnswer({ step: 'order_number', orderNumber: taken.number, link: true })}
            >
              {renderTxt(taken.link)}
            </Button>
            <Button T={T} variant="ghost" disabled={disabled} data-testid="intake-ordernumber-other" onClick={() => setRaw('')}>
              {renderTxt(taken.other)}
            </Button>
          </div>
        </div>
      )}
      {!taken && (
        <div className="vai-ik-actions">
          <Button T={T} disabled={disabled || number === null} onClick={submit} data-testid="intake-ordernumber-save">
            {spec.save ? renderTxt(spec.save) : chrome(ui, 'orderNumber.save', 'Add order number')}
          </Button>
          <Button T={T} variant="ghost" disabled={disabled} onClick={() => onAnswer({ step: 'order_number', orderNumber: null })} data-testid="intake-ordernumber-skip">
            {spec.skip ? renderTxt(spec.skip) : chrome(ui, 'orderNumber.skip', 'Skip, no order')}
          </Button>
        </div>
      )}
      <NoticeLines ui={ui} notices={event.notices} />
      <StepShortcuts ui={ui} event={event} disabled={disabled} onExpress={onExpress} onToSummary={onToSummary} onCancelEdit={onCancelEdit} />
    </Shell>
  );
}
