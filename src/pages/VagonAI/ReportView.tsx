/**
 * ReportView — a report card set as one panel: what was counted, the headline
 * figures, then the breakdown as a chart or a table.
 *
 * One panel rather than a stack of boxes, because it is one answer: the scope
 * line, the totals and the breakdown are read together, and four separately
 * bordered cards made it look like four answers.
 *
 * - **Totals first, as tiles.** The number is the weight; the label sits above
 *   it. A compared total carries its change as a badge beside the figure.
 * - **Chart or table, not both at once.** When there is a chart the breakdown
 *   opens on it — the shape is what a shipper looks at first — and one tap
 *   switches to the full table with every metric. A long breakdown shows its
 *   first rows and says how many more there are.
 * - **CSV of exactly what is on screen**, so the figures in the file are the
 *   figures in the chat.
 *
 * Every string arrives formatted from the gateway — money, km, percentages and
 * the em dash for "no data". This component measures the chart values to size
 * the marks and computes nothing else.
 */
import { useEffect, useId, useState } from 'react';
import {
  CalendarRange,
  ChartColumn,
  ChartLine,
  ChevronDown,
  ChevronUp,
  Download,
  Info,
  Minus,
  Table2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { ResultCardSet, ResultField, ResultTable } from '../../hooks/useChat';
import type { ThemeTokens } from '../../utils/themes';
import { downloadReportCsv } from './reportCsv';

type Translate = (k: string, o?: Record<string, unknown>) => string;
type Chart = NonNullable<ResultTable['chart']>;
type View = 'chart' | 'table';

/** Rows shown before "Show all" — enough to see the leaders without a wall of numbers. */
const PREVIEW_ROWS = 8;
const UNAVAILABLE = '—';

function chartHasData(chart: Chart | undefined): chart is Chart {
  return !!chart && chart.points.some((p) => p.value !== null && p.value > 0);
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** False for the first frame, so bars grow in from zero instead of popping in. */
function useGrowIn(): boolean {
  const [grown, setGrown] = useState(prefersReducedMotion);
  useEffect(() => {
    if (grown) return;
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, [grown]);
  return grown;
}

/**
 * The change against the previous period, as direction and amount only.
 *
 * Deliberately not green or red: whether "up" is good depends on the metric —
 * more spend is bad, a higher on-time rate is good — and the gateway does not
 * say which. Colouring it here would be this component inventing a verdict.
 */
function ChangeBadge({ change, T }: { change: NonNullable<ResultField['change']>; T: ThemeTokens }) {
  const Icon = change.trend === 'up' ? TrendingUp : change.trend === 'down' ? TrendingDown : Minus;
  return (
    <span
      className="inline-flex items-center rounded-full"
      style={{
        gap: 3,
        padding: '2px 7px',
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
        color: T.t2,
        background: T.sf,
        border: `1px solid ${T.bd}`,
      }}
    >
      <Icon size={12} className="flex-shrink-0" />
      {change.label}
    </span>
  );
}

function KpiTile({ field, primary, T }: { field: ResultField; primary: boolean; T: ThemeTokens }) {
  const figure = field.figure ?? field.value;
  const unavailable = figure === UNAVAILABLE;
  return (
    <div
      className="rounded-lg flex flex-col"
      style={{
        padding: '10px 12px',
        gap: 4,
        background: primary ? T.al : T.sa,
        // The tile whose metric the chart draws, so the two read as one thing.
        border: `1px solid ${primary ? T.ac : 'transparent'}`,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: T.t2, lineHeight: 1.3 }}>{field.label}</div>
      <div
        style={{
          fontSize: 21,
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
          color: unavailable ? T.t3 : primary ? T.ac : T.t1,
          wordBreak: 'break-word',
        }}
      >
        {figure}
      </div>
      {field.change && (
        <div>
          <ChangeBadge change={field.change} T={T} />
        </div>
      )}
    </div>
  );
}

function ViewToggle({
  view,
  chartType,
  onChange,
  T,
  t,
}: {
  view: View;
  chartType: Chart['type'];
  onChange: (view: View) => void;
  T: ThemeTokens;
  t: Translate;
}) {
  const options: { key: View; label: string; Icon: typeof Table2 }[] = [
    { key: 'chart', label: t('vagonai.report.chart'), Icon: chartType === 'line' ? ChartLine : ChartColumn },
    { key: 'table', label: t('vagonai.report.table'), Icon: Table2 },
  ];
  return (
    <div
      role="group"
      aria-label={t('vagonai.report.view')}
      className="inline-flex rounded-lg"
      style={{ padding: 2, gap: 2, background: T.sa }}
    >
      {options.map(({ key, label, Icon }) => {
        const active = view === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(key)}
            className="inline-flex items-center rounded-md"
            style={{
              gap: 5,
              height: 26,
              padding: '0 9px',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              color: active ? T.t1 : T.t3,
              background: active ? T.sf : 'transparent',
              boxShadow: active ? '0 1px 2px rgba(16,24,40,0.10)' : 'none',
              transition: 'background 120ms, color 120ms',
            }}
          >
            <Icon size={13} className="flex-shrink-0" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ShowMore({
  expanded,
  total,
  onToggle,
  T,
  t,
}: {
  expanded: boolean;
  total: number;
  onToggle: () => void;
  T: ThemeTokens;
  t: Translate;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="inline-flex items-center"
      style={{
        gap: 4,
        padding: '4px 0',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        color: T.ac,
      }}
    >
      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      {expanded ? t('vagonai.report.showLess') : t('vagonai.report.showAll', { count: total })}
    </button>
  );
}

/**
 * Categories as horizontal bars, each labelled with its own formatted value.
 * A null point is "no data": an empty track and the em dash, never a zero bar.
 */
function BarChartView({ chart, T, t }: { chart: Chart; T: ThemeTokens; t: Translate }) {
  const [expanded, setExpanded] = useState(false);
  const grown = useGrowIn();
  const max = Math.max(0, ...chart.points.map((p) => p.value ?? 0));
  const points = expanded ? chart.points : chart.points.slice(0, PREVIEW_ROWS);

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      {points.map((point) => {
        const width = point.value === null || max <= 0 ? 0 : Math.max(1.5, (point.value / max) * 100);
        return (
          <div
            key={point.label}
            className="grid items-center"
            style={{ gridTemplateColumns: 'minmax(64px, 30%) 1fr auto', gap: 10 }}
          >
            <div
              title={point.label}
              style={{ fontSize: 12, color: T.t2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {point.label}
            </div>
            <div className="rounded-full" style={{ height: 8, background: T.sa, overflow: 'hidden' }}>
              <div
                className="rounded-full"
                style={{
                  height: '100%',
                  width: grown ? `${width}%` : 0,
                  background: `linear-gradient(90deg, ${T.grad1}, ${T.grad2})`,
                  transition: 'width 600ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
              />
            </div>
            <div
              style={{
                minWidth: 52,
                textAlign: 'right',
                fontSize: 12,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                color: point.value === null ? T.t3 : T.t1,
                whiteSpace: 'nowrap',
              }}
            >
              {point.display ?? (point.value === null ? UNAVAILABLE : '')}
            </div>
          </div>
        );
      })}
      {chart.points.length > PREVIEW_ROWS && (
        <ShowMore expanded={expanded} total={chart.points.length} onToggle={() => setExpanded((v) => !v)} T={T} t={t} />
      )}
    </div>
  );
}

/**
 * Time as an area line. Hovering or tapping a point shows its date and value.
 * A null point splits the line, so a gap stays a gap instead of a dip to zero.
 */
function LineChartView({ chart, T }: { chart: Chart; T: ThemeTokens }) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);

  const width = 320;
  const height = 112;
  const padX = 6;
  const padTop = 10;
  const base = height - 4;
  const max = Math.max(0, ...chart.points.map((p) => p.value ?? 0));
  const step = chart.points.length > 1 ? (width - padX * 2) / (chart.points.length - 1) : 0;
  const coords = chart.points.map((p, i) => ({
    x: chart.points.length > 1 ? padX + i * step : width / 2,
    y: p.value === null || max <= 0 ? null : base - (p.value / max) * (base - padTop),
  }));

  const runs: { x: number; y: number }[][] = [];
  let run: { x: number; y: number }[] = [];
  for (const c of coords) {
    if (c.y === null) {
      if (run.length) runs.push(run);
      run = [];
    } else {
      run.push({ x: c.x, y: c.y });
    }
  }
  if (run.length) runs.push(run);

  const labels = chart.points.map((p) => p.label);
  const axisLabels =
    labels.length >= 5 ? [labels[0], labels[Math.floor(labels.length / 2)], labels[labels.length - 1]] : [labels[0], labels[labels.length - 1]];

  const activePoint = active === null ? null : chart.points[active];
  const activeCoord = active === null ? null : coords[active];
  const edge = active === 0 ? 'start' : active === chart.points.length - 1 ? 'end' : 'middle';

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={chart.label}
          style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }}
          onMouseLeave={() => setActive(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={T.ac} stopOpacity={0.28} />
              <stop offset="100%" stopColor={T.ac} stopOpacity={0} />
            </linearGradient>
          </defs>

          {[padTop, (padTop + base) / 2].map((y) => (
            <line key={y} x1={padX} x2={width - padX} y1={y} y2={y} stroke={T.bd} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1={padX} x2={width - padX} y1={base} y2={base} stroke={T.bd} vectorEffect="non-scaling-stroke" />

          {runs.map((r, i) => (
            <g key={i}>
              {r.length > 1 && (
                <path
                  d={`M${r[0].x},${base} ${r.map((c) => `L${c.x},${c.y}`).join(' ')} L${r[r.length - 1].x},${base} Z`}
                  fill={`url(#${gradientId})`}
                />
              )}
              <polyline
                points={r.map((c) => `${c.x},${c.y}`).join(' ')}
                fill="none"
                stroke={T.ac}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}

          {activeCoord && activeCoord.y !== null && (
            <line
              x1={activeCoord.x}
              x2={activeCoord.x}
              y1={padTop}
              y2={base}
              stroke={T.bf}
              strokeDasharray="2 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {coords.map((c, i) =>
            c.y === null ? null : (
              <circle
                key={i}
                cx={c.x}
                cy={c.y}
                r={active === i ? 3.2 : 1.8}
                fill={active === i ? T.sf : T.ac}
                stroke={T.ac}
                strokeWidth={active === i ? 2 : 0}
                vectorEffect="non-scaling-stroke"
              />
            ),
          )}

          {/* Hit areas: one column per point, so the pointer need not land on a 4px dot. */}
          {coords.map((c, i) => (
            <rect
              key={`hit-${i}`}
              x={c.x - Math.max(step, 12) / 2}
              y={0}
              width={Math.max(step, 12)}
              height={height}
              fill="transparent"
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(i)}
            />
          ))}
        </svg>

        {activePoint && activeCoord && (
          <div
            className="absolute rounded-lg"
            style={{
              left: `${(activeCoord.x / width) * 100}%`,
              top: `${((activeCoord.y ?? base) / height) * 100}%`,
              transform: `translate(${edge === 'start' ? '0' : edge === 'end' ? '-100%' : '-50%'}, calc(-100% - 10px))`,
              padding: '5px 9px',
              background: T.sf,
              border: `1px solid ${T.bd}`,
              boxShadow: '0 4px 12px rgba(16,24,40,0.12)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 1,
            }}
          >
            <div style={{ fontSize: 10.5, color: T.t3 }}>{activePoint.label}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, fontVariantNumeric: 'tabular-nums' }}>
              {activePoint.display ?? UNAVAILABLE}
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-between" style={{ fontSize: 10.5, color: T.t3, marginTop: 6 }}>
        {axisLabels.map((label, i) => (
          <span key={`${label}-${i}`}>{label}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * The full table. The label column stays put while the figures scroll sideways,
 * so a wide report on a phone never loses track of which row is which.
 */
function TableView({ table, T, t }: { table: ResultTable; T: ThemeTokens; t: Translate }) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const rows = expanded ? table.rows : table.rows.slice(0, PREVIEW_ROWS);
  const align = (i: number) => (table.columns[i]?.align === 'end' ? 'right' : 'left');
  const stickyFirst = (i: number, background: string) =>
    i === 0 ? { position: 'sticky' as const, left: 0, background, zIndex: 1 } : { background };

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr>
              {table.columns.map((col, i) => (
                <th
                  key={col.key}
                  scope="col"
                  style={{
                    ...stickyFirst(i, T.sa),
                    textAlign: align(i),
                    padding: '8px 14px',
                    color: T.t2,
                    fontWeight: 600,
                    fontSize: 11,
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const background = hovered === row.key ? T.sh : T.sf;
              return (
                <tr key={row.key} onMouseEnter={() => setHovered(row.key)} onMouseLeave={() => setHovered(null)}>
                  {row.cells.map((cell, i) => (
                    <td
                      key={i}
                      style={{
                        ...stickyFirst(i, background),
                        textAlign: align(i),
                        padding: '9px 14px',
                        color: row.muted || cell === UNAVAILABLE ? T.t3 : T.t1,
                        fontWeight: i === 0 ? 600 : 400,
                        fontStyle: row.muted ? 'italic' : undefined,
                        whiteSpace: i === 0 ? 'normal' : 'nowrap',
                        wordBreak: i === 0 ? 'break-word' : undefined,
                        minWidth: i === 0 ? 110 : undefined,
                        borderTop: `1px solid ${T.bd}`,
                        transition: 'background 100ms',
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          {table.totals && (
            <tfoot>
              <tr>
                {table.totals.map((cell, i) => (
                  <td
                    key={i}
                    style={{
                      ...stickyFirst(i, T.sa),
                      textAlign: align(i),
                      padding: '10px 14px',
                      color: T.t1,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      borderTop: `1px solid ${T.bf}`,
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {table.rows.length > PREVIEW_ROWS && (
        <div style={{ padding: '6px 14px', borderTop: `1px solid ${T.bd}` }}>
          <ShowMore expanded={expanded} total={table.rows.length} onToggle={() => setExpanded((v) => !v)} T={T} t={t} />
        </div>
      )}
    </div>
  );
}

export default function ReportView({ set, T, t }: { set: ResultCardSet; T: ThemeTokens; t: Translate }) {
  const table = set.table;
  const chart = chartHasData(table?.chart) ? table?.chart : undefined;
  const [view, setView] = useState<View>(chart ? 'chart' : 'table');
  if (!table) return null;

  const totals = set.cards[0];
  // A one-row report IS its totals; the tiles already say everything the table would.
  const hasBreakdown = table.rows.length > 1 || !!table.totals;
  const showing: View | null = view === 'chart' && chart ? 'chart' : hasBreakdown ? 'table' : null;
  const compareLabel = totals?.subtitle;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: `1px solid ${T.bd}`,
        background: T.sf,
        boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
      }}
    >
      {/* What was counted, and what you can do with it. */}
      <div
        className="flex flex-wrap items-center justify-between"
        style={{ gap: 8, padding: '9px 14px', borderBottom: `1px solid ${T.bd}` }}
      >
        <div className="flex flex-wrap items-center min-w-0" style={{ gap: 6 }}>
          {table.caption && (
            <span className="inline-flex items-center min-w-0" style={{ gap: 5, fontSize: 11.5, color: T.t2 }}>
              <CalendarRange size={13} className="flex-shrink-0" style={{ color: T.t3 }} />
              <span style={{ wordBreak: 'break-word' }}>{table.caption}</span>
            </span>
          )}
          {compareLabel && (
            <span
              className="rounded-full"
              style={{ padding: '2px 8px', fontSize: 11, fontWeight: 600, color: T.ac, background: T.al, whiteSpace: 'nowrap' }}
            >
              {compareLabel}
            </span>
          )}
        </div>
        <div className="flex items-center" style={{ gap: 6 }}>
          {chart && hasBreakdown && <ViewToggle view={view} chartType={chart.type} onChange={setView} T={T} t={t} />}
          <button
            type="button"
            onClick={() => downloadReportCsv(table, set.title)}
            title={t('vagonai.report.download')}
            aria-label={t('vagonai.report.download')}
            className="inline-flex items-center rounded-lg"
            style={{
              gap: 5,
              height: 30,
              padding: '0 10px',
              border: `1px solid ${T.bd}`,
              background: T.sf,
              color: T.t2,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={13} className="flex-shrink-0" />
            CSV
          </button>
        </div>
      </div>

      {totals && totals.fields.length > 0 && (
        <div
          className="grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))', gap: 8, padding: '12px 14px' }}
        >
          {totals.fields.map((field, i) => (
            <KpiTile key={field.label} field={field} primary={!!chart && i === 0} T={T} />
          ))}
        </div>
      )}

      {showing === 'chart' && chart && (
        <div style={{ padding: '12px 14px 14px', borderTop: `1px solid ${T.bd}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 10 }}>{chart.label}</div>
          {chart.type === 'bar' ? <BarChartView chart={chart} T={T} t={t} /> : <LineChartView chart={chart} T={T} />}
        </div>
      )}
      {showing === 'table' && (
        <div style={{ borderTop: `1px solid ${T.bd}` }}>
          <TableView table={table} T={T} t={t} />
        </div>
      )}

      {table.notes?.length ? (
        <div className="flex flex-col" style={{ gap: 4, padding: '9px 14px', borderTop: `1px solid ${T.bd}`, background: T.sh }}>
          {table.notes.map((note) => (
            <div key={note} className="flex items-start" style={{ gap: 6, fontSize: 11.5, color: T.t2, lineHeight: 1.45 }}>
              <Info size={13} className="flex-shrink-0" style={{ color: T.t3, marginTop: 1 }} />
              <span>{note}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
