export const wizardQueryKeys = {
  vehicleTypes: ['create-shipment', 'vehicle-types'] as const,
  partners: ['create-shipment', 'partners'] as const,
  unlinkedOrders: ['create-shipment', 'unlinked-orders'] as const,
  trackingEmailLookup: ['create-shipment', 'tracking-email-lookup'] as const,
  publicQuota: (draftId: number | null) => ['create-shipment', 'public-quota', draftId] as const,
};
