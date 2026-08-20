import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WebViewLayout } from '../../layouts/WebViewLayout';
import { SubscriptionPage } from './SubscriptionPage';
import {
  createWebViewSubscriptionService,
  type WebViewSubscriptionService,
} from '../../api/services/webViewSubscriptionService';
import {
  getStoredWebViewUserId,
  setStoredWebViewUserId,
  type WebViewRole,
} from '../../api/webviewClient';
import './subscription.css';

type Props = {
  role: WebViewRole;
};

export const WebViewSubscriptionPage: React.FC<Props> = ({ role }) => {
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

  const service = useMemo<WebViewSubscriptionService | null>(() => {
    if (!userId) return null;
    return createWebViewSubscriptionService(role, userId);
  }, [role, userId]);

  if (!userId || !service) {
    return (
      <WebViewLayout>
        <div className="webview-subscription-error">
          <h2>Subscription unavailable</h2>
          <p>Missing or invalid user session. Please open subscription from the mobile app.</p>
        </div>
      </WebViewLayout>
    );
  }

  return (
    <WebViewLayout>
      <SubscriptionPage variant="webview" webviewRole={role} subscriptionApi={service} userId={userId} />
    </WebViewLayout>
  );
};
