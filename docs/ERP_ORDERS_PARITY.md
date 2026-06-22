# ERP Orders View 1 — PDS-909 / PDS-910 Parity Checklist

Reference: [PDS-909](https://myvagon.atlassian.net/browse/PDS-909), [PDS-910](https://myvagon.atlassian.net/browse/PDS-910)

| Section | Requirement | React | Status |
|---------|-------------|-------|--------|
| Header | Create Order + Import (AI) + template download | `ErpOrdersHeader` | Done |
| KPI strip | Unplanned, Planned, On Trip, Completed, Canceled | `ErpOrdersKpiStrip` | Done |
| Tabs | Removed — KPIs are filters | No tabs row | Done |
| Filters | High Priority only + search | `ErpOrdersFilterBar` | Done |
| Table | Delivery Date, product name +N, Last Update | `ErpOrdersTable` | Done |
| Linked Load | Hyperlink to shipment | `Link` in table | Done |
| Create Order | Full form with Address Book + Product Master | `CreateEditOrderModal` | Done |
| Edit | Unplanned only | API 422 + drawer banner | Done |
| Status model | Computed from load/shipment | Backend `ShipperErpOrder::computeStatus` | Done |
| AI Import | 4-step wizard | `OrdersAiWizardModal` | Done |
| Loaders | Table overlay + global on mutations | `TableLoadingOverlay`, `useSyncGlobalLoader` | Done |
| i18n | en + el keys | `locale/en.json`, `locale/el.json` | Done |
| Create Load / Itinerary | Deferred | `ErpOrdersDeferredViews` stub | Deferred |

## Staging QA script

1. KPI counts match `/erp-orders/summary` for all five statuses
2. Clicking a KPI filters the list; no tabs under KPIs
3. High Priority filter works; no “No load” or “Sync issues” pills
4. Table columns: Order ID, Customer, Ship From/To, Delivery Date, Products (+N), Status, Linked Load, Last Update
5. Create Order — all fields, high-priority toggle, optional product lines
6. Edit unplanned order succeeds; planned/on-trip/completed shows locked message
7. List shows `TableLoadingOverlay` on refresh; mutations show global loader
8. AI Wizard: upload `docs/fixtures/orders-ai-wizard-messy-sample.csv` → preview → confirm import
9. Greek locale shows translated labels
10. Subscription-blocked user (no `manage_erp_orders`) sees 403 banner

## API routes

`MV_Backend_API/routes/api/shipper.php` under `/api/shipper/v1/erp-orders/*`

## Frontend

- Service: `shipper/src/api/services/erpOrdersService.ts`
- Hook: `shipper/src/pages/ErpOrders/hooks/useErpOrdersList.ts`
- Components: `shipper/src/components/ErpOrders/*`
- Fixture: `shipper/docs/fixtures/orders-ai-wizard-messy-sample.csv`

## Env

- `VITE_API_BASE_URL` — e.g. `https://staging.myvagon.com/api/shipper/v1`
- Backend: run migration `2026_06_20_100000_create_shipper_erp_orders_tables.php`
- Seed permission `manage_erp_orders` or re-run `PermissionSeeder`
