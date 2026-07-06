# PDS-917 Step 3 — QA Checklist

## Broadcast & partners

- [ ] Private / Public / My Fleet (SOON) cards render; no bulk load UI
- [ ] Private: carrier companies + freelancer drivers from partners API
- [ ] No "Invite new partner" link on Step 3
- [ ] Partners loading/error states visible
- [ ] Public: quota banner shows used/limit/remaining (or unlimited)
- [ ] Public at limit: Create disabled; publish returns 422

## Pricing

- [ ] Contract lane price when selected partner has matching origin/destination cities
- [ ] Spot: AI suggested price populates target (or empty if denied/no subscription)
- [ ] No hardcoded €750 default; no Alpha Foods / PAR-* demo text
- [ ] Manual price override + reset to suggested works
- [ ] €/km and €/pallet derived from target price
- [ ] Negotiable toggle persists on save/publish

## Load Value (Order Value)

- [ ] Auto-sum from linked ERP order values when orders have order_value set
- [ ] Manual override of load value works
- [ ] Saved on step-3 draft; persisted to shipments.order_value on publish

## Tracking links

- [ ] Groups by customer from real cargo lines only (no demo fallback)
- [ ] Empty state when no product lines
- [ ] Email fields prefilled from customer/company data where available

## Summary sidebar

- [ ] Route label from real stop cities
- [ ] Distance, time, weight, customers, orders from wizard state
- [ ] Stop timeline uses real customer/order data (no hardcoded pills)

## Footer & publish

- [ ] Save Draft calls partial step-3 save
- [ ] Create publishes single load; navigates to `/shipments/{id}`
- [ ] GPS / live navigation toggle persists
- [ ] Driver notes max 500 chars

## Persistence / DB

- [ ] `shipments.order_value` set when provided
- [ ] `shipper_erp_orders.shipment_id` linked for orders in cargo on publish
- [ ] ERP orders status moves to planned when linked

## Automated

- [ ] `npm run build` passes
- [ ] `php artisan test --filter=CreateShipment` passes
- [ ] ERP order_value tests pass
