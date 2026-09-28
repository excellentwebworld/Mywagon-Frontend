/**
 * Left-side panel on the VagonAI page: past-conversation history — grouped
 * by recency, resumable, deletable one-at-a-time or all at once. VagonAI
 * always opens on a blank new chat (see VagonAIPage) — this panel is purely
 * an explicit "go back to an old chat" affordance, never an auto-restore.
 */
import { useEffect, useState } from 'react';
import {
  MessageSquarePlus, Trash2, PanelLeftClose, PanelLeftOpen, MessagesSquare, Search,
} from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { useMediaQuery, DESKTOP_SIDEBAR_QUERY } from '../../hooks/useMediaQuery';
import { groupConversationsByRecency, formatConversationTimestamp, type HistoryGroupLabel } from './historyGrouping';
import type { ConversationSummary } from './api/conversationsService';

const GROUP_LABEL_KEY: Record<HistoryGroupLabel, string> = {
  today: 'vagonai.history.groups.today',
  yesterday: 'vagonai.history.groups.yesterday',
  previous7: 'vagonai.history.groups.previous7',
  older: 'vagonai.history.groups.older',
};

const DESKTOP_COLLAPSED_KEY = 'vagonai-history-collapsed';

interface HistorySidebarProps {
  conversations: ConversationSummary[];
  loading: boolean;
  error: string | null;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export default function HistorySidebar({
  conversations, loading, error, activeId, onSelect, onNewChat, onDelete, onClearAll,
}: HistorySidebarProps) {
  const { T } = useTheme();
  const { t } = useTranslation();
  const isDesktop = useMediaQuery(DESKTOP_SIDEBAR_QUERY);
  const [expandedOnMobile, setExpandedOnMobile] = useState(false);
  const [collapsedOnDesktop, setCollapsedOnDesktop] = useState(
    () => localStorage.getItem(DESKTOP_COLLAPSED_KEY) === '1',
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [confirmingClearAll, setConfirmingClearAll] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    localStorage.setItem(DESKTOP_COLLAPSED_KEY, collapsedOnDesktop ? '1' : '0');
  }, [collapsedOnDesktop]);

  const open = isDesktop ? !collapsedOnDesktop : expandedOnMobile;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? conversations.filter((c) => (c.title || t('vagonai.history.untitled')).toLowerCase().includes(q))
    : conversations;
  const groups = groupConversationsByRecency(filtered);
  const pendingDeleteTitle = conversations.find((c) => c.id === pendingDeleteId)?.title;

  return (
    <>
      {/* Collapsed rail: always mounted so it can slide/fade in as the drawer collapses */}
      <button
        type="button"
        onClick={() => (isDesktop ? setCollapsedOnDesktop(false) : setExpandedOnMobile(true))}
        aria-label={t('vagonai.history.open')}
        title={t('vagonai.history.open')}
        aria-hidden={open}
        tabIndex={open ? -1 : 0}
        className="flex-shrink-0 flex items-center justify-center overflow-hidden"
        style={{
          width: open ? 0 : 40,
          height: 40,
          margin: open ? 0 : 12,
          borderRadius: 10,
          background: T.sf,
          border: `1px solid ${T.bd}`,
          color: T.t2,
          opacity: open ? 0 : 1,
          pointerEvents: open ? 'none' : 'auto',
          transition: 'width 220ms ease-in-out, margin 220ms ease-in-out, opacity 160ms ease-in-out',
        }}
      >
        <PanelLeftOpen size={16} />
      </button>

      {/* Sliding drawer */}
      <aside
        className="flex-shrink-0 flex flex-col h-full overflow-hidden"
        aria-hidden={!open}
        style={{
          width: isDesktop ? (open ? 264 : 0) : 264,
          background: T.sh,
          borderRight: isDesktop && !open ? 'none' : `1px solid ${T.bd}`,
          position: isDesktop ? 'relative' : 'absolute',
          zIndex: isDesktop ? undefined : 20,
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          transform: !isDesktop ? `translateX(${open ? '0' : '-100%'})` : undefined,
          transition: isDesktop
            ? 'width 220ms ease-in-out, border-color 220ms ease-in-out'
            : 'transform 220ms ease-in-out',
        }}
      >
        <div className="flex flex-col h-full" style={{ width: 264 }}>
          <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
            <div className="flex items-center gap-1.5 min-w-0" style={{ color: T.t2 }}>
              <MessagesSquare size={14} />
              <span className="text-[11px] font-semibold uppercase tracking-wide truncate">{t('vagonai.history.title')}</span>
            </div>
            <button
              type="button"
              onClick={() => (isDesktop ? setCollapsedOnDesktop(true) : setExpandedOnMobile(false))}
              aria-label={t('vagonai.history.close')}
              title={t('vagonai.history.close')}
              style={{ color: T.t3, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <PanelLeftClose size={16} />
            </button>
          </div>

          <div className="px-3 pt-1 pb-2 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => { onNewChat(); if (!isDesktop) setExpandedOnMobile(false); }}
              className="w-full flex items-center justify-center gap-2 rounded-xl transition-colors"
              style={{
                height: 40, background: T.ac, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                boxShadow: `0 6px 16px ${T.bd}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.ah; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = T.ac; }}
            >
              <MessageSquarePlus size={15} />
              {t('vagonai.history.newChat')}
            </button>

            {conversations.length > 0 && (
              <div className="relative">
                <Search size={14} className="absolute" style={{ left: 10, top: 10, color: T.t3 }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('vagonai.history.searchPlaceholder')}
                  aria-label={t('vagonai.history.searchPlaceholder')}
                  className="w-full outline-none"
                  style={{
                    height: 34, borderRadius: 10, border: `1px solid ${T.bd}`, background: T.sf,
                    padding: '0 10px 0 30px', fontSize: 12.5, color: T.t1,
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-2">
            {loading && (
              <div className="px-1 py-1">
                <Skeleton height={34} borderRadius={10} count={4} style={{ marginBottom: 6 }} />
              </div>
            )}

            {!loading && error && (
              <p className="px-2 text-[12px]" style={{ color: '#B91C1C' }}>{error}</p>
            )}

            {!loading && !error && conversations.length === 0 && (
              <p className="px-2 py-4 text-[12px] text-center" style={{ color: T.t3 }}>{t('vagonai.history.empty')}</p>
            )}

            {!loading && !error && conversations.length > 0 && groups.length === 0 && (
              <p className="px-2 py-4 text-[12px] text-center" style={{ color: T.t3 }}>{t('vagonai.history.noResults')}</p>
            )}

            {!loading && !error && groups.map((group) => (
              <div key={group.label} className="mb-2">
                <div className="px-2 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: T.t3 }}>
                  {t(GROUP_LABEL_KEY[group.label])}
                </div>
                {group.items.map((c) => {
                  const active = c.id === activeId;
                  return (
                    <div
                      key={c.id}
                      className="group relative flex items-center rounded-lg"
                      style={{ background: active ? T.ap : 'transparent' }}
                    >
                      <button
                        type="button"
                        onClick={() => { onSelect(c.id); if (!isDesktop) setExpandedOnMobile(false); }}
                        className="flex-1 min-w-0 text-left rounded-lg"
                        style={{
                          padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer',
                          color: active ? T.ac : T.t1,
                        }}
                        title={c.title ?? t('vagonai.history.untitled')}
                      >
                        <div className="truncate text-[12.5px] font-medium">{c.title || t('vagonai.history.untitled')}</div>
                        <div className="truncate text-[10.5px] mt-0.5" style={{ color: active ? T.ac : T.t3 }}>
                          {formatConversationTimestamp(c.updatedAt)}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPendingDeleteId(c.id); }}
                        aria-label={t('vagonai.history.delete')}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mr-1.5"
                        style={{
                          color: T.t3, background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8,
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {conversations.length > 0 && (
            <div className="px-3 py-2.5" style={{ borderTop: `1px solid ${T.bd}` }}>
              <button
                type="button"
                onClick={() => setConfirmingClearAll(true)}
                className="w-full text-center text-[11.5px] font-medium"
                style={{ color: T.t3, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {t('vagonai.history.clearAll')}
              </button>
            </div>
          )}
        </div>
      </aside>

      {!isDesktop && (
        <div
          className="fixed inset-0"
          style={{
            background: 'rgba(0,0,0,0.35)', zIndex: 19,
            opacity: expandedOnMobile ? 1 : 0,
            pointerEvents: expandedOnMobile ? 'auto' : 'none',
            transition: 'opacity 220ms ease-in-out',
          }}
          onClick={() => setExpandedOnMobile(false)}
          aria-hidden="true"
        />
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId) onDelete(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        title={t('vagonai.history.deleteConfirmTitle')}
        message={t('vagonai.history.deleteConfirmMessage', { title: pendingDeleteTitle || t('vagonai.history.untitled') })}
        confirmLabel={t('vagonai.history.delete')}
      />

      <ConfirmDialog
        open={confirmingClearAll}
        onClose={() => setConfirmingClearAll(false)}
        onConfirm={() => { onClearAll(); setConfirmingClearAll(false); }}
        title={t('vagonai.history.clearAllConfirmTitle')}
        message={t('vagonai.history.clearAllConfirmMessage')}
        confirmLabel={t('vagonai.history.clearAll')}
      />
    </>
  );
}
