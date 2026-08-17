# Phase 6 — Add-on Frontend (plan)

Render **every** add-on returned by API (recurring + one_time). Do not use `INITIAL_RECURRING_ADDONS` / `INITIAL_USAGE_ADDONS` in production.

For each item:

- Name, price for selected display cycle, availability (`included_in_plan` badge).
- Purchase → quote → Viva (same return verify, `kind=addon`).
- Count input when `type=count`.
- Purchased cards: cancel, auto-pay (recurring only), expired/cancelled labels.
- After verify, refetch overview so usage limits update.

Test independently: status add-on, count add-on, cancel, renew display, plan change stacking (document expected stack behavior).
