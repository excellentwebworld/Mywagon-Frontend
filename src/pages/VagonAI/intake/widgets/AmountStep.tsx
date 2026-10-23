/**
 * The money box the price and order-value widgets share: a € amount, pre-filled with the smart default, one primary
 * button to set it and one quiet way out. Enter sets it. The amount rules live in `intakeModel.parseAmount`.
 */
import { useState } from 'react';
import { Heading, Shell } from '../intakeShell';
import { TapButton as Button } from '../intakeUi';
import { inputStyle } from '../intakeStyles';
import type { IntakeStepEvent } from '../contract';
import { renderTxt } from '../intakeCopy';
import type { AmountParse } from '../intakeModel';
import { NoticeLines, StepShortcuts, type IntakeUi } from '../intakeUi';

export function AmountStep({
  ui, event, icon, testPrefix, initial, parse, note, setLabel, placeholder, invalidText, skipLabel, extra,
  disabled, onSet, onSkip, onExpress, onToSummary, onCancelEdit,
}: {
  ui: IntakeUi; event: IntakeStepEvent; icon: React.ReactNode; testPrefix: string;
  /** The pre-filled text (the suggestion / the auto-sum), or ''. */
  initial: string;
  parse: (raw: string) => AmountParse;
  /** A line above the box: the suggestion or the auto-sum. */
  note?: string;
  setLabel: string; placeholder: string; invalidText: string;
  /** Null ⇒ no way to skip. */
  skipLabel: string | null;
  /** Extra line under the buttons (e.g. why a fixed price needs an amount). */
  extra?: string;
  disabled: boolean;
  onSet: (value: number) => void; onSkip: () => void;
  onExpress: () => void; onToSummary: () => void; onCancelEdit: () => void;
}) {
  const { T } = ui;
  const [raw, setRaw] = useState(initial);
  const parsed = parse(raw);
  const invalid = raw.trim() !== '' && !parsed.ok;
  const submit = () => { if (!disabled && parsed.ok) onSet(parsed.value); };
  return (
    <Shell T={T}>
      <Heading T={T} icon={icon} title={renderTxt(event.prompt)} hint={event.hint ? renderTxt(event.hint) : undefined} />
      {note && <p data-testid={`${testPrefix}-note`} className="vai-ik-lead">{note}</p>}
      <div className="vai-ik-money">
        <span aria-hidden="true">€</span>
        <input
          type="text"
          inputMode="decimal"
          value={raw}
          disabled={disabled}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
          placeholder={placeholder}
          aria-label={renderTxt(event.prompt)}
          aria-invalid={invalid}
          data-testid={`${testPrefix}-input`}
          style={{ ...inputStyle(T, { invalid }), height: 44 }}
        />
      </div>
      {invalid && <p role="alert" data-testid={`${testPrefix}-invalid`} className="vai-ik-inline-error">{invalidText}</p>}
      <div className="vai-ik-actions">
        <Button T={T} disabled={disabled || !parsed.ok} onClick={submit} data-testid={`${testPrefix}-set`}>{setLabel}</Button>
        {skipLabel && <Button T={T} variant="ghost" disabled={disabled} onClick={onSkip} data-testid={`${testPrefix}-skip`}>{skipLabel}</Button>}
      </div>
      {extra && <p data-testid={`${testPrefix}-extra`} className="vai-ik-why">{extra}</p>}
      <NoticeLines ui={ui} notices={event.notices} />
      <StepShortcuts ui={ui} event={event} disabled={disabled} onExpress={onExpress} onToSummary={onToSummary} onCancelEdit={onCancelEdit} />
    </Shell>
  );
}
