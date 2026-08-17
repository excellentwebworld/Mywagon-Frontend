function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Opens server HTML in a new tab and triggers the browser print dialog. */
export function openHtmlPrintWindow(title: string, html: string, autoPrint = true): void {
  if (!html?.trim()) return;

  // Do not use noopener — it prevents writing into the new window (results in about:blank).
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const content =
    /^\s*<!doctype/i.test(html) || /^\s*<html/i.test(html)
      ? html
      : `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body>${html}</body></html>`;

  printWindow.document.open();
  printWindow.document.write(content);
  printWindow.document.close();

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

  printWindow.addEventListener('load', () => {
    setTimeout(triggerPrint, 300);
  });

  setTimeout(triggerPrint, 400);
}
