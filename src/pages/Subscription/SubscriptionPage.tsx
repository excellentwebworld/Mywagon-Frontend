import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/useToast';
import type { AddonTab, BillingCycle, PlanKey, SubModal } from './types';
import {
  BILLING_DETAILS,
  FEATURE_TABLE,
  INITIAL_PLAN,
  INITIAL_RECURRING_ADDONS,
  INITIAL_USAGE,
  INITIAL_USAGE_ADDONS,
  PLAN_FEATURES,
  PLAN_ORDER,
  PLANS,
  PRO_INCLUDED_ADDONS,
  RENEWAL_DATE,
  USAGE_RESET_DATE,
  formatDate,
  formatEuro,
  usageTone,
} from './mockData';
import './subscription.css';

const FEATURE_LABELS: Record<string, string> = {
  fPrivateLoads: 'Private loads / month',
  fPartners: 'Partner carriers',
  fPublicLoads: 'Post public loads',
  fSearchTrucks: 'Search available trucks',
  fMarketplace: 'Marketplace access',
  fManage: 'Manage shipments',
  fRating: 'Rate & review transporter',
  fChat: 'Chat with transporter',
  fDispatchers: 'Dispatcher accounts',
  fTrackingLinks: 'Tracking links',
  fBids: 'Bids / month',
  fGPS: 'GPS tracked routes',
  fPODs: 'Digital PODs',
  fMultistop: 'Multi-stop routes',
};

const USAGE_LABELS: Record<string, string> = {
  privateLoads: 'Private Loads',
  partners: 'Partners',
  dispatchers: 'Dispatchers',
  trackingLinks: 'Tracking Links',
  bids: 'Bids',
};

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
  cycle: BillingCycle;
  onChange: (c: BillingCycle) => void;
  monthlyLabel: string;
  yearlyLabel: string;
  saveLabel: string;
}) {
  return (
    <div className="cycle-toggle">
      <button
        type="button"
        className={`cycle-btn${cycle === 'monthly' ? ' active' : ''}`}
        onClick={() => onChange('monthly')}
      >
        {monthlyLabel}
      </button>
      <button
        type="button"
        className={`cycle-btn${cycle === 'yearly' ? ' active' : ''}`}
        onClick={() => onChange('yearly')}
      >
        {yearlyLabel}
        <span className="save-tag">{saveLabel}</span>
      </button>
    </div>
  );
}

export const SubscriptionPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const locale = i18n.language?.startsWith('el') ? 'el' : 'en';

  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [planKey, setPlanKey] = useState<PlanKey>(INITIAL_PLAN);
  const [addonTab, setAddonTab] = useState<AddonTab>('recurring');
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [usage, setUsage] = useState(INITIAL_USAGE);
  const [recurring, setRecurring] = useState(INITIAL_RECURRING_ADDONS);
  const [usageAddons, setUsageAddons] = useState(INITIAL_USAGE_ADDONS);
  const [modal, setModal] = useState<SubModal | null>(null);

  const plan = PLANS[planKey];
  const price = plan.price[cycle];
  const curIdx = PLAN_ORDER.indexOf(planKey);

  const tf = (key: string, fallback: string) => t(`subscriptionPage.${key}`, fallback);

  const featureLabel = (f: string) => tf(f, FEATURE_LABELS[f] ?? f);

  const closeModal = () => setModal(null);

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

  const scrollToAddons = () => {
    document.getElementById('addonsSection')?.scrollIntoView({ behavior: 'smooth' });
  };

  const applyPlanLimits = (next: PlanKey) => {
    const limits = PLANS[next].limits;
    setUsage((prev) =>
      prev.map((item) => {
        const raw = limits[item.key as keyof typeof limits];
        const limit = typeof raw === 'number' ? raw : null;
        return { ...item, limit };
      }),
    );
  };

  const confirmModal = () => {
    if (!modal) return;
    if (modal.kind === 'upgrade') {
      setPlanKey(modal.planKey);
      applyPlanLimits(modal.planKey);
      toast.success(tf('successUpgrade', 'Plan upgraded successfully!'));
    }
    if (modal.kind === 'enable') {
      setRecurring((prev) => prev.map((a) => (a.id === modal.addonId ? { ...a, enabled: true } : a)));
      toast.success(tf('successAddon', 'Add-on enabled!'));
    }
    if (modal.kind === 'remove') {
      setRecurring((prev) => prev.map((a) => (a.id === modal.addonId ? { ...a, enabled: false } : a)));
      toast.success(tf('successRemoved', 'Add-on will be removed at end of cycle.'));
    }
    if (modal.kind === 'purchase') {
      setUsageAddons((prev) =>
        prev.map((a) => (a.id === modal.addonId ? { ...a, owned: a.owned + a.cart } : a)),
      );
      const bought = usageAddons.find((a) => a.id === modal.addonId);
      if (bought) {
        const map: Record<string, string> = {
          extraTrackingLinks: 'trackingLinks',
          extraBids: 'bids',
          extraPrivateLoads: 'privateLoads',
        };
        const usageKey = map[bought.id];
        if (usageKey) {
          setUsage((prev) =>
            prev.map((u) =>
              u.key === usageKey && u.limit != null ? { ...u, limit: u.limit + bought.cart } : u,
            ),
          );
        }
      }
      toast.success(tf('successPurchase', 'Purchase completed!'));
    }
    closeModal();
  };

  const modalContent = useMemo(() => {
    if (!modal) return null;
    if (modal.kind === 'upgrade') {
      const p = PLANS[modal.planKey];
      const pr = p.price[cycle];
      return {
        title: `${tf('upgradeTitle', 'Upgrade to')} ${p.name}`,
        confirm: tf('confirmUpgrade', 'Confirm Upgrade'),
        danger: false,
        body: (
          <>
            <div className="m-highlight">
              <div className="mh-label">{tf('newPrice', 'New Monthly Price')}</div>
              <div className="mh-val">{pr === 0 ? tf('free', 'Free forever') : `${formatEuro(pr)}${tf('perMonth', '/month')}`}</div>
              <div className="mh-sub">
                {tf('effectiveDate', 'Effective')}: {tf('immediately', 'Immediately')}
              </div>
            </div>
            <div className="m-info">
              {tf(
                'prorationNote',
                'You will be charged a prorated amount for the remaining days of this billing cycle.',
              )}
            </div>
          </>
        ),
      };
    }
    if (modal.kind === 'enable') {
      const ao = recurring.find((a) => a.id === modal.addonId);
      if (!ao) return null;
      return {
        title: `${tf('enableTitle', 'Enable Add-On')} ${ao.name}`,
        confirm: tf('confirmEnable', 'Enable & Agree'),
        danger: false,
        body: (
          <>
            <div style={{ textAlign: 'center', fontSize: 28, marginBottom: 12 }}>{ao.icon}</div>
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{ao.name}</div>
            <div className="m-highlight">
              <div className="mh-label">{tf('monthlyCharge', 'Monthly Charge')}</div>
              <div className="mh-val">
                {formatEuro(ao.price)}
                <span style={{ fontSize: 13, color: 'var(--t3)', fontWeight: 500 }}> {ao.unit}</span>
              </div>
              <div className="mh-sub">{tf('chargedNextCycle', 'Charged on your next billing cycle')}</div>
            </div>
            <div className="m-info">
              {tf(
                'enableNote',
                'By enabling this add-on, you agree to be charged the amount shown above on each billing cycle. You can disable it at any time — charges stop at the end of the current cycle.',
              )}
            </div>
          </>
        ),
      };
    }
    if (modal.kind === 'remove') {
      const ao = recurring.find((a) => a.id === modal.addonId);
      if (!ao) return null;
      return {
        title: tf('removeTitle', 'Remove Add-On'),
        confirm: tf('confirmRemove', 'Confirm Removal'),
        danger: true,
        body: (
          <>
            <div style={{ textAlign: 'center', fontSize: 28, marginBottom: 12 }}>{ao.icon}</div>
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{ao.name}</div>
            <div className="m-info">
              {tf(
                'removeNote',
                'This add-on will be deactivated at the end of your current billing cycle. You will not be charged again.',
              )}
            </div>
          </>
        ),
      };
    }
    const ao = usageAddons.find((a) => a.id === modal.addonId);
    if (!ao) return null;
    const total = ao.price * ao.cart;
    return {
      title: `${tf('purchaseTitle', 'Purchase')} ${ao.name}`,
      confirm: tf('confirmPurchase', 'Confirm Purchase'),
      danger: false,
      body: (
        <>
          <div style={{ textAlign: 'center', fontSize: 28, marginBottom: 12 }}>{ao.icon}</div>
          <div className="m-highlight">
            <div className="mh-label">{tf('totalCost', 'Total Cost')}</div>
            <div className="mh-val">{formatEuro(total)}</div>
            <div className="mh-sub">
              {ao.cart} × {formatEuro(ao.price)} {ao.unit}
            </div>
          </div>
          <div className="m-info">
            {tf('purchaseNote', 'Units will be added to your account immediately and are non-refundable.')}
          </div>
        </>
      ),
    };
  }, [modal, cycle, recurring, usageAddons, t]);

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
          <div className="ps-value">{plan.name}</div>
          <div className="ps-sub">{price === 0 ? tf('free', 'Free forever') : `${formatEuro(price)}${tf('perMonth', '/month')}`}</div>
          <div className="ps-badge">
            <span className="dot" /> {tf('active', 'Active')}
          </div>
        </div>
        <div className="ps-card">
          <div className="ps-label">{tf('billingCycle', 'Billing Cycle')}</div>
          <div style={{ marginTop: 6 }}>
            <CycleToggle
              cycle={cycle}
              onChange={setCycle}
              monthlyLabel={tf('monthly', 'Monthly')}
              yearlyLabel={tf('yearly', 'Yearly')}
              saveLabel={tf('save9', '-9%')}
            />
          </div>
        </div>
        <div className="ps-card">
          <div className="ps-label">{tf('nextRenewal', 'Next Renewal')}</div>
          <div className="ps-value" style={{ fontSize: 15 }}>
            {planKey === 'essential' ? '—' : formatDate(RENEWAL_DATE, locale)}
          </div>
          <div className="ps-sub">
            {planKey === 'essential' ? tf('free', 'Free forever') : `€${price}${tf('perMonth', '/month')}`}
          </div>
        </div>
        <div className="ps-card">
          <div className="ps-label">{tf('paymentMethod', 'Payment')}</div>
          <div className="ps-value" style={{ fontSize: 14, color: 'var(--t3)' }}>
            {tf('noPayment', 'No payment method')}
          </div>
          <div className="ps-sub" style={{ marginTop: 4 }}>
            <button type="button" className="ps-link">
              {tf('addPayment', 'Add payment method')}
            </button>
          </div>
          <div className="ps-badge soon" style={{ marginTop: 6 }}>
            <span className="dot" /> {tf('autopayLabel', 'Autopay')}: {tf('comingSoon', 'Coming Soon')}
          </div>
        </div>
      </div>

      <div className="usage-section">
        <div className="usage-title">
          📊 {tf('usageTitle', 'Usage This Period')}
          <span className="reset">
            {tf('resetLabel', 'Resets')}: {formatDate(USAGE_RESET_DATE, locale)}
          </span>
        </div>
        <div className="usage-grid">
          {usage.map((u) => {
            const unlimited = u.limit == null;
            const pct = unlimited ? 0 : Math.round((u.used / u.limit) * 100);
            const tone = usageTone(u.used, u.limit);
            return (
              <div key={u.key} className={`usage-card ${tone === 'ok' ? '' : tone}`}>
                <div className="uc-top">
                  <div className="uc-name">{tf(u.key, USAGE_LABELS[u.key] ?? u.key)}</div>
                  <div className="uc-vals">
                    <span className="used">{u.used}</span>
                    <span className="lim"> / {unlimited ? tf('unlimited', 'Unlimited') : u.limit}</span>
                  </div>
                </div>
                <div className="uc-bar">
                  <div className={`uc-fill ${tone}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="uc-bottom">
                  <span className={`uc-pct ${tone}`}>{pct}%</span>
                  {pct >= 70 ? (
                    <button type="button" className="uc-action" onClick={scrollToAddons}>
                      {tf('increase', 'Increase')}
                    </button>
                  ) : null}
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
            saveLabel={tf('save9', '-9%')}
          />
        </div>
        <div className="plans-grid">
          {PLAN_ORDER.map((pKey, i) => {
            const p = PLANS[pKey];
            const pr = p.price[cycle];
            const isCurrent = pKey === planKey;
            const isUpgrade = i > curIdx;
            const yearlyOrig = pKey === 'plus' ? 550 : pKey === 'pro' ? 1100 : 0;
            const showOrig = cycle === 'yearly' && pr > 0 && yearlyOrig > pr;
            const note =
              pKey === 'plus'
                ? cycle === 'yearly'
                  ? tf('saveYearPlus', 'Save €600/year')
                  : tf('needsPlus', 'Everything for digital transformation')
                : pKey === 'pro'
                  ? cycle === 'yearly'
                    ? tf('saveYearPro', 'Save €1,200/year')
                    : tf('needsPro', 'For high-volume operations')
                  : '';

            return (
              <div key={pKey} className={`pcard${p.popular ? ' feat' : ''}${isCurrent ? ' current' : ''}`}>
                {isCurrent ? (
                  <span className="cur-tag">✓ {tf('currentPlanBtn', 'Current Plan')}</span>
                ) : p.popular ? (
                  <span className="pop-tag">{tf('popular', 'Popular')}</span>
                ) : null}
                <div className="pcard-top">
                  <div className="pnm">{p.name}</div>
                  <div className="pds">{p.desc}</div>
                  <div className="pr">
                    <span className="c">€</span>
                    <span className="a">{pr === 0 ? '0' : pr.toLocaleString('de-DE')}</span>
                    <span className="p">{tf('perMonth', '/month')}</span>
                    {showOrig ? (
                      <span className="o">
                        €{yearlyOrig}
                        {tf('perMonth', '/month')}
                      </span>
                    ) : null}
                  </div>
                  <div className="pnt">{p.free ? tf('freeForever', 'Free forever') : note}</div>
                </div>
                <div className="pcard-cta">
                  {isCurrent ? (
                    <button type="button" className="cta cur">
                      ✓ {tf('currentPlanBtn', 'Current Plan')}
                    </button>
                  ) : isUpgrade ? (
                    <button type="button" className="cta pri" onClick={() => setModal({ kind: 'upgrade', planKey: pKey })}>
                      {tf('upgradeTo', 'Upgrade to')} {p.name}
                    </button>
                  ) : (
                    <button type="button" className="cta sec" onClick={() => setModal({ kind: 'upgrade', planKey: pKey })}>
                      {tf('downgradeTo', 'Downgrade to')} {p.name}
                    </button>
                  )}
                </div>
                <div className="pcard-features">
                  <div className="flbl">{tf('includes', 'Includes')}</div>
                  <ul className="fl">
                    {PLAN_FEATURES.map((f) => {
                      const val = p.limits[f.k];
                      const on = val !== '✗' && val !== 0;
                      const showVal = (typeof val === 'number' || typeof val === 'string') && val !== '✓' && val !== '✗';
                      return (
                        <li key={f.k} className={`fi${on ? '' : ' off'}${f.k === 'marketplace' ? ' mp-feat' : ''}`}>
                          <span className={`ic ${on ? 'ok' : 'no'}`}>{on ? <CheckIcon /> : <DashIcon />}</span>
                          <span className="fi-label">{featureLabel(f.f)}</span>
                          {f.beta ? <span className="sub-beta">BETA</span> : null}
                          {showVal ? <span className="sub-feat-val">{val}</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className={`feat-toggle${featuresOpen ? ' open' : ''}`}
          onClick={() => setFeaturesOpen((v) => !v)}
        >
          <span className="chevron">▼</span>{' '}
          {featuresOpen ? tf('hideFeatures', 'Hide feature comparison') : tf('seeFeatures', 'See full feature comparison')}
        </button>
        <div className={`feat-table-wrap${featuresOpen ? ' show' : ''}`}>
          <table className="feat-table">
            <thead>
              <tr>
                <th>{tf('featureLabel', 'Feature')}</th>
                <th>Essential</th>
                <th>Plus</th>
                <th>Pro</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_TABLE.map((cat) => (
                <React.Fragment key={cat.name}>
                  <tr className="cat-row">
                    <td colSpan={4}>{cat.name}</td>
                  </tr>
                  {cat.features.map((row) => (
                    <tr key={row.f}>
                      <td>{featureLabel(row.f)}</td>
                      {[row.e, row.p, row.r].map((v, idx) => {
                        if (v === '✓' || v === '✓ BETA') {
                          return (
                            <td key={idx}>
                              <span className="check">✓</span>
                              {v.includes('BETA') ? (
                                <>
                                  {' '}
                                  <span className="sub-beta">BETA</span>
                                </>
                              ) : null}
                            </td>
                          );
                        }
                        if (v === '—') {
                          return (
                            <td key={idx}>
                              <span className="dash">—</span>
                            </td>
                          );
                        }
                        return (
                          <td key={idx} className="feat-mono">
                            {v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="addons-section" id="addonsSection">
        <div className="section-title">
          <span className="st-icon">✦</span> {tf('addonsTitle', 'Add-Ons Marketplace')}
        </div>
        <div className="addons-tabs">
          <button
            type="button"
            className={`ao-tab${addonTab === 'recurring' ? ' active' : ''}`}
            onClick={() => setAddonTab('recurring')}
          >
            {tf('recurringTab', 'Recurring Add-Ons')}
          </button>
          <button
            type="button"
            className={`ao-tab${addonTab === 'usage' ? ' active' : ''}`}
            onClick={() => setAddonTab('usage')}
          >
            {tf('usageTab', 'Usage-Based Add-Ons')}
          </button>
        </div>
        <div className="ao-grid">
          {addonTab === 'recurring'
            ? recurring.map((ao) => {
                const included = planKey === 'pro' && PRO_INCLUDED_ADDONS.includes(ao.id);
                return (
                  <div key={ao.id} className={`ao-card${ao.enabled ? ' purchased' : ''}`}>
                    <div className="ao-top">
                      <div>
                        <span style={{ fontSize: 18, marginRight: 6 }}>{ao.icon}</span>
                        <span className="ao-name">{ao.name}</span>
                      </div>
                      <div className="ao-price">
                        {formatEuro(ao.price)}
                        <span>{ao.unit}</span>
                      </div>
                    </div>
                    <div className="ao-desc">{ao.desc}</div>
                    {included ? (
                      <div className="ao-included">
                        <span className="plan-inc">✓</span> {tf('alreadyIncluded', 'Included in your plan')}
                      </div>
                    ) : (
                      <div className="ao-controls">
                        <button
                          type="button"
                          className={`ao-toggle${ao.enabled ? ' on' : ''}`}
                          onClick={() =>
                            setModal({ kind: ao.enabled ? 'remove' : 'enable', addonId: ao.id })
                          }
                          aria-label={ao.enabled ? tf('disableAddon', 'Disable') : tf('enableAddon', 'Enable')}
                        >
                          <div className="knob" />
                        </button>
                        <span className={`ao-status${ao.enabled ? ' active' : ''}`}>
                          {ao.enabled ? tf('disableAddon', 'Disable') : tf('enableAddon', 'Enable')}
                        </span>
                        {ao.enabled ? (
                          <button
                            type="button"
                            className="ao-buy remove"
                            onClick={() => setModal({ kind: 'remove', addonId: ao.id })}
                          >
                            {tf('removeAddon', 'Remove')}
                          </button>
                        ) : null}
                      </div>
                    )}
                    {ao.enabled ? (
                      <div className="ao-purchased-info">
                        ✓ {tf('addedLabel', 'Added to your account')} · {tf('willCharge', 'Will be charged on next billing cycle')}
                      </div>
                    ) : null}
                  </div>
                );
              })
            : usageAddons.map((ao) => (
                <div key={ao.id} className={`ao-card${ao.owned > 0 ? ' purchased' : ''}`}>
                  <div className="ao-top">
                    <div>
                      <span style={{ fontSize: 18, marginRight: 6 }}>{ao.icon}</span>
                      <span className="ao-name">{ao.name}</span>
                    </div>
                    <div className="ao-price">
                      {formatEuro(ao.price)}
                      <span>{ao.unit}</span>
                    </div>
                  </div>
                  <div className="ao-desc">{ao.desc}</div>
                  {ao.owned > 0 ? (
                    <div className="ao-purchased-info" style={{ marginBottom: 12 }}>
                      <span className="qty-owned">{ao.owned}</span> {tf('ownedLabel', 'Owned')}
                    </div>
                  ) : null}
                  <div className="ao-controls">
                    <div className="ao-counter">
                      <button
                        type="button"
                        onClick={() =>
                          setUsageAddons((prev) =>
                            prev.map((x) => (x.id === ao.id ? { ...x, cart: Math.max(1, x.cart - 1) } : x)),
                          )
                        }
                      >
                        −
                      </button>
                      <input className="qty" value={ao.cart} readOnly />
                      <button
                        type="button"
                        onClick={() =>
                          setUsageAddons((prev) =>
                            prev.map((x) => (x.id === ao.id ? { ...x, cart: x.cart + 1 } : x)),
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="ao-buy"
                      onClick={() => setModal({ kind: 'purchase', addonId: ao.id })}
                    >
                      {tf('buyNow', 'Purchase')} · {formatEuro(ao.price * ao.cart)}
                    </button>
                  </div>
                </div>
              ))}
        </div>
      </div>

      <div className="billing-section">
        <h3>🏢 {tf('billingDetails', 'Billing Details')}</h3>
        <div className="billing-grid">
          <div className="b-field">
            <div className="b-label">{tf('companyName', 'Company Name')}</div>
            <div className="b-val">{BILLING_DETAILS.companyName}</div>
          </div>
          <div className="b-field">
            <div className="b-label">{tf('vatId', 'VAT / Tax ID')}</div>
            <div className="b-val">{BILLING_DETAILS.vatId}</div>
          </div>
          <div className="b-field">
            <div className="b-label">{tf('billingAddress', 'Billing Address')}</div>
            <div className="b-val">{BILLING_DETAILS.address}</div>
          </div>
          <div className="b-field">
            <div className="b-label">{tf('invoiceEmail', 'Invoice Email')}</div>
            <div className="b-val">{BILLING_DETAILS.invoiceEmail}</div>
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
                    onClick={confirmModal}
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
