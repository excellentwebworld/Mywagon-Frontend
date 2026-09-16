import { apiDelete, apiGet, apiPost, apiPut } from '../client';

export type ErpProviderCatalogItem = {
  id: string;
  name: string;
  category: string;
  available: boolean;
  data_types: string[];
  sync_direction: string;
  description: string;
  status: 'disconnected' | 'connected' | 'error' | 'coming_soon';
  last_synced_at: string | null;
  last_error: string | null;
  has_credentials: boolean;
};

export type ErpSyncRun = {
  id: number;
  status: string;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
};

export type BusinessCentralConnection = {
  id?: number;
  provider: string;
  status: string;
  settings: {
    auth_mode?: string | null;
    tenant_id: string | null;
    environment: string | null;
    company_id: string | null;
    company_name: string | null;
    client_id: string | null;
    use_fixture: boolean;
    has_client_secret: boolean;
    oauth_configured?: boolean;
  };
  last_synced_at: string | null;
  last_error: string | null;
  last_run: ErpSyncRun | null;
};

export type BcConnectionPayload = {
  tenant_id: string;
  environment: string;
  company_id?: string;
  company_name?: string;
  client_id: string;
  client_secret?: string;
};

const BASE = '/integrations/erp/connections';

export const erpIntegrationService = {
  async listConnections(): Promise<ErpProviderCatalogItem[]> {
    const res = await apiGet<ErpProviderCatalogItem[]>(BASE);
    return res.data ?? [];
  },

  async getBusinessCentral(): Promise<BusinessCentralConnection> {
    const res = await apiGet<BusinessCentralConnection>(`${BASE}/business_central`);
    return res.data;
  },

  async startBusinessCentralOAuth(): Promise<{ authorize_url: string; oauth_configured: boolean }> {
    const res = await apiGet<{ authorize_url: string; oauth_configured: boolean }>(
      `${BASE}/business_central/oauth/start`
    );
    return res.data;
  },

  async completeBusinessCentralOAuth(
    code: string,
    state: string
  ): Promise<{
    connection: BusinessCentralConnection;
    companies: Array<{ id: string; name: string }>;
  }> {
    const res = await apiPost<{
      connection: BusinessCentralConnection;
      companies: Array<{ id: string; name: string }>;
    }>(`${BASE}/business_central/oauth/callback`, { code, state });
    return res.data;
  },

  async saveBusinessCentralSettings(body: {
    environment: string;
    company_id?: string;
    company_name?: string;
  }): Promise<BusinessCentralConnection> {
    const res = await apiPut<BusinessCentralConnection>(`${BASE}/business_central/settings`, body);
    return res.data;
  },

  async saveBusinessCentral(body: BcConnectionPayload): Promise<BusinessCentralConnection> {
    const res = await apiPut<BusinessCentralConnection>(`${BASE}/business_central`, body);
    return res.data;
  },

  async testBusinessCentral(): Promise<{
    ok: boolean;
    message: string;
    companies: Array<{ id: string; name: string }>;
    connection: BusinessCentralConnection;
  }> {
    const res = await apiPost<{
      ok: boolean;
      message: string;
      companies: Array<{ id: string; name: string }>;
      connection: BusinessCentralConnection;
    }>(`${BASE}/business_central/test`);
    return res.data;
  },

  async syncBusinessCentral(): Promise<{
    connection: BusinessCentralConnection;
    run: ErpSyncRun;
  }> {
    const res = await apiPost<{
      connection: BusinessCentralConnection;
      run: ErpSyncRun;
    }>(`${BASE}/business_central/sync`);
    return res.data;
  },

  async disconnectBusinessCentral(): Promise<void> {
    await apiDelete(`${BASE}/business_central`);
  },
};
