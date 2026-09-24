// MYVAGON Shipper Web — reference UI primitives (React 18, no dependencies)
// Requires dev-kit/mv-app-tokens.css loaded at the root.
// Every colour below is a CSS variable. If you need a colour that isn't here, it's the wrong colour.

import React from 'react';

/* ------------------------------------------------------------------ */
/* 1. STATUS → TONE MAP (single source of truth for every status chip) */
/* ------------------------------------------------------------------ */
// Functional colours carry meaning. Map the status string here, never inline a colour in a page.
export const STATUS_TONE = {
  // success — done, paid, healthy
  // NOTE: shipment/load lifecycle statuses (pending, past due, scheduled, ready, on trip…) use LOAD_STATUS below, not this map.
  paid: 'success', active: 'success', completed: 'success', delivered: 'success', fulfilled: 'success', verified: 'success',
  // warning — needs the user's attention soon
  pending: 'warning', unpaid: 'warning', 'needs action': 'warning', 'expiring soon': 'warning', 'partially fulfilled': 'warning', 'awaiting pod': 'warning',
  // danger — late, failed, blocked
  overdue: 'danger', 'past due': 'danger', 'at risk': 'danger', canceled: 'danger', cancelled: 'danger', suspended: 'danger', unfulfilled: 'danger', failed: 'danger',
  // info (brand blue) — scheduled / in motion, neutral progress
  planned: 'info', scheduled: 'info', upcoming: 'info', ready: 'info', 'on trip': 'info', 'invitation sent': 'info',
  // neutral — inert states
  draft: 'neutral', archived: 'neutral', inactive: 'neutral', unplanned: 'neutral', 'coming soon': 'neutral',
};

const TONES = {
  success: { bg: 'var(--mv-success-bg)', fg: 'var(--mv-success-ink)', dot: 'var(--mv-success)' },
  warning: { bg: 'var(--mv-warning-bg)', fg: 'var(--mv-warning-ink)', dot: 'var(--mv-warning)' },
  danger:  { bg: 'var(--mv-danger-bg)',  fg: 'var(--mv-danger)',       dot: 'var(--mv-danger)' },
  info:    { bg: 'var(--mv-blue-100)',   fg: 'var(--mv-blue)',         dot: 'var(--mv-blue)' },
  neutral: { bg: 'var(--mv-grey-100)',   fg: 'var(--mv-grey-600)',     dot: 'var(--mv-grey-400)' },
  accent:  { bg: 'var(--mv-purple-100)', fg: 'var(--mv-purple-dark)',  dot: 'var(--mv-purple)' },
};

/* 1b. LOAD LIFECYCLE STATUS — existing MYVAGON solid colour coding (production values).
   Only the shape is normalised: 8px radius, min 26px high, Poppins 600, upright (no italics).
   Optional second line (sub) carries context: "2 bid requests", "Payment pending", "Shipment pending". */
export const LOAD_STATUS = {
  draft:                 { bg: 'transparent', fg: 'var(--app-text-2)', border: '1.5px dashed var(--app-border-strong)' }, // TO CONFIRM
  scheduled:             { bg: '#FFFFFF', fg: '#9B51E0', border: '1.5px solid #9B51E0' },
  ready:                 { bg: '#A7DBF8', fg: '#1F1F41' },
  pending:               { bg: '#56D19E', fg: '#FFFFFF' },   // no bids / carrier pending (mint)
  'pending-bids':        { bg: '#F2C744', fg: '#1F1F41' },   // pending with bids received (mustard)
  'on trip':             { bg: '#3B8FE8', fg: '#FFFFFF' },
  'past due':            { bg: '#FF6B0A', fg: '#FFFFFF' },
  fulfilled:             { bg: '#8B8A8F', fg: '#FFFFFF', subFg: '#FFD3A8' },
  'partially fulfilled': { split: true },                    // grey "Partially" + black "Fulfilled"
  unfulfilled:           { bg: '#000001', fg: '#FFFFFF', border: '1px solid var(--app-black-contour)' },
  canceled:              { bg: '#E06666', fg: '#FFFFFF' },
};

export function LoadStatus({ status, bids, sub, label }) {
  const raw = String(status || 'draft').toLowerCase().trim();
  const spaced = raw.replace(/_/g, ' ').replace(/fullfilled/g, 'fulfilled');
  const k =
    spaced === 'pending' && bids
      ? 'pending-bids'
      : spaced === 'on trip' || spaced === 'in progress'
        ? 'on trip'
        : spaced === 'past due'
          ? 'past due'
          : spaced === 'partially fulfilled'
            ? 'partially fulfilled'
            : spaced === 'not fulfilled' || spaced === 'unfulfilled'
              ? 'unfulfilled'
              : spaced === 'canceled' || spaced === 'cancelled'
                ? 'canceled'
                : spaced;
  const t = LOAD_STATUS[k] || LOAD_STATUS.draft;
  const display = label || status;
  const second = bids ? `${bids} bid requests` : sub;
  if (t.split) {
    return (
      <span style={{ display: 'inline-flex', minHeight: 26, borderRadius: 8, overflow: 'hidden', fontSize: 12, fontWeight: 600, border: '1px solid var(--app-black-contour)' }}>
        <span style={{ display: 'flex', alignItems: 'center', padding: '0 9px', background: '#E6E6E8', color: '#1F1F41' }}>Partially</span>
        <span style={{ display: 'flex', alignItems: 'center', padding: '0 9px', background: '#000001', color: '#FFFFFF' }}>Fulfilled</span>
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 108, minHeight: 26, padding: '4px 10px',
      borderRadius: 8, background: t.bg, color: t.fg, border: t.border || '1px solid transparent', fontSize: 12, fontWeight: 600, lineHeight: 1.25, textAlign: 'center' }}>
      {display}
      {second && <span style={{ fontSize: 11, fontWeight: 500, color: t.subFg || 'inherit' }}>{second}</span>}
    </span>
  );
}

/* 1c. OPERATIONAL FILTERS — derived views. Colour appears ONLY as a 7px dot next to the filter / KPI label. */
export const OPS_DOT = {
  'needs action': '#F2C744',      // = Pending with bids
  'awaiting response': '#56D19E', // = Pending, no bids yet
  upcoming: '#A7DBF8',            // = Ready
  'at risk': '#D63AAF',           // fuchsia
  'awaiting pod': '#8B8A8F',      // = Fulfilled
  'on trip': '#3B8FE8',
  'past due': '#FF6B0A',
};
export const OpsDot = ({ filter }) => <span style={{ width: 7, height: 7, borderRadius: 4, background: OPS_DOT[String(filter).toLowerCase()] || 'var(--app-border-strong)' }} />;

/* 1d. STOP TYPE — Pickup white, Dropoff black (existing coding). Dark mode: black label gets a white contour via --app-black-contour. */
export function StopTag({ type }) {
  const drop = String(type).toLowerCase() === 'dropoff';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
      background: drop ? '#000001' : '#FFFFFF', color: drop ? '#FFFFFF' : '#000001',
      border: drop ? '1px solid var(--app-black-contour)' : '1px solid var(--app-border-strong)' }}>
      {drop ? 'DROPOFF' : 'PICKUP'}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 2. STATUS BADGE (records: invoices, partners, SKUs, lanes) — functional colour, always with a dot              */
/* ------------------------------------------------------------------ */
export function StatusBadge({ status, tone }) {
  const t = TONES[tone || STATUS_TONE[String(status).toLowerCase()] || 'neutral'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 10px',
      borderRadius: 'var(--r-tag)', background: t.bg, color: t.fg,
      fontSize: 12, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: t.dot }} />
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 3. TAG — categorical (type, metric, role). NEVER functional colours */
/* ------------------------------------------------------------------ */
// variant: 'outline' (default) | 'brand' (purple tint, "yours/primary" category) | 'blue' (secondary category)
export function Tag({ children, variant = 'outline' }) {
  const v = {
    outline: { background: 'var(--app-surface)', color: 'var(--mv-grey-600)', border: '1px solid var(--app-border)' },
    brand:   { background: 'var(--mv-purple-100)', color: 'var(--mv-purple-dark)', border: '1px solid transparent' },
    blue:    { background: 'var(--mv-blue-100)', color: 'var(--mv-blue)', border: '1px solid transparent' },
    navy:    { background: 'var(--mv-navy)', color: 'var(--mv-white)', border: '1px solid transparent' },
  }[variant];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 9px', borderRadius: 'var(--r-tag)', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', ...v }}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 4. BUTTON — hierarchy: gradient (1 per screen) > primary > secondary > ghost */
/* ------------------------------------------------------------------ */
// Hover: purple surfaces and purple links shift to brand Blue (--app-primary-hover / --app-link-hover).
export function Button({ variant = 'primary', size = 'md', icon, children, disabled, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const h = size === 'sm' ? 32 : 40;
  const v = {
    gradient:  { background: 'var(--mv-grad-purple-blue)', color: 'var(--mv-white)', border: 'none', boxShadow: 'var(--sh-purple)' },
    primary:   { background: hover ? 'var(--app-primary-hover)' : 'var(--mv-purple)', color: 'var(--mv-white)', border: 'none' },
    navy:      { background: 'var(--mv-navy)', color: 'var(--mv-white)', border: 'none' },
    secondary: { background: 'var(--app-surface)', color: 'var(--app-text)', border: '1px solid var(--app-border-strong)' },
    ghost:     { background: 'transparent', color: hover ? 'var(--app-link-hover)' : 'var(--app-accent-text)', border: 'none' },
    danger:    { background: 'var(--app-surface)', color: 'var(--mv-danger)', border: '1px solid var(--mv-danger-bg)' },
  }[variant];
  return (
    <button disabled={disabled} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} {...rest} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, height: h, padding: size === 'sm' ? '0 12px' : '0 16px',
      borderRadius: 'var(--r-button)', fontSize: size === 'sm' ? 13 : 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1, transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)', ...v, ...rest.style,
    }}>
      {icon}{children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* 5. CARD + PAGE HEADER                                                */
/* ------------------------------------------------------------------ */
// tone="hero" = analytics gradient. Use ONLY for stats / analytics surfaces (performance summary, headline KPI, reports).
export function Card({ title, action, children, padding = 20, tone = 'light' }) {
  const dark = tone === 'hero';
  return (
    <section style={{
      background: dark ? 'var(--grad-analytics)' : 'var(--app-surface)', color: dark ? 'var(--mv-white)' : 'inherit',
      border: dark ? 'none' : '1px solid var(--app-border)', borderRadius: 'var(--r-card)', boxShadow: 'var(--sh-card)', overflow: 'hidden',
    }}>
      {title && (
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: dark ? '1px solid rgba(255,255,255,.12)' : '1px solid var(--app-border)' }}>
          <h3 style={{ margin: 0, fontSize: 'var(--fs-section)', fontWeight: 600 }}>{title}</h3>
          {action}
        </header>
      )}
      <div style={{ padding }}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 'var(--fs-page-title)', fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</h1>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--app-text-2)' }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 6. KPI CARD — numbers in ink, colour only via a status dot           */
/* ------------------------------------------------------------------ */
// tone: 'hero' = analytics gradient, ONLY for the total KPI at the start of a row (e.g. Active loads), max 1 per row.
// Status KPIs: 'success'|'warning'|'danger'|'info' — white card, colour via dot only.
export function KpiCard({ label, value, meta, tone, active, onClick }) {
  const hero = tone === 'hero';
  const dot = tone && !hero ? TONES[tone].dot : null;
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', cursor: onClick ? 'pointer' : 'default', padding: '16px 18px', borderRadius: 'var(--r-card)',
      background: hero ? 'var(--grad-analytics)' : 'var(--app-surface)', color: hero ? 'var(--mv-white)' : 'var(--app-text)',
      border: active ? '1.5px solid var(--mv-purple)' : hero ? 'none' : '1px solid var(--app-border)', boxShadow: active ? 'var(--app-focus)' : 'var(--sh-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-overline)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: hero ? 'var(--mv-purple-tint)' : 'var(--app-text-3)' }}>
        {dot && <span style={{ width: 7, height: 7, borderRadius: 4, background: dot }} />}{label}
      </div>
      <div style={{ marginTop: 8, fontSize: 'var(--fs-kpi)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{value}</div>
      {meta && <div style={{ marginTop: 4, fontSize: 12, color: hero ? 'var(--mv-grey-300)' : 'var(--app-text-3)' }}>{meta}</div>}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* 7. TABS (underline, purple) + FILTER CHIPS (navy when active)        */
/* ------------------------------------------------------------------ */
export function Tabs({ items, value, onChange }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--app-border)', overflowX: 'auto' }}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button key={it.id} role="tab" aria-selected={on} onClick={() => onChange(it.id)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: on ? '2px solid var(--mv-purple)' : '2px solid transparent', marginBottom: -1,
            color: on ? 'var(--mv-purple)' : 'var(--app-text-2)', fontSize: 14, fontWeight: on ? 600 : 500, whiteSpace: 'nowrap',
          }}>
            {it.label}
            {it.count != null && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: on ? 'var(--mv-purple-100)' : 'var(--mv-grey-100)', color: on ? 'var(--mv-purple-dark)' : 'var(--mv-grey-600)' }}>{it.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function FilterChips({ items, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {items.map((it) => {
        const on = it === value;
        return (
          <button key={it} onClick={() => onChange(it)} style={{
            height: 32, padding: '0 12px', borderRadius: 'var(--r-control)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            background: on ? 'var(--mv-navy)' : 'var(--app-surface)', color: on ? 'var(--mv-white)' : 'var(--app-text-2)',
            border: on ? '1px solid var(--mv-navy)' : '1px solid var(--app-border)',
          }}>{it}</button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 8. TOGGLE — purple, never green                                      */
/* ------------------------------------------------------------------ */
export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1 }}>
      <span
        role="switch"
        aria-checked={Boolean(checked)}
        aria-disabled={disabled || undefined}
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) onChange(!checked);
        }}
        style={{ width: 40, height: 24, borderRadius: 12, padding: 3, boxSizing: 'border-box', background: checked ? 'var(--mv-purple)' : 'var(--mv-grey-300)', transition: 'background var(--dur) var(--ease)' }}
      >
        <span style={{ display: 'block', width: 18, height: 18, borderRadius: 9, background: 'var(--mv-white)', boxShadow: 'var(--sh-card)', transform: checked ? 'translateX(16px)' : 'none', transition: 'transform var(--dur) var(--ease)' }} />
      </span>
      {label}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* 9. USAGE METER — brand gradient; functional colour only near the limit */
/* ------------------------------------------------------------------ */
export function UsageMeter({ label, used, limit }) {
  const unlimited = limit == null;
  const pct = unlimited ? 0 : Math.min(100, (used / limit) * 100);
  const fill = pct >= 100 ? 'var(--mv-danger)' : pct >= 85 ? 'var(--mv-warning)' : 'var(--mv-grad-purple-blue)';
  return (
    <div style={{ padding: 16, borderRadius: 12, border: '1px solid var(--app-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span style={{ color: 'var(--app-text-2)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}><b>{used}</b><span style={{ color: 'var(--app-text-3)' }}> / {unlimited ? 'Unlimited' : limit}</span></span>
      </div>
      <div style={{ marginTop: 12, height: 6, borderRadius: 3, background: 'var(--mv-grey-100)' }}>
        {!unlimited && <div style={{ width: pct + '%', height: '100%', borderRadius: 3, background: fill }} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 10. MONEY — never colour a zero, never green a balance               */
/* ------------------------------------------------------------------ */
export function Money({ value, overdue, currency = 'EUR' }) {
  const zero = Number(value) === 0;
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: zero ? 400 : 600, color: zero ? 'var(--app-text-3)' : overdue ? 'var(--mv-danger)' : 'var(--app-text)' }}>
      {new Intl.NumberFormat('en-IE', { style: 'currency', currency: currency || 'EUR' }).format(Number(value) || 0)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 11. LINK — purple, blue on hover, never underlined by default         */
/* ------------------------------------------------------------------ */
export function Link({ children, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <a {...rest} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ color: hover ? 'var(--app-link-hover)' : 'var(--app-accent-text)', fontWeight: 600, textDecoration: 'none', transition: 'color var(--dur) var(--ease)', ...rest.style }}>
      {children}
    </a>
  );
}
