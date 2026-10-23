/**
 * Small shared pieces of the intake widgets: the context every widget receives, and the bits several of them draw.
 * Nothing here reads a hook — a widget is handed the theme and the translator so it can be rendered (and tested)
 * without a provider. `IntakeWidgetHost` is the only place that calls `useTheme` / `useTranslation`.
 */
import { useEffect, useRef, type ButtonHTMLAttributes } from 'react';
import { AlertTriangle, FastForward, Info, ListChecks, X } from 'lucide-react';
import type { ThemeTokens } from '../../../utils/themes';
import { intakeKey, type TFn } from './intakeCopy';
import { takeFocusIntent } from './intakeFocus';
import { EL_NUMBERS, EN_NUMBERS, type NumberLocale } from './numberFormat';
import { TAP_CLASS } from './tap';
import type { IntakeStepEvent, Notice } from './contract';

export interface IntakeUi {
  T: ThemeTokens;
  t: TFn;
}

/** `t('vagonai.shipment.intake.<key>')` with an English default for the rare key a locale lacks. */
export const chrome = (ui: IntakeUi, key: string, fallback: string, params?: Record<string, unknown>): string =>
  ui.t(intakeKey(key), { defaultValue: fallback, ...params });

/**
 * Which language's number habits to read typed numbers with (`1.234,50` in Greek, `1,234.50` in English): taken from the
 * decimal mark the locale file declares (`number.decimal`), so a language added later only needs that one key.
 */
export const numberLocaleOf = (ui: IntakeUi): NumberLocale => (chrome(ui, 'number.decimal', '.') === ',' ? EL_NUMBERS : EN_NUMBERS);

/**
 * The intake button: primary (the step's one action), ghost (a second answer), danger, or subtle (a quiet text button —
 * the step shortcuts, Discard). Drawn by `intake.css`; a phone-sized tap target (≥ 44 px under `md`; unchanged above it).
 * `T` is accepted and unused so call sites keep the `flowPrimitives` shape.
 */
export function TapButton({
  children, onClick, variant = 'primary', size, disabled, icon, className, ...props
}: {
  T?: ThemeTokens; children: React.ReactNode; onClick: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'subtle'; size?: 'sm'; disabled?: boolean; icon?: React.ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>) {
  const { T, ...rest } = props;
  void T; // the theme is read by intake.css, not here
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      {...rest}
      className={`vai-ik-btn vai-ik-btn--${variant}${size ? ` vai-ik-btn--${size}` : ''} ${TAP_CLASS}${className ? ` ${className}` : ''}`}
    >
      {icon}
      {children}
    </button>
  );
}

/**
 * Wraps a card that has just arrived. When the shipper's own action brought it (`armFocusIntent`), focus moves to it —
 * once, without scrolling the chat — so keyboard and screen-reader users land on the new question instead of `<body>`
 * (QA-1). Otherwise (page load, history, a card nobody waited for) it does nothing at all.
 */
export function LiveFocus({ label, children, testId = 'intake-live' }: { label: string; children: React.ReactNode; testId?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (takeFocusIntent()) ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div ref={ref} tabIndex={-1} role="group" aria-label={label} data-testid={testId} style={{ outline: 'none' }}>
      {children}
    </div>
  );
}

/** Notices from resolving the shipper's words: what happened, then how to fix it. A warning is an amber callout. */
export function NoticeLines({ notices }: { ui: IntakeUi; notices: Notice[] }) {
  if (notices.length === 0) return null;
  return (
    <div className="vai-ik-notes" data-testid="intake-notices">
      {notices.map((n, i) => {
        const warn = n.tone === 'warning';
        return (
          <p key={`${n.code}-${i}`} className={`vai-ik-note${warn ? ' vai-ik-note--warn' : ''}`} data-tone={n.tone}>
            {warn ? <AlertTriangle size={15} aria-hidden="true" /> : <Info size={15} aria-hidden="true" />}
            <span>{n.fix ? `${n.text.text} ${n.fix.text}` : n.text.text}</span>
          </p>
        );
      })}
    </div>
  );
}

/** A plain line under a widget: a refused answer or a lost race. `role=alert` so a screen reader says it. */
export function NoticeLine({ tone, children }: { ui: IntakeUi; tone: 'error' | 'info'; children: React.ReactNode }) {
  return (
    <p
      className={`vai-ik-note vai-ik-note--${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
      data-testid="intake-notice"
      data-tone={tone}
    >
      {tone === 'error' ? <AlertTriangle size={15} aria-hidden="true" /> : <Info size={15} aria-hidden="true" />}
      <span>{children}</span>
    </p>
  );
}

/**
 * The shortcuts that belong to a step rather than to its widget: "Use defaults for the rest" (express),
 * "Go to summary", and "Cancel edit" when the step was opened from the summary. One quiet row, never the main action.
 */
export function StepShortcuts({
  ui, event, disabled, onExpress, onToSummary, onCancelEdit,
}: {
  ui: IntakeUi; event: IntakeStepEvent; disabled: boolean;
  onExpress: () => void; onToSummary: () => void; onCancelEdit: () => void;
}) {
  if (!event.canExpress && !event.canToSummary && !event.editing) return null;
  return (
    <div className="vai-ik-foot" data-testid="intake-shortcuts">
      {event.editing && (
        <TapButton T={ui.T} variant="subtle" icon={<X size={14} aria-hidden="true" />} disabled={disabled} onClick={onCancelEdit} data-testid="intake-cancel-edit">
          {chrome(ui, 'summary.cancelEdit', 'Cancel edit')}
        </TapButton>
      )}
      {event.canExpress && (
        <TapButton T={ui.T} variant="subtle" icon={<FastForward size={14} aria-hidden="true" />} disabled={disabled} onClick={onExpress} data-testid="intake-express">
          {chrome(ui, 'express.label', 'Use defaults for the rest')}
        </TapButton>
      )}
      {event.canToSummary && (
        <TapButton T={ui.T} variant="subtle" icon={<ListChecks size={14} aria-hidden="true" />} disabled={disabled} onClick={onToSummary} data-testid="intake-to-summary">
          {chrome(ui, 'express.toSummary', 'Go to summary')}
        </TapButton>
      )}
    </div>
  );
}

/**
 * Splits a localised sentence around one `{{slot}}`, so the slot can be drawn as buttons.
 * "To publish, add: {{fields}}" → ["To publish, add: ", ""]. A template without the slot comes back whole.
 */
export function splitAround(template: string, slot: string): [string, string] {
  const re = new RegExp(`\\{\\{\\s*${slot}\\s*\\}\\}|\\{\\s*${slot}\\s*\\}`);
  const m = re.exec(template);
  if (!m) return [template, ''];
  return [template.slice(0, m.index), template.slice(m.index + m[0].length)];
}
