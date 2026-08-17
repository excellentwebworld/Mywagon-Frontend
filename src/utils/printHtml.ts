function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapHtml(title: string, html: string): string {
  return /^\s*<!doctype/i.test(html) || /^\s*<html/i.test(html)
    ? html
    : `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body>${html}</body></html>`;
}

function schedulePrint(printWindow: Window, autoPrint: boolean): void {
  const triggerPrint = () => {
    try {
      printWindow.focus();
      if (autoPrint) {
        printWindow.print();
      }
    } catch {
      /* popup may be blocked after navigation */
    }
  };

  printWindow.addEventListener('load', () => setTimeout(triggerPrint, 300), { once: true });
  setTimeout(triggerPrint, 800);
}

/**
 * Open a blank print tab synchronously (must be called from a click handler).
 * Populate it later with fillPrintWindow once HTML is fetched.
 */
export function preparePrintWindow(title = 'Document'): Window | null {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return null;

  try {
    printWindow.document.open();
    printWindow.document.write(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>` +
        '<style>body{font-family:Arial,Helvetica,sans-serif;padding:40px;text-align:center;color:#6b6192;}</style>' +
        '</head><body><p>Loading document…</p></body></html>',
    );
    printWindow.document.close();
  } catch {
    /* window may already be restricted */
  }

  return printWindow;
}

/** Write fetched HTML into a tab opened via preparePrintWindow. */
export function fillPrintWindow(
  printWindow: Window | null,
  title: string,
  html: string,
  autoPrint = true,
): void {
  if (!printWindow || printWindow.closed) return;

  if (!html?.trim()) {
    printWindow.close();
    return;
  }

  const content = wrapHtml(title, html);
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  printWindow.location.href = url;
  schedulePrint(printWindow, autoPrint);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Opens server HTML in a new tab and triggers the browser print dialog. */
export function openHtmlPrintWindow(title: string, html: string, autoPrint = true): void {
  if (!html?.trim()) return;

  const content = wrapHtml(title, html);
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const printWindow = window.open(url, '_blank');
  if (!printWindow) {
    URL.revokeObjectURL(url);
    return;
  }

  schedulePrint(printWindow, autoPrint);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Remove inline print controls from server HTML before embedding in a preview iframe. */
export function sanitizeHtmlForPreview(html: string): string {
  return html.replace(/<div class="print-bar">[\s\S]*?<\/div>/gi, '');
}

/** Download printable HTML (user can open and print/save as PDF from the browser). */
export function downloadHtmlFile(title: string, html: string): void {
  if (!html?.trim()) return;

  const content = wrapHtml(title, html);
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = title.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  link.href = url;
  link.download = `${safeName || 'document'}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
