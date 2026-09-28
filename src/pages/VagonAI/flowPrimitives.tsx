/**
 * The pieces both guided flows are built from.
 *
 * `CreateShipmentFlow` used to hold these, with a note saying it was deliberately
 * one file - and that was right while there was one flow. A second flow makes the
 * same argument point the other way: two copies of a picker row is two places a
 * focus ring or a disabled state can drift, and the flows have to look like one
 * product because to the shipper they are one product.
 *
 * Nothing here knows about shipments or products. Anything that does belongs in
 * the flow that owns it - `StepBar` stayed behind in `CreateShipmentFlow` for
 * exactly that reason, since its eleven segments are that flow's own shape.
 */
import { Check, AlertTriangle, Info, Plus } from 'lucide-react';
import type { ThemeTokens } from '../../utils/themes';

export function Shell({ T, children }: { T: ThemeTokens; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl mt-3"
      style={{ border: `1px solid ${T.bd}`, background: T.sf, padding: 14, maxWidth: 560 }}
    >
      {children}
    </div>
  );
}

export function Heading({ T, icon, title, hint }: { T: ThemeTokens; icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-center" style={{ gap: 7, fontSize: 14, fontWeight: 650, color: T.t1 }}>
        <span style={{ color: T.ac }}>{icon}</span>
        <span>{title}</span>
      </div>
      {hint && <p style={{ fontSize: 12, color: T.t3, marginTop: 3 }}>{hint}</p>}
    </div>
  );
}

export function Field({
  T, label, children, required, invalid,
}: {
  T: ThemeTokens;
  label: string;
  children: React.ReactNode;
  required?: boolean;
  invalid?: boolean;
}) {
  return (
    <label className="flex flex-col" style={{ gap: 4, flex: '1 1 140px', minWidth: 130 }}>
      <span style={{ fontSize: 11, color: invalid ? '#DC2626' : T.t3, fontWeight: 600 }}>
        {label}
        {required ? <span style={{ color: '#DC2626', marginLeft: 3 }} aria-hidden="true">*</span> : null}
      </span>
      {children}
    </label>
  );
}

export function Button({
  T, children, onClick, variant = 'primary', disabled, icon,
  ...rest
}: {
  T: ThemeTokens; children: React.ReactNode; onClick: () => void;
  variant?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; icon?: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const primary = variant === 'primary';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-lg"
      {...rest}
      style={{
        height: 34, padding: '0 14px', fontSize: 13, fontWeight: 600, gap: 6,
        border: `1px solid ${primary ? 'transparent' : T.bd}`,
        background: primary ? T.ac : 'transparent',
        color: primary ? '#fff' : variant === 'danger' ? '#DC2626' : T.t2,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {icon}
      {children}
    </button>
  );
}

/** A tappable record row — the shape every picker in this flow uses. */
export function PickRow({
  T, title, subtitle, selected, disabled, onClick, badge,
}: {
  T: ThemeTokens; title: string; subtitle?: string | null; selected: boolean;
  disabled?: boolean; onClick: () => void; badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-between rounded-lg w-full text-left"
      style={{
        padding: '8px 10px', gap: 8,
        border: `1px solid ${selected ? T.ac : T.bd}`,
        background: selected ? T.al : 'transparent',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span className="min-w-0">
        <span className="block" style={{ fontSize: 13, fontWeight: 600, color: T.t1, wordBreak: 'break-word' }}>
          {title}
        </span>
        {subtitle && <span className="block" style={{ fontSize: 11, color: T.t3 }}>{subtitle}</span>}
      </span>
      <span className="flex items-center flex-shrink-0" style={{ gap: 6 }}>
        {badge && (
          <span style={{ fontSize: 10, fontWeight: 700, color: T.t3, border: `1px solid ${T.bd}`, borderRadius: 5, padding: '1px 5px' }}>
            {badge}
          </span>
        )}
        {selected && <Check size={14} style={{ color: T.ac }} />}
      </span>
    </button>
  );
}

/**
 * The dashed "add a new one" row that closes every picker.
 *
 * Deliberately part of the list rather than a button above or below it. A picker
 * that ends in a dead end - "Nothing matched." - is where a shipper abandons the
 * flow, and an affordance sitting inside the same scroll they were already reading
 * is the one they actually find. Visually distinct from a `PickRow` because it is
 * not a record: it opens a form.
 */
export function AddNewRow({
  T, label, hint, disabled, onClick,
}: {
  T: ThemeTokens; label: string; hint?: string; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center rounded-lg w-full text-left"
      style={{
        padding: '8px 10px', gap: 8,
        border: `1px dashed ${T.bd}`,
        background: 'transparent',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <Plus size={14} style={{ color: T.ac, flexShrink: 0 }} />
      <span className="min-w-0">
        <span className="block" style={{ fontSize: 13, fontWeight: 600, color: T.ac }}>{label}</span>
        {hint && <span className="block" style={{ fontSize: 11, color: T.t3 }}>{hint}</span>}
      </span>
    </button>
  );
}

export function Notes({ T, notes, tone = 'info' }: { T: ThemeTokens; notes: string[]; tone?: 'info' | 'warn' }) {
  if (notes.length === 0) return null;
  const color = tone === 'warn' ? '#B45309' : T.t3;
  return (
    <div className="flex flex-col mt-2" style={{ gap: 4 }}>
      {notes.map((note) => (
        <p key={note} className="flex items-start" style={{ gap: 5, fontSize: 11, color, lineHeight: 1.45 }}>
          {tone === 'warn' ? <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" /> : <Info size={11} className="flex-shrink-0 mt-0.5" />}
          <span>{note}</span>
        </p>
      ))}
    </div>
  );
}

