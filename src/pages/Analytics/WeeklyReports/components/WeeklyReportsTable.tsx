import React from 'react';
import {
  Calendar,
  Mail,
  Download,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Inbox,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { WeeklyReportItem } from '../../../../api/types/weeklyReports';
import { BillingPagination } from '../../../Billing/components/BillingPagination';

interface WeeklyReportsTableProps {
  reports: WeeklyReportItem[];
  loading: boolean;
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  onPageChange: (newPage: number) => void;
  onPerPageChange: (newPerPage: number) => void;
  onSelectReport: (report: WeeklyReportItem) => void;
  onExportCsv: (report: WeeklyReportItem, e: React.MouseEvent) => void;
  exportingReportId: string | number | null;
}

export const WeeklyReportsTable: React.FC<WeeklyReportsTableProps> = ({
  reports,
  loading,
  page,
  lastPage,
  total,
  perPage,
  onPageChange,
  onPerPageChange,
  onSelectReport,
  onExportCsv,
  exportingReportId,
}) => {
  const { t } = useTranslation();

  const renderDelta = (delta: number) => {
    if (delta > 0) {
      return (
        <span className="wr-tbl-delta wr-delta-up">
          <ArrowUpRight size={12} />
          <span>+{delta}</span>
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span className="wr-tbl-delta wr-delta-down">
          <ArrowDownRight size={12} />
          <span>{delta}</span>
        </span>
      );
    }
    return (
      <span className="wr-tbl-delta wr-delta-zero">
        <Minus size={12} />
        <span>0</span>
      </span>
    );
  };

  const formatDeliveryDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="wr-tbl-card">
      <div className="wr-tbl-responsive">
        <table className="wr-table">
          <thead>
            <tr>
              <th className="wr-th-period">{t('weeklyReports.period', 'Week Period')}</th>
              <th className="wr-th-delivery">{t('weeklyReports.deliveryDate', 'Delivered On')}</th>
              <th className="wr-th-fulfilled text-right">{t('weeklyReports.loadsFulfilled', 'Fulfilled')}</th>
              <th className="wr-th-created text-right">{t('weeklyReports.loadsCreated', 'Created')}</th>
              <th className="wr-th-active">{t('weeklyReports.onTrip', 'In Progress')}</th>
              <th className="wr-th-pending">{t('weeklyReports.pending', 'Pending / Canceled')}</th>
              <th className="wr-th-partners text-right">{t('weeklyReports.newPartners', 'Partners')}</th>
              <th className="wr-th-actions text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx} className="wr-tr-skeleton">
                  {/* Period */}
                  <td className="wr-td-period">
                    <div className="wr-period-cell">
                      <div className="wr-sk-box wr-sk-shimmer" style={{ width: 32, height: 32, borderRadius: 8 }} />
                      <div className="wr-period-info" style={{ flex: 1 }}>
                        <div className="wr-sk-line wr-sk-shimmer" style={{ width: '130px', height: '14px' }} />
                      </div>
                    </div>
                  </td>
                  {/* Delivery date */}
                  <td className="wr-td-delivery">
                    <div className="wr-delivery-cell">
                      <div className="wr-sk-line wr-sk-shimmer" style={{ width: '90px', height: '13px', marginBottom: '5px' }} />
                      <div className="wr-sk-line wr-sk-shimmer" style={{ width: '54px', height: '16px', borderRadius: '999px' }} />
                    </div>
                  </td>
                  {/* Fulfilled */}
                  <td className="wr-td-metric text-right">
                    <div className="wr-metric-cell">
                      <div className="wr-sk-line wr-sk-shimmer" style={{ width: '36px', height: '16px', marginBottom: '4px' }} />
                      <div className="wr-sk-line wr-sk-shimmer" style={{ width: '32px', height: '14px', borderRadius: '4px' }} />
                    </div>
                  </td>
                  {/* Created */}
                  <td className="wr-td-metric text-right">
                    <div className="wr-metric-cell">
                      <div className="wr-sk-line wr-sk-shimmer" style={{ width: '36px', height: '16px', marginBottom: '4px' }} />
                      <div className="wr-sk-line wr-sk-shimmer" style={{ width: '32px', height: '14px', borderRadius: '4px' }} />
                    </div>
                  </td>
                  {/* In Progress */}
                  <td className="wr-td-progress">
                    <div className="wr-progress-chips">
                      <div className="wr-sk-line wr-sk-shimmer" style={{ width: '50px', height: '20px', borderRadius: '6px' }} />
                      <div className="wr-sk-line wr-sk-shimmer" style={{ width: '58px', height: '20px', borderRadius: '6px' }} />
                      <div className="wr-sk-line wr-sk-shimmer" style={{ width: '52px', height: '20px', borderRadius: '6px' }} />
                    </div>
                  </td>
                  {/* Pending / Canceled */}
                  <td className="wr-td-pending">
                    <div className="wr-pending-cell">
                      <div className="wr-sk-line wr-sk-shimmer" style={{ width: '76px', height: '20px', borderRadius: '6px' }} />
                    </div>
                  </td>
                  {/* Partners */}
                  <td className="wr-td-partners text-right">
                    <div className="wr-sk-line wr-sk-shimmer" style={{ width: '28px', height: '16px', marginLeft: 'auto' }} />
                  </td>
                  {/* Actions */}
                  <td className="wr-td-actions text-right">
                    <div className="wr-row-actions">
                      <div className="wr-sk-box wr-sk-shimmer" style={{ width: 32, height: 32, borderRadius: 8 }} />
                      <div className="wr-sk-box wr-sk-shimmer" style={{ width: 32, height: 32, borderRadius: 8 }} />
                    </div>
                  </td>
                </tr>
              ))
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={8} className="wr-empty-td">
                  <div className="wr-empty-state">
                    <Inbox size={42} className="wr-empty-icon" />
                    <h3 className="wr-empty-title">
                      {t('weeklyReports.noReports', 'No weekly reports found')}
                    </h3>
                    <p className="wr-empty-desc">
                      {t(
                        'weeklyReports.noReportsDesc',
                        'Reports are generated every Monday morning. Try adjusting your date range filter.'
                      )}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              reports.map((r) => {
                const fulfilled = r.metrics.fulfilled;
                const created = r.metrics.created;
                const onTrip = r.metrics.on_trip?.value ?? 0;
                const scheduled = r.metrics.scheduled?.value ?? 0;
                const ready = r.metrics.ready?.value ?? 0;
                const pending = r.metrics.pending?.value ?? 0;
                const canceled = r.metrics.canceled?.value ?? 0;
                const newPartners = r.metrics.new_partners?.value ?? 0;

                const isExportingThis = exportingReportId === r.id;

                return (
                  <tr
                    key={r.id}
                    className="wr-table-row"
                    onClick={() => onSelectReport(r)}
                    title="Click to view weekly email report with stats"
                  >
                    {/* Period Column */}
                    <td className="wr-td-period">
                      <div className="wr-period-cell">
                        <div className="wr-period-icon-wrap">
                          <Calendar size={16} />
                        </div>
                        <div className="wr-period-info">
                          <strong className="wr-period-title">{r.period_label}</strong>
                        </div>
                      </div>
                    </td>

                    {/* Delivery Date / Sent Status */}
                    <td className="wr-td-delivery">
                      <div className="wr-delivery-cell">
                        <span className="wr-delivery-date">
                          {formatDeliveryDate(r.delivery_date)}
                        </span>
                        <span className="wr-sent-pill">
                          <CheckCircle2 size={11} />
                          <span>{r.is_sent ? 'Sent' : 'Available'}</span>
                        </span>
                      </div>
                    </td>

                    {/* Fulfilled Metric */}
                    <td className="wr-td-metric text-right">
                      <div className="wr-metric-cell">
                        <span className="wr-metric-main-val font-semibold">
                          {fulfilled?.value ?? 0}
                        </span>
                        {renderDelta(fulfilled?.delta ?? 0)}
                      </div>
                    </td>

                    {/* Created Metric */}
                    <td className="wr-td-metric text-right">
                      <div className="wr-metric-cell">
                        <span className="wr-metric-main-val font-semibold">
                          {created?.value ?? 0}
                        </span>
                        {renderDelta(created?.delta ?? 0)}
                      </div>
                    </td>

                    {/* In-Progress (On Trip, Scheduled, Ready) */}
                    <td className="wr-td-progress">
                      <div className="wr-progress-chips">
                        <span className="wr-sub-chip wr-chip-ontrip" title="Loads on trip">
                          <strong>{onTrip}</strong> trip
                        </span>
                        <span className="wr-sub-chip wr-chip-scheduled" title="Loads scheduled">
                          <strong>{scheduled}</strong> sched
                        </span>
                        <span className="wr-sub-chip wr-chip-ready" title="Loads ready">
                          <strong>{ready}</strong> ready
                        </span>
                      </div>
                    </td>

                    {/* Pending & Canceled */}
                    <td className="wr-td-pending">
                      <div className="wr-pending-cell">
                        <span className="wr-sub-chip wr-chip-pending">
                          {pending} pending
                        </span>
                        {canceled > 0 && (
                          <span className="wr-sub-chip wr-chip-canceled">
                            {canceled} cxl
                          </span>
                        )}
                      </div>
                    </td>

                    {/* New Partners */}
                    <td className="wr-td-partners text-right">
                      <span className="wr-partner-badge">
                        {newPartners > 0 ? `+${newPartners}` : '—'}
                      </span>
                    </td>

                    {/* Row Actions */}
                    <td
                      className="wr-td-actions text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="wr-row-actions">
                        <button
                          type="button"
                          className="wr-row-btn wr-row-btn-view"
                          onClick={() => onSelectReport(r)}
                          title={t('weeklyReports.viewEmail', 'View Email Report')}
                          aria-label={t('weeklyReports.viewEmail', 'View Email Report')}
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          type="button"
                          className="wr-row-btn wr-row-btn-csv"
                          disabled={isExportingThis}
                          onClick={(e) => onExportCsv(r, e)}
                          title={t('weeklyReports.exportCsv', 'Export CSV')}
                          aria-label={t('weeklyReports.exportCsv', 'Export CSV')}
                        >
                          <FileSpreadsheet size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <BillingPagination
        page={page}
        lastPage={lastPage}
        total={total}
        perPage={perPage}
        loading={loading}
        label={total === 1 ? 'weekly report' : 'weekly reports'}
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
        perPageOptions={[10, 25, 50]}
      />
    </div>
  );
};
