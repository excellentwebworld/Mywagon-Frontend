/**
 * The result of Save as draft / Publish now (CONTRACT.md §8.11), with **Undo result** for a saved draft.
 *
 * Undo is draft-only (§9.4): a published load can't be undone from the chat, and the card says so and points to
 * Manage Shipments instead of offering a button that would fail. An undo that fails (`undo_failed`, C1) never
 * looks like success — the draft stays shown as saved, with the error and, when repeating it may help, Try again.
 */
import { CircleAlert, CircleCheck, ExternalLink, Plus, Undo2 } from 'lucide-react';
import { Heading, Shell } from '../intakeShell';
import { TapButton as Button } from '../intakeUi';
import type { IntakeDoneEvent } from '../contract';
import { renderTxt } from '../intakeCopy';
import type { IntakeNotice } from '../intakeThread';
import { chrome, NoticeLine, NoticeLines, type IntakeUi } from '../intakeUi';

export function DoneCard({
  ui, event, live, disabled, notice, onOpen, onUndo, onNewLoad, onRetry,
}: {
  ui: IntakeUi; event: IntakeDoneEvent; live: boolean; disabled: boolean; notice?: IntakeNotice | null;
  onOpen: (url: string) => void; onUndo: () => void; onNewLoad: () => void; onRetry: (kind: 'finish' | 'undo') => void;
}) {
  const { T } = ui;
  const unknown = event.outcome === 'unknown';
  return (
    <Shell T={T}>
      <Heading
        T={T}
        tone={unknown ? 'warn' : 'ok'}
        icon={unknown ? <CircleAlert size={18} aria-hidden="true" /> : <CircleCheck size={18} aria-hidden="true" />}
        title={renderTxt(event.message)}
      />
      {event.unsupported.length > 0 && (
        <ul data-testid="intake-unsupported" className="vai-ik-note vai-ik-note--warn" style={{ display: 'block', margin: '0 0 6px', paddingLeft: 30, listStyle: 'disc' }}>
          {event.unsupported.map((u) => <li key={u}>{u}</li>)}
        </ul>
      )}
      {event.drafts && event.drafts.length > 1 && (
        // MS3-404 "one load per order": one row per draft, each with its own link.
        <ul data-testid="intake-done-drafts" className="vai-ik-drafts" style={{ listStyle: 'none', margin: '0 0 8px', padding: 0, display: 'grid', gap: 6 }}>
          {event.drafts.map((d) => (
            <li key={d.draftId} className="flex items-center justify-between" style={{ gap: 8, flexWrap: 'wrap' }} data-testid={`intake-done-draft-${d.draftId}`}>
              <span>{renderTxt(d.label)}</span>
              {live && d.url && !unknown && (
                <Button T={T} variant="ghost" icon={<ExternalLink size={14} aria-hidden="true" />} disabled={disabled} onClick={() => onOpen(d.url!)} data-testid={`intake-open-${d.draftId}`}>
                  {renderTxt(event.next.openUrl)}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <NoticeLines ui={ui} notices={event.warnings} />
      {live && (
        <>
          <div className="vai-ik-actions" style={{ marginTop: 4 }}>
            {event.url && !unknown && !(event.drafts && event.drafts.length > 1) && (
              <Button T={T} icon={<ExternalLink size={14} aria-hidden="true" />} disabled={disabled} onClick={() => onOpen(event.url!)} data-testid="intake-open">
                {renderTxt(event.next.openUrl)}
              </Button>
            )}
            <Button T={T} variant="ghost" icon={<Plus size={14} aria-hidden="true" />} disabled={disabled} onClick={onNewLoad} data-testid="intake-new-load">
              {renderTxt(event.next.newLoad)}
            </Button>
            {event.undo.available && event.undo.kind === 'discard_draft' && (
              <Button T={T} variant="subtle" icon={<Undo2 size={14} aria-hidden="true" />} disabled={disabled} onClick={onUndo} data-testid="intake-undo">
                {event.undo.label ? renderTxt(event.undo.label) : chrome(ui, 'undo.label', 'Undo')}
              </Button>
            )}
          </div>
          {!event.undo.available && event.undo.unavailableReason && (
            <p data-testid="intake-undo-unavailable" className="vai-ik-why" style={{ marginTop: 12 }}>{renderTxt(event.undo.unavailableReason)}</p>
          )}
          {notice && (
            <>
              <NoticeLine ui={ui} tone={notice.tone}>{notice.text}</NoticeLine>
              {notice.retry && (
                <div className="mt-2">
                  <Button T={T} variant="ghost" disabled={disabled} onClick={() => onRetry(notice.retry!)} data-testid="intake-retry">
                    {chrome(ui, 'retry', 'Try again')}
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </Shell>
  );
}
