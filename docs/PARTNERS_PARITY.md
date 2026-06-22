# Partners — Blade vs React Parity Checklist

Reference: `mv-new-frontend-design-development` (client-approved Blade)

| Section | Blade | React (target) | Status |
|---------|-------|----------------|--------|
| 3-pane layout | Yes | Yes | Done |
| KPI strip (6) | Total, Active, Carrier, Freelancer, Invited, Suspended | Aligned — no Missing Bank | Done |
| Facet sidebar | All, By Type, By Status | API facet counts | Done |
| Filter bar | Search, Status, Capability | No region/performance filters | Done |
| List columns (8) | Partner, Unique ID, Type, Status, Contact, Rating & Trips, Capabilities, Created At | Aligned | Done |
| Pagination | Default 12, 10/12/25/50/100 | Server pagination + page size | Done |
| Invite modal | Email / Phone / MV ID; carrier/driver/shipper | `POST /partners/invite` | Done |
| Accept / decline | Inline + detail | Mutations + confirm modal | Done |
| Cancel invite | Delete sent invitation | `DELETE /partners/{id}` | Done |
| Suspend / reactivate | Toggle status | `POST /partners/{id}/toggle-status` | Done |
| Preferred toggle | Relationship field | `POST /partners/{id}/toggle-preferred` | Done |
| Notes & tags | Detail panel | `POST notes` / `POST tags` | Done |
| Contract lanes | Add / delete | `POST/DELETE contract-lanes` | Done |
| Detail lazy-load | AJAX HTML partial | `GET /partners/{id}` on select | Done |
| Performance KPIs | Carrier/driver only | From API detail | Done |
| Fleet section | Carrier/driver capabilities | From API detail | Done |
| Subscription gates | Partner limit, search permission | 403 banner | Done |
| Export / ERP / Add Customer | Not in Blade | Removed from React header | Done |

## API endpoints

Base: `/api/shipper/v1/partners`

- `GET summary` — KPI + facet counts
- `GET reference/truck-categories` — capability filter options
- `GET /` — paginated list (`search`, `facet`, `statuses`, `capabilities`, `page`, `per_page`)
- `POST invite`
- `GET {id}` — detail JSON
- `POST {id}/accept|decline|toggle-status|toggle-preferred|notes|tags`
- `DELETE {id}`
- `POST/DELETE {id}/contract-lanes`

## Staging QA script (manual)

Run side-by-side on staging (Blade vs React):

1. KPI counts match Blade for all facet nodes
2. Search finds same partners (name, email, phone, unique ID)
3. Status + capability filters narrow list correctly
4. Pagination default 12; page lengths 10/12/25/50/100 work
5. Invite by email / phone / MV ID — partner appears as Invited
6. Cancel sent invitation
7. Accept / decline received invitation
8. Suspend active partner → Suspended facet; reactivate
9. Toggle preferred / standard on accepted partner
10. Save notes and tags from detail panel
11. Add and delete contract lane
12. Detail performance KPIs + fleet match Blade for carrier/driver
13. Subscription: partner limit blocks new invite (403)
14. Subscription: search/filters blocked without search permission
15. Mobile layout: facet hidden &lt;900px

## Env

- `VITE_API_BASE_URL` — e.g. `https://staging.myvagon.com/api/shipper/v1`

## Backend migration

Run on staging before API deploy:

```bash
php artisan migrate
```

Migration: `2026_06_18_100000_add_partners_master_columns.php` (relationship, notes, tags, partner_contract_lanes)
