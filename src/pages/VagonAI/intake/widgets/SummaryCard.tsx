/**
 * "Check your load" — the one confirmation click (CONTRACT.md §0.2 #5, §8.5).
 *
 * Save as draft is the primary action and Publish now is secondary (Q4), even when the shipper asked to publish.
 * Every row has its own Edit; "To publish, add: …" names what the gate still needs, each one a link that jumps
 * to the step that owns it. The server's gate is advisory here — R5 runs it again — so this card only decides what
 * to ENABLE, never what is allowed.
 *
 * Hook-free except the discard link (it needs a tiny confirm state). Everything else is a pure function of props.
 */
import { useEffect, useRef, useState } from 'react';
import { ClipboardCheck, Pencil, Send } from 'lucide-react';
import { Heading, Shell } from '../intakeShell';
import { LINK_CLASS, QUIET_LINK_CLASS } from '../intakeStyles';
import { TapButton as Button } from '../intakeUi';
import type { IntakeSummaryEvent, SummaryRow } from '../contract';
import { renderTxt } from '../intakeCopy';
import { jumpTargets } from '../intakeModel';
import { chrome, NoticeLine, NoticeLines, splitAround, type IntakeUi } from '../intakeUi';

const SOURCE_KEY: Record<NonNullable<SummaryRow['source']>, [string, string]> = {
  you_said: ['summary.youSaid', 'you said'],
  order: ['summary.fromOrder', 'from your order'],
  default: ['summary.default', 'default'],
};

export interface SummaryJump { step: string; stopKey?: string }

/**
 * Decides whether Publish is clickable and, when not, why. The route is measured in the browser (§8.5
 * `routeNeeded`); a page that cannot measure yet leaves it off with a reason rather than letting a click fail.
 */
export function publishState(
  event: IntakeSummaryEvent, canMeasureRoute: boolean,
): { enabled: boolean; reason: 'server' | 'route' | null; serverReason?: string } {
  if (!event.actions.publish.enabled) {
    return { enabled: false, reason: 'server', serverReason: event.actions.publish.disabledReason ? renderTxt(event.actions.publish.disabledReason) : undefined };
  }
  if (event.routeNeeded && !canMeasureRoute) return { enabled: false, reason: 'route' };
  return { enabled: true, reason: null };
}

function DiscardLink({ ui, disabled, onDiscard }: { ui: IntakeUi; disabled: boolean; onDiscard: () => void }) {
  const [asking, setAsking] = useState(false);
  const linkRef = useRef<HTMLButtonElement | null>(null);
  const groupRef = useRef<HTMLSpanElement | null>(null);
  const backToLink = useRef(false);
  const { T } = ui;
  // QA-1: pressing "Discard this load" removed the focused link and focus fell to <body>. Now focus goes to the SAFE answer of the
  // question ("No, keep going" — not the destructive one), and back to the link when the shipper changes their mind.
  useEffect(() => {
    if (asking) {
      groupRef.current?.querySelector<HTMLButtonElement>('[data-testid="intake-discard-no"]')?.focus({ preventScroll: true });
    } else if (backToLink.current) {
      backToLink.current = false;
      linkRef.current?.focus({ preventScroll: true });
    }
  }, [asking]);
  if (!asking) {
    return (
      <button
        ref={linkRef} type="button" disabled={disabled} onClick={() => setAsking(true)} data-testid="intake-discard"
        className={QUIET_LINK_CLASS} style={{ fontWeight: 500 }}>
        {chrome(ui, 'summary.discard', 'Discard this load')}
      </button>
    );
  }
  const question = chrome(ui, 'cancel.confirm', 'Discard this load?');
  return (
    <span ref={groupRef} className="inline-flex flex-wrap items-center" style={{ gap: 8 }} role="group" aria-label={question} data-testid="intake-discard-confirm">
      <span style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{question}</span>
      <Button T={T} variant="danger" size="sm" disabled={disabled} onClick={() => { setAsking(false); onDiscard(); }} data-testid="intake-discard-yes">{chrome(ui, 'cancel.yes', 'Yes, discard')}</Button>
      <Button T={T} variant="ghost" size="sm" disabled={disabled} onClick={() => { backToLink.current = true; setAsking(false); }} data-testid="intake-discard-no">{chrome(ui, 'cancel.no', 'No, keep going')}</Button>
    </span>
  );
}

export function SummaryCard({
  ui, event, disabled, canMeasureRoute, notice, routeInfo, onEdit, onJump, onFinish, onDiscard,
}: {
  ui: IntakeUi; event: IntakeSummaryEvent; disabled: boolean; canMeasureRoute: boolean;
  notice?: string | null;
  /** The measured route, when the page has it (§19.8): an estimate is said out loud — Publish stays allowed. */
  routeInfo?: { km: number; estimated: boolean } | null;
  onEdit: (target: { step: string; stopKey?: string }) => void;
  onJump: (target: SummaryJump) => void;
  onFinish: (intent: 'save_draft' | 'publish') => void;
  onDiscard: () => void;
}) {
  const { T } = ui;
  const publish = publishState(event, canMeasureRoute);
  const targets = jumpTargets(event.gate.missing);
  const [missingBefore, missingAfter] = splitAround(chrome(ui, 'summary.missing', 'To publish, add: {{fields}}'), 'fields');
  const saveEnabled = event.actions.saveDraft.enabled && event.gate.draftOk;
  const notSetText = chrome(ui, 'summary.notSet', 'Not set — needed to publish');
  return (
    <Shell T={T}>
      <Heading T={T} icon={<ClipboardCheck size={17} aria-hidden="true" />} title={renderTxt(event.title)} />
      {event.wantedFinish === 'publish' && (
        <p data-testid="intake-wanted-publish" className="vai-ik-sum-intro">
          {chrome(ui, 'summary.wantedPublish', 'You asked to publish. Check the details, then press Publish now.')}
        </p>
      )}
      <ul className="vai-ik-sum" data-testid="intake-summary-rows">
        {event.rows.map((row) => {
          const label = renderTxt(row.label);
          const src = row.source ? SOURCE_KEY[row.source] : null;
          return (
            <li key={row.id} data-testid={`intake-row-${row.id}`} data-kind={row.kind}>
              <div className="min-w-0 flex-1">
                <div className="vai-ik-sum-label">
                  {label}
                  {src && (
                    <span className="vai-ik-src" data-src={row.source} data-testid={`intake-row-source-${row.id}`}>
                      {chrome(ui, src[0], src[1])}
                    </span>
                  )}
                </div>
                {/* The gateway sends "Not set — needed to publish" as the value itself: it is drawn as a gap, like an empty one. */}
                <div className="vai-ik-sum-value" data-empty={!row.value || row.value === notSetText ? 'true' : undefined}>
                  {row.value || chrome(ui, 'summary.notSet', 'Not set — needed to publish')}
                </div>
                {row.secondary && <div className="vai-ik-sum-sub">{row.secondary}</div>}
                {row.warning && <NoticeLines ui={ui} notices={[row.warning]} />}
              </div>
              <Button
                T={T} variant="subtle" size="sm" disabled={disabled}
                icon={<Pencil size={13} aria-hidden="true" />}
                onClick={() => onEdit(row.edit)}
                aria-label={`${chrome(ui, 'summary.edit', 'Edit')}: ${label}`}
                data-testid={`intake-edit-${row.id}`}
                className="flex-shrink-0"
              >
                {chrome(ui, 'summary.edit', 'Edit')}
              </Button>
            </li>
          );
        })}
      </ul>

      <NoticeLines ui={ui} notices={event.warnings} />

      {!event.gate.draftOk && event.gate.reason && (
        <NoticeLine ui={ui} tone="error">{event.gate.reason}</NoticeLine>
      )}

      {!event.gate.publishOk && targets.length > 0 && (
        <p data-testid="intake-missing" className="vai-ik-missing">
          {missingBefore}
          {targets.map((m, i) => (
            <span key={`${m.step}-${m.stopKey ?? ''}-${m.label}`}>
              {i > 0 ? ', ' : ''}
              <button
                type="button" disabled={disabled} onClick={() => onJump({ step: m.step, ...(m.stopKey ? { stopKey: m.stopKey } : {}) })}
                data-testid={`intake-jump-${m.step}`}
                className={LINK_CLASS}>
                {m.label}
              </button>
            </span>
          ))}
          {missingAfter}
        </p>
      )}

      <div className="vai-ik-sum-foot">
        <div className="vai-ik-actions">
          <Button T={T} disabled={disabled || !saveEnabled} onClick={() => onFinish('save_draft')} data-testid="intake-save-draft">
            {chrome(ui, 'summary.saveDraft', 'Save as draft')}
          </Button>
          <Button
            T={T} variant="ghost" icon={<Send size={14} aria-hidden="true" />} disabled={disabled || !publish.enabled} onClick={() => onFinish('publish')}
            data-testid="intake-publish"
            title={publish.reason === 'server' ? publish.serverReason : undefined}
          >
            {chrome(ui, 'summary.publish', 'Publish now')}
          </Button>
        </div>
        <DiscardLink ui={ui} disabled={disabled} onDiscard={onDiscard} />
      </div>
      {publish.reason === 'server' && publish.serverReason && !event.gate.missing.length && (
        <p data-testid="intake-publish-reason" className="vai-ik-why">{publish.serverReason}</p>
      )}
      {publish.reason === 'route' && (
        <p data-testid="intake-publish-reason" className="vai-ik-why">
          {event.route === undefined
            ? chrome(ui, 'summary.routeNoPosition', 'A site on this load has no map position, so the route can’t be measured. You can save a draft now.')
            : chrome(ui, 'summary.routeNeeded', 'Publishing needs the route distance, which isn’t available here yet. You can save a draft now.')}
        </p>
      )}
      {event.routeNeeded && routeInfo?.estimated && (
        <p data-testid="intake-route-estimate" className="vai-ik-why">
          {chrome(ui, 'summary.routeEstimate', '≈ {{km}} km (estimate)', { km: Math.round(routeInfo.km) })}
        </p>
      )}
      {notice && <NoticeLine ui={ui} tone="error">{notice}</NoticeLine>}
    </Shell>
  );
}
