import React from 'react';
import type { BillingIssuer, BillingParty, Invoice } from '../../../api/types/billing';
import { formatCurrency, formatDate } from '../mockData';

function statusClass(status: string): string {
  const value = status.toLowerCase();
  if (value === 'paid') return 'mv-doc-badge mv-doc-badge-paid';
  if (value === 'overdue') return 'mv-doc-badge mv-doc-badge-overdue';
  return 'mv-doc-badge mv-doc-badge-unpaid';
}

interface InvoiceDocumentProps {
  invoice: Invoice;
  issuer?: BillingIssuer | null;
  billTo?: BillingParty | null;
  currency?: string;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  invoice,
  issuer,
  billTo,
  currency = invoice.cur || 'EUR',
}) => {
  const lines = invoice.line_items ?? [];
  const issuerName = issuer?.name || 'MYVAGON';
  const paid = invoice.status === 'Paid';
  const billLines = billTo?.address_lines?.length
    ? billTo.address_lines
    : billTo?.address
      ? [billTo.address]
      : [];

  return (
    <article className="mv-doc" data-document="invoice">
      <div className="mv-doc-top">
        <div>
          <div className="mv-doc-brand-name">{issuerName}</div>
          {issuer?.address ? <div className="mv-doc-muted">{issuer.address}</div> : null}
          {issuer?.email ? <div className="mv-doc-muted">{issuer.email}</div> : null}
          {issuer?.vat_id ? <div className="mv-doc-muted">VAT {issuer.vat_id}</div> : null}
        </div>
        <div className="mv-doc-title-block">
          <h1 className="mv-doc-title">Invoice</h1>
          <div className="mv-doc-number">{invoice.id}</div>
        </div>
      </div>

      <div className="mv-doc-parties">
        <section>
          <div className="mv-doc-label">From</div>
          <div className="mv-doc-company">{issuerName}</div>
          {issuer?.account_holder ? <div className="mv-doc-muted">{issuer.account_holder}</div> : null}
          {issuer?.address ? <div className="mv-doc-muted">{issuer.address}</div> : null}
          {issuer?.email ? <div className="mv-doc-muted">{issuer.email}</div> : null}
        </section>
        <section>
          <div className="mv-doc-label">Bill to</div>
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

      <div className="mv-doc-meta-row">
        <div className="mv-doc-meta-cell">
          <div className="mv-doc-label">Issue date</div>
          <div className="mv-doc-meta-value">{formatDate(invoice.iDate)}</div>
        </div>
        <div className="mv-doc-meta-cell">
          <div className="mv-doc-label">Due date</div>
          <div className="mv-doc-meta-value">{formatDate(invoice.dDate)}</div>
        </div>
        <div className="mv-doc-meta-cell">
          <div className="mv-doc-label">Status</div>
          <div className="mv-doc-meta-value">
            <span className={statusClass(invoice.status)}>{invoice.status}</span>
          </div>
        </div>
        <div className="mv-doc-meta-cell">
          <div className="mv-doc-label">{paid ? 'Paid date' : 'Type'}</div>
          <div className="mv-doc-meta-value">
            {paid ? formatDate(invoice.pDate) : invoice.type}
          </div>
        </div>
      </div>

      <section className="mv-doc-section">
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th className="num">Qty</th>
              <th className="num">Unit price</th>
              <th className="num">VAT</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td className="mv-doc-empty" colSpan={5}>
                  No line items
                </td>
              </tr>
            ) : (
              lines.map((line, index) => (
                <tr key={line.id || `${line.desc}-${index}`}>
                  <td>
                    {line.desc || line.type}
                    {line.sid ? <div className="mv-doc-muted">{line.sid}</div> : null}
                  </td>
                  <td className="num">{line.qty || 1}</td>
                  <td className="num">{formatCurrency(line.unit ?? 0, currency)}</td>
                  <td className="num">{formatCurrency(line.vat ?? 0, currency)}</td>
                  <td className="num">{formatCurrency(line.amt ?? 0, currency)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <div className="mv-doc-totals">
        <div className="mv-doc-totals-box">
          <div className="mv-doc-total-row">
            <span className="mv-doc-muted">Subtotal</span>
            <span>{formatCurrency(invoice.subt, currency)}</span>
          </div>
          <div className="mv-doc-total-row">
            <span className="mv-doc-muted">VAT</span>
            <span>{formatCurrency(invoice.tax, currency)}</span>
          </div>
          {(invoice.cred ?? 0) > 0 ? (
            <div className="mv-doc-total-row">
              <span className="mv-doc-muted">Wallet credit</span>
              <span>−{formatCurrency(invoice.cred, currency)}</span>
            </div>
          ) : null}
          <div className="mv-doc-total-row mv-doc-total-grand">
            <span>Total</span>
            <span>{formatCurrency(invoice.tot, currency)}</span>
          </div>
        </div>
      </div>

      {!paid && issuer?.iban ? (
        <section className="mv-doc-pay">
          <div className="mv-doc-label">Payment details</div>
          {issuer.account_holder ? (
            <div className="mv-doc-muted">
              Account holder: <strong style={{ color: '#111827' }}>{issuer.account_holder}</strong>
            </div>
          ) : null}
          <div className="mv-doc-muted">
            IBAN: <strong style={{ color: '#111827' }}>{issuer.iban}</strong>
          </div>
          {issuer.bic ? (
            <div className="mv-doc-muted">
              BIC: <strong style={{ color: '#111827' }}>{issuer.bic}</strong>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mv-doc-footer">
        {issuerName}
        {issuer?.email ? ` · ${issuer.email}` : ''}
      </div>
    </article>
  );
};
