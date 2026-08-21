import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { downloadBlob } from './webviewDownload';

const PDF_PAGE_WIDTH_PX = 794;
const PDF_MARGIN_MM = 8;

function safeFilename(title: string): string {
  return title.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'document';
}

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function withPdfExportClass(html: string): string {
  if (/<body\b[^>]*\bmv-pdf-export\b/i.test(html)) {
    return html;
  }
  if (/<body\b[^>]*\bclass\s*=/i.test(html)) {
    return html.replace(/<body\b([^>]*)\bclass\s*=\s*(["'])([^"']*)\2/i, '<body$1class=$2$3 mv-pdf-export$2');
  }
  if (/<body\b/i.test(html)) {
    return html.replace(/<body\b/i, '<body class="mv-pdf-export"');
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=${PDF_PAGE_WIDTH_PX}"></head><body class="mv-pdf-export">${html}</body></html>`;
}

async function renderHtmlDocumentToCanvas(html: string): Promise<HTMLCanvasElement> {
  const framedHtml = withPdfExportClass(html).replace(
    /<meta\s+name=["']viewport["'][^>]*>/i,
    `<meta name="viewport" content="width=${PDF_PAGE_WIDTH_PX}">`,
  );

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'pdf-export');
  iframe.style.cssText = [
    'position:fixed',
    'left:-12000px',
    'top:0',
    `width:${PDF_PAGE_WIDTH_PX}px`,
    'height:1200px',
    'border:0',
    'opacity:0',
    'pointer-events:none',
    'background:#ffffff',
  ].join(';');
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) {
      throw new Error('Unable to create PDF export frame.');
    }

    doc.open();
    doc.write(framedHtml);
    doc.close();

    await waitForPaint();

    const target = (doc.querySelector('.mv-doc') as HTMLElement | null) || doc.body;
    const contentHeight = Math.max(target.scrollHeight, target.offsetHeight, doc.body.scrollHeight);
    iframe.style.height = `${Math.ceil(contentHeight + 32)}px`;
    await waitForPaint();

    return await html2canvas(target, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: PDF_PAGE_WIDTH_PX,
      windowWidth: PDF_PAGE_WIDTH_PX,
      windowHeight: Math.ceil(contentHeight + 32),
      onclone: (clonedDoc: Document) => {
        clonedDoc.documentElement.classList.add('mv-pdf-export');
        clonedDoc.body.classList.add('mv-pdf-export');
        clonedDoc.querySelectorAll('.mv-doc').forEach((node) => {
          const el = node as HTMLElement;
          el.style.width = `${PDF_PAGE_WIDTH_PX}px`;
          el.style.maxWidth = `${PDF_PAGE_WIDTH_PX}px`;
          el.style.margin = '0';
          el.style.padding = '48px 52px 40px';
          el.style.overflow = 'visible';
        });
        clonedDoc.querySelectorAll('.mv-doc-section').forEach((node) => {
          const el = node as HTMLElement;
          el.style.overflow = 'visible';
        });
        clonedDoc.querySelectorAll('table').forEach((node) => {
          const el = node as HTMLElement;
          el.style.minWidth = '0';
          el.style.width = '100%';
        });
      },
    });
  } finally {
    iframe.remove();
  }
}

async function renderElementToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const host = document.createElement('div');
  host.className = 'mv-pdf-export';
  host.style.cssText = [
    'position:fixed',
    'left:-12000px',
    'top:0',
    `width:${PDF_PAGE_WIDTH_PX}px`,
    'background:#ffffff',
    'overflow:visible',
    'pointer-events:none',
    'z-index:-1',
  ].join(';');

  const styleNodes = element.ownerDocument.querySelectorAll('style');
  styleNodes.forEach((styleEl) => {
    host.appendChild(styleEl.cloneNode(true));
  });

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = `${PDF_PAGE_WIDTH_PX}px`;
  clone.style.maxWidth = `${PDF_PAGE_WIDTH_PX}px`;
  clone.style.margin = '0';
  clone.style.padding = '48px 52px 40px';
  clone.style.overflow = 'visible';
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    await waitForPaint();
    const height = Math.max(clone.scrollHeight, clone.offsetHeight);
    return await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: PDF_PAGE_WIDTH_PX,
      windowWidth: PDF_PAGE_WIDTH_PX,
      windowHeight: Math.ceil(height + 32),
      onclone: (clonedDoc: Document) => {
        clonedDoc.documentElement.classList.add('mv-pdf-export');
        clonedDoc.body.classList.add('mv-pdf-export');
        clonedDoc.querySelectorAll('.mv-doc-section').forEach((node) => {
          (node as HTMLElement).style.overflow = 'visible';
        });
        clonedDoc.querySelectorAll('table').forEach((node) => {
          const el = node as HTMLElement;
          el.style.minWidth = '0';
          el.style.width = '100%';
        });
      },
    });
  } finally {
    host.remove();
  }
}

function canvasToPdf(canvas: HTMLCanvasElement): Blob {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usableWidth = pageWidth - PDF_MARGIN_MM * 2;
  const usableHeight = pageHeight - PDF_MARGIN_MM * 2;

  const imgWidth = usableWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Short documents: fit on a single page without slicing through content.
  if (imgHeight <= usableHeight + 0.5) {
    pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', PDF_MARGIN_MM, PDF_MARGIN_MM, imgWidth, imgHeight);
    return pdf.output('blob');
  }

  // Multi-page: crop source canvas per page so viewers don't show seam artifacts.
  const pageHeightPx = Math.floor((usableHeight * canvas.width) / imgWidth);
  let sourceY = 0;
  let pageIndex = 0;

  while (sourceY < canvas.height) {
    const sliceHeight = Math.min(pageHeightPx, canvas.height - sourceY);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;

    const ctx = pageCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to create PDF page canvas.');
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight,
    );

    const sliceImgHeight = (sliceHeight * imgWidth) / canvas.width;
    if (pageIndex > 0) {
      pdf.addPage();
    }
    pdf.addImage(
      pageCanvas.toDataURL('image/png', 1.0),
      'PNG',
      PDF_MARGIN_MM,
      PDF_MARGIN_MM,
      imgWidth,
      sliceImgHeight,
    );

    sourceY += sliceHeight;
    pageIndex += 1;
  }

  return pdf.output('blob');
}

/** Renders full HTML (invoice/statement document) to a multi-page A4 PDF and downloads it. */
export async function downloadHtmlAsPdf(html: string, title: string): Promise<void> {
  const canvas = await renderHtmlDocumentToCanvas(html);
  const blob = canvasToPdf(canvas);
  await downloadBlob(blob, `${safeFilename(title)}.pdf`, 'application/pdf');
}

/** Renders a DOM node to a multi-page A4 PDF and downloads it (browser or native WebView bridge). */
export async function downloadElementAsPdf(element: HTMLElement, title: string): Promise<void> {
  const canvas = await renderElementToCanvas(element);
  const blob = canvasToPdf(canvas);
  await downloadBlob(blob, `${safeFilename(title)}.pdf`, 'application/pdf');
}
