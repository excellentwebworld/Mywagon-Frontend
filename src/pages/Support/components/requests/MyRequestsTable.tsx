import React from 'react';
import { useTranslation } from '../../../../hooks/useTranslation';
import type { SupportRequestSummary } from '../../types';
import { RequestStatusPill } from './RequestStatusPill';
import { MyRequestsTableSkeleton } from './MyRequestsTableSkeleton';

interface MyRequestsTableProps {
  requests: SupportRequestSummary[];
  loading: boolean;
  error: string | null;
  page: number;
  lastPage: number;
  onPageChange: (page: number) => void;
  onSelect: (ticketNumber: string) => void;
}

function formatDate(value: string, lang: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function typeBadgeClass(type: string): string {
  const normalized = type.toLowerCase();
  if (normalized.includes('bug')) return 'type-bug';
  if (normalized.includes('feedback') || normalized.includes('feature')) return 'type-feature';
  if (normalized.includes('billing')) return 'type-billing';
  return 'type-other';
}

export function MyRequestsTable({
  requests,
  loading,
  error,
  page,
  lastPage,
  onPageChange,
  onSelect,
}: MyRequestsTableProps) {
  const { t, lang } = useTranslation();

  if (loading && requests.length === 0) {
    return <MyRequestsTableSkeleton />;
  }

  if (error) {
    return <div className="kb-message kb-message--error">{t('support.requests.loadError')}</div>;
  }

  if (requests.length === 0) {
    return <div className="requests-empty">{t('support.requests.empty')}</div>;
  }

  return (
    <>
      <div className="requests-table-wrap">
        <div className="requests-table-scroll">
          <table className="req-table">
            <thead>
              <tr>
                <th>{t('support.requests.columns.ticket')}</th>
                <th>{t('support.requests.columns.type')}</th>
                <th>{t('support.requests.columns.title')}</th>
                <th>{t('support.requests.columns.status')}</th>
                <th>{t('support.requests.columns.created')}</th>
                <th>{t('support.requests.columns.updated')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.ticket_number} onClick={() => onSelect(request.ticket_number)}>
                  <td className="ticket-id">{request.ticket_number}</td>
                  <td>
                    <span className={`type-badge ${typeBadgeClass(request.type)}`}>{request.type}</span>
                  </td>
                  <td className="req-title-cell">{request.title}</td>
                  <td>
                    <RequestStatusPill status={request.status} label={request.status_label} />
                  </td>
                  <td className="date-cell">{formatDate(request.created_at, lang)}</td>
                  <td className="date-cell">{formatDate(request.updated_at, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {lastPage > 1 ? (
        <div className="requests-pagination">
          <button
            type="button"
            className="support-request-btn support-request-btn--secondary"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            {t('support.requests.prevPage')}
          </button>
          <span className="requests-pagination-label">
            {t('support.requests.pageOf', { page, lastPage })}
          </span>
          <button
            type="button"
            className="support-request-btn support-request-btn--secondary"
            disabled={page >= lastPage || loading}
            onClick={() => onPageChange(page + 1)}
          >
            {t('support.requests.nextPage')}
          </button>
        </div>
      ) : null}
    </>
  );
}
