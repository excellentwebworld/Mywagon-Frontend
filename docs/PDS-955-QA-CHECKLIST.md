# PDS-955 — Shipper Signup / Gates QA Checklist

**Ticket:** [PDS-955](https://myvagon.atlassian.net/browse/PDS-955) — Shipper UI Revamp: Sign Up, Info Form & KYC  
**Scope:** Phases 0–6 on shipper `develop` + `MV_Backend_API` staging (`/auth/me` gate fields + register password rules).  
**SPA register:** `/shipper/register`  
**Laravel entry:** `GET shipper/register` → `{SHIPPER_PANEL_URL}/shipper/register`

| Field | Value |
| --- | --- |
| Environment | Staging / local: ________ |
| Tester | ________ |
| Date | ________ |
| Build / commit | shipper `develop` + backend staging |

---

## 1. Entry points → React register

| # | Case | Steps | Expected | Result |
| --- | --- | --- | --- | --- |
| E1 | React Login Join | Open SPA `/login` → “Join for free” | Navigates to `/shipper/register` | ☐ Pass ☐ Fail |
| E2 | Laravel shipper login Join | Blade shipper login → Join (shipper tab) | Redirects to SPA `/shipper/register` | ☐ Pass ☐ Fail |
| E3 | Marketing home Signup | Front home referral Signup CTAs | Reach SPA register (via `shipper.register.form`) | ☐ Pass ☐ Fail |
| E4 | Header Proceed (shipper) | Marketing modal → shipper Proceed | SPA register | ☐ Pass ☐ Fail |
| E5 | Referral invite link | Copy invite from Blade referral modal | Link is `{SHIPPER_PANEL_URL}/shipper/register?referral_code=…` | ☐ Pass ☐ Fail |
| E6 | Referral prefill | Open register with `?referral_code=TEST` | Marketing step shows referral prefilled | ☐ Pass ☐ Fail |

---

## 2. Full wizard → signup → login

| # | Case | Steps | Expected | Result |
| --- | --- | --- | --- | --- |
| R1 | Happy path | Complete nm → ph → OTP → em → OTP → pw → co → ad → mk → vf | Account created; success step; Login works | ☐ Pass ☐ Fail |
| R2 | Password UI | Try weak password (&lt;8 / no special) | Client blocks with complexity message | ☐ Pass ☐ Fail |
| R3 | Password API | Bypass UI if possible / force weak via API | `RegisterShipperRequest` rejects (min 8 + complexity) | ☐ Pass ☐ Fail |
| R4 | Validation errors | Submit with bad VAT / huge cert / duplicate email | Field errors and/or form toast; stay on KYC step; Continue re-enabled after fail | ☐ Pass ☐ Fail |
| R5 | Draft restore | Refresh mid-wizard | Draft restored from sessionStorage | ☐ Pass ☐ Fail |
| R6 | OTP busy | Send / resend OTP while in flight | Buttons disabled; “Sending…” where applicable | ☐ Pass ☐ Fail |

---

## 3. Post-login gates (priority)

| # | Case | Steps | Expected | Result |
| --- | --- | --- | --- | --- |
| G1 | Past-due wins | User with `has_past_due` + pending KYC | Forced to `/billing` (not compliance) | ☐ Pass ☐ Fail |
| G2 | Pending KYC | New signup, KYC pending | Cannot open dashboard/shipments; `/settings/compliance` only (+ billing) | ☐ Pass ☐ Fail |
| G3 | Rejected KYC | Set KYC rejected | Same hard gate as pending → compliance | ☐ Pass ☐ Fail |
| G4 | Company address | KYC accepted, empty address/city/postal | → `/settings/organization?from=company_info`; banner + legal edit | ☐ Pass ☐ Fail |
| G5 | Address unlock | Save street/city/postal; refresh | Gate clears; app navigable | ☐ Pass ☐ Fail |
| G6 | Info-form hard | Primary, mandatory ops incomplete | → `/settings/organization?from=info_form`; banner + ops edit | ☐ Pass ☐ Fail |
| G7 | Info-form unlock | Fill required ops; save | `refreshUser` unlocks | ☐ Pass ☐ Fail |
| G8 | Soft reminder | Mandatory done, &lt;1 month, completion &lt;100% | Modal once/session; Skip dismisses; Yes → org `info_form` | ☐ Pass ☐ Fail |
| G9 | Month enforce | Account ≥1 month, completion ≤90%, mandatory done | Hard gate to org `info_form` until completion &gt;90% | ☐ Pass ☐ Fail |
| G10 | Sub-user | Sub-user login | No info-form hard gate / soft modal | ☐ Pass ☐ Fail |

---

## Sign-off

| Role | Name | Date | Notes |
| --- | --- | --- | --- |
| QA | | | |
| Dev | | | |
