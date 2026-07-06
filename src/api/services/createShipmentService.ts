import { apiDelete, apiGet, apiPost, apiPut } from '../client';
import type { ApiDraftShipment, SaveStepOnePayload, SaveStepTwoPayload } from '../types/createShipment';

export const createShipmentService = {
  async createDraft(): Promise<ApiDraftShipment> {
    const res = await apiPost<ApiDraftShipment>('/create-shipment/drafts');
    return res.data;
  },

  async getDraft(id: number | string): Promise<ApiDraftShipment> {
    const res = await apiGet<ApiDraftShipment>(`/create-shipment/drafts/${id}`);
    return res.data;
  },

  async saveStepOne(id: number | string, payload: SaveStepOnePayload): Promise<ApiDraftShipment> {
    const res = await apiPut<ApiDraftShipment>(`/create-shipment/drafts/${id}/step-1`, payload);
    return res.data;
  },

  async saveStepTwo(id: number | string, payload: SaveStepTwoPayload): Promise<ApiDraftShipment> {
    const res = await apiPut<ApiDraftShipment>(`/create-shipment/drafts/${id}/step-2`, payload);
    return res.data;
  },

  async deleteDraft(id: number | string): Promise<void> {
    await apiDelete(`/create-shipment/drafts/${id}`);
  },
};
