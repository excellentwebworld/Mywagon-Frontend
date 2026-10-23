/**
 * The pieces the order-import cards are built from.
 *
 * Each card used to carry its own Chip, Button, Card and the same three
 * hard-coded hex colours - light-mode values that turned to dark-on-navy in the
 * dark theme. Colours now come from `importTones`, which reads the brand's
 * theme-aware status tokens.
 *
 * Buttons come from flowPrimitives, so an import card's buttons are the same
 * buttons as every other card in the chat.
 */
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, CheckCircle2, ChevronDown, ChevronRight, Search } from 'lucide-react';
import type { ThemeTokens } from '../../utils/themes';
import { useTranslation } from '../../hooks/useTranslation';
import { toUpperGreek } from '../../utils/greekUppercase';
import { TONE, type Tone } from './importTones';

export function ImportCard({ T, children, testId }: { T: ThemeTokens; children: React.ReactNode; testId: string }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: T.bd, background: T.sf, color: T.t1 }}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

/** `accent` is the theme's own colour - for a state that is news, not a warning ("Will be updated"). */
export function Chip({ T, tone, children, title }: { T: ThemeTokens; tone: Tone | 'accent'; children: React.ReactNode; title?: string }) {
  const colors =
    tone === 'neutral' ? { fg: T.t2, bg: T.sa }
      : tone === 'accent' ? { fg: T.ac, bg: `color-mix(in srgb, ${T.ac} 14%, transparent)` }
        : TONE[tone];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color: colors.fg, background: colors.bg }}
      title={title}
    >
      {children}
    </span>
  );
}

/** A secondary action that leaves the chat - same footprint as a ghost Button. */
export function LinkAction({ T, to, label, testId }: { T: ThemeTokens; to: string; label: string; testId?: string }) {
  return (
    <Link
      to={to}
      data-testid={testId}
      className="inline-flex items-center gap-1.5 rounded-lg no-underline"
      style={{ height: 34, padding: '0 14px', fontSize: 13, fontWeight: 600, border: `1px solid ${T.bd}`, color: T.t2 }}
    >
      {label}
      <ArrowUpRight size={13} aria-hidden="true" />
    </Link>
  );
}

/**
 * A collapsed-by-default section. `summary` sits beside the title, so the
 * closed state still says what is inside ("18 matched automatically").
 */
export function Disclosure({
  T, title, summary, defaultOpen = false, open: controlled, onToggle, children, testId, bare = false,
}: {
  T: ThemeTokens;
  title: string;
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  children: React.ReactNode;
  testId?: string;
  /** Inside a Section: no rule of its own above it. */
  bare?: boolean;
}) {
  const [own, setOwn] = useState(defaultOpen);
  const open = controlled ?? own;
  const id = useId();
  return (
    <div className={bare ? 'mt-1.5' : 'border-t pt-2.5 mt-3'} style={{ borderColor: T.bd }} data-testid={testId}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setOwn(!open);
          onToggle?.(!open);
        }}
        className="flex w-full items-center gap-1.5 p-0 border-none bg-transparent text-left"
        style={{ color: T.t1, cursor: 'pointer' }}
      >
        {open ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
        <span className="text-[12.5px] font-semibold">{title}</span>
        {summary ? <span className="text-[12px] min-w-0 truncate" style={{ color: T.t3 }}>{summary}</span> : null}
      </button>
      {open ? <div id={id} className="mt-2">{children}</div> : null}
    </div>
  );
}

/** A native select in the chat's style - for column and site pickers, where the list is the file's own. */
export function SmallSelect({
  T, value, onChange, disabled, label, children, testId, invalid,
}: {
  T: ThemeTokens;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
  testId?: string;
  invalid?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      data-testid={testId}
      className="rounded-lg border text-[12.5px] min-w-0"
      style={{
        height: 32,
        padding: '0 8px',
        maxWidth: 260,
        borderColor: invalid ? TONE.warn.fg : T.bd,
        background: T.sf,
        color: T.t1,
      }}
    >
      {children}
    </select>
  );
}

/**
 * One titled part of an import card. The step number is shown only when the
 * sections are things to do in order (answer, check, import); the note says in
 * one sentence what the shipper is expected to do here.
 */
export function Section({
  T, step, title, badge, note, children, testId,
}: {
  T: ThemeTokens;
  step?: number;
  title: string;
  badge?: { label: string; tone: Tone };
  note?: React.ReactNode;
  children?: React.ReactNode;
  testId?: string;
}) {
  return (
    <section className="border-t pt-3.5 mt-3.5" style={{ borderColor: T.bd }} data-testid={testId}>
      <div className="flex items-center gap-2">
        {step ? (
          <span
            className="inline-flex items-center justify-center rounded-full text-[11.5px] font-bold flex-shrink-0"
            style={{ width: 20, height: 20, background: T.al, color: T.ah }}
            aria-hidden="true"
          >
            {step}
          </span>
        ) : null}
        <h4 className="m-0 text-[13.5px] font-semibold" style={{ color: T.t1 }}>{title}</h4>
        {badge ? <Chip T={T} tone={badge.tone}>{badge.label}</Chip> : null}
      </div>
      {note ? (
        <p className="m-0 mt-1 text-[12.5px]" style={{ color: T.t2, paddingLeft: step ? 28 : 0 }}>{note}</p>
      ) : null}
      {children ? <div className="mt-2.5" style={{ paddingLeft: step ? 28 : 0 }}>{children}</div> : null}
    </section>
  );
}

/**
 * One of an import card's sections (Orders, Customers, Products, Locations,
 * Columns, Not imported): the header always says what is inside, and a tick or
 * a mark says whether it needs the shipper.
 *
 * MS3-378: each section is a framed block under a tinted title banner, the
 * tint alternating with `band`, the title in capitals - with every section
 * open, it still shows at a glance where one ends and the next begins.
 *
 * MS3-374: `locked` (a frozen or past card) disables what is inside, never the
 * header - a section of a card that already ran still opens and closes.
 */
export function ReviewSection({
  T, title, summary, attention, tone, open, onToggle, children, testId, band = 0, locked = false,
}: {
  T: ThemeTokens;
  title: string;
  summary: React.ReactNode;
  /** A mark: input or a look is needed here. Otherwise a green tick. */
  attention: boolean;
  /** The mark's tone when `attention` - amber unless said otherwise (Not imported is red). */
  tone?: Exclude<Tone, 'neutral' | 'ok'>;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: React.ReactNode;
  testId: string;
  /** The banner's tint: neutral (0) or the brand's light accent (1), alternating down the card. */
  band?: 0 | 1;
  locked?: boolean;
}) {
  const id = useId();
  const { lang } = useTranslation();
  const mark = attention ? TONE[tone ?? 'warn'].fg : TONE.ok.fg;
  const tint = band ? T.al : T.sa;
  return (
    <section
      className="vai-review-section mt-2.5 rounded-lg border overflow-hidden"
      style={{ borderColor: open ? `color-mix(in srgb, ${T.t3} 35%, ${T.bd})` : T.bd }}
      data-testid={testId}
      data-attention={attention || undefined}
      data-band={band}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => onToggle(!open)}
        className="flex w-full items-center gap-2 px-3 py-2.5 border-none text-left"
        style={{ color: T.t1, background: tint, cursor: 'pointer' }}
      >
        <span className="flex-shrink-0" style={{ color: mark }}>
          {/* Decorative: the summary beside it says in words what needs the shipper. */}
          {attention ? <AlertTriangle size={15} aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}
        </span>
        {/* Not CSS-uppercased: Greek capitals drop their accents, and text-transform keeps them. */}
        <span className="text-[13px] font-bold flex-shrink-0" style={{ letterSpacing: '0.03em' }} lang={lang}>{toUpperGreek(title)}</span>
        <span className="text-[12px] min-w-0 truncate flex-1" style={{ color: T.t2 }}>{summary}</span>
        {open ? <ChevronDown size={15} aria-hidden="true" /> : <ChevronRight size={15} aria-hidden="true" />}
      </button>
      {/* The open body carries a lighter shade of its banner, so with every section
          open each one still reads as its own panel, alternating down the card. */}
      {open ? (
        <div id={id} className="px-3 pt-2.5 pb-3 border-t" style={{ borderColor: T.bd, background: `color-mix(in srgb, ${tint} 80%, ${T.sf})` }}>
          {locked ? <fieldset disabled className="vai-import-history m-0 p-0 border-0 min-w-0">{children}</fieldset> : children}
        </div>
      ) : null}
    </section>
  );
}

export interface ReviewListItem {
  key: string;
  status: 'existing' | 'new' | 'input' | 'skipped';
  name: string;
  detail: string | null;
  orders: number;
}

/**
 * The rows of a review section: name, its detail (VAT, SKU, address), how many
 * of the file's orders use it, and whether it is new, existing or waiting on
 * the shipper. `extra` renders a row's own control (a pickup answer).
 */
/** A review list gets a search box above this many rows (MS3-368/370). */
export const REVIEW_SEARCH_MIN = 15;

export function ReviewList<I extends ReviewListItem>({
  T, items, truncated, labels, prefix, extra, chip, attention, tall, testId,
}: {
  T: ThemeTokens;
  items: I[];
  truncated: boolean;
  labels: {
    status: Record<ReviewListItem['status'], string>;
    orders: (count: number) => string;
    truncated: string;
    /** Placeholder of the search box shown above `REVIEW_SEARCH_MIN` rows, and what it says when nothing matches. */
    search?: string;
    noMatch?: (query: string) => string;
  };
  prefix?: (item: I) => React.ReactNode;
  extra?: (item: I) => React.ReactNode;
  /** A row's own status chip, in place of New / Existing (a possible match). */
  chip?: (item: I) => React.ReactNode | undefined;
  /** Rows waiting on the shipper besides `input` ones - drawn with the same amber border. */
  attention?: (item: I) => boolean;
  /** Rows that open a form of their own (a location to create) get a taller box, so the form is not cut off. */
  tall?: boolean;
  testId: string;
}) {
  const tone: Record<ReviewListItem['status'], Tone> = { new: 'ok', existing: 'neutral', input: 'warn', skipped: 'neutral' };
  const [query, setQuery] = useState('');
  const searchable = Boolean(labels.search) && items.length > REVIEW_SEARCH_MIN;
  const q = query.trim().toLocaleLowerCase();
  const shown = searchable && q
    ? items.filter((i) => `${i.name} ${i.detail ?? ''}`.toLocaleLowerCase().includes(q))
    : items;
  return (
    <>
      {searchable ? (
        <label className="relative block mb-2">
          <span className="sr-only">{labels.search}</span>
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: T.t3 }} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.search}
            className="w-full rounded-lg border pl-8 pr-2.5 py-1.5 text-[12.5px] outline-none"
            style={{ borderColor: T.bd, background: T.sf, color: T.t1 }}
            data-testid={`${testId}-search`}
          />
        </label>
      ) : null}
      <ul className={`m-0 pl-0 list-none space-y-1 ${tall ? 'max-h-[34rem]' : 'max-h-64'} overflow-auto pr-1`} data-testid={testId}>
        {shown.length === 0 && q ? (
          <li className="px-1 py-1.5 text-[12px]" style={{ color: T.t3 }}>{labels.noMatch?.(query) ?? ''}</li>
        ) : null}
        {shown.map((item) => (
          <li
            key={item.key}
            className="rounded-lg border px-2.5 py-1.5 text-[12px]"
            style={{ borderColor: item.status === 'input' || attention?.(item) ? TONE.warn.fg : T.bd, background: T.sf }}
            data-testid={`${testId}-item`}
            data-status={item.status}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {prefix?.(item)}
              <strong className="min-w-0 truncate" style={{ maxWidth: '60%' }} title={item.name}>{item.name}</strong>
              {item.detail ? <span className="min-w-0 truncate" style={{ color: T.t3 }} title={item.detail}>{item.detail}</span> : null}
              <span className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                {/* A past run knows what it created, not how many orders used each one: no "0 orders". */}
                {item.orders > 0 ? <span style={{ color: T.t3 }}>{labels.orders(item.orders)}</span> : null}
                {chip?.(item) ?? <Chip T={T} tone={tone[item.status]}>{labels.status[item.status]}</Chip>}
              </span>
            </div>
            {extra?.(item)}
          </li>
        ))}
      </ul>
      {truncated ? <p className="m-0 mt-1.5 text-[11.5px]" style={{ color: T.t3 }}>{labels.truncated}</p> : null}
    </>
  );
}

/** A labelled count, for the "what will be imported" and "result" rows. */
/** `to` makes the count a link to where those records are (MS3-373). */
export function StatTile({
  T, label, value, tone = 'neutral', testId, to,
}: { T: ThemeTokens; label: string; value: number; tone?: Tone; testId?: string; to?: string }) {
  const fg = tone === 'neutral' ? T.t1 : TONE[tone].fg;
  const body = (
    <>
      <div className="text-[18px] font-bold leading-tight" style={{ color: fg, fontVariantNumeric: 'tabular-nums' }}>{value.toLocaleString()}</div>
      <div className="text-[11.5px] mt-0.5 inline-flex items-center gap-1" style={{ color: T.t2 }}>
        {label}
        {to ? <ArrowUpRight size={11} aria-hidden="true" /> : null}
      </div>
    </>
  );
  const style = { borderColor: T.bd, background: T.sa, flex: '0 1 210px' } as const;
  return to ? (
    <Link to={to} className="rounded-lg border px-3 py-2 min-w-0 no-underline" style={style} data-testid={testId}>{body}</Link>
  ) : (
    <div className="rounded-lg border px-3 py-2 min-w-0" style={style} data-testid={testId}>{body}</div>
  );
}
