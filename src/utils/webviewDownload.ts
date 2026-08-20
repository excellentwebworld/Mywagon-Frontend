/**
 * Browser + in-app WebView file download helper.
 *
 * Mobile WebViews (React Native / Android) often ignore <a download> and jsPDF.save().
 * When a native bridge exists we post base64 so the app can save the file.
 * Browser falls back to a normal blob download.
 */

type NativeDownloadPayload = {
  type: 'download_file';
  filename: string;
  mimeType: string;
  base64: string;
};

function getNativeBridge(): { postMessage: (msg: string) => void } | null {
  const w = window as Window & {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
    webkit?: { messageHandlers?: { fileDownload?: { postMessage: (msg: unknown) => void } } };
    AndroidBridge?: { downloadBase64?: (filename: string, mimeType: string, base64: string) => void };
  };

  if (w.ReactNativeWebView?.postMessage) return w.ReactNativeWebView;
  return null;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function triggerAnchorDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Returns true when the native app accepted the download via bridge.
 * Returns false when we fell back to browser download (may still fail silently in WebView).
 */
export async function downloadBlob(blob: Blob, filename: string, mimeType?: string): Promise<'native' | 'browser'> {
  const type = mimeType || blob.type || 'application/octet-stream';
  const bridge = getNativeBridge();
  const android = (window as Window & {
    AndroidBridge?: { downloadBase64?: (filename: string, mimeType: string, base64: string) => void };
  }).AndroidBridge;

  if (bridge || android?.downloadBase64) {
    const base64 = await blobToBase64(blob);
    const payload: NativeDownloadPayload = {
      type: 'download_file',
      filename,
      mimeType: type,
      base64,
    };

    if (android?.downloadBase64) {
      android.downloadBase64(filename, type, base64);
      return 'native';
    }

    if (bridge) {
      bridge.postMessage(JSON.stringify(payload));
      return 'native';
    }
  }

  const iosHandler = (window as Window & {
    webkit?: { messageHandlers?: { fileDownload?: { postMessage: (msg: unknown) => void } } };
  }).webkit?.messageHandlers?.fileDownload;

  if (iosHandler?.postMessage) {
    const base64 = await blobToBase64(blob);
    iosHandler.postMessage({
      type: 'download_file',
      filename,
      mimeType: type,
      base64,
    });
    return 'native';
  }

  triggerAnchorDownload(blob, filename);
  return 'browser';
}

export function isLikelyInAppWebView(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as Window & { ReactNativeWebView?: unknown; AndroidBridge?: unknown };
  if (w.ReactNativeWebView || w.AndroidBridge) return true;
  const ua = navigator.userAgent || '';
  return /; wv\)|WebView|MyVagon|CarrierApp|DriverApp/i.test(ua);
}
