# Product Master — Blade vs React Parity Checklist

Reference: `mv-new-frontend-design-development` (client-approved Blade)

| Section | Blade | React (target) | Status |
|---------|-------|----------------|--------|
| 3-pane layout | Facet / list / detail | Facet / list / detail | Done |
| Facet sidebar | All, Unmapped, categories, types | API `/summary` counts | Done |
| View toggle | SKUs / Types | SKUs / Types | Done |
| SKU table columns | SKU, Type, Category, Source, Updated, Status, attrs | Aligned | Done |
| Pagination | Default 12, server-side | API paginated list | Done |
| Add SKU modal | Category/type dropdowns, shipping defaults | Editable shipping defaults | Done |
| Edit SKU | PUT update | API update | Done |
| Toggle active | POST toggle-status | API toggle | Done |
| Bulk archive | POST bulk-archive | API bulk-archive | Done |
| CSV import | Template + upload + summary | API import | Done |
| Excel export | GET export | API export download | Done |
| Types grid | AJAX types-grid | API `/types` (4 stat columns) | Done |
| Filter bar category | Category dropdown | Wired to API list filter | Done |
| Create Shipment wizard products | Product create | `POST /product-master/skus` + catalog refresh | Done |
| Subscription | `manage_product_master` | 403 banner | Done |
| Search filter | DataTable search + subscription | API `search` param | Done |
| AI Master Wizard | 4-step modal | `AiWizardModal` + API `/ai/transform` & `/ai/confirm-import` | Done |
| Rename/merge type | Not in Blade | Removed from React | Done |
| Sync log / ERP sync | Not in Blade | Removed from React | Done |

## Staging QA script (manual)

Run side-by-side on staging (Blade vs React):

1. Facet counts match for All / Active / Inactive / Unmapped / per category
2. SKU list pagination default 12; page length 10/12/25/50/100 works
3. Search finds same records (name, number, barcode, type, category)
4. Facet filter by category and type narrows list correctly
5. Unmapped facet shows only unmapped SKUs
6. Create SKU — required fields enforced; duplicate name per type rejected
7. Edit SKU — fields pre-filled; ERP fields read-only if applicable
8. Toggle active/inactive from detail panel
9. Bulk archive selected rows
10. Export downloads Excel with expected columns
11. Import template download; CSV import shows success/fail counts
12. Types view grid loads shipment stats
13. Subscription blocked user sees banner and cannot mutate
14. AI Wizard: upload valid messy CSV (non-standard headers) → preview shows mapped rows
15. AI Wizard: upload file missing Category column → missing-columns error + template download link
16. AI Wizard: confirm import → SKUs appear in list + facet counts refresh
17. AI Wizard: cancel during processing → no partial DB writes

## Env

- `VITE_API_BASE_URL` — e.g. `https://staging.myvagon.com/api/shipper/v1`

## Implementation notes

- API routes: `MV_Backend_API/routes/api/shipper.php` under `/api/shipper/v1/product-master/*`
- React service: `shipper/src/api/services/productMasterService.ts`
- Hook: `shipper/src/pages/ProductMaster/hooks/useProductMaster.ts` (React Query)
- Feature tests: `MV_Backend_API/tests/Feature/Api/Shipper/ProductMaster/ProductMasterApiTest.php`
- AI Wizard tests: `MV_Backend_API/tests/Feature/Api/Shipper/ProductMaster/AiWizardApiTest.php`
- AI Wizard UI: `shipper/src/components/ProductMaster/AiWizardModal.tsx`
- QA fixture (messy CSV): `shipper/docs/fixtures/ai-wizard-messy-sample.csv`
