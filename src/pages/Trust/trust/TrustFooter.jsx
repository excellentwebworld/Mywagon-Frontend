/**
 * TrustFooter — Trust Center footer.
 *
 * Contact email (mailto), whitepaper download (mock toast),
 * and share link (copies URL to clipboard).
 *
 * Used by: TrustCenterPage
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { FileText, Link2, Check } from 'lucide-react';

export default function TrustFooter() {
  const { t } = useTranslation();
  const { T } = useTheme();
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const handleDownload = () => {
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <footer className="text-center py-8" style={{ borderTop: `1px solid ${T.bd}` }}>
      <p style={{ fontSize: 15, fontWeight: 600, color: T.t1, marginBottom: 8 }}>
        {t('trust.footer.questionsTitle')}
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap mb-6" style={{ fontSize: 13, color: T.t2 }}>
        <a href="mailto:security@myvagon.com" style={{ color: T.ac, textDecoration: 'none' }}>
          security@myvagon.com
        </a>
        <span style={{ color: T.t3 }}>·</span>
        <span>myvagon.com/security</span>
      </div>

      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer border-none transition-all duration-200"
          style={{ background: T.sa, color: T.t1, fontSize: 13, fontWeight: 500, border: `1px solid ${T.bd}` }}
        >
          <FileText size={15} />
          {downloaded ? t('trust.footer.downloadStarted') : t('trust.footer.downloadWhitepaper')}
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer border-none transition-all duration-200"
          style={{ background: T.sa, color: T.t1, fontSize: 13, fontWeight: 500, border: `1px solid ${T.bd}` }}
        >
          {copied ? <Check size={15} style={{ color: '#10B981' }} /> : <Link2 size={15} />}
          {copied ? t('trust.footer.linkCopied') : t('trust.footer.shareLink')}
        </button>
      </div>
    </footer>
  );
}
