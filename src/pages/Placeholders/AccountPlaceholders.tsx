import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';

interface PlaceholderPageProps {
  titleKey: string;
  fallbackTitle: string;
  description?: string;
}

export function PlaceholderPage({ titleKey, fallbackTitle, description }: PlaceholderPageProps) {
  const { t } = useTranslation();
  const { T } = useTheme();

  return (
    <div
      className="flex flex-col items-center justify-center py-20 px-6 rounded-2xl"
      style={{ background: T.sf, border: `1px solid ${T.bd}`, minHeight: 360 }}
    >
      <h1 className="font-bold mb-2" style={{ fontSize: 20, color: T.t1 }}>
        {t(titleKey) || fallbackTitle}
      </h1>
      <p style={{ fontSize: 14, color: T.t3, textAlign: 'center', maxWidth: 420 }}>
        {description || t('settings.fullSettings') || 'Full settings coming soon.'}
      </p>
    </div>
  );
}

export function BillingPage() {
  return <PlaceholderPage titleKey="sidebar.billing" fallbackTitle="Billing" />;
}

export function SubscriptionPage() {
  return <PlaceholderPage titleKey="sidebar.subscription" fallbackTitle="Subscription" />;
}

export function SupportPage() {
  return <PlaceholderPage titleKey="sidebar.support" fallbackTitle="Support" />;
}
