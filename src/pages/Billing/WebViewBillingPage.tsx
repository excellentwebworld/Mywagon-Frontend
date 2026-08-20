import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WebViewLayout } from '../../layouts/WebViewLayout';
import { BillingPage } from './BillingPage';
import {
  createWebViewBillingService,
  type WebViewBillingService,
} from '../../api/services/webViewBillingService';
import {
  getStoredWebViewUserId,
  setStoredWebViewUserId,
  type WebViewRole,
} from '../../api/webviewClient';
import '../Subscription/subscription.css';
import './billing.css';

type Props = {
  role: WebViewRole;
};

export const WebViewBillingPage: React.FC<Props> = ({ role }) => {
  const [searchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const [userId, setUserId] = useState<string>(() => {
    const fromUrl = searchParams.get('user_id');
    if (fromUrl) return fromUrl;
    return getStoredWebViewUserId(role) ?? '';
  });

  useEffect(() => {
    const fromUrl = searchParams.get('user_id');
    if (fromUrl) {
      setUserId(fromUrl);
      setStoredWebViewUserId(role, fromUrl);
    }
    const lang = searchParams.get('lang');
    if (lang) {
      i18n.changeLanguage(lang.startsWith('el') ? 'el' : 'en');
    }
  }, [searchParams, role, i18n]);

  const service = useMemo<WebViewBillingService | null>(() => {
    if (!userId) return null;
    return createWebViewBillingService(role, userId);
  }, [role, userId]);

  if (!userId || !service) {
    return (
      <WebViewLayout>
        <div className="webview-billing-error">
          <h2>Billing unavailable</h2>
          <p>Missing or invalid user session. Please open billing from the mobile app.</p>
        </div>
      </WebViewLayout>
    );
  }

  return (
    <WebViewLayout>
      <BillingPage variant="webview" webviewRole={role} billingApi={service} userId={userId} />
    </WebViewLayout>
  );
};
