import type { Invoice, LineItem } from './types';
import { formatCurrency, formatDate } from './mockData';
import { assetUrl } from '../../utils/assetUrl';
import billingPdfStyles from './billingPdfStyles.css?raw';

export type BillingPdfLabels = {
  invoice: string;
  issued: string;
  due: string;
  paid: string;
  billTo: string;
  from: string;
  lineItems: string;
  liDesc: string;
  liQty: string;
  liRate: string;
  liAmount: string;
  subtotal: string;
  taxVat: string;
  total: string;
  monthlyStatement: string;
  invoicesInPeriod: string;
  thInvoice: string;
  thType: string;
  thStatus: string;
  thTotal: string;
  openingBalance: string;
  closingBalance: string;
};

export function getBillingLogoUrl(): string {
  const path = assetUrl('logo.png');
  if (typeof window !== 'undefined' && path.startsWith('/')) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export const BILLING_PDF_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 12px;
    line-height: 1.55;
    color: #1e293b;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  ${billingPdfStyles}
`;

function taxPercent(subtotal: number, tax: number): string {
  if (!subtotal) return '0';
  return ((tax / subtotal) * 100).toFixed(0);
}

export function buildInvoicePdfHtml(
  invoice: Invoice,
  lineItems: LineItem[],
  labels: BillingPdfLabels,
  locale: string,
  logoUrl: string
): string {
  const rows =
    lineItems.length > 0
      ? lineItems
          .map(
            (li) => `
        <tr>
          <td>
            <div>${escapeHtml(li.desc)}</div>
            ${li.sid ? `<div class="bpdf-load-id">${escapeHtml(li.sid)}</div>` : ''}
          </td>
          <td class="num">${li.qty}</td>
          <td class="num">${escapeHtml(String(li.rate))}</td>
          <td class="num amt bpdf-mono">${formatCurrency(li.amt, invoice.cur)}</td>
        </tr>`
          )
          .join('')
      : `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:20px;">—</td></tr>`;

  return `
    <div class="bpdf-doc">
      <div class="bpdf-header">
        <div class="bpdf-brand">
          <img src="${logoUrl}" alt="MYVAGON" />
          <div class="bpdf-brand-meta">
            MYVAGON B.V.<br />
            Keizersgracht 520, Amsterdam, NL<br />
            VAT: NL862145892B01 · KvK: 78945612
          </div>
        </div>
        <div class="bpdf-title-block">
          <div class="bpdf-title">${escapeHtml(labels.invoice)}</div>
          <div class="bpdf-invoice-id bpdf-mono">${escapeHtml(invoice.id)}</div>
          <div class="bpdf-meta">
            ${escapeHtml(labels.issued)}: ${formatDate(invoice.iDate, locale)}<br />
            ${escapeHtml(labels.due)}: ${formatDate(invoice.dDate, locale)}
            ${
              invoice.pDate
                ? `<br />${escapeHtml(labels.paid)}: ${formatDate(invoice.pDate, locale)}`
                : ''
            }
          </div>
        </div>
      </div>

      <div class="bpdf-parties">
        <div class="bpdf-party">
          <div class="bpdf-party-label">${escapeHtml(labels.billTo)}</div>
          <div class="bpdf-party-name">ΗΠΕΙΡΩΤΙΚΗ ΒΙΟΜΗΧΑΝΙΑ ΕΜΦΙΑΛΩΣΕΩΝ Α.Ε.</div>
          <div class="bpdf-party-detail">
            VI.PE. Ioannina, 45500, Greece<br />
            VAT: EL094123456
          </div>
        </div>
        <div class="bpdf-party right">
          <div class="bpdf-party-label">${escapeHtml(labels.from)}</div>
          <div class="bpdf-party-name">MYVAGON Services</div>
          <div class="bpdf-party-detail">Keizersgracht 520, Amsterdam, NL</div>
        </div>
      </div>

      <div class="bpdf-section-title">${escapeHtml(labels.lineItems)}</div>
      <table class="bpdf-table">
        <colgroup>
          <col style="width:52%" />
          <col style="width:12%" />
          <col style="width:18%" />
          <col style="width:18%" />
        </colgroup>
        <thead>
          <tr>
            <th>${escapeHtml(labels.liDesc)}</th>
            <th class="num">${escapeHtml(labels.liQty)}</th>
            <th class="num">${escapeHtml(labels.liRate)}</th>
            <th class="num">${escapeHtml(labels.liAmount)}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="bpdf-totals-wrap">
        <div class="bpdf-totals">
          <div class="bpdf-total-row">
            <span>${escapeHtml(labels.subtotal)}</span>
            <span class="bpdf-mono">${formatCurrency(invoice.subt, invoice.cur)}</span>
          </div>
          <div class="bpdf-total-row">
            <span>${escapeHtml(labels.taxVat)} (${taxPercent(invoice.subt, invoice.tax)}%)</span>
            <span class="bpdf-mono">${formatCurrency(invoice.tax, invoice.cur)}</span>
          </div>
          <div class="bpdf-total-row grand">
            <span>${escapeHtml(labels.total)}</span>
            <span class="bpdf-mono">${formatCurrency(invoice.tot, invoice.cur)}</span>
          </div>
        </div>
      </div>

      <div class="bpdf-footer">
        MYVAGON B.V. · Amsterdam, Netherlands · IBAN: NL91ABNA0417164300 · BIC: ABNANL2A<br />
        Generated ${new Date().toLocaleString(locale === 'el' ? 'el-GR' : 'en-GB')}
      </div>
    </div>
  `;
}

export function buildStatementPdfHtml(
  statementPeriod: string,
  invoicesList: Invoice[],
  labels: BillingPdfLabels,
  logoUrl: string
): string {
  const outstanding = invoicesList
    .filter((i) => i.status === 'Unpaid' || i.status === 'Overdue')
    .reduce((s, i) => s + i.rem, 0);

  const badgeClass = (status: string) => {
    if (status === 'Paid') return 'paid';
    if (status === 'Overdue') return 'overdue';
    return 'unpaid';
  };

  const rows = invoicesList
    .slice(0, 50)
    .map(
      (inv) => `
      <tr>
        <td class="bpdf-mono">${escapeHtml(inv.id)}</td>
        <td>${escapeHtml(inv.type)}</td>
        <td><span class="bpdf-badge ${badgeClass(inv.status)}">${escapeHtml(inv.status)}</span></td>
        <td class="num amt bpdf-mono">${formatCurrency(inv.tot, inv.cur)}</td>
      </tr>`
    )
    .join('');

  return `
    <div class="bpdf-doc">
      <div class="bpdf-header">
        <div class="bpdf-brand">
          <img src="${logoUrl}" alt="MYVAGON" />
          <div class="bpdf-brand-meta">MYVAGON B.V. · Keizersgracht 520, Amsterdam, NL</div>
        </div>
        <div class="bpdf-title-block">
          <div class="bpdf-title">${escapeHtml(labels.monthlyStatement)}</div>
          <div class="bpdf-invoice-id">${escapeHtml(statementPeriod)}</div>
        </div>
      </div>

      <div class="bpdf-summary-grid">
        <div class="bpdf-summary-card">
          <div class="bpdf-summary-label">${escapeHtml(labels.openingBalance)}</div>
          <div class="bpdf-summary-value bpdf-mono">${formatCurrency(0)}</div>
        </div>
        <div class="bpdf-summary-card danger">
          <div class="bpdf-summary-label">${escapeHtml(labels.closingBalance)}</div>
          <div class="bpdf-summary-value bpdf-mono">${formatCurrency(outstanding)}</div>
        </div>
      </div>

      <div class="bpdf-section-title">${escapeHtml(labels.invoicesInPeriod)}</div>
      <table class="bpdf-table">
        <colgroup>
          <col style="width:28%" />
          <col style="width:28%" />
          <col style="width:22%" />
          <col style="width:22%" />
        </colgroup>
        <thead>
          <tr>
            <th>${escapeHtml(labels.thInvoice)}</th>
            <th>${escapeHtml(labels.thType)}</th>
            <th>${escapeHtml(labels.thStatus)}</th>
            <th class="num">${escapeHtml(labels.thTotal)}</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:20px;">—</td></tr>`}</tbody>
      </table>

      <div class="bpdf-footer">
        MYVAGON B.V. · Financial Statements & Billing Reconciliation · info@myvagon.com
      </div>
    </div>
  `;
}

export function openBillingPdfPrint(title: string, bodyHtml: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
    <style>${BILLING_PDF_STYLES}</style>
  </head>
  <body>
    ${bodyHtml}
    <script>
      window.addEventListener('load', function () {
        setTimeout(function () { window.print(); }, 350);
      });
    </script>
  </body>
</html>`);
  printWindow.document.close();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
