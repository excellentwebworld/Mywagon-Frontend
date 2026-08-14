# PDS 948 – Shipper UI Revamp: Billing

Production implementation of the React Billing module on top of existing Laravel invoice, wallet, bank-transfer, and Viva Wallet flows.

**Do not invent dispute or Managed Payments features.** Those are not in the live billing system.

## Documents

| Doc | Owner | Purpose |
| --- | --- | --- |
| [PHASE-1-EXISTING-ARCHITECTURE.md](./PHASE-1-EXISTING-ARCHITECTURE.md) | FE + BE | Old panel + Viva flow (inspected) |
| [PHASE-2-API-ASSESSMENT.md](./PHASE-2-API-ASSESSMENT.md) | BE | What to reuse vs add |
| [PHASE-3-BACKEND.md](./PHASE-3-BACKEND.md) | Backend | Implementation notes |
| [PHASE-4-FRONTEND.md](./PHASE-4-FRONTEND.md) | Frontend | UI mapping |
| [PHASE-5-VIVA.md](./PHASE-5-VIVA.md) | BE + FE | Checkout, webhook, verify |
| [PHASE-6-INTEGRATION.md](./PHASE-6-INTEGRATION.md) | FE + BE | API contract |
| [PHASE-7-TESTING.md](./PHASE-7-TESTING.md) | QA + both | Scenarios |
| [PHASE-8-RELEASE.md](./PHASE-8-RELEASE.md) | Both | Regression and deploy |

## UI rules (requirement 2)

- Match the HTML/prototype layout for SaaS & Fees, Credits & Adjustments, Statements & Exports.
- **Remove** Managed Payments toolbar tab.
- **Remove** In dispute / dispute modals (no backend dispute workflow).
- Keep existing actions: Pay Now (Viva), Pay using wallet, Bank transfer receipt, view/print invoice, wallet credit, overdue banner, `account_statement` upgrade notice.

## Split of work

| Area | Backend | Frontend |
| --- | --- | --- |
| Invoice list/detail/summary | ShipperBillingService + controllers | BillingPage, SaasFeesTab, drawer |
| Viva create/verify | ShipperInvoicePaymentService + VivaService | Pay Now redirect + return query |
| Wallet pay | Same as old `invoicePaidUsingWalletAmount` | Pay using wallet / Apply credit |
| Bank receipt | Spatie media + `bank_transfer_admin_status=uploaded` | BankTransferModal |
| Credits tab | Wallet transactions (not fake credit notes) | CreditsTab |
| Statements | CSV export of invoices | StatementsTab + PDF preview |
| Adjustment request | `contact_us` type `billing_adjustment` | RequestAdjustmentModal |

Frontend must not integrate until the `/api/shipper/v1/billing/*` contract in Phase 6 is used.
