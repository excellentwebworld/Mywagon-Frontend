import React from 'react';
import { useTranslation } from '../../../hooks/useTranslation';

export function SupportPageHeader() {
  const { t } = useTranslation();

  return (
    <header className="support-page-head">
      <h1 className="support-page-title">{t('support.pageTitle')}</h1>
      <p className="support-page-subtitle">{t('support.pageSubtitle')}</p>
    </header>
  );
}
