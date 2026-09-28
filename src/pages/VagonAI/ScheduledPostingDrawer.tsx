/**
 * The scheduled bulk posting drawer — the ledger, not the form.
 *
 * Opened from the `/vagonai` top bar. It lists this shipper's batches, upcoming
 * and historical, and it is where a `partial` batch gets explained. Arming one
 * happens somewhere else entirely: at the end of the create-shipment wizard, in
 * `CreateShipmentWizard/ScheduleBulkModal.tsx`.
 *
 * ## Why arming is not here
 *
 * It used to be, with a picker over the shipper's pending loads. That could not
 * work: a published shipment is reported by MYVAGON as display strings with no
 * record ids, so the gateway had to match names back to records and then ask the
 * shipper to re-pick their own sites before anything could be armed. The wizard
 * already holds real ids for every stop and cargo line, so arming from there
 * removes the question rather than answering it.
 *
 * ## Listing is also posting
 *
 * The gateway calls MYVAGON with the shipper's own bearer token and holds no
 * credential once a request ends, so a batch is drained during one of this
 * shipper's own authenticated requests rather than by a cron. Opening this
 * drawer is that request — which is why `refresh()` drains, why a timer keeps
 * draining while it is open, and why `postingCaveat` says so on every upcoming
 * card. That caveat is the honest version of "posts at 06:00" and must not be
 * quietly dropped.
 *
 * ## A card says what was armed
 *
 * Every card used to read "N loads, these two dates", which is true of every
 * batch anyone has ever armed — the shipper could not tell two of their own
 * apart without opening both. The facts come from `post.summary`, the gateway's
 * projection of the frozen draft, so a card shows the road distance, the cargo,
 * the price the batch offers and where it goes out, with no second request and
 * without the client learning the draft shape. A fact with no value renders no
 * row: a grid of "—" spends four lines saying nothing.
 *
 * There are no place names on it, and that is a data limit rather than an
 * oversight — a draft's stops are `locationId` and nothing else, so naming them
 * would mean the gateway reading the shipper's Address Book once per row. See
 * `scheduledPosts/summary.ts` for where they would have to come from instead.
 *
 * ## One panel, two views
 *
 * The per-load queue is a view OF this drawer, not a second surface over it. It
 * was briefly a `position: absolute; inset: 0` panel inside `.sp-drawer-root`,
 * which is fixed to the viewport — so "View loads" blacked out the whole page to
 * show a dozen rows of text, and dismissing it was the only way back. Now the
 * drawer swaps its own body and grows a back arrow, the way the other drawers in
 * this app move between a list and a record.
 *
 * ## Idioms followed
 *
 * Hand-rolled portal drawer copying `ErpOrders/OrderDetailDrawer` — there is no
 * shared Drawer primitive in this app and this feature should not be the one to
 * invent one. `ConfirmationModal` for cancelling, as the rest of the app does.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CalendarClock, Loader2, X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useApp } from '../../context/AppContext';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { formatDisplayDateTime } from '../../utils/dateDisplay';
import {
  cancelScheduledPost,
  getScheduledPost,
  listScheduledPosts,
  runDueScheduledPosts,
  type ScheduledPost,
  type ScheduledPostDetail,
} from './api/scheduledPostsService';
import {
  batchTitle,
  cargoFact,
  countdown,
  groupOf,
  negotiability,
  postingCaveat,
  priceFact,
  progressLabel,
  responseWindowLabel,
  routeFact,
  scheduledPostBadgeClass,
} from './scheduledPost';
import { useTr } from './i18n';

/** How often the drawer drains while open. See the module note. */
const DRAIN_INTERVAL_MS = 60_000;

type Translate = (key: string, opts?: Record<string, unknown>) => string;

/**
 * A zone-less `YYYY-MM-DDTHH:mm` as `dd/MM/yyyy HH:mm`.
 *
 * Sliced rather than parsed, deliberately. These are wall clocks meant in the
 * batch's own zone (`post.timezone`), so handing one to `Date` would read it in
 * the browser's zone and shift every window the drawer renders.
 */
function wallClockLabel(value: string | null): string {
  if (!value) return '';
  return formatDisplayDateTime(value.slice(0, 10), value.slice(11, 16));
}

/** The primary key showing through — the title of last resort, never the first choice. */
function shortId(id: string): string {
  return id.slice(0, 8);
}

interface Props {
  onClose: () => void;
}

/**
 * Mounted only while open, as `ScheduleBulkDrawer` beside it is — the parent
 * does `{open && <Drawer/>}`.
 *
 * It used to take an `open` prop and return null, which meant every piece of
 * state here outlived its own panel: closing while reading one batch's queue and
 * reopening put the shipper back inside that batch, and clearing it took an
 * effect whose whole job was to undo the last session. A fresh mount per open
 * has no last session to undo, and reopening starts on the list.
 */
export const ScheduledPostingDrawer: React.FC<Props> = ({ onClose }) => {
  const { t, lang } = useTranslation();
  const { showToast } = useApp();

  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [detail, setDetail] = useState<ScheduledPostDetail | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ScheduledPost | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Which batch is on screen, for the two callbacks that must not be rebuilt
  // when it changes: the drain timer would restart its interval and postpone the
  // next drain every time the shipper opened something, and the key listener
  // would re-subscribe on every keystroke's worth of state.
  const openDetailId = useRef<string | null>(null);
  useEffect(() => {
    openDetailId.current = detail?.id ?? null;
  }, [detail]);

  // ── Escape + body scroll lock, copying OrderDetailDrawer ──
  //
  // Escape leaves the loads view before it leaves the drawer. Closing both at
  // once throws away the list the shipper was working through, and the only way
  // back is reopening and re-finding the batch.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || cancelTarget) return;
      if (openDetailId.current) setDetail(null);
      else onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, cancelTarget]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /** The countdowns tick without the whole list refetching. */
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(async () => {
    try {
      // This call is also the drain — see the module note.
      const { items } = await listScheduledPosts({ perPage: 50 }, lang);
      setPosts(items);
    } catch {
      // A failed list must not empty the panel; the shipper would read that as
      // "my batches are gone".
    }
  }, [lang]);

  const openBatch = useCallback(
    async (id: string) => {
      setOpening(id);
      try {
        setDetail(await getScheduledPost(id, lang));
      } catch {
        // Stays on the list rather than swapping to an empty panel, which reads
        // as "this batch has no loads" — the one thing it never means.
        showToast(t('vagonai.scheduledPost.detailFailed'), 'warning');
      } finally {
        setOpening(null);
      }
    },
    [lang, showToast, t],
  );

  // Opening the drawer is what posts a due batch. Wrapped in an async IIFE
  // rather than called from the effect body, which the hooks lint rule reads as
  // a cascading setState.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  /** Drains on a timer while the drawer is open. Idempotent server-side. */
  useEffect(() => {
    const id = setInterval(() => {
      void (async () => {
        try {
          const summary = await runDueScheduledPosts(lang);
          if (summary.posted === 0 && summary.failed === 0 && summary.expired === 0) return;

          showToast(
            t('vagonai.scheduledPost.drained', { posted: summary.posted, failed: summary.failed }),
            summary.failed > 0 ? 'warning' : 'success',
          );
          await refresh();

          // A drain that ran while the loads view is open just changed the rows
          // being read. Refetched without a spinner: the toast has already said
          // what happened, and a loading state over rows the shipper is halfway
          // through reading has not.
          const readingId = openDetailId.current;
          if (readingId) {
            try {
              setDetail(await getScheduledPost(readingId, lang));
            } catch {
              /* Stale rows beat an emptied panel. */
            }
          }
        } catch {
          /* A missed drain costs one interval; the next one picks it up. */
        }
      })();
    }, DRAIN_INTERVAL_MS);
    return () => clearInterval(id);
  }, [lang, refresh, showToast, t]);

  const doCancel = async () => {
    const target = cancelTarget;
    setCancelTarget(null);
    if (!target) return;
    try {
      await cancelScheduledPost(target.id, lang);
      showToast(t('vagonai.scheduledPost.cancelled'), 'success');
      await refresh();
      // Back to the list if the cancelled batch is the one on screen: its queue
      // is exactly what no longer describes anything.
      if (openDetailId.current === target.id) setDetail(null);
    } catch {
      // A 409 means it started posting between the click and the call, which is
      // a real outcome rather than an error the shipper caused.
      showToast(t('vagonai.scheduledPost.cancelFailed'), 'warning');
      await refresh();
    }
  };

  const attentionCount = posts.filter((p) => groupOf(p.status) === 'attention').length;

  return createPortal(
    <div className="sp-drawer-root" role="presentation">
      <div className="sp-drawer-overlay" onClick={onClose} aria-hidden="true" />
      <div
        className="sp-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sp-drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sp-head">
          <div className="sp-head-title" id="sp-drawer-title">
            {detail ? (
              <>
                <button
                  type="button"
                  className="sp-back"
                  onClick={() => setDetail(null)}
                  aria-label={t('vagonai.scheduledPost.backToList')}
                >
                  <ArrowLeft size={16} />
                </button>
                <span className="sp-head-name">
                  {batchTitle(detail) ?? t('vagonai.scheduledPost.untitled', { id: shortId(detail.id) })}
                </span>
              </>
            ) : (
              <>
                <CalendarClock size={16} />
                <span>{t('vagonai.scheduledPost.title')}</span>
                {/*
                  Surfaced in the header rather than left to the list: a batch that
                  posted seven of ten is this feature's worst outcome, and with in-app
                  status only there is no email to fall back on.
                */}
                {attentionCount > 0 && (
                  <span className="sp-tab-count sp-tab-count--warn" title={t('vagonai.scheduledPost.needsAttention')}>
                    {attentionCount}
                  </span>
                )}
              </>
            )}
          </div>
          <button type="button" className="sp-close" onClick={onClose} aria-label={t('cancel')}>
            <X size={16} />
          </button>
        </div>

        <div className="sp-body">
          {detail ? (
            <BatchDetail detail={detail} t={t} />
          ) : (
            <>
              {/*
                Where batches come from, said once. With no form here any more, a
                shipper looking at an empty list has to be told where the button is
                rather than left to hunt for it.
              */}
              <div className="sp-note">
                <AlertTriangle size={13} /> {t('vagonai.scheduledPost.armedFromFlow')}
              </div>

              <ScheduledList
                posts={posts}
                nowMs={nowMs}
                t={t}
                openingId={opening}
                onCancel={setCancelTarget}
                onOpen={(id) => void openBatch(id)}
              />
            </>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={doCancel}
        type="danger"
        backdropClassName="sp-modal-over-drawer"
        title={t('vagonai.scheduledPost.cancelTitle')}
        confirmText={t('vagonai.scheduledPost.cancelConfirm')}
        cancelText={t('cancel')}
        message={t('vagonai.scheduledPost.cancelBody', { n: cancelTarget?.load_count ?? 0 })}
      />
    </div>,
    document.body,
  );
};

// ---------------------------------------------------------------------------
// The facts, shared by the card and the loads view
// ---------------------------------------------------------------------------

interface FactsProps {
  post: ScheduledPost;
  t: Translate;
  /** The loads view has room for the settings a card has to leave out. */
  full?: boolean;
}

/**
 * What was armed, as rows.
 *
 * A row appears only when its value exists. `summary` carries nulls for a batch
 * armed without a price or without a measured route, and rendering those as "—"
 * fills the card with the absence of information.
 */
const BatchFacts: React.FC<FactsProps> = ({ post, t, full = false }) => {
  const tr = useTr();
  const summary = post.summary;
  // A gateway older than this bundle sends no `summary` at all. Typed as
  // required, so this is not a case the compiler can see — and the cost of
  // being wrong is every card in the drawer throwing rather than one row
  // going missing during a rollout.
  if (!summary) return null;

  const rows: Array<{ key: string; label: string; value: React.ReactNode }> = [];

  const route = routeFact(summary, tr);
  if (route) rows.push({ key: 'route', label: t('vagonai.scheduledPost.factRoute'), value: route });

  const cargo = cargoFact(summary, tr);
  if (cargo) rows.push({ key: 'cargo', label: t('vagonai.scheduledPost.factCargo'), value: cargo });

  const price = priceFact(post);
  if (price) {
    const terms = negotiability(summary);
    rows.push({
      key: 'price',
      label: t('vagonai.scheduledPost.factPrice'),
      value: (
        <>
          {price}
          <span className="sp-fact-note">
            {terms.key === 'floor'
              ? t('vagonai.scheduledPost.priceFloor', { amount: terms.amount })
              : t(`vagonai.scheduledPost.price.${terms.key}`)}
          </span>
        </>
      ),
    });
  }

  if (summary.channels.length > 0) {
    // Where these loads actually go. A batch armed to a partner list and one
    // armed to the open marketplace are very different things to leave running.
    const channels = summary.channels.map((channel) =>
      channel === 'private' && summary.partner_count > 0
        ? t('vagonai.scheduledPost.channel.privateCount', { n: summary.partner_count })
        : t(`vagonai.scheduledPost.channel.${channel}`),
    );
    rows.push({ key: 'channels', label: t('vagonai.scheduledPost.factChannels'), value: channels.join(' · ') });
  }

  if (summary.reference_sample) {
    rows.push({
      key: 'reference',
      label: t('vagonai.scheduledPost.factReference'),
      value: (
        <>
          {summary.reference_sample}
          <span className="sp-fact-note">{t('vagonai.scheduledPost.referenceExpanded')}</span>
        </>
      ),
    });
  }

  if (full) {
    rows.push({
      key: 'stops',
      label: t('vagonai.scheduledPost.factStops'),
      value: t('vagonai.scheduledPost.stopCount', { n: summary.stop_count }),
    });
    rows.push({
      key: 'response',
      label: t('vagonai.scheduledPost.factResponse'),
      value: summary.require_tracking
        ? `${responseWindowLabel(summary.response_window, tr)} · ${t('vagonai.scheduledPost.trackingRequired')}`
        : responseWindowLabel(summary.response_window, tr),
    });
  }

  if (rows.length === 0) return null;

  return (
    <dl className="sp-facts">
      {rows.map((row) => (
        <React.Fragment key={row.key}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
};

// ---------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------

interface ListProps {
  posts: ScheduledPost[];
  nowMs: number;
  t: Translate;
  /** The batch whose queue is being fetched, so its own button can say so. */
  openingId: string | null;
  onCancel: (post: ScheduledPost) => void;
  onOpen: (id: string) => void;
}

/**
 * The batches, grouped.
 *
 * `attention` comes FIRST and holds `partial` alongside `failed`. A shipper who
 * armed ten loads and got seven has not had a success, and the worst failure
 * mode of this whole feature is their never finding that out — so it is not
 * filed under Posted and it is not below the fold.
 */
const ScheduledList: React.FC<ListProps> = ({ posts, nowMs, t, openingId, onCancel, onOpen }) => {
  const tr = useTr();
  const groups = [
    { key: 'attention' as const, label: t('vagonai.scheduledPost.groupAttention') },
    { key: 'upcoming' as const, label: t('vagonai.scheduledPost.groupUpcoming') },
    { key: 'posted' as const, label: t('vagonai.scheduledPost.groupPosted') },
    { key: 'cancelled' as const, label: t('vagonai.scheduledPost.groupCancelled') },
  ];

  if (posts.length === 0) {
    return <div className="sp-empty">{t('vagonai.scheduledPost.empty')}</div>;
  }

  return (
    <>
      {groups.map((group) => {
        const rows = posts.filter((post) => groupOf(post.status) === group.key);
        if (rows.length === 0) return null;
        return (
          <div className="sp-group" key={group.key}>
            <div className="sp-group-head">
              {group.label} <span>{rows.length}</span>
            </div>
            {rows.map((post) => (
              <div className="sp-card" key={post.id}>
                <div className="sp-card-top">
                  <span className={scheduledPostBadgeClass(post.status)}>
                    {t(`vagonai.scheduledPost.status.${post.status}`)}
                  </span>
                  {post.status === 'scheduled' && (
                    <span className="sp-card-count">
                      {countdown(post.fire_at, nowMs, tr) ?? t('vagonai.scheduledPost.dueNow')}
                    </span>
                  )}
                </div>

                <div className="sp-card-title">
                  {batchTitle(post) ?? t('vagonai.scheduledPost.untitled', { id: shortId(post.id) })}
                </div>
                <div className="sp-card-meta">{progressLabel(post, tr)}</div>
                <div className="sp-card-meta">
                  {t('vagonai.scheduledPost.cardWindow', {
                    pickup: wallClockLabel(post.pickup_from),
                    dropoff: wallClockLabel(post.dropoff_from),
                  })}
                </div>

                <BatchFacts post={post} t={t} />

                {postingCaveat(post, nowMs, tr) && (
                  <div className="sp-card-caveat">{postingCaveat(post, nowMs, tr)}</div>
                )}
                {post.last_error && <div className="sp-card-error">{post.last_error}</div>}

                <div className="sp-card-actions">
                  <button
                    type="button"
                    className="sp-link"
                    onClick={() => onOpen(post.id)}
                    aria-busy={openingId === post.id}
                  >
                    {openingId === post.id && <Loader2 size={11} className="sp-spin" />}
                    {t('vagonai.scheduledPost.viewLoads')}
                  </button>
                  {post.status === 'scheduled' && (
                    <button type="button" className="sp-link sp-link--danger" onClick={() => onCancel(post)}>
                      {t('cancel')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------------------
// One batch
// ---------------------------------------------------------------------------

/**
 * One batch and its per-load queue, in the drawer's own body.
 *
 * This is where a `partial` batch is actually explained: one row per load, with
 * the SID of each that went out and the reason for each that did not. The facts
 * above it repeat the card's, plus the settings a card has no room for — a
 * shipper who came here to ask "what did I arm?" should not have to go back to
 * the list to read half the answer.
 */
const BatchDetail: React.FC<{ detail: ScheduledPostDetail; t: Translate }> = ({ detail, t }) => {
  const tr = useTr();
  return (
    <>
      <div className="sp-detail-top">
        <span className={scheduledPostBadgeClass(detail.status)}>
          {t(`vagonai.scheduledPost.status.${detail.status}`)}
        </span>
        <span className="sp-card-meta">{progressLabel(detail, tr)}</span>
      </div>

      <div className="sp-card-meta">
        {t('vagonai.scheduledPost.cardWindow', {
          pickup: wallClockLabel(detail.pickup_from),
          dropoff: wallClockLabel(detail.dropoff_from),
        })}
      </div>

      <BatchFacts post={detail} t={t} full />

      {detail.last_error && <div className="sp-card-error">{detail.last_error}</div>}

      <div className="sp-group-head sp-loads-head">{t('vagonai.scheduledPost.loadsTitle', { n: detail.load_count })}</div>

      {detail.loads.map((load) => (
        <div className="sp-load" key={load.seq}>
          <span className="sp-load-seq">#{load.seq}</span>
          <span className="sp-load-status">{t(`vagonai.scheduledPost.loadStatus.${load.status}`)}</span>
          {load.shipment_url && load.auto_id ? (
            <Link to={load.shipment_url} className="sp-link">
              {load.auto_id}
            </Link>
          ) : (
            <span className="sp-load-ref">{load.reference ?? '—'}</span>
          )}
          {load.last_error && <span className="sp-load-error">{load.last_error}</span>}
        </div>
      ))}
    </>
  );
};

export default ScheduledPostingDrawer;
