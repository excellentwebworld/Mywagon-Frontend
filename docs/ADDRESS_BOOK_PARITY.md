# Address Book — Blade vs React Parity Checklist

Reference: `mv-new-frontend-design-development` (client-approved Blade)

| Section | Blade | React (target) | Status |
|---------|-------|----------------|--------|
| 3-pane layout | Yes | Yes | Done |
| Directory (4 nodes only) | All/My/Customer/Archived | 4 system nodes + summary counts | Done |
| Filter bar | Search only 250ms | Search only, 250ms debounce | Done |
| List columns | Location, City, Type, Role, Ops, Contact, Usage, Actions | Aligned | Done |
| Pagination | Default 12, 10/12/25/50/100 | Default 12 + page-length selector | Done |
| Export | Excel server | `GET /address-book/export` (.xlsx) | Done |
| Create 4-step wizard | Yes | Fields + validation aligned | Done |
| Edit modal | 4-step AJAX | Single scroll + Google Maps + locked company | Done |
| Company entity | Select2 + POST | `company-entities` API wired | Done |
| Google Maps | Autocomplete + pin | `GoogleMapAddressField` + `VITE_GOOGLE_MAPS_KEY` | Done |
| Duplicate check | UI stub | API + Use existing selects record | Done |
| Restore archived | Row + detail | Row menu + detail panel | Done |
| Detail panel | Full sections | Map, stats, ops, contacts, notes | Done |

## Staging QA script (manual)

Run side-by-side on staging (Blade vs React):

1. Directory counts match for All / My / Customer / Archived
2. Search finds same records (name, address, city, phone, email)
3. Create My Location — required ops fields enforced
4. Create Customer Location — company search + inline company create
5. Edit location — company locked for customer, fields pre-filled
6. Archive → appears in Archived; Restore returns to active
7. Export downloads Excel with expected columns
8. Detail panel sections and badges match
9. Google autocomplete + lat/lng when `VITE_GOOGLE_MAPS_KEY` is set
10. Duplicate warning on review step; "Use existing" selects record
11. Pagination default 12; page length change works
12. Mobile breakpoints (directory hidden &lt;900px)

## Env

- `VITE_GOOGLE_MAPS_KEY` — Google Places autocomplete and detail map embed
- `VITE_API_BASE_URL` — e.g. `https://staging.myvagon.com/api/shipper/v1`
