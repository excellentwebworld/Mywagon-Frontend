import React, { useMemo } from 'react';
import { useTranslation } from '../../../../hooks/useTranslation';
import { useAuth } from '../../../../hooks/useAuth';

function detectBrowser(ua: string): string {
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  return 'Browser';
}

function detectOs(ua: string): string {
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  return 'OS';
}

export function RequestContextChips() {
  const { t, lang } = useTranslation();
  const { user } = useAuth();

  const chips = useMemo(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const now = new Date();
    const time = now.toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const tz =
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : '—';

    return [
      { label: 'USER', value: user.email || '—' },
      { label: 'ORG', value: user.company || '—' },
      { label: 'BROWSER', value: `${detectBrowser(ua)} / ${detectOs(ua)}` },
      { label: 'TIME', value: time },
      { label: 'TZ', value: tz },
    ];
  }, [lang, user.company, user.email]);

  return (
    <div className="form-group">
      <div className="form-label">{t('support.request.context')}</div>
      <div className="context-chips" aria-label={t('support.request.context')}>
        {chips.map((chip) => (
          <div key={chip.label} className="ctx-chip">
            <span className="ctx-label">{chip.label}</span>
            {chip.value}
          </div>
        ))}
      </div>
    </div>
  );
}
