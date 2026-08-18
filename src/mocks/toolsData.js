/**
 * toolsData.js — Mock data for Integrations + AI Settings.
 *
 * Changelog v2:
 * - Added connector descriptions, data type labels
 * - Added API usage/charges data (INTEGRATION_USAGE)
 * - Expanded AI_USAGE with plan tiers, purchase history, auto-purchase settings
 * - Added AI_ROLE_OPTIONS for role selector
 */

// ═══ INTEGRATIONS ═══

export const CONNECTOR_CATEGORIES = [
  { key: 'erp', labelKey: 'integrations.cat.erp', icon: '🏢' },
  { key: 'wms', labelKey: 'integrations.cat.wms', icon: '🏭' },
  { key: 'yms', labelKey: 'integrations.cat.yms', icon: '🅿️' },
  { key: 'fleet', labelKey: 'integrations.cat.fleet', icon: '🚛' },
  { key: 'accounting', labelKey: 'integrations.cat.accounting', icon: '💳' },
];

export const CONNECTORS = [
  // Connected
  { id: 'softone', name: 'Softone by Entersoft', category: 'erp', icon: '⚡', status: 'coming_soon', featured: true, region: 'GR', syncDirection: 'inbound', lastSync: null, errorCount: 0, dataTypes: ['orders', 'products', 'customers'], description: 'Full ERP integration for orders, products, customers and invoicing.' },
  { id: 'frotcom', name: 'Frotcom', category: 'fleet', icon: '📡', status: 'coming_soon', featured: false, region: 'GR', syncDirection: 'inbound', lastSync: null, errorCount: 0, dataTypes: ['gps', 'mileage', 'fuel'], description: 'Real-time GPS tracking, mileage reporting, and fuel consumption data from your fleet.' },
  { id: 'mydata', name: 'myDATA / AADE', category: 'accounting', icon: '🇬🇷', status: 'coming_soon', featured: true, region: 'GR', syncDirection: 'outbound', lastSync: null, errorCount: 0, dataTypes: ['invoices'], description: 'Official Greek tax authority e-invoicing. Automatic submission of invoices and credit notes to AADE.' },

  // Not connected
  { id: 'sap_b1', name: 'SAP Business One', category: 'erp', icon: '🔷', status: 'coming_soon', region: null, dataTypes: ['orders', 'products', 'customers', 'invoices'], description: 'Enterprise-grade ERP with comprehensive supply chain management and financial reporting.' },
  { id: 'business_central', name: 'Dynamics 365 BC', category: 'erp', icon: '🟦', status: 'not_connected', region: null, dataTypes: ['orders'], description: 'Microsoft Business Central for small-to-mid-size businesses. Orders inbound sync.' },
  { id: 'epsilon', name: 'Epsilon Net (Pylon)', category: 'erp', icon: '🟩', status: 'not_connected', region: 'GR', featured: true, dataTypes: ['orders', 'invoices'], description: 'Popular Greek ERP for accounting, payroll, and commercial management.' },
  { id: 'netsuite', name: 'Oracle NetSuite', category: 'erp', icon: '🔴', status: 'not_connected', region: null, dataTypes: ['orders', 'products', 'customers', 'invoices'], description: 'Cloud ERP for growing businesses. Full financial management and inventory control.' },
  { id: 'custom_erp', name: 'Custom ERP', category: 'erp', icon: '🔌', status: 'not_connected', region: null, dataTypes: ['orders', 'products'], description: 'Connect any ERP via our universal REST/SOAP adapter. Custom field mapping supported.' },

  { id: 'manhattan', name: 'Manhattan Associates', category: 'wms', icon: '🏭', status: 'not_connected', region: null, dataTypes: ['inventory', 'orders'], description: 'Enterprise warehouse management for complex distribution and fulfillment operations.' },
  { id: 'blue_yonder', name: 'Blue Yonder (JDA)', category: 'wms', icon: '🔵', status: 'coming_soon', region: null, dataTypes: ['inventory'], description: 'AI-driven supply chain planning and warehouse optimization.' },
  { id: 'korber', name: 'Körber (HighJump)', category: 'wms', icon: '🟠', status: 'not_connected', region: null, dataTypes: ['inventory', 'orders'], description: 'Flexible WMS for mid-market warehouses with multi-site support.' },

  { id: 'lea_reply', name: 'LEA Reply YMS', category: 'yms', icon: '🅿️', status: 'not_connected', region: 'EU', dataTypes: ['dock_scheduling'], description: 'Yard management and dock scheduling for European distribution centers.' },
  { id: 'c3', name: 'C3 Solutions', category: 'yms', icon: '🟢', status: 'coming_soon', region: null, dataTypes: ['dock_scheduling'], description: 'Dock appointment scheduling and yard visibility platform.' },

  { id: 'samsara', name: 'Samsara', category: 'fleet', icon: '📡', status: 'not_connected', region: null, dataTypes: ['gps', 'mileage', 'fuel', 'temperature'], description: 'IoT fleet management with GPS, dashcams, temperature monitoring, and driver safety.' },
  { id: 'geotab', name: 'Geotab', category: 'fleet', icon: '🌐', status: 'not_connected', region: null, dataTypes: ['gps', 'mileage', 'diagnostics'], description: 'Telematics platform for fleet tracking, engine diagnostics, and driver behavior.' },
  { id: 'webfleet', name: 'Webfleet (TomTom)', category: 'fleet', icon: '🗺️', status: 'not_connected', region: 'EU', dataTypes: ['gps', 'mileage', 'eta'], description: 'European fleet management with professional navigation and ETA prediction.' },

  { id: 'mydata_edeltio', name: 'myDATA e-Δελτίο', category: 'accounting', icon: '🇬🇷', status: 'not_connected', region: 'GR', featured: true, dataTypes: ['delivery_notes'], description: 'Digital delivery note (e-Δελτίο) for the Greek AADE system. Mandatory from 2027.' },
  { id: 'stripe', name: 'Stripe', category: 'accounting', icon: '💳', status: 'not_connected', region: null, dataTypes: ['payments'], description: 'Online payment processing for invoices, subscriptions, and marketplace payouts.' },
  { id: 'eurobank', name: 'Eurobank Gateway', category: 'accounting', icon: '🏦', status: 'not_connected', region: 'GR', dataTypes: ['payments'], description: 'Greek banking gateway for direct bank transfers and payment reconciliation.' },
];

export const API_KEYS = [
  { id: 'AK-001', name: 'Production ERP Sync', prefix: 'mv_live_a8f3****', env: 'production', createdAt: '2025-06-15', lastUsed: '2026-05-09T08:00:00Z', createdBy: 'Pavlos D.', requestsToday: 2341, requestsMonth: 68420 },
  { id: 'AK-002', name: 'Analytics Dashboard', prefix: 'mv_live_c2d1****', env: 'production', createdAt: '2025-09-20', lastUsed: '2026-05-08T14:30:00Z', createdBy: 'Pavlos D.', requestsToday: 890, requestsMonth: 24530 },
  { id: 'AK-003', name: 'Sandbox Testing', prefix: 'mv_test_x9k2****', env: 'sandbox', createdAt: '2026-03-01', lastUsed: '2026-04-15T11:00:00Z', createdBy: 'Andreas K.', requestsToday: 12, requestsMonth: 340 },
];

export const WEBHOOKS = [
  { id: 'WH-001', name: 'ERP Order Sync', url: 'https://erp.vikos.com/hooks/orders', events: 4, status: 'active', successRate: 98.2, lastDelivery: '2026-05-09T08:15:00Z', lastStatus: 200 },
  { id: 'WH-002', name: 'Fleet Alerts', url: 'https://fleet.vikos.com/hooks/alerts', events: 3, status: 'active', successRate: 100, lastDelivery: '2026-05-09T07:30:00Z', lastStatus: 200 },
  { id: 'WH-003', name: 'Billing Notifications', url: 'https://billing.vikos.com/hooks/notify', events: 3, status: 'failing', successRate: 23, lastDelivery: '2026-05-06T10:00:00Z', lastStatus: 503 },
];

export const DATA_FLOW_HEALTH = [
  { system: 'Softone', direction: '↔', status: 'ok', errors: 0, lastSync: '2h ago', records: 14520 },
  { system: 'Frotcom', direction: '←', status: 'ok', errors: 0, lastSync: '15m ago', records: 8340 },
  { system: 'myDATA', direction: '→', status: 'error', errors: 3, lastSync: '1d ago', records: 2100 },
  { system: 'WH: ERP', direction: '→', status: 'ok', errors: 0, lastSync: '5m ago', records: 68420 },
  { system: 'WH: Fleet', direction: '→', status: 'ok', errors: 0, lastSync: '15m ago', records: 12300 },
  { system: 'WH: Billing', direction: '→', status: 'failing', errors: 12, lastSync: '3d ago', records: 890 },
];

export const SYNC_STATS = { total: 12847, successRate: 97.2, warnings: 89, failed: 23 };

// API usage / billing for integrations
export const INTEGRATION_USAGE = {
  currentPlan: 'Business',
  billingPeriod: { start: '2026-05-01', end: '2026-05-31' },
  pricing: {
    includedCalls: 100000,
    overageRate: 0.002,
    webhookRate: 0.001,
  },
  usage: {
    apiCalls: { used: 92950, included: 100000 },
    webhookDeliveries: { used: 4280, included: 10000 },
    dataTransfer: { usedMB: 342, includedMB: 1000 },
  },
  charges: {
    baseSubscription: 49.00,
    apiOverage: 0.00,
    webhookOverage: 0.00,
    dataOverage: 0.00,
    totalThisPeriod: 49.00,
  },
  history: [
    { month: 'Apr 2026', apiCalls: 87400, webhooks: 3920, cost: 49.00 },
    { month: 'Mar 2026', apiCalls: 105200, webhooks: 4100, cost: 59.40 },
    { month: 'Feb 2026', apiCalls: 78300, webhooks: 3100, cost: 49.00 },
    { month: 'Jan 2026', apiCalls: 94100, webhooks: 3800, cost: 49.00 },
  ],
  byKey: [
    { keyName: 'Production ERP Sync', calls: 68420, pct: 73.6, cost: 34.10 },
    { keyName: 'Analytics Dashboard', calls: 24530, pct: 26.4, cost: 14.90 },
  ],
};

// ═══ AI SETTINGS ═══

export const AI_CONFIG = {
  enabled: true,
  access: 'all', // 'all' | 'specific'
  allowedRoles: ['admin', 'dispatcher'],
  chatLocations: { floatingButton: true, dedicatedPage: true, commandPalette: true, sidebarPanel: false },
};

export const AI_ROLE_OPTIONS = [
  { key: 'admin', labelKey: 'ai.role.admin' },
  { key: 'dispatcher', labelKey: 'ai.role.dispatcher' },
  { key: 'operations_manager', labelKey: 'ai.role.operationsManager' },
  { key: 'warehouse_staff', labelKey: 'ai.role.warehouseStaff' },
  { key: 'driver', labelKey: 'ai.role.driver' },
  { key: 'finance', labelKey: 'ai.role.finance' },
  { key: 'viewer', labelKey: 'ai.role.viewer' },
];

export const AI_CAPABILITIES = [
  // Query
  { id: 'search_view', group: 'query', level: 'auto' },
  { id: 'generate_reports', group: 'query', level: 'auto' },
  { id: 'export_data', group: 'query', level: 'confirm' },
  { id: 'answer_questions', group: 'query', level: 'auto' },
  // Create
  { id: 'create_shipments', group: 'create', level: 'confirm' },
  { id: 'create_orders', group: 'create', level: 'confirm' },
  { id: 'create_loads', group: 'create', level: 'confirm' },
  { id: 'create_lanes', group: 'create', level: 'confirm' },
  { id: 'create_addresses', group: 'create', level: 'confirm' },
  { id: 'invite_partners', group: 'create', level: 'blocked' },
  // Modify
  { id: 'edit_orders', group: 'modify', level: 'confirm' },
  { id: 'assign_fleet', group: 'modify', level: 'confirm' },
  { id: 'update_status', group: 'modify', level: 'confirm' },
  { id: 'split_group', group: 'modify', level: 'confirm' },
  { id: 'edit_rates', group: 'modify', level: 'confirm' },
  // Accept
  { id: 'accept_bids', group: 'accept', level: 'confirm' },
  { id: 'reject_bids', group: 'accept', level: 'confirm' },
  { id: 'confirm_delivery', group: 'accept', level: 'confirm' },
  // Cancel/Delete
  { id: 'cancel_shipments', group: 'cancel', level: 'blocked' },
  { id: 'archive_orders', group: 'cancel', level: 'confirm' },
  { id: 'delete_permanent', group: 'cancel', level: 'blocked' },
  // Financial
  { id: 'view_pricing', group: 'financial', level: 'auto' },
  { id: 'update_surcharge', group: 'financial', level: 'blocked' },
  { id: 'modify_defaults', group: 'financial', level: 'blocked' },
  // Admin
  { id: 'manage_users', group: 'admin', level: 'blocked' },
  { id: 'change_org_settings', group: 'admin', level: 'blocked' },
  { id: 'modify_security', group: 'admin', level: 'blocked' },
  // Support
  { id: 'open_tickets', group: 'support', level: 'confirm' },
  { id: 'answer_howto', group: 'support', level: 'auto' },
  { id: 'suggest_workflows', group: 'support', level: 'auto' },
  // AI Analysis
  { id: 'load_optimization', group: 'analysis', level: 'auto' },
  { id: 'route_optimization', group: 'analysis', level: 'auto' },
  { id: 'price_recommendations', group: 'analysis', level: 'auto' },
  { id: 'smart_matching', group: 'analysis', level: 'auto' },
  { id: 'document_ocr', group: 'analysis', level: 'auto' },
  { id: 'anomaly_detection', group: 'analysis', level: 'auto' },
  { id: 'predictive_eta', group: 'analysis', level: 'auto' },
];

export const AI_CAPABILITY_GROUPS = [
  { key: 'query', labelKey: 'ai.capGroup.query' },
  { key: 'create', labelKey: 'ai.capGroup.create' },
  { key: 'modify', labelKey: 'ai.capGroup.modify' },
  { key: 'accept', labelKey: 'ai.capGroup.accept' },
  { key: 'cancel', labelKey: 'ai.capGroup.cancel' },
  { key: 'financial', labelKey: 'ai.capGroup.financial' },
  { key: 'admin', labelKey: 'ai.capGroup.admin' },
  { key: 'support', labelKey: 'ai.capGroup.support' },
  { key: 'analysis', labelKey: 'ai.capGroup.analysis' },
];

export const AI_KNOWLEDGE = {
  customInstructions: '• We always prefer carriers with ADR certification for any shipment from the Ioannina facility.\n• Our standard payment terms are Net 30 days. Never accept Net 60 or longer.\n• For shipments over 20 tonnes, always suggest a semi-trailer, never a rigid truck.\n• Our peak season is June-September. Flag any carrier rate increases during this period.\n• Internal terminology: "Class A" means temperature-controlled shipments.',
  dataSources: { platformDocs: true, companyData: true, externalSearch: false },
};

export const AI_BEHAVIOR = {
  responseLanguage: 'match', // 'match' | specific locale
  tone: 'professional',
  verbosity: 'balanced',
  proactive: { optimizations: true, anomalies: true, reminders: true, workflows: false },
};

export const AI_HISTORY = {
  retention: '90',
  viewOwn: true, viewAll: true, shareContext: false,
  maskSensitive: true, noTraining: true,
};

export const AI_PROVIDER = {
  mode: 'default', // 'default' | 'byok'
  byokProvider: null, byokModel: null, byokRegion: null,
};

export const MCP_CONFIG = {
  enabled: true,
  serverUrl: 'https://mcp.myvagon.com/org/ORG-001',
  capabilities: [
    { key: 'shipments', enabled: true, permission: 'read' },
    { key: 'orders', enabled: true, permission: 'readwrite' },
    { key: 'fleet', enabled: true, permission: 'read' },
    { key: 'priceLists', enabled: false, permission: 'read' },
    { key: 'partners', enabled: true, permission: 'read' },
    { key: 'analytics', enabled: true, permission: 'read' },
    { key: 'masterData', enabled: true, permission: 'read' },
    { key: 'documents', enabled: false, permission: 'read' },
  ],
  tokens: [
    { id: 'T1', name: 'Claude Desktop — Pavlos', prefix: 'mcp_•••4521', createdAt: '2026-04-10', lastUsed: '2026-05-09T07:00:00Z', status: 'active' },
    { id: 'T2', name: 'Copilot Studio — Operations', prefix: 'mcp_•••8734', createdAt: '2026-03-01', lastUsed: '2026-05-08T10:00:00Z', status: 'active' },
  ],
};

export const AI_ASSISTANTS = [
  { key: 'claude', name: 'Claude (Anthropic)', icon: '🟣', connected: true },
  { key: 'chatgpt', name: 'ChatGPT (OpenAI)', icon: '🟢', connected: false },
  { key: 'copilot', name: 'Microsoft Copilot', icon: '🔵', connected: true },
  { key: 'gemini', name: 'Google Gemini', icon: '🔴', connected: false },
  { key: 'custom', name: 'Custom AI Agent', icon: '⚡', connected: false },
];

export const AI_USAGE = {
  plan: 'Business',
  planPrice: 79,
  period: { start: '2026-05-01', end: '2026-05-31', daysLeft: 21 },
  limits: {
    requests: { used: 7821, total: 10000 },
    tokens: { used: 3100000, total: 5000000 },
    ocr: { used: 45, total: 100 },
  },
  byFeature: [
    { label: 'Chat conversations', requests: 3200, tokens: 1500000, cost: 24.50 },
    { label: 'Load optimization', requests: 540, tokens: 400000, cost: 8.10 },
    { label: 'Smart matching', requests: 490, tokens: 300000, cost: 5.90 },
    { label: 'Document OCR', requests: 340, tokens: 500000, cost: 9.20 },
    { label: 'Route suggestions', requests: 280, tokens: 100000, cost: 3.40 },
    { label: 'Anomaly detection', requests: 150, tokens: 100000, cost: 2.10 },
    { label: 'Predictive ETA', requests: 120, tokens: 100000, cost: 1.80 },
    { label: 'MCP Server', requests: 701, tokens: 100000, cost: 4.00 },
  ],
  extra: {
    enabled: true,
    autoPurchase: false,
    autoPurchaseAmount: 50,
    spent: 47.30,
    limit: 200,
    balance: 152.70,
    pricePerCredit: 10,
  },
  purchaseHistory: [
    { id: 'PH-001', date: '2026-05-02', amount: 50, credits: 5000, method: 'Manual', status: 'completed' },
    { id: 'PH-002', date: '2026-04-15', amount: 100, credits: 10000, method: 'Manual', status: 'completed' },
    { id: 'PH-003', date: '2026-03-28', amount: 50, credits: 5000, method: 'Auto', status: 'completed' },
  ],
  planTiers: [
    { name: 'Starter', price: 0, requests: 1000, tokens: 500000, ocr: 10, highlight: false },
    { name: 'Professional', price: 39, requests: 5000, tokens: 2000000, ocr: 50, highlight: false },
    { name: 'Business', price: 79, requests: 10000, tokens: 5000000, ocr: 100, highlight: true },
    { name: 'Enterprise', price: null, requests: null, tokens: null, ocr: null, highlight: false },
  ],
};
