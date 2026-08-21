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
    grid-template-columns: 1fr 1fr 0.9fr 1.3fr;
    gap: 0;
    margin-top: 24px;
    border: 1px solid #e5e7eb;
    min-height: max-content;
  }
  .mv-doc-meta-cell {
    padding: 8px 10px;
    border-right: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    overflow: visible;
  }
  .mv-doc-meta-cell:last-child { border-right: 0; }
  .mv-doc-meta-value {
    font-size: 11px;
    font-weight: 700;
    line-height: 1.35;
    margin-top: 2px;
    word-break: break-word;
    overflow-wrap: break-word;
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
    word-break: break-word;
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
  }
  .mv-doc-total-row:last-child { border-bottom: 0; }
  .mv-doc-total-grand {
    font-weight: 800;
    font-size: 15px;
    border-top: 2px solid #111827;
    padding-top: 10px;
    margin-top: 4px;
  }
  .mv-doc-kpi {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
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
  @media screen and (max-width: 768px) {
    .mv-doc {
      width: 100% !important;
      max-width: 100% !important;
      padding: 20px 14px 24px !important;
    }
    .mv-doc-top {
      flex-direction: column;
      gap: 12px;
    }
    .mv-doc-title-block { text-align: left; }
    .mv-doc-title { font-size: 22px; }
    .mv-doc-parties {
      grid-template-columns: 1fr;
      gap: 16px;
      margin-top: 18px;
    }
    .mv-doc-meta-row {
      grid-template-columns: repeat(2, 1fr) !important;
    }
    .mv-doc-meta-cell {
      border-bottom: 1px solid #e5e7eb;
    }
    .mv-doc-meta-cell:nth-child(2n) { border-right: 0; }
    .mv-doc-kpi {
      grid-template-columns: 1fr 1fr;
    }
    .mv-doc-kpi-card {
      border-bottom: 1px solid #e5e7eb;
    }
    .mv-doc-kpi-card:nth-child(2n) { border-right: 0; }
    .mv-doc-kpi-value { font-size: 14px; }
    .mv-doc-section { margin-top: 18px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .mv-doc table {
      min-width: 500px;
    }
    .mv-doc th, .mv-doc td {
      font-size: 11px;
      padding: 8px 6px;
    }
  }
  @media print {
    body { background: #fff; }
    .mv-doc { width: 100% !important; max-width: none !important; padding: 0 !important; }
    .mv-doc-top { flex-direction: row !important; }
    .mv-doc-title-block { text-align: right !important; }
    .mv-doc-title { font-size: 34px !important; }
    .mv-doc-parties { grid-template-columns: 1fr 1fr !important; gap: 40px !important; }
    .mv-doc-meta-row { grid-template-columns: 1fr 1fr 0.9fr 1.3fr !important; }
    .mv-doc-meta-cell { border-bottom: 0 !important; border-right: 1px solid #e5e7eb !important; }
    .mv-doc-meta-cell:last-child { border-right: 0 !important; }
    .mv-doc-kpi { grid-template-columns: repeat(4, 1fr) !important; }
    .mv-doc-kpi-card { border-bottom: 0 !important; border-right: 1px solid #e5e7eb !important; }
    .mv-doc-kpi-card:last-child { border-right: 0 !important; }
    .mv-doc-section { overflow: visible !important; }
    .mv-doc table { min-width: 0 !important; width: 100% !important; }
  }

  /* Forced desktop layout for html2canvas / iframe PDF export (ignores mobile viewport). */
  .mv-pdf-export .mv-doc,
  .mv-pdf-export.mv-doc {
    width: 794px !important;
    max-width: 794px !important;
    padding: 48px 52px 40px !important;
    margin: 0 !important;
    overflow: visible !important;
  }
  .mv-pdf-export .mv-doc-top { flex-direction: row !important; gap: 32px !important; }
  .mv-pdf-export .mv-doc-title-block { text-align: right !important; }
  .mv-pdf-export .mv-doc-title { font-size: 34px !important; }
  .mv-pdf-export .mv-doc-parties {
    grid-template-columns: 1fr 1fr !important;
    gap: 40px !important;
    margin-top: 28px !important;
  }
  .mv-pdf-export .mv-doc-meta-row {
    grid-template-columns: 1fr 1fr 0.9fr 1.3fr !important;
  }
  .mv-pdf-export .mv-doc-meta-cell {
    border-bottom: 0 !important;
    border-right: 1px solid #e5e7eb !important;
  }
  .mv-pdf-export .mv-doc-meta-cell:last-child { border-right: 0 !important; }
  .mv-pdf-export .mv-doc-kpi {
    grid-template-columns: repeat(4, 1fr) !important;
  }
  .mv-pdf-export .mv-doc-kpi-card {
    border-bottom: 0 !important;
    border-right: 1px solid #e5e7eb !important;
  }
  .mv-pdf-export .mv-doc-kpi-card:last-child { border-right: 0 !important; }
  .mv-pdf-export .mv-doc-kpi-value { font-size: 16px !important; }
  .mv-pdf-export .mv-doc-section {
    margin-top: 28px !important;
    overflow: visible !important;
  }
  .mv-pdf-export .mv-doc table {
    min-width: 0 !important;
    width: 100% !important;
  }
  .mv-pdf-export .mv-doc th,
  .mv-pdf-export .mv-doc td {
    font-size: 12px !important;
    padding: 11px 8px !important;
  }
  .mv-pdf-export .mv-doc th {
    font-size: 10px !important;
    padding: 8px 8px 10px !important;
  }
`;
