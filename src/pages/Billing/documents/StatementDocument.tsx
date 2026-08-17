import React from 'react';
import type { StatementPayload } from '../../../api/types/billing';
import { formatCurrency, formatDate } from '../mockData';

interface StatementDocumentProps {
  statement: StatementPayload;
}

export const StatementDocument: React.FC<StatementDocumentProps> = ({ statement }) => {
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

  return (
    <article className="mv-doc" data-document="statement">
      <div className="mv-doc-top">
        <div>
          <div className="mv-doc-brand-name">{issuer?.name || 'MYVAGON'}</div>
          {issuer?.address ? <div className="mv-doc-muted">{issuer.address}</div> : null}
          {issuer?.email ? <div className="mv-doc-muted">{issuer.email}</div> : null}
        </div>
        <div className="mv-doc-title-block">
          <h1 className="mv-doc-title">Statement</h1>
          <div className="mv-doc-number">{statement.period}</div>
          {statement.from || statement.to ? (
            <div className="mv-doc-muted">
              {statement.from || ''} — {statement.to || ''}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mv-doc-parties">
        <section>
          <div className="mv-doc-label">From</div>
          <div className="mv-doc-company">{issuer?.name || 'MYVAGON'}</div>
          {issuer?.address ? <div className="mv-doc-muted">{issuer.address}</div> : null}
          {issuer?.email ? <div className="mv-doc-muted">{issuer.email}</div> : null}
        </section>
        <section>
          <div className="mv-doc-label">Account</div>
          <div className="mv-doc-company">{billTo?.company_name || '—'}</div>
          {billTo?.email ? <div className="mv-doc-muted">{billTo.email}</div> : null}
          {billLines.map((line) => (
            <div key={line} className="mv-doc-muted">
              {line}
            </div>
          ))}
          {billTo?.vat_id ? <div className="mv-doc-muted">VAT {billTo.vat_id}</div> : null}
        </section>
      </div>

      <div className="mv-doc-kpi">
        <div className="mv-doc-kpi-card">
          <div className="mv-doc-label">Invoices billed</div>
          <div className="mv-doc-kpi-value">{formatCurrency(billed, currency)}</div>
          <div className="mv-doc-muted">{invoices.length} invoices</div>
        </div>
        <div className="mv-doc-kpi-card">
          <div className="mv-doc-label">Paid</div>
          <div className="mv-doc-kpi-value">{formatCurrency(paid, currency)}</div>
        </div>
        <div className="mv-doc-kpi-card">
          <div className="mv-doc-label">Outstanding</div>
          <div className="mv-doc-kpi-value">{formatCurrency(outstanding, currency)}</div>
        </div>
        <div className="mv-doc-kpi-card">
          <div className="mv-doc-label">Wallet balance</div>
          <div className="mv-doc-kpi-value">{formatCurrency(statement.wallet_balance, currency)}</div>
        </div>
      </div>

      <section className="mv-doc-section">
        <div className="mv-doc-label">Invoices</div>
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Type</th>
              <th>Status</th>
              <th>Issue date</th>
              <th>Due date</th>
              <th className="num">Total</th>
              <th className="num">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td className="mv-doc-empty" colSpan={7}>
                  No invoices in this period
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.raw_id ?? invoice.id}>
                  <td>{invoice.id}</td>
                  <td>{invoice.type}</td>
                  <td>{invoice.status}</td>
                  <td>{formatDate(invoice.iDate)}</td>
                  <td>{formatDate(invoice.dDate)}</td>
                  <td className="num">{formatCurrency(invoice.tot, currency)}</td>
                  <td className="num">{formatCurrency(invoice.rem, currency)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="mv-doc-section">
        <div className="mv-doc-label">Wallet activity</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th className="num">Amount</th>
              <th>Type</th>
              <th>Applied to</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr>
                <td className="mv-doc-empty" colSpan={5}>
                  No wallet movements in this period
                </td>
              </tr>
            ) : (
              movements.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.date)}</td>
                  <td>{row.reason}</td>
                  <td className="num">{formatCurrency(row.amt, currency)}</td>
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
