import React from 'react';
import {
  Calendar,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Inbox,
  Eye,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { useTranslation } from '../../../../hooks/useTranslation';
import type { WeeklyReportItem } from '../../../../api/types/weeklyReports';
import { BillingPagination } from '../../../Billing/components/BillingPagination';
import {
  formatWeeklyDeliveryDate,
  formatWeeklyPeriodLabel,
} from '../weeklyReportsDates';

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
        <span>0</span>
      </span>
    );
  };

  return (
    <div className="wr-tbl-card">
      <div className="wr-tbl-responsive">
        <table className="wr-table">
          <thead>
            <tr>
              <th className="wr-th-period">{t('weeklyReports.period', 'Week Period')}</th>
              <th className="wr-th-delivery">{t('weeklyReports.deliveryDate', 'Delivered On')}</th>
              <th className="wr-th-fulfilled">{t('weeklyReports.loadsFulfilled', 'Fulfilled')}</th>
              <th className="wr-th-created">{t('weeklyReports.loadsCreated', 'Created')}</th>
              <th className="wr-th-active">{t('weeklyReports.onTrip', 'In Progress')}</th>
              <th className="wr-th-pending">{t('weeklyReports.pending', 'Loads Currently Pending')}</th>
              <th className="wr-th-partners">{t('weeklyReports.newPartners', 'Partners')}</th>
              <th className="wr-th-actions">
                {t('analytics.weeklyReports.actions', 'Actions')}
              </th>
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
                      <div className="wr-period-info">
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
                  <td className="wr-td-metric">
                    <div className="wr-metric-cell">
                      <div className="wr-sk-line wr-sk-shimmer" style={{ width: '36px', height: '16px', marginBottom: '4px' }} />
                      <div className="wr-sk-line wr-sk-shimmer" style={{ width: '32px', height: '14px', borderRadius: '4px' }} />
                    </div>
                  </td>
                  {/* Created */}
                  <td className="wr-td-metric">
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
                  {/* Pending */}
                  <td className="wr-td-pending">
                    <div className="wr-pending-cell">
                      <div className="wr-sk-line wr-sk-shimmer" style={{ width: '76px', height: '20px', borderRadius: '6px' }} />
                    </div>
                  </td>
                  {/* Partners */}
                  <td className="wr-td-partners">
                    <div className="wr-sk-line wr-sk-shimmer" style={{ width: '28px', height: '16px', margin: '0 auto' }} />
                  </td>
                  {/* Actions */}
                  <td className="wr-td-actions">
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
                const newPartners = r.metrics.new_partners?.value ?? 0;

                const isExportingThis = exportingReportId === r.id;

                return (
                  <tr
                    key={r.id}
                    className="wr-table-row"
                    onClick={() => onSelectReport(r)}
                    title={t(
                      'analytics.weeklyReports.clickToView',
                      'Click to view weekly email report with stats'
                    )}
                  >
                    {/* Period Column */}
                    <td className="wr-td-period">
                      <div className="wr-period-cell">
                        <div className="wr-period-icon-wrap">
                          <Calendar size={16} />
                        </div>
                        <div className="wr-period-info">
                          <strong className="wr-period-title">
                            {formatWeeklyPeriodLabel(r.week_start, r.week_end)}
                          </strong>
                        </div>
                      </div>
                    </td>

                    {/* Delivery Date / Sent Status */}
                    <td className="wr-td-delivery">
                      <div className="wr-delivery-cell">
                        <span className="wr-delivery-date">
                          {formatWeeklyDeliveryDate(r.sent_at, r.delivery_date)}
                        </span>
                        <span className="wr-sent-pill">
                          <CheckCircle2 size={11} />
                          <span>
                            {r.is_sent
                              ? t('analytics.weeklyReports.sent', 'Sent')
                              : t('analytics.weeklyReports.available', 'Available')}
                          </span>
                        </span>
                      </div>
                    </td>

                    {/* Fulfilled Metric */}
                    <td className="wr-td-metric">
                      <div className="wr-metric-cell">
                        <span className="wr-metric-main-val font-semibold">
                          {fulfilled?.value ?? 0}
                        </span>
                        {renderDelta(fulfilled?.delta ?? 0)}
                      </div>
                    </td>

                    {/* Created Metric */}
                    <td className="wr-td-metric">
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
                        <span
                          className="wr-sub-chip wr-chip-ontrip"
                          title={t('analytics.weeklyReports.loadsOnTrip', 'Loads on trip')}
                        >
                          <strong>{onTrip}</strong>{' '}
                          {t('analytics.weeklyReports.chipTrip', 'trip')}
                        </span>
                        <span
                          className="wr-sub-chip wr-chip-scheduled"
                          title={t('analytics.weeklyReports.loadsScheduled', 'Loads scheduled')}
                        >
                          <strong>{scheduled}</strong>{' '}
                          {t('analytics.weeklyReports.chipSched', 'sched')}
                        </span>
                        <span
                          className="wr-sub-chip wr-chip-ready"
                          title={t('analytics.weeklyReports.loadsReady', 'Loads ready')}
                        >
                          <strong>{ready}</strong>{' '}
                          {t('analytics.weeklyReports.chipReady', 'ready')}
                        </span>
                      </div>
                    </td>

                    {/* Pending */}
                    <td className="wr-td-pending">
                      <div className="wr-pending-cell">
                        <span className="wr-sub-chip wr-chip-pending">
                          {pending} {t('analytics.weeklyReports.chipPending', 'pending')}
                        </span>
                      </div>
                    </td>

                    {/* New Partners */}
                    <td className="wr-td-partners">
                      <span className="wr-partner-badge">
                        {newPartners > 0 ? `+${newPartners}` : '0'}
                      </span>
                    </td>

                    {/* Row Actions */}
                    <td
                      className="wr-td-actions"
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
                          {isExportingThis ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <FileSpreadsheet size={15} />
                          )}
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
        label={
          total === 1
            ? t('analytics.weeklyReports.weeklyReportSingular', 'weekly report')
            : t('analytics.weeklyReports.weeklyReportPlural', 'weekly reports')
        }
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
        perPageOptions={[10, 25, 50]}
      />
    </div>
  );
};
