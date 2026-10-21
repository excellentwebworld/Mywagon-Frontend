/**
 * The intake cards' frame: the card and its heading (the field style and link classes are in `intakeStyles.ts`). Same props as the `flowPrimitives` pair the widgets
 * used before, so a widget only changes its import; the look lives in `intake.css` (scoped to `.vai-ik`), so the older
 * guided flows that still use `flowPrimitives` are not touched. Hook-free.
 */
import type { ThemeTokens } from '../../../utils/themes';
import './intake.css';

export function Shell({ children, testId }: { T?: ThemeTokens; children: React.ReactNode; testId?: string }) {
  return <div className="vai-ik" data-testid={testId}>{children}</div>;
}

export function Heading({
  icon, title, hint, tone,
}: { T?: ThemeTokens; icon: React.ReactNode; title: string; hint?: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="vai-ik-head">
      <span className="vai-ik-head-icon" data-tone={tone} aria-hidden="true">{icon}</span>
      <div className="vai-ik-head-text">
        <div className="vai-ik-title">{title}</div>
        {hint && <p className="vai-ik-hint">{hint}</p>}
      </div>
    </div>
  );
}
