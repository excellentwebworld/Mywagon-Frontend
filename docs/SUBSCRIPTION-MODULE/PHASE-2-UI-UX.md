# Phase 2 — New Shipper Panel UI / UX

## 1. What exists today (React)

| Item | Location | State |
| --- | --- | --- |
| Route `/subscription` | `src/router.tsx` | Mock `SubscriptionPage` — **no API** |
| Types / mock plans | `src/pages/Subscription/{types,mockData,subscription.css}` | Prototype Essential/Plus/Pro |
| Nav | Sidebar, TopNav, Profile dropdown | Linked |
| Feature gates | `SubscriptionGateModal` | Deep-link `/subscription` (some modules still Laravel URL) |
| Billing | `/billing` PDS-948 | Invoices for subscription/add-on already listed |
| Settings → Subscription | Feature mapping: placeholder | Keep link to `/subscription` |

## 2. Old Blade screens to preserve

Single page `subscription.blade.php`:

1. Monthly / Yearly toggle (Yearly “Best value”).
2. Plan cards: name, € / month (yearly card shows yearly monthly-rate), Current Plan badge, Upgrade Plan, Enable Auto Pay (on upgrade), expandable permission list (included vs not).
3. Add-on column: Recurring + 1-Time (only with active subscription).
4. Benefits strip: plan chip, Auto Payment On/Off, Cancel Plan / Plan Cancelled, cards Active Users, Paid Users (overage), Renewal Date, Days Left (red if &lt; 7). Free: renewal N/A, days unlimited glyph.
5. Purchased add-ons grid.
6. Modals: add-on purchase, VAT, cancel confirm, enable auto-pay, add-on tooltips, contact us.

Payment is **not** an in-app card form: redirect Viva Smart Checkout (same as Billing Pay Now).

## 3. New UI (mock) vs old behavior

| New mock | Old production | Decision |
| --- | --- | --- |
| Essential “Free forever” | Free plan expires monthly and is reassigned | Show renewal/expiry from API; do not say forever unless product signs off a change |
| Autopay “Coming Soon” | Plan + add-on auto-pay exist | **Implement auto-pay** to match old panel |
| Usage meters (loads, partners, seats, bids) | Dashboard-ish counts only (dispatchers, partners, paid overage) | Keep usage if API can compute from same counters as `checkSubscriptionPermission` |
| Feature comparison table | Expandable per-card permission list | Either is OK; values **must** come from API |
| Upgrade modal local confirm (no payment) | Viva redirect + quote | Must call quote + Viva |
| Remove add-on “end of cycle” toast without API | Cancel flag; access until end | Call cancel API |
| Hardcoded add-on prices | Per-plan `addon_price` | API |
| Payment method “Add card” | Viva token via `allowRecurring` at checkout | No PCI card form; show Auto-pay on/off |
| Yearly save -9% | `price` vs `price_yearly` from DB | Compute from API, don’t hardcode 9% |
| Pro includes GPS/POD/multistop | DB permissions | API `included` flags |
| Link View Invoices | Billing module | Keep `/billing` |

## 4. Screens / components required

| Screen | Notes |
| --- | --- |
| Subscription page | Replace mock data with hooks |
| Plan cards | Current / Upgrade / hidden for yearly+lower |
| Quote + VAT modal | Mirror `calculatePayment` |
| Viva redirect / return | Query `t`,`s` like Billing |
| Cancel plan modal | |
| Add-on tabs Recurring / One-time | From API |
| Add-on quote modal + qty | |
| Purchased add-ons | Cancel + auto-pay toggle |
| Loading skeleton | Match Billing skeleton pattern |
| Empty add-ons | No active plan or no priced add-ons |
| Error toast | 422/403/Viva fail |
| Gate modal | Already exists; point to `/subscription` |

Responsive: existing `subscription.css`; keep Billing-level breakpoints. No new design system.

## 5. User journeys (SPA)

1. **New / Essential user:** see three plans → Upgrade Plus/Pro → quote → optional auto-pay → Viva → return verify → current plan Plus/Pro.
2. **Mid-cycle upgrade (monthly→monthly):** quote shows prorated new price; expire date unchanged.
3. **Yearly subscriber:** no upgrade buttons; cancel only; add-ons at yearly interval.
4. **Cancel:** confirm → cancelled badge → access until expire → cron Essential.
5. **Buy recurring add-on:** quote + VAT + auto-pay → Viva → purchased card.
6. **Buy count pack:** qty → Pay Now → usage limit increases.
7. **Cancel add-on:** remains until `end_date`.
8. **Failed Viva:** toast, plan unchanged.
9. **Past-due invoices:** Billing gate, not this page.

## 6. States

| Entity | States |
| --- | --- |
| Plan | essential/free, paid active, cancelled-but-unexpired, expired (briefly until cron), custom |
| Add-on | available, purchased active, cancelled, expired |
| Payment | idle, quoting, redirecting, verifying, success, failed, cancelled, timeout |
| Page | loading, error, ready |

## 7. Validation (frontend = backend)

- Plan id must be active shipper catalog id.
- Period `month`|`year`.
- Cannot start checkout if yearly current plan (match Blade).
- Add-on `addon_price_id` must belong to current plan.
- Count ≥ 1 integer.
- Cancel only own non-cancelled add-on / own plan.

## 8. Mapping old → new

| Old | New |
| --- | --- |
| Blade plan grid | Plan cards + comparison |
| `calculate-payment` | Upgrade modal totals |
| `payment/handle` | `POST .../plans/{id}/checkout` → `checkoutUrl` |
| `auto-pay` | Summary toggle |
| `cancel/plan` | Cancel modal |
| Add-on lists | Recurring / usage tabs **fed by API type** |
| `get-addon-price` | JSON quote (no HTML) |
| Purchased grid | Same data |
| Billing | Existing `/billing` |
| Dashboard plan chip | Keep dashboard API later; out of this module unless already present |

Do not ship the mock’s local `confirmModal()` mutations.
