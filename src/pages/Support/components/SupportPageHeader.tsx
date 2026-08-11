import React from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { useTheme } from '../../../hooks/useTheme';

export function SupportPageHeader() {
  const { t } = useTranslation();
  const { T } = useTheme();

  return (
    <div className="support-page-head" style={{ marginBottom: 24 }}>
      <h1
        className="support-page-title"
        style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.3px',
          color: T.t1,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {t('support.pageTitle')}
      </h1>
      <p style={{ fontSize: 13, color: T.t2, marginTop: 3 }}>
        {t('support.pageSubtitle')}
      </p>
    </div>
  );
}
