import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { BILLING_DOCUMENT_CSS } from './documentStyles';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function wrapBillingDocumentHtml(title: string, markup: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${BILLING_DOCUMENT_CSS}</style>
</head>
<body>${markup}</body>
</html>`;
}

export function renderBillingDocumentHtml(title: string, element: ReactElement): string {
  return wrapBillingDocumentHtml(title, renderToStaticMarkup(element));
}
