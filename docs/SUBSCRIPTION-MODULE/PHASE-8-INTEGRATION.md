# Phase 8 — Frontend + Backend Integration (plan)

- Shared TypeScript types from Phase 3 JSON (no HTML fragments).
- Auth header same as Billing.
- 403 gates: `upgrade_url: '/subscription'`.
- Loading / error / empty.
- Ignore duplicate checkout clicks (disable button + 409).
- After verify, sync overview; Billing list should show new invoice without extra work.
- Multi-tab: last verify wins via idempotency.
- Sub-user: read-only vs pay — implement per Phase 3 auth decision.
