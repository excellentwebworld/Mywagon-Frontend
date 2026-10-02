import React from 'react';
import type { StatementPayload } from '../../../api/types/billing';
import { formatCurrency, formatDate, invoiceStatusLabel, invoiceTypeLabel, walletReasonLabel } from '../mockData';
import { useTranslation } from 'react-i18next';

interface StatementDocumentProps {
  statement: StatementPayload;
}

export const StatementDocument: React.FC<StatementDocumentProps> = ({ statement }) => {
  const { t, i18n } = useTranslation();
  const currency = statement.currency || 'EUR';
  const issuer = statement.issuer;
  const billTo = statement.bill_to;
  const invoices = statement.invoices ?? [];
  const movements = statement.wallet_movements ?? [];
  const billed = invoices.reduce((sum, row) => sum + (Number(row.tot) || 0), 0);
  const outstanding = invoices.reduce((sum, row) => sum + (Number(row.rem) || 0), 0);
  const paid = billed - outstanding;
  const billLines = billTo?.address_lines?.length
    ? billTo.address_lines
    : billTo?.address
      ? [billTo.address]
      : [];
  const moneyLocale = (i18n.language || 'en').toLowerCase().startsWith('el') ? 'el' : 'en';
  const money = (val: number) => formatCurrency(val, currency, moneyLocale);

  return (
    <article className="mv-doc" data-document="statement">
      <div className="mv-doc-top">
        <div>
          <div className="mv-doc-brand-name">{issuer?.name || 'MYVAGON'}</div>
          {issuer?.address ? <div className="mv-doc-muted">{issuer.address}</div> : null}
          {issuer?.email ? <div className="mv-doc-muted">{issuer.email}</div> : null}
        </div>
        <div className="mv-doc-title-block">
          <h1 className="mv-doc-title">{t('billingPage.statement.title', 'Statement')}</h1>
          <div className="mv-doc-number">{statement.period}</div>
          {statement.from || statement.to ? (
            <div className="mv-doc-muted">
              {formatDate(statement.from)} — {formatDate(statement.to)}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mv-doc-parties">
        <section>
          <div className="mv-doc-label">{t('billingPage.statement.from', 'From')}</div>
          <div className="mv-doc-company">{issuer?.name || 'MYVAGON'}</div>
          {issuer?.address ? <div className="mv-doc-muted">{issuer.address}</div> : null}
          {issuer?.email ? <div className="mv-doc-muted">{issuer.email}</div> : null}
        </section>
        <section>
          <div className="mv-doc-label">{t('billingPage.statement.account', 'Account')}</div>
          <div className="mv-doc-company">{billTo?.company_name || '—'}</div>
          {billTo?.email ? <div className="mv-doc-muted">{billTo.email}</div> : null}
          {billLines.map((line) => (
            <div key={line} className="mv-doc-muted">
              {line}
            </div>
          ))}
          {billTo?.vat_id ? (
            <div className="mv-doc-muted">
              {t('billingPage.statement.vat', 'VAT')} {billTo.vat_id}
            </div>
          ) : null}
        </section>
      </div>

      <div className="mv-doc-kpi">
        <div className="mv-doc-kpi-card">
          <div className="mv-doc-label">{t('billingPage.statement.invoicesBilled', 'Invoices billed')}</div>
          <div className="mv-doc-kpi-value">{money(billed)}</div>
          <div className="mv-doc-muted">
            {t('billingPage.statement.invoiceCount', {
              count: invoices.length,
              defaultValue: '{{count}} invoices',
            })}
          </div>
        </div>
        <div className="mv-doc-kpi-card">
          <div className="mv-doc-label">{t('billingPage.statement.paid', 'Paid')}</div>
          <div className="mv-doc-kpi-value">{money(paid)}</div>
        </div>
        <div className="mv-doc-kpi-card">
          <div className="mv-doc-label">{t('billingPage.statement.outstanding', 'Outstanding')}</div>
          <div className="mv-doc-kpi-value">{money(outstanding)}</div>
        </div>
        <div className="mv-doc-kpi-card">
          <div className="mv-doc-label">{t('billingPage.statement.walletBalance', 'Wallet balance')}</div>
          <div className="mv-doc-kpi-value">{money(statement.wallet_balance)}</div>
        </div>
      </div>

      <section className="mv-doc-section">
        <div className="mv-doc-label">{t('billingPage.statement.invoices', 'Invoices')}</div>
        <table>
          <thead>
            <tr>
              <th>{t('billingPage.statement.colInvoice', 'Invoice')}</th>
              <th>{t('billingPage.statement.colType', 'Type')}</th>
              <th>{t('billingPage.statement.colStatus', 'Status')}</th>
              <th>{t('billingPage.statement.colIssueDate', 'Issue date')}</th>
              <th>{t('billingPage.statement.colDueDate', 'Due date')}</th>
              <th className="num">{t('billingPage.statement.colTotal', 'Total')}</th>
              <th className="num">{t('billingPage.statement.colRemaining', 'Remaining')}</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td className="mv-doc-empty" colSpan={7}>
                  {t('billingPage.statement.noInvoices', 'No invoices in this period')}
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.raw_id ?? invoice.id}>
                  <td>{invoice.id}</td>
                  <td>{invoiceTypeLabel(invoice, t)}</td>
                  <td>{invoiceStatusLabel(invoice, t)}</td>
                  <td>{formatDate(invoice.iDate)}</td>
                  <td>{formatDate(invoice.dDate)}</td>
                  <td className="num">{money(invoice.tot)}</td>
                  <td className="num">{money(invoice.rem)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="mv-doc-section">
        <div className="mv-doc-label">{t('billingPage.statement.walletActivity', 'Wallet activity')}</div>
        <table>
          <thead>
            <tr>
              <th>{t('billingPage.statement.colDate', 'Date')}</th>
              <th>{t('billingPage.statement.colDescription', 'Description')}</th>
              <th className="num">{t('billingPage.statement.colAmount', 'Amount')}</th>
              <th>{t('billingPage.statement.colType', 'Type')}</th>
              <th>{t('billingPage.statement.colAppliedTo', 'Applied to')}</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr>
                <td className="mv-doc-empty" colSpan={5}>
                  {t('billingPage.statement.noWalletMovements', 'No wallet movements in this period')}
                </td>
              </tr>
            ) : (
              movements.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.date)}</td>
                  <td>{walletReasonLabel(row.reason, t)}</td>
                  <td className="num">{money(row.amt)}</td>
                  <td>{row.type || '—'}</td>
                  <td>{row.applied || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <div className="mv-doc-footer">
        {issuer?.name || 'MYVAGON'}
        {issuer?.email ? ` · ${issuer.email}` : ''}
      </div>
    </article>
  );
};
