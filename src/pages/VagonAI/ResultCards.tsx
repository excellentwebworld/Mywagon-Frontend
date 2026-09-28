/**
 * ResultCards — the records a lookup found, rendered as detail cards.
 *
 * The dead end this closes. Asked "where is SID-10251?", the assistant used to
 * answer in a paragraph: a fraction of what the gateway was holding, and no way
 * to act on it. Everything a shipper checks next — the status, the route, the
 * carrier, the price, the stops — was either missing or buried in prose, and the
 * one obvious next move, opening the record, meant leaving the chat and
 * navigating there by hand.
 *
 * Sibling to SelectionCards, and deliberately not the same component:
 *
 * - A **selection** asks. It is tappable, exactly one is live, and answering it
 *   spends it.
 * - A **result** answers. Nothing is pending on it, nothing retires it, and the
 *   only action is to go and open the record.
 *
 * Everything here is built server-side from a record the core API actually
 * returned during the turn — including the localized strings and the route. So a
 * card can never name a record the shipper does not have, and its button can
 * never point at a page that does not exist. This component resolves nothing; it
 * lays out what it is given.
 *
 * Two rules the layout exists to serve:
 *
 * - **Route before detail.** A shipper checking a load reads the route first, so
 *   the route is a line of its own above the fields rather than two rows inside
 *   them.
 * - **One button per destination.** Shipments have their own pages, so the button
 *   sits on the card. Locations and products share one master page each, so the
 *   button sits under the list — five identical buttons would imply five
 *   different places to go.
 */
import { Link } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  BarChart3,
  MapPin,
  MessageSquarePlus,
  Package,
  Search,
  Truck,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import type { ResultAction, ResultCard, ResultCardSet, ResultStop, ResultTone } from '../../hooks/useChat';
import type { ThemeTokens } from '../../utils/themes';

interface Props {
  set: ResultCardSet;
  T: ThemeTokens;
  /**
   * Sends a card's follow-up as the shipper's next message.
   *
   * Optional so a transcript rendered without a live composer — history, a
   * finished turn — simply shows no follow-up buttons rather than showing ones
   * that do nothing.
   */
  onFollowUp?: (prompt: string) => void;
}

/**
 * Tone → colour, as translucent fills rather than the flat STATUS_COLORS pairs,
 * whose light backgrounds only work on a light theme. `danger` carries the reason
 * a record cannot be used, so it has to stay legible in both.
 */
function toneStyle(tone: ResultTone, T: ThemeTokens, isDark: boolean): { background: string; color: string } {
  switch (tone) {
    case 'danger':
      return { background: 'rgba(239,68,68,0.16)', color: isDark ? '#FCA5A5' : '#B91C1C' };
    case 'warning':
      return { background: 'rgba(245,158,11,0.16)', color: isDark ? '#FBBF24' : '#B45309' };
    case 'success':
      return { background: 'rgba(16,185,129,0.16)', color: isDark ? '#6EE7B7' : '#047857' };
    case 'info':
      return { background: 'rgba(14,165,233,0.14)', color: isDark ? '#7DD3FC' : '#0369A1' };
    default:
      return { background: T.sa, color: T.t2 };
  }
}

function KindIcon({ kind, size = 13 }: { kind: ResultCardSet['kind']; size?: number }) {
  // A truck is a truck whether it is the shipper's load or a carrier's vehicle;
  // without this an available truck drew the Package icon and read as a product.
  if (kind === 'shipment' || kind === 'truck') return <Truck size={size} />;
  if (kind === 'location') return <MapPin size={size} />;
  if (kind === 'analytics') return <BarChart3 size={size} />;
  return <Package size={size} />;
}

/**
 * The action, as a real anchor rather than a button that calls navigate().
 *
 * `Link` keeps middle-click and open-in-new-tab working — a shipper checking a
 * load usually wants it beside the conversation, not instead of it — and it
 * applies the router basename, which a hand-written href would silently drop
 * under a sub-path deployment.
 */
function ActionLink({ action, T }: { action: ResultAction; T: ThemeTokens }) {
  return (
    <Link
      to={action.href}
      className="inline-flex items-center gap-1.5 rounded-lg no-underline"
      style={{
        height: 32,
        padding: '0 12px',
        border: `1px solid ${T.bd}`,
        background: T.sf,
        color: T.t1,
        fontSize: 12.5,
        fontWeight: 700,
      }}
    >
      {action.label}
      <ArrowUpRight size={13} className="flex-shrink-0" />
    </Link>
  );
}

/**
 * The in-chat next move, deliberately not styled like the route anchor.
 *
 * The two sit side by side and do very different things — one leaves for a page,
 * one asks the assistant something — so the accent is spent on the conversational
 * one. A shipper who wanted to leave the chat would already have a reason to;
 * the whole point of this button is that they do not have to.
 */
function FollowUpButton({
  followUp,
  T,
  onFollowUp,
}: {
  followUp: NonNullable<ResultCard['followUp']>;
  T: ThemeTokens;
  onFollowUp: (prompt: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onFollowUp(followUp.prompt)}
      className="inline-flex items-center gap-1.5 rounded-lg"
      style={{
        height: 32,
        padding: '0 12px',
        border: `1px solid ${T.ac}`,
        background: 'transparent',
        color: T.ac,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      <MessageSquarePlus size={13} className="flex-shrink-0" />
      {followUp.label}
    </button>
  );
}

/** One stop on an itinerary. The role is named in words, not just drawn as an arrow. */
function StopRow({ stop, T, t }: { stop: ResultStop; T: ThemeTokens; t: (k: string) => string }) {
  const collecting = stop.role === 'pickup';
  return (
    <div className="flex items-start gap-1.5" style={{ fontSize: 12 }}>
      <span className="flex-shrink-0" style={{ color: T.t3, marginTop: 2 }}>
        {collecting ? <ArrowUpFromLine size={12} /> : <ArrowDownToLine size={12} />}
      </span>
      <div className="min-w-0">
        <div style={{ color: T.t1, fontWeight: 600, wordBreak: 'break-word' }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: T.t3,
              marginRight: 5,
            }}
          >
            {t(collecting ? 'vagonai.confirm.stopPickup' : 'vagonai.confirm.stopDelivery')}
          </span>
          {stop.label}
          {stop.place && stop.place !== stop.label ? (
            <span style={{ color: T.t3, fontWeight: 400 }}> · {stop.place}</span>
          ) : null}
        </div>
        {(stop.when || stop.cargo) && (
          <div style={{ color: T.t3, lineHeight: 1.45, wordBreak: 'break-word' }}>
            {[stop.when, stop.cargo].filter(Boolean).join(' · ')}
          </div>
        )}
        {/*
          What has actually happened at this stop — the thing a shipper asking
          about a load wants to know. Given weight rather than colour: the
          gateway sends it as plain words, so tinting it here would be this
          component inventing a severity it was not told.
        */}
        {stop.state && (
          <div style={{ color: T.t2, fontWeight: 600, lineHeight: 1.45 }}>{stop.state}</div>
        )}
      </div>
    </div>
  );
}

/**
 * A dashboard group, rendered as tiles rather than as labelled rows.
 *
 * Why this is a separate component from RecordCard. Every other card here is one
 * record: a title you read, a handful of labelled details under it, and a button
 * to go and open it. A label column and a value column is exactly right for that
 * — the labels differ in length, the values are prose, and the shipper reads down
 * the list.
 *
 * A dashboard group is the opposite shape. Eleven values, all of them numbers,
 * all short, none of them worth a line of its own, and the thing the shipper is
 * actually doing is scanning for the ones that are not zero. In the row layout
 * that becomes eleven lines of "Scheduled   4" and the scan turns into reading.
 * As tiles the numbers are the visual weight and the labels sit under them, so
 * the non-zero ones are found at a glance — which is how the real dashboard is
 * laid out, and why it is laid out that way.
 *
 * Emphasis is decided per group by `cardId`, not per value, and never by parsing
 * a value for meaning:
 *
 * - `attention` is work waiting on the shipper, so a non-zero tile is the point
 *   of the card and is drawn in the accent colour. A zero there is genuinely good
 *   news and recedes.
 * - `loads` and `performance` are description, not alarm. Nothing is tinted: a
 *   large "Cancelled" count is a fact about the account's history, and colouring
 *   it red would be this component inventing a judgement the gateway did not send.
 *
 * The em dash is the gateway's own "not computable yet" (no delay report has ever
 * been filed, so there is no on-time percentage). It is dimmed rather than
 * dropped, because a grid that silently loses two of its eight tiles reads as a
 * rendering fault rather than as an answer.
 */
function MetricCard({
  card,
  T,
  isDark,
}: {
  card: ResultCard;
  T: ThemeTokens;
  isDark: boolean;
}) {
  const alerting = card.id === 'attention';

  return (
    <div
      className="rounded-lg"
      style={{ padding: '11px 13px', border: `1px solid ${T.bd}`, background: T.sf }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.t1, wordBreak: 'break-word' }}>
            {card.title}
          </div>
          {card.subtitle && (
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 1, wordBreak: 'break-word' }}>
              {card.subtitle}
            </div>
          )}
        </div>
        {card.badges?.length ? (
          <span
            className="flex-shrink-0"
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 999,
              whiteSpace: 'nowrap',
              ...toneStyle(card.badges[0].tone, T, isDark),
            }}
          >
            {card.badges[0].label}
          </span>
        ) : null}
      </div>

      <div
        className="grid"
        style={{
          // auto-fill rather than a fixed column count: the same grid holds six
          // tiles, eleven and eight, and has to stay readable in the chat column
          // on a phone as well as beside the history sidebar on a desktop.
          gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))',
          gap: 6,
          marginTop: 10,
        }}
      >
        {card.fields.map((f) => {
          const unavailable = f.value === '—';
          const live = alerting && !unavailable && f.value !== '0';
          return (
            <div
              key={f.label}
              className="rounded-lg"
              style={{
                padding: '8px 9px',
                background: T.sa,
                // A hairline that only appears on a tile that wants the eye. It
                // does the emphasis together with the colour rather than instead
                // of it, so the card still reads if colours are hard to tell apart.
                border: `1px solid ${live ? T.ac : 'transparent'}`,
              }}
            >
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                  color: unavailable ? T.t3 : live ? T.ac : T.t1,
                  wordBreak: 'break-word',
                }}
              >
                {f.value}
              </div>
              <div style={{ fontSize: 10.5, color: T.t3, marginTop: 3, lineHeight: 1.3 }}>
                {f.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecordCard({ card, kind, T, isDark, t, onFollowUp }: {
  card: ResultCard;
  kind: ResultCardSet['kind'];
  T: ThemeTokens;
  isDark: boolean;
  t: (k: string, o?: Record<string, unknown>) => string;
  onFollowUp?: (prompt: string) => void;
}) {
  return (
    <div
      className="rounded-lg"
      style={{
        padding: '11px 13px',
        border: `1px solid ${T.bd}`,
        background: T.sf,
        // Archived or deactivated: dimmed rather than hidden, so a shipper
        // looking for a record they cannot use finds out why instead of
        // concluding it is gone.
        opacity: card.muted ? 0.6 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className="flex items-center gap-1.5"
            style={{ fontSize: 13.5, fontWeight: 700, color: T.t1 }}
          >
            <span className="flex-shrink-0" style={{ color: T.t3 }}>
              <KindIcon kind={kind} />
            </span>
            <span className="min-w-0" style={{ wordBreak: 'break-word' }}>{card.title}</span>
          </div>
          {card.subtitle && (
            <div style={{ fontSize: 12, color: T.t3, marginTop: 1, wordBreak: 'break-word' }}>{card.subtitle}</div>
          )}
        </div>
        {card.status && (
          <span
            className="flex-shrink-0"
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '2px 7px',
              borderRadius: 999,
              whiteSpace: 'nowrap',
              ...toneStyle(card.status.tone, T, isDark),
            }}
          >
            {/*
              The app's own label for this status, so a load never reads one way
              here and another on the shipments page. The gateway's `label` is the
              fallback for a status this build has no key for.
            */}
            {t(card.status.code, { defaultValue: card.status.label })}
          </span>
        )}
      </div>

      {/* The route, read before the detail rows rather than buried among them. */}
      {card.headline && (
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: T.t1,
            marginTop: 7,
            lineHeight: 1.45,
            wordBreak: 'break-word',
          }}
        >
          {card.headline}
        </div>
      )}

      {card.fields.length > 0 && (
        <div
          className="grid"
          style={{
            // max-content sizes the label column to the longest label, so every
            // value lines up — the point of a labelled row over a run of prose.
            gridTemplateColumns: 'max-content 1fr',
            columnGap: 12,
            rowGap: 3,
            marginTop: 8,
            fontSize: 12,
          }}
        >
          {card.fields.map((f) => (
            <div key={f.label} className="contents">
              <span style={{ color: T.t3 }}>{f.label}</span>
              <span style={{ color: T.t1, fontVariantNumeric: 'tabular-nums', wordBreak: 'break-word' }}>
                {f.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {card.badges?.length ? (
        <div className="flex flex-wrap" style={{ gap: 4, marginTop: 8 }}>
          {card.badges.map((badge) => (
            <span
              key={badge.label}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: 999,
                ...toneStyle(badge.tone, T, isDark),
              }}
            >
              {badge.label}
            </span>
          ))}
        </div>
      ) : null}

      {card.stops?.length ? (
        <div
          className="flex flex-col"
          style={{ gap: 6, marginTop: 9, paddingTop: 9, borderTop: `1px solid ${T.bd}` }}
        >
          {card.stops.map((stop, i) => (
            <StopRow key={`${stop.role}-${stop.label}-${i}`} stop={stop} T={T} t={t} />
          ))}
        </div>
      ) : null}

      {/*
        Both next moves, when the card has both: the route leaves for a page, the
        follow-up asks the assistant. Wrapped so they wrap rather than overflow on
        a narrow screen.
      */}
      {(card.action || (card.followUp && onFollowUp)) && (
        <div className="flex flex-wrap items-center" style={{ gap: 6, marginTop: 10 }}>
          {card.action && <ActionLink action={card.action} T={T} />}
          {card.followUp && onFollowUp && (
            <FollowUpButton followUp={card.followUp} T={T} onFollowUp={onFollowUp} />
          )}
        </div>
      )}
    </div>
  );
}

export default function ResultCards({ set, T, onFollowUp }: Props) {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  return (
    <div style={{ marginTop: 10, maxWidth: 560 }}>
      <div className="flex items-center gap-1.5" style={{ fontSize: 13.5, fontWeight: 700, color: T.t1 }}>
        <span className="flex-shrink-0" style={{ color: T.t3 }}>
          <KindIcon kind={set.kind} />
        </span>
        {set.title}
      </div>

      {/* What the lookup searched on — usually the thing worth correcting. */}
      {set.query && (
        <div className="flex items-center gap-1" style={{ fontSize: 11.5, color: T.t3, marginTop: 3 }}>
          <Search size={11} className="flex-shrink-0" />
          <span style={{ wordBreak: 'break-word' }}>{t('vagonai.records.matchedOn', { query: set.query })}</span>
        </div>
      )}

      <div className="flex flex-col" style={{ gap: 6, marginTop: 8 }}>
        {set.cards.map((card) =>
          // The kind decides the layout, because the two are different shapes of
          // answer rather than two skins on one: records are things to open and
          // read down, dashboard groups are numbers to scan across.
          set.kind === 'analytics' ? (
            <MetricCard key={card.id} card={card} T={T} isDark={isDark} />
          ) : (
            <RecordCard
              key={card.id}
              card={card}
              kind={set.kind}
              T={T}
              isDark={isDark}
              t={t}
              onFollowUp={onFollowUp}
            />
          ),
        )}
      </div>

      {/*
        Said plainly rather than left to be inferred from a short list: a shipper
        who cannot see the record they asked about needs to know the list was cut,
        not conclude the record is missing.
      */}
      {set.truncated && (
        <div style={{ fontSize: 11.5, color: T.t3, marginTop: 7 }}>{set.truncated.note}</div>
      )}

      {/* One destination for the whole list — locations and products. */}
      {set.action && (
        <div style={{ marginTop: 9 }}>
          <ActionLink action={set.action} T={T} />
        </div>
      )}
    </div>
  );
}
