/**
 * "Tell me about the load in your own words" — with a quiet way out: "I'd rather go step by step".
 *
 * The typed text is a normal chat turn (CONTRACT.md §5.3: the model calls `shipment_intake(facts)`), so Send hands
 * the text to the page's own `send`. The widget never calls the gateway itself. Enter sends, Shift+Enter is a new
 * line; the example is a one-tap fill, so a shipper who does not know what to write has something to start from.
 */
import { useState } from 'react';
import { Lightbulb, MessageSquareText, SendHorizontal } from 'lucide-react';
import { Heading, Shell } from '../intakeShell';
import { TapButton as Button } from '../intakeUi';
import { inputStyle } from '../intakeStyles';
import type { DescribeWidgetSpec, IntakeStepEvent } from '../contract';
import { renderTxt } from '../intakeCopy';
import { describeText } from '../intakeModel';
import { chrome, NoticeLines, StepShortcuts, type IntakeUi } from '../intakeUi';
import { TAP_CLASS } from '../tap';

export function DescribeWidget({
  ui, event, spec, disabled, onSend, onStepByStep, onExpress, onToSummary, onCancelEdit,
}: {
  ui: IntakeUi; event: IntakeStepEvent; spec: DescribeWidgetSpec; disabled: boolean;
  onSend: (text: string) => void; onStepByStep: () => void;
  onExpress: () => void; onToSummary: () => void; onCancelEdit: () => void;
}) {
  const { T } = ui;
  const [text, setText] = useState('');
  const ready = describeText(text) !== null;
  const send = () => {
    const out = describeText(text);
    if (out && !disabled) { onSend(out); setText(''); }
  };
  return (
    <Shell T={T}>
      <Heading T={T} icon={<MessageSquareText size={17} aria-hidden="true" />} title={renderTxt(event.prompt)} hint={event.hint ? renderTxt(event.hint) : undefined} />
      <textarea
        value={text}
        disabled={disabled}
        rows={4}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
        }}
        placeholder={chrome(ui, 'describe.placeholder', 'Describe the load…')}
        aria-label={renderTxt(event.prompt)}
        data-testid="intake-describe-input"
        className="rounded-lg"
        style={{ ...inputStyle(T), height: 'auto', minHeight: 96, padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setText(renderTxt(spec.example).replace(/^\s*(e\.g\.|π\.χ\.)\s*/i, ''))}
        data-testid="intake-describe-example"
        className={`vai-ik-chip ${TAP_CLASS}`}
        style={{ marginTop: 10, whiteSpace: 'normal', textAlign: 'left', height: 'auto', padding: '6px 12px', lineHeight: 1.4, fontWeight: 500 }}
      >
        <Lightbulb size={13} aria-hidden="true" style={{ flexShrink: 0, color: T.ac }} />
        <span>{renderTxt(spec.example)}</span>
      </button>
      <div className="vai-ik-actions">
        <Button T={T} icon={<SendHorizontal size={14} aria-hidden="true" />} disabled={disabled || !ready} onClick={send} data-testid="intake-describe-send">
          {chrome(ui, 'describe.send', 'Send')}
        </Button>
        <Button T={T} variant="ghost" disabled={disabled} onClick={onStepByStep} data-testid="intake-describe-stepbystep">
          {renderTxt(spec.stepByStep)}
        </Button>
      </div>
      <NoticeLines ui={ui} notices={event.notices} />
      <StepShortcuts ui={ui} event={event} disabled={disabled} onExpress={onExpress} onToSummary={onToSummary} onCancelEdit={onCancelEdit} />
    </Shell>
  );
}
