/**
 * Schedule Bulk Posting — the drawer behind the Review card's third button.
 *
 * The load is already decided: this opens on top of the finished flow and takes
 * its draft as the template, so there is nothing here about *what* to post and
 * everything about *how many* and *when*. Five fields.
 *
 * ## Why this is armed here, from a draft
 *
 * A batch needs a template, and a template has to be built out of record ids.
 * `CreateShipmentFlow` already holds a `ShipmentDraft` whose stops and lines are
 * `locationId` / `productId` — the shipper picked every one from their own
 * Address Book and Product Master — so this takes it verbatim. There is no
 * mapper on this path and there should never be one.
 *
 * That is also why the button is not on the `publish_shipment` confirmation
 * card, which is the other place a publish appears in the chat. That card's
 * arguments are display-shaped (`vehicle_type_names`, `partner_names`,
 * `product_name`) with no ids at all, so arming from it would mean matching
 * display names back to records — which `scheduledPostsService` forbids in
 * writing, because it silently posts loads against the wrong product or carrier.
 *
 * An earlier version of this feature lived at the end of the Create Shipment
 * wizard and mapped `WizardFormValues` through `scheduleFromWizard.ts`. The
 * guided flow needs no such reshape, which is why that path is gone.
 *
 * ## Scheduling is an alternative to publishing, not an addition
 *
 * Opening this posts nothing. The Review card's own Publish button is still the
 * way to put ONE load out, and the two are deliberately exclusive — "how many
 * loads did I just create" should never be a question the shipper has to work
 * out. The posting time defaults to Now (MS3-347): confirming a batch left on
 * Now posts it straight away, behind the same review modal as a later time.
 *
 * ## Idioms followed
 *
 * - Plain `useState` plus the pure predicates in `scheduledPost.ts`, deferring
 *   real validation to the gateway's `ok: false / missing[]`. Not Formik+yup:
 *   two form idioms exist in this codebase and this feature uses the lighter
 *   one, matching `CreateShipmentFlow` itself.
 * - `DatePicker` + `TimePicker` as a pair — the established datetime control
 *   here; there is no combined one.
 * - `aria-disabled` on Confirm, never `disabled`, so a blocked click still
 *   scrolls to the field that caused it.
 * - `ConfirmationModal` for the review step, as the rest of the app does.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CalendarClock, Check, Loader2, X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useApp } from '../../context/AppContext';
import { DatePicker } from '../../components/ui/DatePicker';
import { TimePicker } from '../../components/ui/TimePicker';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { localPartsToUtcIso } from '../../utils/timezone';
import { formatDisplayDateTime } from '../../utils/dateDisplay';
import { createScheduledPost, runDueScheduledPosts } from './api/scheduledPostsService';
import { deliveryStop, pickupStop, type ShipmentDraft } from './createShipmentDraft';
import {
  SCHEDULE_LIMITS,
  batchTotal,
  effectivePostInstant,
  emptyScheduleForm,
  postsImmediately,
  scheduleIssues,
  wallClock,
  type ScheduleFormState,
} from './scheduledPost';
import { useTr } from './i18n';
import '../../styles/scheduled-post.css';

/** What the Review card hands over when its Schedule button is pressed. */
export interface ScheduleTemplate {
  /** Already resolved to record ids by the flow. Copied as the batch template. */
  draft: ShipmentDraft;
  /**
   * The road distance the flow measured. Undefined when a stop had no
   * coordinates to measure from — the gateway refuses a batch without one, so
   * that case is surfaced here rather than at submit.
   */
  routeSummary?: { total_dist_km: number; total_drive_min?: number };
}

interface ScheduleBulkDrawerProps {
  onClose: () => void;
  template: ScheduleTemplate;
  /** Recorded on the batch so it can be traced back to the conversation. */
  conversationId?: string | null;
}

/**
 * Splits a draft stop's `YYYY-MM-DDTHH:mm` into the pair the pickers take.
 *
 * Returns empty strings rather than defaulting, so a stop with no time set
 * leaves the field blank for `scheduleIssues` to ask about — a silent 00:00
 * would arm a batch against a time the shipper never chose.
 */
function splitWallClock(value: string | null | undefined): { date: string; time: string } {
  if (!value) return { date: '', time: '' };
  const [date = '', rest = ''] = value.split('T');
  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
    time: /^([01]\d|2[0-3]):[0-5]\d/.test(rest) ? rest.slice(0, 5) : '',
  };
}

/**
 * Mounted only while open, by design — the parent does `{open && <Drawer/>}`.
 *
 * That is what lets the form seed itself in a `useState` initializer instead of
 * in an effect that writes state on open, which is a cascading render the hooks
 * lint rule rightly refuses. A fresh mount per open also resets `submitting` and
 * any standing server refusal for free, so there is no stale state to clear.
 */
export const ScheduleBulkDrawer: React.FC<ScheduleBulkDrawerProps> = ({
  onClose,
  template,
  conversationId = null,
}) => {
  const { t, lang } = useTranslation();
  const tr = useTr();
  const { showToast } = useApp();
  const { draft, routeSummary } = template;

  // Seeded from the load being scheduled - a repeat almost always moves its
  // dates forward rather than inventing new ones.
  const [form, setForm] = useState<ScheduleFormState>(() => {
    const pickup = splitWallClock(pickupStop(draft)?.from);
    const dropoff = splitWallClock(deliveryStop(draft)?.from);
    const reference = draft.customerReference?.trim();
    return {
      ...emptyScheduleForm(),
      pickupDate: pickup.date,
      pickupTime: pickup.time || '06:00',
      dropoffDate: dropoff.date,
      dropoffTime: dropoff.time || '18:00',
      referencePattern: reference ? `${reference} #{n}/{total}` : '',
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [flashField, setFlashField] = useState<string | null>(null);
  const [serverIssue, setServerIssue] = useState<{ missing: string[]; reason: string } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Keeps the time clauses honest while the drawer sits open - the pickup gap
  // is graded on when the batch will really post, which moves with the clock.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const patch = (next: Partial<ScheduleFormState>) => {
    setForm((prev) => ({ ...prev, ...next }));
    setServerIssue(null);
  };

  const postInstant = useMemo(() => {
    if (!form.postDate) return null;
    const iso = localPartsToUtcIso(form.postDate, form.postTime);
    const parsed = Date.parse(iso);
    return Number.isFinite(parsed) ? parsed : null;
  }, [form.postDate, form.postTime]);

  /**
   * Why Confirm is blocked.
   *
   * Only the schedule is checked here. The load arrived as a draft the Review
   * card had already gated, so unlike the wizard path there is no mapping
   * refusal to put in front of these.
   */
  const issues = useMemo(() => scheduleIssues(form, nowMs, postInstant, tr), [form, nowMs, postInstant, tr]);

  const firstIssue = serverIssue
    ? { field: serverIssue.missing[0] ?? 'loadCount', message: serverIssue.reason }
    : (issues[0] ?? null);
  const ready = issues.length === 0;
  const total = batchTotal(draft, form.loadCount);

  /**
   * Scrolls to and rings the field a block names.
   *
   * The wizard's own affordance: a greyed-but-clickable button whose click still
   * takes the shipper somewhere, rather than a dead control with no explanation.
   */
  const flashAndScroll = useCallback((field: string) => {
    const node = fieldRefs.current[field] ?? fieldRefs.current.loadCount;
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashField(field);
    setTimeout(() => setFlashField(null), 1700);
  }, []);

  const onConfirmClick = () => {
    if (submitting) return;
    if (!ready) {
      if (firstIssue) flashAndScroll(firstIssue.field);
      return;
    }
    setConfirmOpen(true);
  };

  const doSchedule = async () => {
    setConfirmOpen(false);
    if (!ready || submitting) return;

    const pickupFrom = wallClock(form.pickupDate, form.pickupTime);
    const dropoffFrom = wallClock(form.dropoffDate, form.dropoffTime);
    if (!pickupFrom || !dropoffFrom || postInstant === null) return;

    // The default is Now (MS3-347) and has gone stale by the time Confirm is
    // pressed, so a time earlier today is sent as the moment of submitting.
    const submittedAt = Date.now();
    const fireMs = effectivePostInstant(postInstant, submittedAt);
    const postNow = postsImmediately(postInstant, submittedAt);

    setSubmitting(true);
    try {
      const result = await createScheduledPost(
        {
          conversationId,
          label: form.label.trim() || null,
          // Taken verbatim. `sourceDraftId` is null because nothing has been
          // written yet — publishing a Laravel draft consumes it, so each queued
          // load creates its own at posting time.
          template: { kind: 'wizard', draft, sourceDraftId: null },
          loadCount: form.loadCount,
          pickup: { from: pickupFrom },
          dropoff: { from: dropoffFrom },
          // The one instant in the payload. Every stop time above is wall clock.
          fireAt: new Date(fireMs).toISOString(),
          referencePattern: form.referencePattern.trim() || null,
          routeSummary: routeSummary ?? null,
        },
        lang,
      );

      if (!result.ok) {
        // A refusal is a 200 carrying the field to go back to. Shown in place
        // rather than as a toast, because a toast cannot be scrolled to.
        setServerIssue({ missing: result.missing, reason: result.reason });
        flashAndScroll(result.missing[0] ?? 'loadCount');
        return;
      }

      if (postNow) {
        // Armed for now, so post now. A batch only posts during a live request
        // (the gateway holds no credential once one ends), and without this it
        // would sit due until the shipper next opened Scheduled posting.
        showToast(t('vagonai.scheduledPost.postingNow', { n: result.post.load_count }), 'success');
        void runDueScheduledPosts(lang)
          .then((summary) =>
            showToast(
              t('vagonai.scheduledPost.drained', { posted: summary.posted, failed: summary.failed }),
              summary.failed > 0 ? 'error' : 'success',
            ),
          )
          .catch(() => showToast(t('vagonai.scheduledPost.drainLater'), 'error'));
      } else {
        showToast(
          t('vagonai.scheduledPost.armed', {
            n: result.post.load_count,
            when: formatDisplayDateTime(form.postDate, form.postTime),
          }),
          'success',
        );
      }
      onClose();
    } catch {
      showToast(t('vagonai.scheduledPost.armFailed'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const field = (name: string, label: string, children: React.ReactNode, hint?: string) => (
    <div
      className={`sp-field${flashField === name ? ' sp-field--flash' : ''}`}
      ref={(el) => {
        fieldRefs.current[name] = el;
      }}
    >
      <label className="sp-label">{label}</label>
      {children}
      {hint && <div className="sp-hint">{hint}</div>}
    </div>
  );

  return createPortal(
    <div className="sp-drawer-root" role="presentation">
      <div className="sp-drawer-overlay" onClick={onClose} aria-hidden="true" />
      <div
        className="sp-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sp-schedule-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sp-head">
          <div className="sp-head-title" id="sp-schedule-title">
            <CalendarClock size={16} />
            <span>{t('vagonai.scheduledPost.title')}</span>
          </div>
          <button type="button" className="sp-close" onClick={onClose} aria-label={t('cancel')}>
            <X size={16} />
          </button>
        </div>

        <div className="sp-body">
          {/*
            What is being copied, stated rather than chosen. The load is the one
            on the Review card behind this drawer, so a picker here would be
            offering a decision that has already been made.
          */}
          <div className="sp-note">
            <Check size={13} /> {t('vagonai.scheduledPost.fromWizard')}
          </div>

          {/*
            No road distance. MYVAGON refuses to publish without one, so the
            gateway will refuse the whole batch — said here, before five fields
            are filled in, rather than as a submit-time refusal.
          */}
          {!routeSummary && (
            <div className="sp-note sp-note--warn">
              <AlertTriangle size={13} />
              <div>
                <strong>{t('vagonai.scheduledPost.cannotSchedule')}</strong>
                <span>{t('vagonai.scheduledPost.noRoute')}</span>
              </div>
            </div>
          )}

          {field(
            'loadCount',
            t('vagonai.scheduledPost.fieldCount'),
            <input
              type="number"
              className="sp-input"
              min={SCHEDULE_LIMITS.minLoadCount}
              max={SCHEDULE_LIMITS.maxLoadCount}
              value={form.loadCount}
              onChange={(e) => patch({ loadCount: Number(e.target.value) })}
            />,
            t('vagonai.scheduledPost.countHint', { max: SCHEDULE_LIMITS.maxLoadCount }),
          )}

          {field(
            'pickup.from',
            t('vagonai.scheduledPost.fieldPickup'),
            <div className="sp-row">
              <DatePicker value={form.pickupDate} onChange={(v) => patch({ pickupDate: v })} />
              <TimePicker value={form.pickupTime} onChange={(v) => patch({ pickupTime: v })} />
            </div>,
            t('vagonai.scheduledPost.pickupHint'),
          )}

          {field(
            'dropoff.from',
            t('vagonai.scheduledPost.fieldDropoff'),
            <div className="sp-row">
              <DatePicker value={form.dropoffDate} onChange={(v) => patch({ dropoffDate: v })} />
              <TimePicker value={form.dropoffTime} onChange={(v) => patch({ dropoffTime: v })} />
            </div>,
          )}

          {field(
            'fireAt',
            t('vagonai.scheduledPost.fieldPostAt'),
            <div className="sp-row">
              <DatePicker value={form.postDate} onChange={(v) => patch({ postDate: v })} />
              <TimePicker value={form.postTime} onChange={(v) => patch({ postTime: v })} />
            </div>,
            // The honest sentence. The gateway holds no credential once a request
            // ends, so nothing fires while the shipper is away.
            t('vagonai.scheduledPost.postAtHint'),
          )}

          {field(
            'referencePattern',
            t('vagonai.scheduledPost.fieldReference'),
            <input
              type="text"
              className="sp-input"
              placeholder="PO-4821 #{n}/{total}"
              value={form.referencePattern}
              onChange={(e) => patch({ referencePattern: e.target.value })}
            />,
            t('vagonai.scheduledPost.referenceHint'),
          )}

          {field(
            'label',
            t('vagonai.scheduledPost.fieldLabel'),
            <input
              type="text"
              className="sp-input"
              value={form.label}
              onChange={(e) => patch({ label: e.target.value })}
            />,
          )}

          {total !== null && (
            <div className="sp-summary">
              {t('vagonai.scheduledPost.summary', {
                n: form.loadCount,
                price: draft.pricing.startingPrice ?? 0,
                total,
              })}
            </div>
          )}
        </div>

        <div className="sp-foot">
          {!ready && firstIssue && (
            <span className="sp-blocked">
              <AlertTriangle size={12} /> {firstIssue.message}
            </span>
          )}
          {/*
            aria-disabled, never disabled: a blocked click still scrolls to the
            field that caused it, which is the wizard's own affordance. A dead
            button answers "why?" with nothing.
          */}
          <button
            type="button"
            className="sp-confirm"
            onClick={onConfirmClick}
            aria-disabled={!ready || submitting}
            data-ready={ready && !submitting}
            title={!ready && firstIssue ? firstIssue.message : undefined}
          >
            {submitting ? <Loader2 size={14} className="sp-spin" /> : <Check size={14} />}
            {t('vagonai.scheduledPost.confirm', { n: form.loadCount })}
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSchedule}
        type="info"
        backdropClassName="sp-modal-over-drawer"
        title={t('vagonai.scheduledPost.reviewTitle')}
        confirmText={t('vagonai.scheduledPost.reviewConfirm')}
        cancelText={t('cancel')}
        message={
          <div className="sp-review">
            <ReviewRow label={t('vagonai.scheduledPost.fieldCount')} value={String(form.loadCount)} />
            <ReviewRow
              label={t('vagonai.scheduledPost.fieldPickup')}
              value={formatDisplayDateTime(form.pickupDate, form.pickupTime)}
            />
            <ReviewRow
              label={t('vagonai.scheduledPost.fieldDropoff')}
              value={formatDisplayDateTime(form.dropoffDate, form.dropoffTime)}
            />
            <ReviewRow
              label={t('vagonai.scheduledPost.fieldPostAt')}
              value={formatDisplayDateTime(form.postDate, form.postTime)}
            />
            {total !== null && <ReviewRow label={t('vagonai.scheduledPost.reviewTotal')} value={`€${total}`} />}
            <p className="sp-review-caveat">{t('vagonai.scheduledPost.reviewCaveat')}</p>
          </div>
        }
      />
    </div>,
    document.body,
  );
};

const ReviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="sp-review-row">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export default ScheduleBulkDrawer;
