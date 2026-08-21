import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  CalendarClock,
  CreditCard,
  Crown,
  Gem,
  Puzzle,
  Receipt,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/useToast';
import { ApiError, getApiErrorMessage } from '../../api';
import { subscriptionService as shipperSubscriptionService } from '../../api/services/subscriptionService';
import type { WebViewSubscriptionService } from '../../api/services/webViewSubscriptionService';
import type { WebViewRole } from '../../api/webviewClient';
import type {
  AddonQuote,
  BillingCycle as ApiCycle,
  PurchasedAddon,
  SubscriptionAddonOffer,
  SubscriptionOverview,
  SubscriptionPermissionItem,
  SubscriptionQuote,
} from '../../api/types/subscription';
import { formatDate, formatMoney, usageTone } from './mockData';
import { PriceBreakdown, type PriceBreakdownRow } from './PriceBreakdown';
import { SubscriptionModalSkeleton, SubscriptionSkeleton } from './SubscriptionSkeleton';
import {
  clearPendingCheckout,
  rememberPendingCheckout,
  notifyNativeOpenCheckout,
  notifyNativeForceLogout,
} from '../../utils/webviewCheckout';
import './subscription.css';

type UiCycle = 'monthly' | 'yearly';
type AddonTab = 'recurring' | 'usage';
type PaymentKind = 'plan' | 'addon';
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

const CARRIER_USAGE_LABELS: Record<string, string> = {
  number_of_fleet_manager_users: 'Number of Fleet Manager Users',
  number_of_driver_users: 'Number of Driver Users',
  add_partners: 'Add partners',
  partners: 'Partners',
};

const DRIVER_USAGE_LABELS: Record<string, string> = {
  partners_count: 'Partners',
  add_partners: 'Add partners',
  post_private_availability: 'Private Availability',
  post_public_availability: 'Public Availability',
};

function looksLikeSlug(value: string): boolean {
  return /^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(value.trim());
}

function humanizeSlug(slug: string): string {
  return slug
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type SubscriptionApi = typeof shipperSubscriptionService | WebViewSubscriptionService;

type SubscriptionPageProps = {
  variant?: 'shipper' | 'webview';
  webviewRole?: WebViewRole;
  subscriptionApi?: SubscriptionApi;
  userId?: string;
};

function formatEuro(n: number, currency?: string): string {
  return formatMoney(n, currency ?? 'EUR');
}

function toApiCycle(cycle: UiCycle): ApiCycle {
  return cycle === 'yearly' ? 'year' : 'month';
}

function currentIntervalToUi(
  interval?: string | null,
  startDate?: string | null,
  expireDate?: string | null,
): UiCycle {
  const raw = (interval ?? '').toLowerCase().trim();
  if (raw === 'year' || raw === 'yearly' || raw === 'annual' || raw === 'annually') {
    return 'yearly';
  }
  if (startDate && expireDate) {
    const start = Date.parse(startDate);
    const expire = Date.parse(expireDate);
    if (!Number.isNaN(start) && !Number.isNaN(expire) && (expire - start) / 86400000 >= 180) {
      return 'yearly';
    }
  }
  return 'monthly';
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
  applyPurchasedAddons = true,
): SubscriptionPermissionItem[] {
  return permissions
    .map((row) => {
      const granted =
        applyPurchasedAddons &&
        isCurrentCard &&
        row.type === 'status' &&
        purchasedStatusSlugs.has(row.slug);
      return {
        ...row,
        included: row.included || granted,
        value: granted && (!row.value || row.value === '0') ? '1' : row.value,
      };
    })
    .sort((a, b) => Number(b.included) - Number(a.included));
}

const BETA_PERMISSION_SLUGS = new Set<string>();

const BETA_PERMISSION_NAMES = new Set<string>();

function isBetaPermission(slug?: string | null, name?: string | null, isBeta?: boolean): boolean {
  if (isBeta) return true;
  if (slug && BETA_PERMISSION_SLUGS.has(slug)) return true;
  if (name && BETA_PERMISSION_NAMES.has(name.trim().toLowerCase())) return true;
  return false;
}

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({
  variant = 'shipper',
  webviewRole,
  subscriptionApi: subscriptionApiProp,
  userId,
}) => {
  const api = subscriptionApiProp ?? shipperSubscriptionService;
  const isWebView = variant === 'webview';
  const usageLabels =
    webviewRole === 'carrier'
      ? CARRIER_USAGE_LABELS
      : webviewRole === 'driver'
        ? DRIVER_USAGE_LABELS
        : USAGE_LABELS;
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const locale = i18n.language?.startsWith('el') ? 'el' : 'en';
  const tf = (key: string, fallback: string) => t(`subscriptionPage.${key}`, { defaultValue: fallback });
  const usageLabel = (slug: string, apiName?: string | null) => {
    const mapped = usageLabels[slug];
    const fallback = mapped ?? humanizeSlug(slug);
    const fromApi = (apiName || '').trim();
    if (!fromApi || fromApi === slug || looksLikeSlug(fromApi)) {
      return t(`subscriptionPage.usage.${slug}`, { defaultValue: fallback });
    }
    return fromApi;
  };

  const [paymentSettling, setPaymentSettling] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return Boolean(params.get('payment') || params.get('t') || params.get('transaction_id'));
  });
  const paymentSettlingRef = useRef(paymentSettling);
  paymentSettlingRef.current = paymentSettling;
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
  const [autoPayProcessing, setAutoPayProcessing] = useState<'plan' | number | null>(null);
  const [autoPayOnCheckout, setAutoPayOnCheckout] = useState(true);
  const [addonCounts, setAddonCounts] = useState<Record<number, number>>({});
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', description: '' });
  const [expandedPlanIds, setExpandedPlanIds] = useState<Record<number, boolean>>({});
  const dataRef = useRef(data);
  dataRef.current = data;

  const subscribedCycle: UiCycle = currentIntervalToUi(
    data?.current?.interval,
    data?.current?.start_date,
    data?.current?.expire_date,
  );
  const planCheckoutCycle = toApiCycle(cycle);
  // Add-ons must use the UI billing toggle, not the plan's interval, so a yearly
  // subscriber can still purchase at the monthly add-on rate when Monthly is selected.
  const addonCheckoutCycle = toApiCycle(cycle);

  const paymentToastMessages = useCallback(
    (kind: PaymentKind) => ({
      success:
        kind === 'addon'
          ? tf('successAddon', 'Add-on purchased successfully!')
          : tf('successUpgrade', 'Plan updated successfully!'),
      failed:
        kind === 'addon'
          ? tf('payFailedAddon', 'Add-on purchase was not completed.')
          : tf('payFailedPlan', 'Plan purchase was not completed.'),
    }),
    [t],
  );

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
    const isFirstLoad = !dataRef.current;
    if (isFirstLoad) setLoading(true);
    setError(null);
    try {
      const overview = await api.getOverview();
      if (!overview) {
        throw new Error('Unable to load subscription.');
      }
      setData(overview);
      if (overview.current) {
        setCycle(currentIntervalToUi(overview.current.interval, overview.current.start_date, overview.current.expire_date));
      }
    } catch (err) {
      setError(toError(err, tf('loadError', 'Unable to load subscription.')));
    } finally {
      setLoading(false);
    }
  }, [api, toError, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data?.current) return;
    setCycle(currentIntervalToUi(data.current.interval, data.current.start_date, data.current.expire_date));
  }, [data?.current?.user_subscription_id, data?.current?.interval, data?.current?.start_date, data?.current?.expire_date]);

  // Shipper only: center current plan in the horizontal carousel.
  // WebView: never auto-scroll — it also moves the page vertically in mobile WebViews.
  useEffect(() => {
    if (isWebView || !data) return;
    const currentCard = document.querySelector('.subscription-page .pcard.current');
    if (!(currentCard instanceof HTMLElement)) return;

    const track = currentCard.closest('.plans-grid');
    if (!(track instanceof HTMLElement)) return;

    const cardRect = currentCard.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    const nextLeft =
      track.scrollLeft +
      (cardRect.left - trackRect.left) -
      (track.clientWidth - currentCard.clientWidth) / 2;
    track.scrollLeft = Math.max(0, nextLeft);
  }, [data?.current?.plan_id, cycle, isWebView]);

  // WebView: always pin to top after mount and after content replaces the skeleton.
  useLayoutEffect(() => {
    if (!isWebView) return undefined;
    const toTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      document.querySelectorAll<HTMLElement>('.webview-subscription-shell, .webview-subscription-main').forEach((el) => {
        el.scrollTop = 0;
      });
    };
    toTop();
    const timers = [0, 100, 300, 600].map((ms) => window.setTimeout(toTop, ms));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [isWebView, loading, data]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const transactionId = params.get('t') || params.get('transaction_id');
    const orderCode = params.get('s') || params.get('order_code');
    const kindParam = params.get('kind');
    const forceLogout = params.get('force_logout') === '1';
    const paymentKind: PaymentKind = kindParam === 'addon' ? 'addon' : 'plan';
    const messages = paymentToastMessages(paymentKind);
    let cancelled = false;

    const clearQuery = () => {
      const url = new URL(window.location.href);
      ['payment', 'kind', 't', 's', 'transaction_id', 'order_code', 'force_logout'].forEach((k) =>
        url.searchParams.delete(k),
      );
      if (isWebView && userId) {
        url.searchParams.set('user_id', userId);
      }
      window.history.replaceState({}, '', url.pathname + url.search);
    };

    const maybeForceLogout = (shouldLogout: boolean) => {
      // Only native carrier/driver WebViews — never shipper browser / Blade.
      if (!shouldLogout || !isWebView) return;
      notifyNativeForceLogout(paymentKind === 'addon' ? 'addon_purchased' : 'plan_purchased');
    };

    /**
     * Order matters for WebView:
     * 1) Persist/verify payment in DB
     * 2) Refresh subscription data from API
     * 3) Only then show success UI / native callbacks
     */
    const finishSuccess = async (kind: PaymentKind, shouldForceLogout = forceLogout) => {
      if (cancelled) return;
      try {
        await load();
        if (cancelled) return;
        clearPendingCheckout();
        clearQuery();
        toast.success(paymentToastMessages(kind).success);
        maybeForceLogout(shouldForceLogout);
      } finally {
        if (!cancelled) setPaymentSettling(false);
      }
    };

    const settleFailure = (message: string) => {
      if (cancelled) return;
      clearPendingCheckout();
      clearQuery();
      setPaymentSettling(false);
      toast.error(message);
    };

    if (!payment && !transactionId && !orderCode) {
      setPaymentSettling(false);
      return;
    }

    setPaymentSettling(true);

    if (payment === 'failed' || payment === 'cancel' || payment === 'cancelled') {
      settleFailure(messages.failed);
      return;
    }

    // Prefer client verify when Viva transaction id is present (ensures DB is updated before success UI).
    if (transactionId) {
      api
        .verifyPayment(transactionId, orderCode || undefined)
        .then(async (result) => {
          if (cancelled) return;
          const shouldLogout = forceLogout || Boolean(result.force_logout);
          await finishSuccess(result.kind === 'addon' ? 'addon' : 'plan', shouldLogout);
        })
        .catch(async (err) => {
          if (cancelled) return;
          if (payment === 'success') {
            // Laravel payment-success already persisted; still refresh before toasting.
            await finishSuccess(paymentKind, forceLogout);
            return;
          }
          settleFailure(toError(err, messages.failed));
        });
      return () => {
        cancelled = true;
      };
    }

    if (payment === 'success') {
      void finishSuccess(paymentKind, forceLogout);
    } else {
      setPaymentSettling(false);
    }

    return () => {
      cancelled = true;
    };
  }, [api, load, paymentToastMessages, toast, toError, isWebView, userId]);

  // WebView only: after returning from Viva, refresh subscription (skip while payment is settling).
  useEffect(() => {
    if (!isWebView) return undefined;

    const refresh = () => {
      if (paymentSettlingRef.current) return;
      if (document.visibilityState && document.visibilityState !== 'visible') return;
      void load();
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [isWebView, load]);

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
    if (modal.kind !== 'upgrade' && modal.kind !== 'buy-addon') {
      setQuote(null);
      setQuoteLoading(false);
      return;
    }
    setQuote(null);
    setQuoteLoading(true);
    const run = async () => {
      try {
        if (modal.kind === 'upgrade') {
          setQuote(await api.quotePlan(modal.planId, planCheckoutCycle));
        }
        if (modal.kind === 'buy-addon') {
          setQuote(await api.quoteAddon(modal.addon.addon_price_id, modal.count, addonCheckoutCycle));
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

  const startCheckout = async (
    url: string | null,
    activated?: boolean,
    kind: PaymentKind = 'plan',
    orderCode?: string | null,
  ) => {
    const messages = paymentToastMessages(kind);
    if (activated) {
      clearPendingCheckout();
      toast.success(messages.success);
      closeModal();
      await load();
      return;
    }
    if (url) {
      rememberPendingCheckout(orderCode, kind);
      notifyNativeOpenCheckout(url, orderCode);
      window.location.assign(url);
      return;
    }
    toast.error(messages.failed);
  };

  const submitContact = async () => {
    if (busy) return;
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.phone.trim() || contactForm.description.trim().length < 5) {
      toast.error(tf('contactInvalid', 'Please fill in name, email, phone, and a short message.'));
      return;
    }
    setBusy(true);
    try {
      await api.contactUs({
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
        const result = await api.checkoutPlan(modal.planId, planCheckoutCycle, autoPayOnCheckout);
        await startCheckout(result.checkout_url, result.activated, 'plan', result.order_code);
        return;
      }
      if (modal.kind === 'buy-addon') {
        const result = await api.checkoutAddon(
          modal.addon.addon_price_id,
          modal.count,
          addonCheckoutCycle,
          autoPayOnCheckout && modal.addon.billing_type === 'recurring',
        );
        await startCheckout(result.checkout_url, result.activated, 'addon', result.order_code);
        return;
      }
      if (modal.kind === 'cancel-plan') {
        await api.cancelPlan();
        toast.success(tf('successCancel', 'Plan cancelled. Access continues until the period ends.'));
        closeModal();
        await load();
        return;
      }
      if (modal.kind === 'cancel-addon') {
        await api.cancelAddon(modal.addon.id);
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
    if (autoPayProcessing) return;
    if (enabled && data?.current && !data.current.has_payment_method) {
      toast.error(tf('autopayNeedsCheckout', 'Complete a checkout with auto-pay to store a payment method.'));
      return;
    }
    setAutoPayProcessing('plan');
    try {
      await api.setAutoPay(enabled);
      toast.success(enabled ? tf('autopayOn', 'Auto-pay enabled.') : tf('autopayOff', 'Auto-pay disabled.'));
      await load();
    } catch (err) {
      toast.error(toError(err, tf('actionFailed', 'Unable to complete this action.')));
    } finally {
      setAutoPayProcessing(null);
    }
  };

  const toggleAddonAutoPay = async (addon: PurchasedAddon, enabled: boolean) => {
    if (autoPayProcessing) return;
    setAutoPayProcessing(addon.id);
    try {
      await api.setAddonAutoPay(addon.id, enabled);
      toast.success(enabled ? tf('autopayOn', 'Auto-pay enabled.') : tf('autopayOff', 'Auto-pay disabled.'));
      await load();
    } catch (err) {
      toast.error(toError(err, tf('actionFailed', 'Unable to complete this action.')));
    } finally {
      setAutoPayProcessing(null);
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
  const currency = data?.currency ?? 'EUR';
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
      const planLabel = plan?.name ?? q?.plan_name ?? '';
      const periodLabel = q?.period === 'year' ? tf('yearly', 'Yearly') : tf('monthly', 'Monthly');
      return {
        title: `${tf('upgradeTitle', 'Upgrade to')} ${planLabel}`,
        confirm: busy ? tf('processing', 'Processing…') : tf('payNow', 'Pay Now'),
        danger: false,
        body: quoteLoading || busy ? (
          <SubscriptionModalSkeleton variant="quote" />
        ) : q ? (
          <>
            <PriceBreakdown
              descriptionLabel={tf('description', 'Description')}
              rows={[
                {
                  id: 'plan',
                  label: `${tf('planPrice', 'Plan Price')} - ${planLabel} (${periodLabel})`,
                  value: formatEuro(q.subtotal, q.currency),
                },
                {
                  id: 'vat',
                  divider: true,
                  label: `${tf('vatTax', 'VAT Tax')} (${q.vat_percent}%)`,
                  value: formatEuro(q.vat_amount, q.currency),
                },
                {
                  id: 'grand',
                  divider: true,
                  strong: true,
                  label: tf('grandTotal', 'Grand Total'),
                  value: formatEuro(q.total, q.currency),
                },
              ]}
              footer={
                <label className="pb-autopay">
                  <span>{tf('enableAutopay', 'Enable Auto Pay')}</span>
                  <input type="checkbox" checked={autoPayOnCheckout} onChange={(e) => setAutoPayOnCheckout(e.target.checked)} />
                </label>
              }
            />
            {q.prorated ? <div className="m-info">{tf('proratedNote', 'Price is prorated for the unused days in your current billing period.')}</div> : null}
            {q.vat_percent > 0 ? (
              <div className="m-info">
                {tf('vatNote', 'As per EU tax regulations, customers from Greece are required to pay')} {q.vat_percent}% {tf('vatOnDigital', 'VAT on digital services and products.')}
              </div>
            ) : null}
          </>
        ) : null,
      };
    }
    if (modal.kind === 'buy-addon') {
      const q = quote as AddonQuote | null;
      const cur = q?.currency ?? currency;
      const months = q?.interval === 'year' ? 12 : 1;
      const count = q?.count ?? modal.count;
      const unit = q?.unit_price ?? 0;
      const totalExpr =
        count > 1
          ? `${count} × ${months} ${tf('month', 'Month')} × ${formatEuro(unit, cur)}`
          : `${months} ${tf('month', 'Month')} × ${formatEuro(unit, cur)}`;
      return {
        title: modal.addon.name,
        confirm: busy ? tf('processing', 'Processing…') : tf('payNow', 'Pay Now'),
        danger: false,
        body: quoteLoading || busy ? (
          <SubscriptionModalSkeleton variant="quote" />
        ) : q ? (
          <>
            <PriceBreakdown
              descriptionLabel={tf('description', 'Description')}
              rows={[
                {
                  id: 'addon',
                  label: `${tf('addonFeatures', 'Add-On Features')} - ${q.name || modal.addon.name}`,
                  value: formatEuro(unit, cur),
                },
                ...(modal.addon.type === 'count' || count > 1
                  ? ([
                      {
                        id: 'count',
                        label: tf('count', 'Count'),
                        value: String(count),
                      },
                    ] satisfies PriceBreakdownRow[])
                  : []),
                {
                  id: 'total',
                  divider: true,
                  label: `${tf('total', 'Total')} (${totalExpr})`,
                  value: formatEuro(q.subtotal, cur),
                },
                {
                  id: 'vat',
                  label: `${tf('vatTax', 'VAT Tax')} (${q.vat_percent}%)`,
                  value: formatEuro(q.vat_amount, cur),
                },
                {
                  id: 'grand',
                  divider: true,
                  strong: true,
                  label: tf('grandTotal', 'Grand Total'),
                  value: formatEuro(q.total, cur),
                },
              ]}
              footer={
                q.is_recurring ? (
                  <label className="pb-autopay">
                    <span>{tf('enableAutopay', 'Enable Auto Pay')}</span>
                    <input type="checkbox" checked={autoPayOnCheckout} onChange={(e) => setAutoPayOnCheckout(e.target.checked)} />
                  </label>
                ) : undefined
              }
            />
            {!q.is_recurring ? (
              <div className="m-info">{tf('purchaseNote', 'Units are added after payment according to the billing option you selected.')}</div>
            ) : null}
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
        confirm: busy ? tf('processing', 'Processing…') : tf('confirmCancel', 'Cancel plan'),
        danger: true,
        body: busy ? (
          <SubscriptionModalSkeleton variant="confirm" />
        ) : (
          <div className="m-info">{tf('cancelPlanNote', 'You keep access until the current period ends. Auto-pay will be turned off.')}</div>
        ),
      };
    }
    if (modal.kind === 'contact') {
      return {
        title: tf('contactTitle', 'Contact us'),
        confirm: busy ? tf('processing', 'Processing…') : tf('contactSubmit', 'Submit Request'),
        danger: false,
        body: busy ? (
          <SubscriptionModalSkeleton variant="form" />
        ) : (
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
      confirm: busy ? tf('processing', 'Processing…') : tf('removeAddon', 'Remove'),
      danger: true,
      body: busy ? (
        <SubscriptionModalSkeleton variant="confirm" />
      ) : (
        <div className="m-info">{tf('cancelAddonNote', 'The add-on stays active until its end date, then it will not renew.')}</div>
      ),
    };
  }, [modal, plans, quote, quoteLoading, busy, autoPayOnCheckout, contactForm, currency, t]);

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
            {formatEuro(price, currency)}
            <span> / {tf('month', 'month')}</span>
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

  if ((loading && !data) || (paymentSettling && !data)) {
    return <SubscriptionSkeleton />;
  }

  const pageClass = isWebView ? 'subscription-page webview-subscription' : 'subscription-page';

  if (error && !data) {
    return (
      <div className={pageClass}>
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
    <div className={pageClass}>
      {paymentSettling ? (
        <div className="m-info" style={{ marginBottom: 12 }} role="status" aria-live="polite">
          {tf('settlingPayment', 'Confirming your payment…')}
        </div>
      ) : null}
      <header className="sub-head">
        <div className="sub-head-l">
          <div className="sub-head-title-row">
            <span className="sub-head-icon" aria-hidden="true">
              <Crown size={18} />
            </span>
            <h1 className="pg-t">{tf('pgTitle', 'Subscription')}</h1>
          </div>
          {!isWebView ? <p className="pg-s">{tf('pgSub', 'Manage your plan, usage, and add-ons')}</p> : null}
        </div>
        <div className="pg-head-r">
          <Link
            to={
              isWebView && webviewRole && userId
                ? `/webview/${webviewRole}/billing?user_id=${encodeURIComponent(userId)}`
                : '/billing'
            }
            className="sub-btn sub-btn-outline"
          >
            <Receipt size={15} />
            {tf('viewInvoicesShort', 'View Invoices')}
          </Link>
        </div>
      </header>

      <div className="plan-summary">
        <div className="ps-card ps-card--plan">
          <div className="ps-card-top">
            <span className="ps-icon ps-icon--purple" aria-hidden="true">
              <Sparkles size={16} />
            </span>
            <div className="ps-label">{tf('currentPlan', 'Current Plan')}</div>
          </div>
          <div className="ps-value">{current?.plan_name ?? '—'}</div>
          <div className="ps-sub">
            {current?.is_free ? tf('freePlan', 'Free plan') : `${formatEuro(displayPrice, currency)}${tf('perMonth', '/month')}`}
          </div>
          <div className={`ps-badge${current?.is_cancelled ? ' cancelled' : ''}`}>
            <span className="dot" /> {current?.is_cancelled ? tf('cancelled', 'Cancelled') : tf('active', 'Active')}
          </div>
        </div>
        <div className="ps-card">
          <div className="ps-card-top">
            <span className="ps-icon ps-icon--blue" aria-hidden="true">
              <RefreshCw size={16} />
            </span>
            <div className="ps-label">{tf('billingCycle', 'Billing Cycle')}</div>
          </div>
          <div className="ps-value">{subscribedCycle === 'yearly' ? tf('yearly', 'Yearly') : tf('monthly', 'Monthly')}</div>
          <div className="ps-sub">
            {subscribedCycle === 'yearly' ? tf('billedYearly', 'Billed once per year') : tf('billedMonthly', 'Billed every month')}
          </div>
        </div>
        <div className="ps-card">
          <div className="ps-card-top">
            <span className="ps-icon ps-icon--amber" aria-hidden="true">
              <CalendarClock size={16} />
            </span>
            <div className="ps-label">{tf('nextRenewal', 'Next Renewal')}</div>
          </div>
          <div className="ps-value ps-value--sm">
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
          <div className="ps-card-top">
            <span className="ps-icon ps-icon--green" aria-hidden="true">
              <CreditCard size={16} />
            </span>
            <div className="ps-label">{tf('paymentMethod', 'Payment')}</div>
          </div>
          <div className="ps-value ps-value--muted">
            {current?.has_payment_method
              ? current.payment_method_label || tf('cardOnFile', 'Saved via Viva Wallet')
              : tf('noPayment', 'No payment method')}
          </div>
          <div className="ps-autopay">
            <span>{tf('autopayLabel', 'Autopay')}</span>
            {autoPayProcessing === 'plan' ? (
              <span className="ao-autopay-processing" aria-live="polite">
                <RefreshCw size={12} className="ao-autopay-spinner" aria-hidden="true" />
                {tf('processing', 'Processing…')}
              </span>
            ) : (
              <button
                type="button"
                className={`ao-toggle${current?.recurring_payment ? ' on' : ''}`}
                role="switch"
                aria-checked={Boolean(current?.recurring_payment)}
                aria-label={tf('autopayLabel', 'Autopay')}
                disabled={!current || current.is_free || busy || autoPayProcessing !== null}
                onClick={() => void togglePlanAutoPay(!current?.recurring_payment)}
              >
                <span className="knob" />
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="sub-panel usage-section">
        <div className="sub-section-head">
          <span className="sub-section-icon" aria-hidden="true">
            <BarChart3 size={16} />
          </span>
          <div className="usage-title">
            {tf('usageTitle', 'Usage This Period')}
            <span className="reset">
              {tf('resetLabel', 'Resets')}: {current?.is_free ? tf('renewalNa', 'N/A') : current?.expire_date ? formatDate(current.expire_date, locale) : '—'}
            </span>
          </div>
        </div>
        <div className="usage-grid">
          {!isWebView ? (
            <>
              <div className="usage-card usage-card--seat">
                <div className="uc-top">
                  <div className="uc-name">
                    <Users size={13} className="uc-icon" aria-hidden="true" />
                    {tf('activeUsers', 'Active Users')}
                  </div>
                  <div className="uc-vals">
                    <span className="used">{data?.seats?.active_users ?? 0}</span>
                  </div>
                </div>
              </div>
              <div className="usage-card usage-card--seat">
                <div className="uc-top">
                  <div className="uc-name">
                    <Users size={13} className="uc-icon" aria-hidden="true" />
                    {tf('paidUsers', 'Paid Users')}
                  </div>
                  <div className="uc-vals">
                    <span className="used">{data?.seats?.paid_users ?? 0}</span>
                  </div>
                </div>
              </div>
            </>
          ) : null}
          {(data?.usage ?? []).map((u) => {
            const unlimited = u.unlimited || u.limit == null;
            const pct = unlimited ? 0 : Math.round((u.used / Math.max(u.limit || 1, 1)) * 100);
            const tone = usageTone(u.used, unlimited ? null : u.limit);
            return (
              <div key={u.slug} className={`usage-card ${tone === 'ok' ? '' : tone}`}>
                <div className="uc-top">
                  <div className="uc-name">{usageLabel(u.slug, u.name)}</div>
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
      </section>

      <section className="sub-panel plans-section">
        <div className="plans-header">
          <div className="sub-section-head">
            <span className="sub-section-icon sub-section-icon--gem" aria-hidden="true">
              <Gem size={16} />
            </span>
            <h2>{tf('choosePlan', 'Choose Your Plan')}</h2>
          </div>
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
              cycle === 'yearly' ? p.upgrade_available_yearly : p.upgrade_available_monthly;
            const planPermissions = resolvePlanPermissions(
              p.permissions,
              isCurrentCard,
              purchasedStatusSlugs,
              !isWebView,
            );
            const included = planPermissions.filter((row) => row.included);
            const planExpanded = Boolean(expandedPlanIds[p.id]);
            const previewLimit = 6;
            const shownPermissions = planExpanded ? planPermissions : included.slice(0, previewLimit);
            const hiddenCount = planPermissions.length - shownPermissions.length;
            return (
              <div key={p.id} className={`pcard${isCurrentCard ? ' current' : ''}`}>
                {isCurrentCard ? <span className="cur-tag">✓ {tf('currentPlanBtn', 'Current Plan')}</span> : null}
                <div className="pcard-top">
                  <div className="pnm">{p.name}</div>
                  {!isWebView && p.description ? <div className="pds">{p.description}</div> : null}
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
                  ) : (
                    <button type="button" className="cta sec" disabled>
                      {tf('notAvailable', 'Not available')}
                    </button>
                  )}
                </div>
                <div className="pcard-features">
                  <div className="flbl">{tf('includes', 'Includes')}</div>
                  <ul className="fl">
                    {shownPermissions.map((row) => {
                      const val = permissionDisplay(row.value, row.included, row.type);
                      const on = row.included;
                      const showCount = row.type !== 'status';
                      return (
                        <li key={row.slug} className={`fi${on ? '' : ' off'}`}>
                          <span className={`ic ${on ? 'ok' : 'no'}`}>{on ? <CheckIcon /> : <DashIcon />}</span>
                          <span className="fi-label">{row.name}</span>
                          {isBetaPermission(row.slug, row.name, row.is_beta) ? (
                            <span className="sub-beta">{tf('beta', 'BETA')}</span>
                          ) : null}
                          {showCount ? (
                            <span className={`sub-feat-val${val === '∞' ? ' is-infinity' : ''}`}>
                              {val === '∞' ? <span className="infinity-sign">∞</span> : val}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                  {hiddenCount > 0 || planExpanded ? (
                    <button
                      type="button"
                      className="feat-more"
                      onClick={() => setExpandedPlanIds((prev) => ({ ...prev, [p.id]: !planExpanded }))}
                    >
                      {planExpanded
                        ? tf('showLessFeatures', 'Show less')
                        : `+${hiddenCount} ${tf('moreFeatures', 'more')}`}
                    </button>
                  ) : null}
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
                      {isBetaPermission(perm.slug, perm.name, perm.is_beta) ? (
                        <span className="sub-beta">{tf('beta', 'BETA')}</span>
                      ) : null}
                    </span>
                  </td>
                  {plans.map((p) => {
                    const isCurrentCard = p.id === current?.plan_id && cycle === subscribedCycle;
                    const resolved = resolvePlanPermissions(
                      p.permissions,
                      isCurrentCard,
                      purchasedStatusSlugs,
                      !isWebView,
                    );
                    const row = resolved.find((x) => x.slug === perm.slug);
                    const val = permissionDisplay(row?.value ?? '0', Boolean(row?.included), row?.type ?? perm.type);
                    return (
                      <td key={p.id} className="feat-mono">
                        {val === '✓' ? (
                          <span className="check">✓</span>
                        ) : val === '—' ? (
                          <span className="dash">—</span>
                        ) : val === '∞' ? (
                          <span className="infinity-sign">∞</span>
                        ) : (
                          val
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sub-panel addons-section" id="addonsSection">
        <details className="sub-fold" {...(!isWebView ? { open: true } : {})}>
        <summary className="section-title">
          <span className="st-icon" aria-hidden="true">
            <Puzzle size={15} />
          </span>
          <span>{tf('addonsTitle', 'Add-Ons Marketplace')}</span>
        </summary>
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
                    <div className="ao-price">{formatEuro(addon.total, currency)}</div>
                  </div>
                  <div className="ao-desc">
                    {tf('count', 'Count')}: {addon.count} · {formatDate(addon.start_date, locale)} → {formatDate(addon.end_date, locale)}
                  </div>
                  <div className="ao-purchased-info">
                    <div className="ao-purchased-status">
                      {addon.is_cancelled ? tf('cancelled', 'Cancelled') : tf('active', 'Active')}
                      {addon.billing_type === 'recurring' && !addon.is_cancelled ? (
                        <span className="ps-autopay">
                          <span>{tf('autopayLabel', 'Autopay')}</span>
                          {autoPayProcessing === addon.id ? (
                            <span className="ao-autopay-processing" aria-live="polite">
                              <RefreshCw size={12} className="ao-autopay-spinner" aria-hidden="true" />
                              {tf('processing', 'Processing…')}
                            </span>
                          ) : (
                            <button
                              type="button"
                              className={`ao-toggle${addon.auto_pay ? ' on' : ''}`}
                              role="switch"
                              aria-checked={addon.auto_pay}
                              disabled={busy || autoPayProcessing !== null}
                              onClick={() => void toggleAddonAutoPay(addon, !addon.auto_pay)}
                            >
                              <span className="knob" />
                            </button>
                          )}
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
                </div>
              ))}
            </div>
          </div>
        ) : null}
        </details>
      </section>

      <section className="sub-panel billing-section">
        <details className="sub-fold" {...(!isWebView ? { open: true } : {})}>
        <summary className="sub-section-head">
          <span className="sub-section-icon" aria-hidden="true">
            <Building2 size={16} />
          </span>
          <h3>{tf('billingDetails', 'Billing Details')}</h3>
        </summary>
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
            <div className="b-val">
              {(data?.billing.address_lines?.length
                ? data.billing.address_lines
                : [data?.billing.address].filter(Boolean)).map((line) => (
                <div key={line}>{line}</div>
              ))}
              {!data?.billing.address && !data?.billing.address_lines?.length ? '—' : null}
            </div>
          </div>
          <div className="b-field">
            <div className="b-label">{tf('invoiceEmail', 'Invoice Email')}</div>
            <div className="b-val">{data?.billing.invoice_email || '—'}</div>
            <Link
              to={
                isWebView && webviewRole && userId
                  ? `/webview/${webviewRole}/billing?user_id=${encodeURIComponent(userId)}`
                  : '/billing'
              }
              className="b-link"
            >
              <Receipt size={12} />
              {tf('viewInvoices', 'View Invoices')}
            </Link>
          </div>
        </div>
        </details>
      </section>

      {modal && modalContent
        ? createPortal(
            <div
              className="sub-modal-overlay"
              onClick={busy || quoteLoading ? undefined : closeModal}
              role="presentation"
            >
              <div className="sub-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-busy={busy || quoteLoading}>
                <div className="sub-modal-head">
                  <h3>{modalContent.title}</h3>
                  <button
                    type="button"
                    className="sub-modal-close"
                    onClick={closeModal}
                    aria-label="Close"
                    disabled={busy || quoteLoading}
                  >
                    ✕
                  </button>
                </div>
                <div className="sub-modal-body">{modalContent.body}</div>
                <div className="sub-modal-foot">
                  {busy || quoteLoading ? (
                    <div className="sub-modal-foot-skel" aria-hidden="true">
                      <span className="sub-modal-skel-btn" />
                      <span className="sub-modal-skel-btn sub-modal-skel-btn--pri" />
                    </div>
                  ) : (
                    <>
                      <button type="button" className="sub-btn" onClick={closeModal}>
                        {tf('cancelBtn', 'Cancel')}
                      </button>
                      <button
                        type="button"
                        className={modalContent.danger ? 'sub-btn sub-btn-danger' : 'sub-btn sub-btn-p'}
                        onClick={() => void confirmModal()}
                      >
                        {modalContent.confirm}
                      </button>
                    </>
                  )}
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
