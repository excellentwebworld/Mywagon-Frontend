# Phase 7 — Payment & Subscription Integration (plan)

Follow PDS-948 Viva notes (`PHASE-5-VIVA.md`) plus:

| Event | Expected |
| --- | --- |
| Init | Order amount = server grand total cents |
| Success `t` | Idempotent activate plan or add-on |
| Fail / cancel / timeout | No DB entitlement change |
| Pending `A` | Do not activate; user can retry |
| Duplicate webhook / double verify | One invoice, one entitlement |
| Auto-renew cron | Existing `assign:free-subscription` |
| Addon renew cron | `handle:addon-purchase` |
| Refund | Not implemented in old panel — do not invent |

Env: existing `VIVA_*`, `SHIPPER_PANEL_URL`, `config('app.vat_tax')`.

Frontend: never activate locally on “Pay”; only after verify or overview refetch.
