export const BILLING_DOCUMENT_CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #111827;
    background: #fff;
  }
  .mv-doc {
    width: 794px;
    max-width: 100%;
    margin: 0 auto;
    padding: 48px 52px 40px;
    color: #111827;
    background: #fff;
  }
  .mv-doc-top {
    display: flex;
    justify-content: space-between;
    gap: 32px;
    align-items: flex-start;
    padding-bottom: 20px;
    border-bottom: 2px solid #111827;
  }
  .mv-doc-brand-name {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: #111827;
  }
  .mv-doc-muted {
    color: #4b5563;
    font-size: 12px;
    line-height: 1.55;
  }
  .mv-doc-title-block { text-align: right; }
  .mv-doc-title {
    font-size: 34px;
    font-weight: 800;
    letter-spacing: 1px;
    line-height: 1;
    margin: 0;
    text-transform: uppercase;
    color: #111827;
  }
  .mv-doc-number {
    margin-top: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #111827;
  }
  .mv-doc-parties {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin-top: 28px;
  }
  .mv-doc-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 8px;
  }
  .mv-doc-company {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .mv-doc-meta-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    margin-top: 24px;
    border: 1px solid #e5e7eb;
  }
  .mv-doc-meta-cell {
    padding: 10px 12px;
    border-right: 1px solid #e5e7eb;
  }
  .mv-doc-meta-cell:last-child { border-right: 0; }
  .mv-doc-meta-value {
    font-size: 13px;
    font-weight: 700;
    margin-top: 2px;
  }
  .mv-doc-badge {
    display: inline-block;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .mv-doc-badge-paid { color: #047857; }
  .mv-doc-badge-unpaid { color: #c2410c; }
  .mv-doc-badge-overdue { color: #b91c1c; }
  .mv-doc-section { margin-top: 28px; }
  .mv-doc table {
    width: 100%;
    border-collapse: collapse;
  }
  .mv-doc th {
    border-bottom: 2px solid #111827;
    color: #111827;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 8px 8px 10px;
    text-align: left;
    background: transparent;
  }
  .mv-doc th.num, .mv-doc td.num {
    text-align: right;
    white-space: nowrap;
  }
  .mv-doc td {
    padding: 11px 8px;
    border-bottom: 1px solid #e5e7eb;
    font-size: 12px;
    vertical-align: top;
  }
  .mv-doc-empty {
    text-align: center;
    color: #6b7280;
    padding: 20px 12px !important;
  }
  .mv-doc-totals {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }
  .mv-doc-totals-box { width: 280px; }
  .mv-doc-total-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 8px 0;
    font-size: 13px;
    border-bottom: 1px solid #e5e7eb;
  }
  .mv-doc-total-grand {
    border-bottom: 0;
    border-top: 2px solid #111827;
    margin-top: 4px;
    padding-top: 10px;
    font-size: 15px;
    font-weight: 800;
  }
  .mv-doc-kpi {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    margin-top: 24px;
    border: 1px solid #e5e7eb;
  }
  .mv-doc-kpi-card {
    padding: 12px 14px;
    border-right: 1px solid #e5e7eb;
    background: #fff;
  }
  .mv-doc-kpi-card:last-child { border-right: 0; }
  .mv-doc-kpi-value {
    font-size: 16px;
    font-weight: 800;
    margin-top: 4px;
  }
  .mv-doc-pay {
    margin-top: 28px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
  }
  .mv-doc-footer {
    margin-top: 36px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    text-align: center;
    color: #6b7280;
    font-size: 11px;
  }
  @media print {
    body { background: #fff; }
    .mv-doc { width: auto; padding: 12mm; }
  }
`;
