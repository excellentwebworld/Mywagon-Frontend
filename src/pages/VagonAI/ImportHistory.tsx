/**
 * The shared Import History (MS3-373): every order import the account ran,
 * from the Vagon AI chat or the Orders page, newest first. A row opens that
 * run's summary in the same card the chat shows, read-only - a past run is
 * read, not closed or re-imported.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import type { ThemeTokens } from '../../utils/themes';
import { useTranslation } from '../../hooks/useTranslation';
import { downloadImportFile, getImportHistory, getOrderImport, type ImportHistoryItem } from './api/orderImportService';
import ErpImportCard from './ErpImportCard';
import { Chip } from './importCardKit';
import { TONE } from './importTones';

const PAGE_SIZE = 20;

function HistoryRow({ T, item }: { T: ThemeTokens; item: ImportHistoryItem }) {
  const { t, lang } = useTranslation();
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const run = useQuery({
    queryKey: ['order-import', item.importId, lang],
    queryFn: () => getOrderImport(item.importId, lang),
    enabled: open,
    staleTime: 60_000,
  });
  const c = item.counts;
  const when = new Date(item.createdAt);
  const counts = c
    ? [
        t('vagonai.importHistory.count.created', { count: c.created }),
        c.updated ? t('vagonai.importHistory.count.updated', { count: c.updated }) : null,
        c.plannedSkipped ? t('vagonai.importHistory.count.planned', { count: c.plannedSkipped }) : null,
        c.failed ? t('vagonai.importHistory.count.failed', { count: c.failed }) : null,
      ].filter(Boolean).join(' · ')
    : null;

  return (
    <li className="rounded-lg border" style={{ borderColor: T.bd, background: T.sf }} data-testid="import-history-row">
      <div className="flex items-start">
      <button
        type="button"
        className="flex-1 min-w-0 flex items-start gap-2.5 px-3 py-2.5 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <FileSpreadsheet size={16} className="mt-0.5 flex-shrink-0" style={{ color: T.ac }} aria-hidden="true" />
        <span className="flex-1 min-w-0">
          <span className="flex flex-wrap items-center gap-1.5">
            <strong className="text-[13px] truncate" style={{ color: T.t1 }} title={item.filename}>{item.filename}</strong>
            <Chip T={T} tone="neutral">{t(`vagonai.importHistory.source.${item.source}`)}</Chip>
            {item.status === 'failed' ? <Chip T={T} tone="error">{t('vagonai.importHistory.status.failed')}</Chip> : null}
            {item.status === 'running' ? <Chip T={T} tone="warn">{t('vagonai.importHistory.status.running')}</Chip> : null}
          </span>
          <span className="block text-[12px] mt-0.5" style={{ color: T.t3 }}>
            {[
              Number.isNaN(when.getTime()) ? null : when.toLocaleString(lang, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
              t('vagonai.importHistory.by', { name: item.user.name }),
            ].filter(Boolean).join(' · ')}
          </span>
          {counts ? <span className="block text-[12px] mt-0.5" style={{ color: T.t2 }}>{counts}</span> : null}
        </span>
        <span className="flex-shrink-0 mt-0.5" style={{ color: T.t3 }} aria-hidden="true">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
      </button>
      {/* MS3-375: the file as it was uploaded - downloaded, never shown on screen. */}
      {item.hasFile ? (
        <button
          type="button"
          className="flex-shrink-0 inline-flex items-center gap-1 mt-2 mr-2 rounded-md px-2 py-1 text-[12px] font-semibold underline-offset-2 hover:underline"
          style={{ color: T.ac }}
          disabled={downloading}
          onClick={() => {
            setDownloadError(false);
            setDownloading(true);
            downloadImportFile(item.importId, item.filename)
              .catch(() => setDownloadError(true))
              .finally(() => setDownloading(false));
          }}
          title={t('vagonai.importHistory.downloadTitle', { file: item.filename })}
          aria-label={t('vagonai.importHistory.downloadTitle', { file: item.filename })}
          data-testid="import-history-download"
        >
          {downloading ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Download size={13} aria-hidden="true" />}
          {t('vagonai.importHistory.download')}
        </button>
      ) : null}
      </div>
      {downloadError ? (
        <p className="m-0 px-3 pb-2 text-[12px]" style={{ color: TONE.error.fg }} role="alert">{t('vagonai.importHistory.downloadFailed')}</p>
      ) : null}
      {open ? (
        <div className="px-3 pb-3" data-testid="import-history-summary">
          {run.isLoading ? (
            <p className="m-0 flex items-center gap-2 text-[12.5px]" style={{ color: T.t3 }}>
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              {t('vagonai.importHistory.loading')}
            </p>
          ) : run.data?.view ? (
            <ErpImportCard view={run.data.view} T={T} readOnly />
          ) : (
            <p className="m-0 text-[12.5px]" style={{ color: TONE.error.fg }}>{run.data?.message ?? t('vagonai.importHistory.loadFailed')}</p>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function ImportHistory({ T }: { T: ThemeTokens }) {
  const { t, lang } = useTranslation();
  const [pages, setPages] = useState(1);
  const history = useQuery({
    queryKey: ['order-import-history', pages, lang],
    queryFn: () => getImportHistory(1, PAGE_SIZE * pages, lang),
    // Fetched again each time the tab opens, so an import that just ran is listed (the app default caches 60 s).
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const data = history.data;

  if (history.isLoading) {
    return (
      <p className="m-0 flex items-center gap-2 text-[13px]" style={{ color: T.t3 }}>
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        {t('vagonai.importHistory.loading')}
      </p>
    );
  }
  if (history.isError || !data || data.status) {
    return <p className="m-0 text-[13px]" style={{ color: TONE.error.fg }}>{data?.message ?? t('vagonai.importHistory.loadFailed')}</p>;
  }
  if (data.items.length === 0) return <p className="m-0 text-[13px]" style={{ color: T.t3 }}>{t('vagonai.importHistory.empty')}</p>;
  return (
    <div data-testid="import-history">
      <ul className="m-0 pl-0 list-none space-y-2">
        {data.items.map((item) => <HistoryRow key={item.importId} T={T} item={item} />)}
      </ul>
      {data.total > data.items.length ? (
        <button
          type="button"
          className="mt-3 text-[12.5px] font-semibold underline"
          style={{ color: T.t2 }}
          disabled={history.isFetching}
          onClick={() => setPages((n) => n + 1)}
          data-testid="import-history-more"
        >
          {t('vagonai.importHistory.more', { count: data.total - data.items.length })}
        </button>
      ) : null}
    </div>
  );
}
