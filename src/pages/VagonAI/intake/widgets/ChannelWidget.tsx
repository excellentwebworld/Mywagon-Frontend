/**
 * "Who should see this load?" (§8.7, MS3-409). Private · my partners is pre-selected, and its partner list is shown right
 * under it, already ticked the way the gateway proposes (every partner for `private_all`, or the one it suggests), so the
 * shipper sees who gets the load and can untick or add partners before one "Send to …" tap. Public is a deliberate second
 * step: it hides the list and shows what it means (every carrier on MYVAGON can see the load) and the public quota; only
 * "Yes, make it public" posts it.
 *
 * The list is the gateway's inline `partners.items` (sent when it has ≤ 50), or above that R4 `partners` (`loadPartners`,
 * passed by the host only when it serves it), loaded when the step opens. With neither, Private is the one-tap
 * "Send to all my partners". A suggested partner keeps its one-tap "Only <name>".
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, Users } from 'lucide-react';
import { Heading, Shell } from '../intakeShell';
import { inputStyle, LINK_CLASS } from '../intakeStyles';
import { TapButton as Button } from '../intakeUi';
import type { ChannelWidgetSpec, IntakeAnswerWire, IntakeStepEvent } from '../contract';
import { renderTxt } from '../intakeCopy';
import { channelAnswer, channelDefaultOf, proposedPartnerIds } from '../intakeModel';
import { chrome, NoticeLines, StepShortcuts, type IntakeUi } from '../intakeUi';
import type { OptionsResponse } from '../contract';
import { itemsOf } from '../optionsModel';
import { nodesOfItems, toggled, visibleRows } from '../pickerTree';
import { FILTER_AFTER } from '../../selectionGroups';
import { ChoiceButton } from './choiceKit';
import { GroupedPicker } from './GroupedPicker';

/** `useState` order: [0] public chosen, [1] ticked ids (null = untouched: the gateway's proposal), [2] search, [3] remote rows (R4 path). */
type Remote = { status: 'error' } | { status: 'ready'; rows: { id: string; name: string }[]; partial: boolean };

export function ChannelWidget({
  ui, event, spec, disabled, onAnswer, loadPartners, onExpress, onToSummary, onCancelEdit,
}: {
  ui: IntakeUi; event: IntakeStepEvent; spec: ChannelWidgetSpec; disabled: boolean;
  onAnswer: (wire: IntakeAnswerWire) => void;
  /** R4 `partners`, all pages — passed only when the gateway serves it (§19.5). */
  loadPartners?: () => Promise<OptionsResponse>;
  onExpress: () => void; onToSummary: () => void; onCancelEdit: () => void;
}) {
  const { T } = ui;
  const count = spec.partners.count;
  const preselected = channelDefaultOf(spec);
  const [publicChosen, setPublicChosen] = useState(preselected === 'public' || count === 0);
  const [ticked, setTicked] = useState<string[] | null>(null);
  const [search, setSearch] = useState('');
  const [remote, setRemote] = useState<Remote | null>(null);
  const inline = spec.partners.items && spec.partners.items.length > 0 ? spec.partners.items : null;
  const canList = count > 0 && (inline !== null || loadPartners !== undefined);
  const showList = canList && !publicChosen;

  useEffect(() => {
    if (!showList || inline || !loadPartners || remote) return;
    let live = true;
    loadPartners().then(
      (res) => { if (live) setRemote(res.ok ? { status: 'ready', rows: itemsOf(res).map((o) => ({ id: o.id, name: o.title })), partial: res.nextCursor !== null || res.total > itemsOf(res).length } : { status: 'error' }); },
      () => { if (live) setRemote({ status: 'error' }); },
    );
    return () => { live = false; };
  }, [showList, inline, loadPartners, remote]);

  // R4 path: nothing back yet reads as loading (the effect above only ever sets the outcome).
  const loading = showList && !inline && loadPartners !== undefined && remote === null;
  const rowsList = inline ?? (remote?.status === 'ready' ? remote.rows : []);
  const picked = ticked ?? proposedPartnerIds(spec, rowsList);
  const complete = inline !== null || (remote?.status === 'ready' && !remote.partial);
  // Untouched "all my partners" stays all of them even when only the first page of a long list is loaded.
  const everyone = (ticked === null && preselected === 'all') || (complete && rowsList.length > 0 && rowsList.every((row) => picked.includes(row.id)));
  const suggested = spec.suggested;
  const why = suggested?.why === undefined ? undefined : typeof suggested.why === 'string' ? suggested.why : renderTxt(suggested.why);
  const suggestedBadge = chrome(ui, 'choice.suggested', 'Suggested');
  const nodes = nodesOfItems(rowsList.map((p) => ({
    id: p.id, title: p.name,
    ...(suggested?.partnerId === p.id ? { badges: [suggestedBadge], ...(why ? { subtitle: why } : {}) } : {}),
  })));
  const shown = visibleRows(nodes, new Set<string>(), search);
  const warning = spec.publicWarning
    ? renderTxt(spec.publicWarning)
    : chrome(ui, 'channel.public.warn', 'A public load is visible to every carrier on MYVAGON.');
  // Every partner ticked is "all my partners" (partners added later get it too); fewer is that exact list.
  const send = () => onAnswer(everyone ? channelAnswer({ kind: 'all' }) : channelAnswer({ kind: 'partners', partnerIds: picked }));
  return (
    <Shell T={T}>
      <Heading T={T} icon={<Users size={17} aria-hidden="true" />} title={renderTxt(event.prompt)} hint={event.hint ? renderTxt(event.hint) : undefined} />
      <div className="vai-ik-choices" role="group" aria-label={renderTxt(event.prompt)} data-testid="intake-channel">
        {count > 0 && (
          <ChoiceButton
            ui={ui} testId="intake-channel-private"
            label={chrome(ui, 'channel.private.label', 'Private · my partners ({{count}})', { count })}
            selected={!publicChosen} suggested={preselected === 'all'}
            disabled={disabled} onClick={() => setPublicChosen(false)}
          />
        )}
        <ChoiceButton
          ui={ui} testId="intake-channel-public"
          label={chrome(ui, 'channel.public', 'Public marketplace')}
          selected={publicChosen} suggested={preselected === 'public'}
          disabled={disabled} onClick={() => setPublicChosen(true)}
        />
      </div>
      {count > 0 && !publicChosen && !canList && (
        <div className="vai-ik-actions" style={{ marginTop: 12 }}>
          <Button T={T} disabled={disabled} onClick={() => onAnswer(channelAnswer({ kind: 'all' }))} data-testid="intake-channel-all">
            {chrome(ui, 'channel.sendToAll', 'Send to all {{count}} partners', { count })}
          </Button>
          {suggested && (
            <Button T={T} variant="ghost" disabled={disabled} onClick={() => onAnswer(channelAnswer({ kind: 'partner', partnerId: suggested.partnerId }))} data-testid="intake-channel-partner">
              {chrome(ui, 'channel.only', 'Only {{name}}', { name: suggested.name })}
            </Button>
          )}
          {suggested && why && <p className="vai-ik-why" data-testid="intake-channel-why" style={{ flexBasis: '100%', marginTop: 0 }}>{why}</p>}
        </div>
      )}
      {showList && (
        <div data-testid="intake-channel-pickbox" className="vai-ik-panel" style={{ marginTop: 12 }}>
          {loading && <p data-testid="intake-channel-pick-loading" className="vai-ik-why" style={{ marginTop: 0 }}>{chrome(ui, 'pick.loading', 'Loading…')}</p>}
          {remote?.status === 'error' && <p role="alert" data-testid="intake-channel-pick-error" className="vai-ik-inline-error" style={{ marginTop: 0 }}>{chrome(ui, 'pick.error', 'The list could not be loaded. Try again.')}</p>}
          {!loading && remote?.status !== 'error' && (
            <>
              {rowsList.length > FILTER_AFTER && (
                <input
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="intake-channel-pick-search"
                  placeholder={chrome(ui, 'pick.search', 'Search')} aria-label={chrome(ui, 'pick.search', 'Search')}
                  style={{ ...inputStyle(T), marginBottom: 10 }}
                />
              )}
              <div className="vai-ik-actions" style={{ marginTop: 0, marginBottom: 8 }}>
                <button type="button" className={LINK_CLASS} disabled={disabled || everyone} data-testid="intake-channel-pick-all" onClick={() => setTicked(rowsList.map((row) => row.id))}>
                  {chrome(ui, 'pick.selectAll', 'Select all')}
                </button>
                <button type="button" className={LINK_CLASS} disabled={disabled || picked.length === 0} data-testid="intake-channel-pick-none" onClick={() => setTicked([])}>
                  {chrome(ui, 'pick.clear', 'Clear')}
                </button>
              </div>
              <GroupedPicker
                ui={ui} testId="intake-channel-pick-list" rows={shown} selected={picked} multiple disabled={disabled}
                emptyText={chrome(ui, 'pick.noMatch', 'Nothing matches.')}
                onToggleGroup={() => undefined} onPick={(n) => setTicked(toggled(picked, n.id))}
              />
              {remote?.status === 'ready' && remote.partial && (
                <p data-testid="intake-channel-pick-partial" style={{ fontSize: 12, color: T.t3, marginTop: 6 }}>{chrome(ui, 'pick.partial', 'Showing the first {{count}}. Type to narrow the list.', { count: rowsList.length })}</p>
              )}
              <div className="vai-ik-actions" style={{ marginTop: 12 }}>
                <Button T={T} disabled={disabled || (picked.length === 0 && !everyone)} onClick={send} data-testid="intake-channel-pick-confirm">
                  {everyone
                    ? chrome(ui, 'channel.sendToAll', 'Send to all {{count}} partners', { count: Math.max(count, picked.length) })
                    : chrome(ui, 'channel.sendTo', 'Send to {{count}} partners', { count: picked.length })}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
      {count === 0 && (
        <p data-testid="intake-channel-nopartners" className="vai-ik-note vai-ik-note--info">
          {chrome(ui, 'channel.noPartners', 'You have no partners yet. Choose Public, or add a partner first.')}
        </p>
      )}
      {publicChosen && (
        <div data-testid="intake-channel-publicbox" className="vai-ik-panel vai-ik-panel--warn" style={{ marginTop: 12 }}>
          <p className="flex items-start" style={{ gap: 8, fontSize: 13.5, fontWeight: 600, color: T.t1, lineHeight: 1.5 }}>
            <AlertTriangle size={16} className="flex-shrink-0" style={{ color: '#B45309', marginTop: 2 }} aria-hidden="true" />
            <span data-testid="intake-channel-warning">{warning}</span>
          </p>
          {spec.publicQuota && (
            <p data-testid="intake-channel-quota" style={{ fontSize: 12.5, color: T.t2, marginTop: 4, paddingLeft: 24 }}>
              {chrome(ui, 'channel.quota', 'Public loads used: {{used}} of {{limit}}', { used: spec.publicQuota.used, limit: spec.publicQuota.limit })}
            </p>
          )}
          <div className="vai-ik-actions" style={{ marginTop: 12, paddingLeft: 24 }}>
            <Button T={T} disabled={disabled} onClick={() => onAnswer(channelAnswer({ kind: 'public' }))} data-testid="intake-channel-public-confirm">
              {chrome(ui, 'channel.publicConfirm', 'Yes, make it public')}
            </Button>
            {count > 0 && (
              <Button T={T} variant="ghost" disabled={disabled} onClick={() => setPublicChosen(false)} data-testid="intake-channel-public-back">
                {chrome(ui, 'channel.back', 'Back')}
              </Button>
            )}
          </div>
        </div>
      )}
      <NoticeLines ui={ui} notices={event.notices} />
      <StepShortcuts ui={ui} event={event} disabled={disabled} onExpress={onExpress} onToSummary={onToSummary} onCancelEdit={onCancelEdit} />
    </Shell>
  );
}
