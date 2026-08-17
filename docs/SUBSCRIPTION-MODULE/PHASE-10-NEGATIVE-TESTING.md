# Phase 10 — Negative & Edge-Case Testing

| Case | Expect |
| --- | --- |
| Invalid plan / addon / period | 422 |
| Unauthorized / expired token | 401 |
| Sub-user without permission | 403 |
| Duplicate purchase click | One Viva order / one activation |
| Duplicate verify | 200, no second invoice |
| Missing webhook, only SPA verify | Activates |
| Wrong Viva status | No activate |
| Expired / cancelled plan cancel again | 422 |
| Upgrade while yearly | 422 |
| Upgrade while payment pending | Second checkout allowed or 409 (pick one and test) |
| Add-on for other plan’s price id | 422 |
| Add-on without active subscription | 422 |
| Network fail after pay, before verify | Verify later still activates once |
| Back button on Viva | Fail page / cancelled verify |
| Two tabs checkout | Idempotency / lock |
| Essential cancel | 422 |
| Unlimited limits (≥10000) | Usage unlimited flag |

Include VAT non-GR = 0.
