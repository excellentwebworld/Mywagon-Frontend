import React from 'react';
import {
  X,
  Download,
  Printer,
  Mail,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { WeeklyReportItem } from '../../../../api/types/weeklyReports';

interface WeeklyReportEmailModalProps {
  report: WeeklyReportItem | null;
  onClose: () => void;
  onExportCsv: (report: WeeklyReportItem) => void;
}

export const WeeklyReportEmailModal: React.FC<WeeklyReportEmailModalProps> = ({
  report,
  onClose,
  onExportCsv,
}) => {
  const { t } = useTranslation();

  if (!report) return null;

  const metricDefinitions = [
    {
      key: 'fulfilled' as const,
      label: t('weeklyReports.loadsFulfilled', 'Loads Fulfilled'),
      description: 'Shipments successfully completed during this week',
    },
    {
      key: 'partially_fulfilled' as const,
      label: t('weeklyReports.partiallyFulfilled', 'Loads Partially Fulfilled'),
      description: 'Shipments with partial deliveries or adjustments',
    },
    {
      key: 'created' as const,
      label: t('weeklyReports.loadsCreated', 'Loads Created'),
      description: 'New shipment orders created in the platform',
    },
    {
      key: 'not_fulfilled' as const,
      label: t('weeklyReports.notFulfilled', 'Loads Not Fulfilled'),
      description: 'Shipments that could not be completed',
    },
    {
      key: 'pending' as const,
      label: t('weeklyReports.pending', 'Loads Currently Pending'),
      description: 'Active shipments awaiting assignment or confirmation',
    },
    {
      key: 'canceled' as const,
      label: t('weeklyReports.canceled', 'Loads Canceled'),
      description: 'Shipments canceled during this period',
    },
    {
      key: 'new_partners' as const,
      label: t('weeklyReports.newPartners', 'New Partners'),
      description: 'Carrier and driver partnerships accepted',
    },
    {
      key: 'on_trip' as const,
      label: t('weeklyReports.onTrip', 'Loads On Trip'),
      description: 'Vehicles currently in transit with your freight',
    },
    {
      key: 'scheduled' as const,
      label: t('weeklyReports.scheduled', 'Loads Scheduled'),
      description: 'Shipments scheduled for upcoming pickup dates',
    },
    {
      key: 'ready' as const,
      label: t('weeklyReports.ready', 'Loads Ready'),
      description: 'Freight prepared and awaiting carrier pickup',
    },
  ];

  const handlePrint = () => {
    window.print();
  };

  const formatSentDate = (isoStr?: string, fallback = '') => {
    if (!isoStr) return fallback;
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return fallback;
      return d.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return fallback;
    }
  };

  return (
    <div
      className="wr-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wr-email-title"
    >
      <div
        className="wr-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="wr-modal-toolbar">
          <div className="wr-toolbar-left">
            <div className="wr-mail-badge">
              <Mail size={15} />
              <span>{t('weeklyReports.emailPreview', 'Weekly Report Email')}</span>
            </div>
            <span className="wr-period-chip">{report.period_label}</span>
          </div>

          <div className="wr-toolbar-actions">
            <button
              type="button"
              className="wr-btn wr-btn-secondary"
              onClick={() => onExportCsv(report)}
              title={t('weeklyReports.exportCsv', 'Export CSV')}
            >
              <Download size={14} />
              <span>{t('weeklyReports.exportCsv', 'Export CSV')}</span>
            </button>
            <button
              type="button"
              className="wr-btn wr-btn-secondary no-print"
              onClick={handlePrint}
              title="Print email"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
            <button
              type="button"
              className="wr-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Email Client Envelope Header */}
        <div className="wr-envelope-header">
          <div className="wr-envelope-row">
            <span className="wr-envelope-lbl">Subject:</span>
            <span className="wr-envelope-val wr-subject-text">{report.email_subject}</span>
          </div>
          <div className="wr-envelope-grid">
            <div className="wr-envelope-row">
              <span className="wr-envelope-lbl">From:</span>
              <span className="wr-envelope-val">MYVAGON Logistics &lt;reports@myvagon.com&gt;</span>
            </div>
            <div className="wr-envelope-row">
              <span className="wr-envelope-lbl">To:</span>
              <span className="wr-envelope-val">
                {report.recipient_name} &lt;{report.recipient_email || 'shipper@myvagon.com'}&gt;
              </span>
            </div>
            <div className="wr-envelope-row">
              <span className="wr-envelope-lbl">Date:</span>
              <span className="wr-envelope-val">
                {formatSentDate(report.sent_at, report.delivery_date)}
              </span>
            </div>
            <div className="wr-envelope-row">
              <span className="wr-envelope-lbl">Status:</span>
              <span className="wr-envelope-val wr-sent-status">
                <CheckCircle2 size={13} className="text-[var(--mv-success-ink)]" />
                <span>{report.is_sent ? 'Delivered via Email' : 'Generated'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Email Document Body Frame (Matches Weekly Email Blade Template) */}
        <div className="wr-email-body-frame">
          <div className="wr-email-card">
            {/* Header Brand */}
            <div className="wr-card-brand">
              <div className="wr-logo-wrap">
                <span className="wr-logo-txt">
                  <span className="wr-logo-my">MY</span>
                  <span className="wr-logo-vagon">VAGON</span>
                </span>
              </div>
              <div className="wr-email-badge">Weekly Digest</div>
            </div>

            {/* Email Heading & Salutation */}
            <div className="wr-card-heading">
              <h2 id="wr-email-title" className="wr-card-title">
                {t('weeklyReports.emailTitle', 'Your Weekly Logistics Report')}
              </h2>
              <p className="wr-card-salutation">
                {t('weeklyReports.hello', 'Hello {{name}},', { name: report.recipient_name || 'Shipper' })}
              </p>
              <p className="wr-card-intro">
                {t(
                  'weeklyReports.summaryIntro',
                  'Here is your logistics performance summary for {{period}}.',
                  { period: report.period_label }
                )}
              </p>
            </div>

            {/* Metrics List Table */}
            <div className="wr-metrics-table-wrap">
              <table className="wr-metrics-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th className="text-right">Current Week</th>
                    <th className="text-right">vs Last Week</th>
                  </tr>
                </thead>
                <tbody>
                  {metricDefinitions.map((def) => {
                    const metric = report.metrics[def.key] ?? {
                      value: 0,
                      previous: 0,
                      delta: 0,
                      delta_percent: 0,
                    };
                    const delta = metric.delta;
                    const isPositive = delta > 0;
                    const isNegative = delta < 0;

                    return (
                      <tr key={def.key} className="wr-metric-row">
                        <td className="wr-metric-name-cell">
                          <strong className="wr-metric-label">{def.label}</strong>
                          <span className="wr-metric-desc">{def.description}</span>
                        </td>
                        <td className="wr-metric-val-cell text-right">
                          <span className="wr-val-pill">{metric.value}</span>
                        </td>
                        <td className="wr-metric-delta-cell text-right">
                          <span
                            className={`wr-delta-tag ${
                              isPositive
                                ? 'wr-delta-up'
                                : isNegative
                                ? 'wr-delta-down'
                                : 'wr-delta-zero'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowUpRight size={13} />
                            ) : isNegative ? (
                              <ArrowDownRight size={13} />
                            ) : (
                              <Minus size={13} />
                            )}
                            <span>
                              {isPositive ? `+${delta}` : delta}{' '}
                              {t('weeklyReports.vsLastWeek', 'vs last week')}
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Email Sign-off */}
            <div className="wr-card-footer">
              <p>
                {t('weeklyReports.thankYou', 'Thank you for using MYVAGON!')}
                <br />
                <strong>— The MYVAGON Team</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
