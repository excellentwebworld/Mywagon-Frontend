import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/useToast';
import { ApiError, getApiErrorMessage } from '../../api';
import { subscriptionService } from '../../api/services/subscriptionService';
import type {
  AddonQuote,
  BillingCycle as ApiCycle,
  PurchasedAddon,
  SubscriptionAddonOffer,
  SubscriptionOverview,
  SubscriptionPermissionItem,
  SubscriptionQuote,
} from '../../api/types/subscription';
import { formatDate, formatEuro, usageTone } from './mockData';
import { SubscriptionSkeleton } from './SubscriptionSkeleton';
import './subscription.css';

type UiCycle = 'monthly' | 'yearly';
type AddonTab = 'recurring' | 'usage';
type SubModal =
  | { kind: 'upgrade'; planId: number }
  | { kind: 'cancel-plan' }
  | { kind: 'buy-addon'; addon: SubscriptionAddonOffer; count: number }
  | { kind: 'cancel-addon'; addon: PurchasedAddon }
  | { kind: 'contact' }
  | { kind: 'tooltip'; which: AddonTab };

const USAGE_LABELS: Record<string, string> = {
  private_load_limit: 'Private Loads',
  public_load_limit: 'Public Loads',
  partners: 'Partners',
  dispatcher_users: 'Dispatchers',
  count_of_bids_per_month: 'Bids',
  send_tracking_links_to_your_customers_per_month: 'Tracking Links',
};

function toApiCycle(cycle: UiCycle): ApiCycle {
  return cycle === 'yearly' ? 'year' : 'month';
}

function currentIntervalToUi(interval?: string | null): UiCycle {
  return interval === 'year' ? 'yearly' : 'monthly';
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M2.5 7l3 3 6-6" />
    </svg>
  );
}

function DashIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 7h8" />
    </svg>
  );
}

function CycleToggle({
  cycle,
  onChange,
  monthlyLabel,
  yearlyLabel,
  saveLabel,
}: {
  cycle: UiCycle;
  onChange: (c: UiCycle) => void;
  monthlyLabel: string;
  yearlyLabel: string;
  saveLabel: string;
}) {
  return (
    <div className="cycle-toggle">
      <button type="button" className={`cycle-btn${cycle === 'monthly' ? ' active' : ''}`} onClick={() => onChange('monthly')}>
        {monthlyLabel}
      </button>
      <button type="button" className={`cycle-btn${cycle === 'yearly' ? ' active' : ''}`} onClick={() => onChange('yearly')}>
        {yearlyLabel}
        {saveLabel ? <span className="save-tag">{saveLabel}</span> : null}
      </button>
    </div>
  );
}

function permissionDisplay(value: string, included: boolean, type: string): string {
  if (type === 'status') {
    return included && Number(value) > 0 ? '✓' : '—';
  }
  const numeric = Number(value);
  if (!included || value === '0' || Number.isNaN(numeric) || numeric <= 0) {
    return type === 'percentage' ? '0%' : '0';
  }
  const label = numeric >= 10000 ? '∞' : value;
  return type === 'percentage' && label !== '∞' ? `${label}%` : label;
}

function resolvePlanPermissions(
  permissions: SubscriptionPermissionItem[],
  isCurrentCard: boolean,
  purchasedStatusSlugs: Set<string>,
): SubscriptionPermissionItem[] {
  return permissions
    .map((row) => {
      const granted = isCurrentCard && row.type === 'status' && purchasedStatusSlugs.has(row.slug);
      return {
        ...row,
        included: row.included || granted,
        value: granted && (!row.value || row.value === '0') ? '1' : row.value,
      };
    })
    .sort((a, b) => Number(b.included) - Number(a.included));
}

const BETA_PERMISSION_SLUGS = new Set([
  'post_loads_publicly',
  'search_publicly_posted_trucks',
  'bids_per_month',
  'public_loads',
  'search_available_trucks',
  'count_of_bids_per_month',
]);

const BETA_PERMISSION_NAMES = new Set([
  'post loads publicly',
  'search publicly posted trucks',
  'bids per month',
]);

function isBetaPermission(slug?: string | null, name?: string | null): boolean {
  if (slug && BETA_PERMISSION_SLUGS.has(slug)) return true;
  if (name && BETA_PERMISSION_NAMES.has(name.trim().toLowerCase())) return true;
  return false;
}

export const SubscriptionPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const locale = i18n.language?.startsWith('el') ? 'el' : 'en';
  const tf = (key: string, fallback: string) => t(`subscriptionPage.${key}`, fallback);

  const [cycle, setCycle] = useState<UiCycle>('monthly');
  const [addonTab, setAddonTab] = useState<AddonTab>('recurring');
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [data, setData] = useState<SubscriptionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<SubModal | null>(null);
  const [quote, setQuote] = useState<SubscriptionQuote | AddonQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [autoPayOnCheckout, setAutoPayOnCheckout] = useState(true);
  const [addonCounts, setAddonCounts] = useState<Record<number, number>>({});
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', description: '' });

  const subscribedCycle: UiCycle = currentIntervalToUi(data?.current?.interval);
  const planCheckoutCycle = toApiCycle(cycle);
  const addonCheckoutCycle = toApiCycle(subscribedCycle);

  const toError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof ApiError) {
        return getApiErrorMessage(err, fallback, t as (key: string, options?: Record<string, string | number>) => string);
      }
      if (err instanceof Error && err.message) return err.message;
      return fallback;
    },
    [t],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await subscriptionService.getOverview();
      setData(overview);
    } catch (err) {
      setError(toError(err, tf('loadError', 'Unable to load subscription.')));
    } finally {
      setLoading(false);
    }
  }, [toError, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data?.current) return;
    setCycle(currentIntervalToUi(data.current.interval));
  }, [data?.current?.user_subscription_id, data?.current?.interval]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const transactionId = params.get('t') || params.get('transaction_id');
    const orderCode = params.get('s') || params.get('order_code');
    const clearQuery = () => {
      const url = new URL(window.location.href);
      ['payment', 't', 's', 'transaction_id', 'order_code'].forEach((k) => url.searchParams.delete(k));
      window.history.replaceState({}, '', url.pathname + url.search);
    };
    if (payment === 'failed' || payment === 'cancel' || payment === 'cancelled') {
      toast.error(tf('payFailed', 'Payment was not completed.'));
      clearQuery();
      return;
    }
    if (payment === 'success') {
      toast.success(tf('successUpgrade', 'Plan updated successfully!'));
      clearQuery();
      void load();
      return;
    }
    if (transactionId || orderCode) {
      subscriptionService
        .verifyPayment(transactionId || undefined, orderCode || undefined)
        .then(() => {
          toast.success(tf('successUpgrade', 'Payment completed successfully!'));
          void load();
        })
        .catch((err) => toast.error(toError(err, tf('payFailed', 'Payment was not completed.'))))
        .finally(clearQuery);
    }
  }, [load, t, toast, toError]);

  const closeModal = () => {
    setModal(null);
    setQuote(null);
  };

  useEffect(() => {
    if (!modal) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [modal]);

  useEffect(() => {
    if (!modal) return;
    setQuote(null);
    setQuoteLoading(true);
    const run = async () => {
      try {
        if (modal.kind === 'upgrade') {
          setQuote(await subscriptionService.quotePlan(modal.planId, planCheckoutCycle));
        }
        if (modal.kind === 'buy-addon') {
          setQuote(await subscriptionService.quoteAddon(modal.addon.addon_price_id, modal.count, addonCheckoutCycle));
        }
      } catch (err) {
        toast.error(toError(err, tf('quoteFailed', 'Unable to calculate price.')));
        closeModal();
      } finally {
        setQuoteLoading(false);
      }
    };
    void run();
  }, [modal, planCheckoutCycle, addonCheckoutCycle, t, toError, toast]);

  const startCheckout = async (url: string | null, activated?: boolean) => {
    if (activated) {
      toast.success(tf('successUpgrade', 'Plan updated successfully!'));
      closeModal();
      await load();
      return;
    }
    if (url) {
      window.location.assign(url);
      return;
    }
    toast.error(tf('payFailed', 'Payment could not be started.'));
  };

  const submitContact = async () => {
    if (busy) return;
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.phone.trim() || contactForm.description.trim().length < 5) {
      toast.error(tf('contactInvalid', 'Please fill in name, email, phone, and a short message.'));
      return;
    }
    setBusy(true);
    try {
      await subscriptionService.contactUs({
        name: contactForm.name.trim(),
        email: contactForm.email.trim(),
        phone: contactForm.phone.trim(),
        description: contactForm.description.trim(),
      });
      toast.success(tf('contactSent', 'Contact request submitted successfully.'));
      closeModal();
    } catch (err) {
      toast.error(toError(err, tf('actionFailed', 'Unable to complete this action.')));
    } finally {
      setBusy(false);
    }
  };

  const confirmModal = async () => {
    if (!modal || busy) return;
    if (modal.kind === 'tooltip') {
      closeModal();
      return;
    }
    if (modal.kind === 'contact') {
      await submitContact();
      return;
    }
    setBusy(true);
    try {
      if (modal.kind === 'upgrade') {
        const result = await subscriptionService.checkoutPlan(modal.planId, planCheckoutCycle, autoPayOnCheckout);
        await startCheckout(result.checkout_url, result.activated);
        return;
      }
      if (modal.kind === 'buy-addon') {
        const result = await subscriptionService.checkoutAddon(
          modal.addon.addon_price_id,
          modal.count,
          addonCheckoutCycle,
          autoPayOnCheckout && modal.addon.billing_type === 'recurring',
        );
        await startCheckout(result.checkout_url, result.activated);
        return;
      }
      if (modal.kind === 'cancel-plan') {
        await subscriptionService.cancelPlan();
        toast.success(tf('successCancel', 'Plan cancelled. Access continues until the period ends.'));
        closeModal();
        await load();
        return;
      }
      if (modal.kind === 'cancel-addon') {
        await subscriptionService.cancelAddon(modal.addon.id);
        toast.success(tf('successRemoved', 'Add-on will stop at the end of its period.'));
        closeModal();
        await load();
        return;
      }
    } catch (err) {
      toast.error(toError(err, tf('actionFailed', 'Unable to complete this action.')));
    } finally {
      setBusy(false);
    }
  };

  const togglePlanAutoPay = async (enabled: boolean) => {
    if (enabled && data?.current && !data.current.has_payment_method) {
      toast.error(tf('autopayNeedsCheckout', 'Complete a checkout with auto-pay to store a payment method.'));
      return;
    }
    try {
      await subscriptionService.setAutoPay(enabled);
      toast.success(enabled ? tf('autopayOn', 'Auto-pay enabled.') : tf('autopayOff', 'Auto-pay disabled.'));
      await load();
    } catch (err) {
      toast.error(toError(err, tf('actionFailed', 'Unable to complete this action.')));
    }
  };

  const toggleAddonAutoPay = async (addon: PurchasedAddon, enabled: boolean) => {
    try {
      await subscriptionService.setAddonAutoPay(addon.id, enabled);
      toast.success(enabled ? tf('autopayOn', 'Auto-pay enabled.') : tf('autopayOff', 'Auto-pay disabled.'));
      await load();
    } catch (err) {
      toast.error(toError(err, tf('actionFailed', 'Unable to complete this action.')));
    }
  };

  const openContact = () => {
    setContactForm({
      name: data?.contact?.name || '',
      email: data?.contact?.email || '',
      phone: data?.contact?.phone || '',
      description: '',
    });
    setModal({ kind: 'contact' });
  };

  const current = data?.current;
  const plans = data?.plans ?? [];
  const purchasedStatusSlugs = new Set(
    (data?.purchased_addons ?? []).filter((addon) => !addon.is_cancelled).map((addon) => addon.slug),
  );
  const yearlySave =
    plans.some((p) => p.price_monthly > 0 && p.price_yearly_monthly_rate > 0 && p.price_yearly_monthly_rate < p.price_monthly)
      ? tf('saveTag', 'Best value')
      : '';

  const comparisonPermissions = useMemo(() => {
    const seen = new Set<string>();
    const rows: SubscriptionPermissionItem[] = [];
    plans.forEach((plan) => {
      plan.permissions.forEach((perm) => {
        if (seen.has(perm.slug)) return;
        seen.add(perm.slug);
        rows.push(perm);
      });
    });
    return rows;
  }, [plans]);

  const modalContent = useMemo(() => {
    if (!modal) return null;
    if (modal.kind === 'upgrade') {
      const plan = plans.find((p) => p.id === modal.planId);
      const q = quote as SubscriptionQuote | null;
      return {
        title: `${tf('upgradeTitle', 'Upgrade to')} ${plan?.name ?? ''}`,
        confirm: busy ? tf('processing', 'Processing…') : tf('payNow', 'Pay Now'),
        danger: false,
        body: quoteLoading ? (
          <p>{tf('loading', 'Loading…')}</p>
        ) : q ? (
          <>
            <div className="m-highlight">
              <div className="mh-label">{tf('totalCost', 'Total Cost')}</div>
              <div className="mh-val">{formatEuro(q.total)}</div>
              <div className="mh-sub">
                {tf('subtotal', 'Subtotal')} {formatEuro(q.subtotal)}
                {q.vat_percent > 0 ? ` · VAT ${q.vat_percent}% ${formatEuro(q.vat_amount)}` : ''}
              </div>
            </div>
            {q.prorated ? <div className="m-info">{tf('proratedNote', 'Price is prorated for the unused days in your current billing period.')}</div> : null}
            {q.vat_percent > 0 ? (
              <div className="m-info">
                {tf('vatNote', 'As per EU tax regulations, customers from Greece are required to pay')} {q.vat_percent}% {tf('vatOnDigital', 'VAT on digital services and products.')}
              </div>
            ) : null}
            <label className="m-info" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={autoPayOnCheckout} onChange={(e) => setAutoPayOnCheckout(e.target.checked)} />
              {tf('enableAutopay', 'Enable auto-pay for renewals')}
            </label>
          </>
        ) : null,
      };
    }
    if (modal.kind === 'buy-addon') {
      const q = quote as AddonQuote | null;
      return {
        title: modal.addon.name,
        confirm: busy ? tf('processing', 'Processing…') : tf('payNow', 'Pay Now'),
        danger: false,
        body: quoteLoading ? (
          <p>{tf('loading', 'Loading…')}</p>
        ) : q ? (
          <>
            <div className="m-highlight">
              <div className="mh-label">{tf('totalCost', 'Total Cost')}</div>
              <div className="mh-val">{formatEuro(q.total)}</div>
              <div className="mh-sub">
                {q.count} × {formatEuro(q.unit_price)}
                {q.vat_percent > 0 ? ` · VAT ${q.vat_percent}%` : ''}
              </div>
            </div>
            {q.is_recurring ? (
              <label className="m-info" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={autoPayOnCheckout} onChange={(e) => setAutoPayOnCheckout(e.target.checked)} />
                {tf('enableAutopay', 'Enable auto-pay for renewals')}
              </label>
            ) : (
              <div className="m-info">{tf('purchaseNote', 'Units are added after payment and follow your current subscription cycle.')}</div>
            )}
            {q.vat_percent > 0 ? (
              <div className="m-info">
                {tf('vatNote', 'As per EU tax regulations, customers from Greece are required to pay')} {q.vat_percent}% {tf('vatOnDigital', 'VAT on digital services and products.')}
              </div>
            ) : null}
          </>
        ) : null,
      };
    }
    if (modal.kind === 'cancel-plan') {
      return {
        title: tf('cancelPlanTitle', 'Cancel plan'),
        confirm: tf('confirmCancel', 'Cancel plan'),
        danger: true,
        body: <div className="m-info">{tf('cancelPlanNote', 'You keep access until the current period ends. Auto-pay will be turned off.')}</div>,
      };
    }
    if (modal.kind === 'contact') {
      return {
        title: tf('contactTitle', 'Contact us'),
        confirm: busy ? tf('processing', 'Processing…') : tf('contactSubmit', 'Submit Request'),
        danger: false,
        body: (
          <div className="sub-contact-form">
            <label>
              {tf('contactName', 'Full Name')}
              <input value={contactForm.name} onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))} />
            </label>
            <label>
              {tf('contactPhone', 'Phone Number')}
              <input value={contactForm.phone} onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))} />
            </label>
            <label>
              {tf('contactEmail', 'Email ID')}
              <input type="email" value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))} />
            </label>
            <label>
              {tf('contactMessage', 'Write your request here...')}
              <textarea rows={4} value={contactForm.description} onChange={(e) => setContactForm((p) => ({ ...p, description: e.target.value }))} />
            </label>
          </div>
        ),
      };
    }
    if (modal.kind === 'tooltip') {
      return {
        title: modal.which === 'recurring' ? tf('recurringTab', 'Recurring Add-Ons') : tf('usageTab', 'Usage-Based Add-Ons'),
        confirm: tf('gotIt', 'Got it'),
        danger: false,
        body: (
          <div className="m-info">
            {modal.which === 'recurring' ? (
              <>
                <p>{tf('recurringTip1', 'These add-on features are recurring.')}</p>
                <p>{tf('recurringTip2', 'Purchasing one of these will unlock this feature and it will stay active for the billing period. Unless you cancel before the end of the period, the feature will auto-renew and you will be invoiced automatically for the subsequent period.')}</p>
              </>
            ) : (
              <>
                <p>{tf('oneTimeTip1', 'These add-on features are consumable.')}</p>
                <p>{tf('oneTimeTip2', 'Purchasing one unit of each will give you one credit to use that feature, after which you will have to purchase more. You can buy multiple of those at once.')}</p>
              </>
            )}
          </div>
        ),
      };
    }
    return {
      title: modal.addon.name,
      confirm: tf('removeAddon', 'Remove'),
      danger: true,
      body: <div className="m-info">{tf('cancelAddonNote', 'The add-on stays active until its end date, then it will not renew.')}</div>,
    };
  }, [modal, plans, quote, quoteLoading, busy, autoPayOnCheckout, contactForm, t]);

  const renderAddonCard = (ao: SubscriptionAddonOffer) => {
    const price = cycle === 'yearly' ? ao.yearly_price : ao.monthly_price;
    const count = addonCounts[ao.addon_price_id] ?? 1;
    const purchased = (data?.purchased_addons ?? []).find((p) => p.slug === ao.slug && !p.is_cancelled);
    const included = ao.included_in_plan || (ao.type !== 'count' && Boolean(purchased));
    return (
      <div key={ao.addon_price_id} className={`ao-card${purchased ? ' purchased' : ''}`}>
        <div className="ao-top">
          <div>
            <span className="ao-name">{ao.name}</span>
            {ao.description && ao.description !== ao.name ? <div className="ao-desc">{ao.description}</div> : null}
          </div>
          <div className="ao-price">
            {formatEuro(price)}
            <span>{ao.type === 'count' ? ` / ${cycle === 'yearly' ? tf('year', 'year') : tf('month', 'month')}` : `/${cycle === 'yearly' ? 'yr' : 'mo'}`}</span>
          </div>
        </div>
        {included ? (
          <div className="ao-included">
            <span className="plan-inc">✓</span> {tf('alreadyIncluded', 'Included in your plan')}
          </div>
        ) : (
          <div className="ao-controls">
            {ao.type === 'count' ? (
              <div className="ao-counter">
                <button type="button" onClick={() => setAddonCounts((prev) => ({ ...prev, [ao.addon_price_id]: Math.max(1, count - 1) }))}>
                  −
                </button>
                <input className="qty" value={count} readOnly />
                <button type="button" onClick={() => setAddonCounts((prev) => ({ ...prev, [ao.addon_price_id]: count + 1 }))}>
                  +
                </button>
              </div>
            ) : null}
            <button
              type="button"
              className="ao-buy"
              onClick={() => setModal({ kind: 'buy-addon', addon: ao, count: ao.type === 'count' ? count : 1 })}
            >
              {tf('buyNow', 'Purchase')}
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading && !data) {
    return <SubscriptionSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="subscription-page">
        <div className="pg-t">{tf('pgTitle', 'Subscription')}</div>
        <p className="pg-s">{error}</p>
        <button type="button" className="sub-btn" onClick={() => void load()}>
          {tf('retry', 'Retry')}
        </button>
      </div>
    );
  }

  const displayPrice = current
    ? subscribedCycle === 'yearly'
      ? current.list_yearly_monthly_rate || current.list_monthly
      : current.list_monthly
    : 0;

  return (
    <div className="subscription-page">
      <div className="pg-head">
        <div>
          <div className="pg-t">{tf('pgTitle', 'Subscription')}</div>
          <div className="pg-s">{tf('pgSub', 'Manage your plan, usage, and add-ons')}</div>
        </div>
        <div className="pg-head-r">
          <Link to="/billing" className="sub-btn">
            {tf('viewInvoicesShort', 'View Invoices')}
          </Link>
        </div>
      </div>

      <div className="plan-summary">
        <div className="ps-card">
          <div className="ps-label">{tf('currentPlan', 'Current Plan')}</div>
          <div className="ps-value">{current?.plan_name ?? '—'}</div>
          <div className="ps-sub">
            {current?.is_free ? tf('freePlan', 'Free plan') : `${formatEuro(displayPrice)}${tf('perMonth', '/month')}`}
          </div>
          <div className="ps-badge">
            <span className="dot" /> {current?.is_cancelled ? tf('cancelled', 'Cancelled') : tf('active', 'Active')}
          </div>
        </div>
        <div className="ps-card">
          <div className="ps-label">{tf('billingCycle', 'Billing Cycle')}</div>
          <div className="ps-value">{subscribedCycle === 'yearly' ? tf('yearly', 'Yearly') : tf('monthly', 'Monthly')}</div>
          <div className="ps-sub">
            {subscribedCycle === 'yearly' ? tf('billedYearly', 'Billed once per year') : tf('billedMonthly', 'Billed every month')}
          </div>
        </div>
        <div className="ps-card">
          <div className="ps-label">{tf('nextRenewal', 'Next Renewal')}</div>
          <div className="ps-value" style={{ fontSize: 15 }}>
            {current?.is_free ? tf('renewalNa', 'N/A') : current?.expire_date ? formatDate(current.expire_date, locale) : '—'}
          </div>
          <div className="ps-sub">
            {current?.is_free
              ? tf('unlimitedDays', 'Unlimited')
              : current?.days_left != null
                ? `${current.days_left} ${tf('daysLeft', 'days left')}`
                : ''}
          </div>
          {current?.is_custom ? <div className="ps-sub">{tf('customPlanNote', 'This plan is managed by MYVAGON.')}</div> : null}
          {current?.can_cancel ? (
            <button type="button" className="ps-link" onClick={() => setModal({ kind: 'cancel-plan' })}>
              {tf('cancelPlan', 'Cancel plan')}
            </button>
          ) : null}
        </div>
        <div className="ps-card">
          <div className="ps-label">{tf('paymentMethod', 'Payment')}</div>
          <div className="ps-value" style={{ fontSize: 14, color: 'var(--t3)' }}>
            {current?.has_payment_method ? tf('cardOnFile', 'Saved via Viva Wallet') : tf('noPayment', 'No payment method')}
          </div>
          <div className="ps-autopay">
            <span>{tf('autopayLabel', 'Autopay')}</span>
            <button
              type="button"
              className={`ao-toggle${current?.recurring_payment ? ' on' : ''}`}
              role="switch"
              aria-checked={Boolean(current?.recurring_payment)}
              aria-label={tf('autopayLabel', 'Autopay')}
              disabled={!current || current.is_free || busy}
              onClick={() => void togglePlanAutoPay(!current?.recurring_payment)}
            >
              <span className="knob" />
            </button>
          </div>
        </div>
      </div>

      <div className="usage-section">
        <div className="usage-title">
          {tf('usageTitle', 'Usage This Period')}
          <span className="reset">
            {tf('resetLabel', 'Resets')}: {current?.is_free ? tf('renewalNa', 'N/A') : current?.expire_date ? formatDate(current.expire_date, locale) : '—'}
          </span>
        </div>
        <div className="usage-grid">
          <div className="usage-card">
            <div className="uc-top">
              <div className="uc-name">{tf('activeUsers', 'Active Users')}</div>
              <div className="uc-vals">
                <span className="used">{data?.seats?.active_users ?? 0}</span>
              </div>
            </div>
          </div>
          <div className="usage-card">
            <div className="uc-top">
              <div className="uc-name">{tf('paidUsers', 'Paid Users')}</div>
              <div className="uc-vals">
                <span className="used">{data?.seats?.paid_users ?? 0}</span>
              </div>
            </div>
          </div>
          {(data?.usage ?? []).map((u) => {
            const unlimited = u.unlimited || u.limit == null;
            const pct = unlimited ? 0 : Math.round((u.used / Math.max(u.limit || 1, 1)) * 100);
            const tone = usageTone(u.used, unlimited ? null : u.limit);
            return (
              <div key={u.slug} className={`usage-card ${tone === 'ok' ? '' : tone}`}>
                <div className="uc-top">
                  <div className="uc-name">{tf(u.slug, USAGE_LABELS[u.slug] ?? u.slug)}</div>
                  <div className="uc-vals">
                    <span className="used">{u.used}</span>
                    <span className="lim"> / {unlimited ? tf('unlimited', 'Unlimited') : u.limit}</span>
                  </div>
                </div>
                <div className="uc-bar">
                  <div className={`uc-fill ${tone}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="plans-header">
          <h2>💎 {tf('choosePlan', 'Choose Your Plan')}</h2>
          <CycleToggle
            cycle={cycle}
            onChange={setCycle}
            monthlyLabel={tf('monthly', 'Monthly')}
            yearlyLabel={tf('yearly', 'Yearly')}
            saveLabel={yearlySave}
          />
        </div>
        <div className="plans-grid">
          {plans.map((p) => {
            const pr = cycle === 'yearly' ? p.price_yearly_monthly_rate : p.price_monthly;
            const isCurrentCard = p.id === current?.plan_id && cycle === subscribedCycle;
            const canUpgrade =
              !current?.is_custom && (cycle === 'yearly' ? p.upgrade_available_yearly : p.upgrade_available_monthly);
            const planPermissions = resolvePlanPermissions(p.permissions, isCurrentCard, purchasedStatusSlugs);
            return (
              <div key={p.id} className={`pcard${isCurrentCard ? ' current' : ''}`}>
                {isCurrentCard ? <span className="cur-tag">✓ {tf('currentPlanBtn', 'Current Plan')}</span> : null}
                <div className="pcard-top">
                  <div className="pnm">{p.name}</div>
                 {/* <div className="pds">{p.description}</div> */}
                  <div className="pr">
                    <span className="c">€</span>
                    <span className="a">{pr === 0 ? '0' : pr.toLocaleString('de-DE')}</span>
                    <span className="p">{tf('perMonth', '/month')}</span>
                  </div>
                  <div className="pnt">{p.is_free ? tf('freePlan', 'Free plan') : ''}</div>
                </div>
                <div className="pcard-cta">
                  {isCurrentCard ? (
                    <button type="button" className="cta cur">
                      ✓ {tf('currentPlanBtn', 'Current Plan')}
                    </button>
                  ) : canUpgrade ? (
                    <button type="button" className="cta pri" onClick={() => setModal({ kind: 'upgrade', planId: p.id })}>
                      {tf('upgradeTo', 'Upgrade to')} {p.name}
                    </button>
                  ) : current?.is_custom ? (
                    <button type="button" className="cta sec" disabled>
                      {tf('customPlanCta', 'Managed plan')}
                    </button>
                  ) : (
                    <button type="button" className="cta sec" disabled>
                      {tf('notAvailable', 'Not available')}
                    </button>
                  )}
                </div>
                <div className="pcard-features">
                  <div className="flbl">{tf('includes', 'Includes')}</div>
                  <ul className="fl">
                    {planPermissions.map((row) => {
                      const val = permissionDisplay(row.value, row.included, row.type);
                      const on = row.included;
                      const showCount = row.type !== 'status';
                      return (
                        <li key={row.slug} className={`fi${on ? '' : ' off'}`}>
                          <span className={`ic ${on ? 'ok' : 'no'}`}>{on ? <CheckIcon /> : <DashIcon />}</span>
                          <span className="fi-label">{row.name}</span>
                          {isBetaPermission(row.slug, row.name) ? (
                            <span className="sub-beta">{tf('beta', 'BETA')}</span>
                          ) : null}
                          {showCount ? <span className="sub-feat-val">{val}</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" className={`feat-toggle${featuresOpen ? ' open' : ''}`} onClick={() => setFeaturesOpen((v) => !v)}>
          <span className="chevron">▼</span>{' '}
          {featuresOpen ? tf('hideFeatures', 'Hide feature comparison') : tf('seeFeatures', 'See full feature comparison')}
        </button>
        <div className={`feat-table-wrap${featuresOpen ? ' show' : ''}`}>
          <table className="feat-table">
            <thead>
              <tr>
                <th>{tf('featureLabel', 'Feature')}</th>
                {plans.map((p) => (
                  <th key={p.id}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonPermissions.map((perm) => (
                <tr key={perm.slug}>
                  <td>
                    <span className="inline-flex items-center gap-1.5">
                      {perm.name}
                      {isBetaPermission(perm.slug, perm.name) ? (
                        <span className="sub-beta">{tf('beta', 'BETA')}</span>
                      ) : null}
                    </span>
                  </td>
                  {plans.map((p) => {
                    const isCurrentCard = p.id === current?.plan_id && cycle === subscribedCycle;
                    const resolved = resolvePlanPermissions(p.permissions, isCurrentCard, purchasedStatusSlugs);
                    const row = resolved.find((x) => x.slug === perm.slug);
                    const val = permissionDisplay(row?.value ?? '0', Boolean(row?.included), row?.type ?? perm.type);
                    return (
                      <td key={p.id} className="feat-mono">
                        {val === '✓' ? <span className="check">✓</span> : val === '—' ? <span className="dash">—</span> : val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="addons-section" id="addonsSection">
        <div className="section-title">
          <span className="st-icon">✦</span> {tf('addonsTitle', 'Add-Ons Marketplace')}
          <button type="button" className="sub-btn" style={{ marginLeft: 'auto' }} onClick={openContact}>
            {tf('contactTitle', 'Contact us')}
          </button>
        </div>
        {!current ? (
          <div className="m-info">{tf('addonsNeedPlan', 'Add-ons are available after you have an active subscription.')}</div>
        ) : (
          <>
            <div className="addons-tabs">
              <div className={`ao-tab${addonTab === 'recurring' ? ' active' : ''}`}>
                <button type="button" className="ao-tab-btn" onClick={() => setAddonTab('recurring')}>
                  {tf('recurringTab', 'Recurring Add-Ons')}
                </button>
                <button
                  type="button"
                  className="ao-tip"
                  aria-label={tf('addonInfo', 'Info')}
                  onClick={() => setModal({ kind: 'tooltip', which: 'recurring' })}
                >
                  i
                </button>
              </div>
              <div className={`ao-tab${addonTab === 'usage' ? ' active' : ''}`}>
                <button type="button" className="ao-tab-btn" onClick={() => setAddonTab('usage')}>
                  {tf('usageTab', 'Usage-Based Add-Ons')}
                </button>
                <button
                  type="button"
                  className="ao-tip"
                  aria-label={tf('addonInfo', 'Info')}
                  onClick={() => setModal({ kind: 'tooltip', which: 'usage' })}
                >
                  i
                </button>
              </div>
            </div>
            <div className="ao-grid">
              {addonTab === 'recurring'
                ? (data?.addons.recurring ?? []).map(renderAddonCard)
                : (data?.addons.one_time ?? []).map(renderAddonCard)}
            </div>
            {(addonTab === 'recurring' ? data?.addons.recurring : data?.addons.one_time)?.length === 0 ? (
              <div className="m-info">{tf('noAddons', 'No add-ons are priced for your current plan.')}</div>
            ) : null}
          </>
        )}
        {(data?.purchased_addons ?? []).length > 0 ? (
          <div style={{ marginTop: 24 }}>
            <div className="section-title">{tf('purchasedTitle', 'Purchased add-ons')}</div>
            <div className="ao-grid">
              {(data?.purchased_addons ?? []).map((addon) => (
                <div key={addon.id} className="ao-card purchased">
                  <div className="ao-top">
                    <span className="ao-name">{addon.name}</span>
                    <div className="ao-price">{formatEuro(addon.total)}</div>
                  </div>
                  <div className="ao-desc">
                    {tf('count', 'Count')}: {addon.count} · {addon.start_date} → {addon.end_date}
                  </div>
                  <div className="ao-purchased-info">
                    {addon.is_cancelled ? tf('cancelled', 'Cancelled') : tf('active', 'Active')}
                    {addon.billing_type === 'recurring' && !addon.is_cancelled ? (
                      <span className="ps-autopay" style={{ marginLeft: 8 }}>
                        <span>{tf('autopayLabel', 'Autopay')}</span>
                        <button
                          type="button"
                          className={`ao-toggle${addon.auto_pay ? ' on' : ''}`}
                          role="switch"
                          aria-checked={addon.auto_pay}
                          disabled={busy}
                          onClick={() => void toggleAddonAutoPay(addon, !addon.auto_pay)}
                        >
                          <span className="knob" />
                        </button>
                      </span>
                    ) : addon.auto_pay ? (
                      ` · ${tf('autopayLabel', 'Autopay')}`
                    ) : null}
                  </div>
                  {!addon.is_cancelled ? (
                    <button type="button" className="ao-buy remove" onClick={() => setModal({ kind: 'cancel-addon', addon })}>
                      {tf('removeAddon', 'Remove')}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="billing-section">
        <h3>🏢 {tf('billingDetails', 'Billing Details')}</h3>
        <div className="billing-grid">
          <div className="b-field">
            <div className="b-label">{tf('companyName', 'Company Name')}</div>
            <div className="b-val">{data?.billing.company_name || '—'}</div>
          </div>
          <div className="b-field">
            <div className="b-label">{tf('vatId', 'VAT / Tax ID')}</div>
            <div className="b-val">{data?.billing.vat_id || '—'}</div>
          </div>
          <div className="b-field">
            <div className="b-label">{tf('billingAddress', 'Billing Address')}</div>
            <div className="b-val">{data?.billing.address || '—'}</div>
          </div>
          <div className="b-field">
            <div className="b-label">{tf('invoiceEmail', 'Invoice Email')}</div>
            <div className="b-val">{data?.billing.invoice_email || '—'}</div>
            <Link to="/billing" className="b-link">
              {tf('viewInvoices', 'View Invoices →')}
            </Link>
          </div>
        </div>
      </div>

      {modal && modalContent
        ? createPortal(
            <div className="sub-modal-overlay" onClick={closeModal} role="presentation">
              <div className="sub-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="sub-modal-head">
                  <h3>{modalContent.title}</h3>
                  <button type="button" className="sub-modal-close" onClick={closeModal} aria-label="Close">
                    ✕
                  </button>
                </div>
                <div className="sub-modal-body">{modalContent.body}</div>
                <div className="sub-modal-foot">
                  <button type="button" className="sub-btn" onClick={closeModal}>
                    {tf('cancelBtn', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    className={modalContent.danger ? 'sub-btn sub-btn-danger' : 'sub-btn sub-btn-p'}
                    disabled={busy || quoteLoading}
                    onClick={() => void confirmModal()}
                  >
                    {modalContent.confirm}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

export default SubscriptionPage;
