import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { downloadBlob } from './webviewDownload';

function safeFilename(title: string): string {
  return title.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'document';
}

/** Renders a DOM node to a multi-page A4 PDF and downloads it (browser or native WebView bridge). */
export async function downloadElementAsPdf(element: HTMLElement, title: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: Math.max(element.scrollWidth, element.clientWidth),
    windowHeight: Math.max(element.scrollHeight, element.clientHeight),
    onclone: (clonedDoc: Document) => {
      clonedDoc.querySelectorAll('.pdf-body, .pdf-viewer, .billing-doc-paper').forEach((node: Element) => {
        const el = node as HTMLElement;
        el.style.overflow = 'visible';
        el.style.height = 'auto';
        el.style.maxHeight = 'none';
        el.style.transform = 'none';
        el.style.zoom = 'normal';
      });
      clonedDoc.querySelectorAll('.mv-doc').forEach((node: Element) => {
        const el = node as HTMLElement;
        el.style.width = '794px';
        el.style.maxWidth = '794px';
        el.style.padding = '48px 52px 40px';
        el.style.margin = '0 auto';
      });
    },
  });

  const imgData = canvas.toDataURL('image/png', 1.0);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 8) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const filename = `${safeFilename(title)}.pdf`;
  const blob = pdf.output('blob');
  await downloadBlob(blob, filename, 'application/pdf');
}
