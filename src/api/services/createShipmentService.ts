import { apiDelete, apiGet, apiPost, apiPut } from '../client';
import type {
  ApiDraftShipment,
  ApiVehicleType,
  PublishShipmentResponse,
  SaveStepOnePayload,
  SaveStepThreePayload,
  SaveStepTwoPayload,
} from '../types/createShipment';

export const createShipmentService = {
  async getVehicleTypes(): Promise<ApiVehicleType[]> {
    const res = await apiGet<ApiVehicleType[]>('/create-shipment/reference/vehicle-types');
    return res.data ?? [];
  },

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

  async saveStepThree(id: number | string, payload: SaveStepThreePayload): Promise<ApiDraftShipment> {
    const res = await apiPut<ApiDraftShipment>(`/create-shipment/drafts/${id}/step-3`, payload);
    return res.data;
  },

  async publishDraft(id: number | string): Promise<PublishShipmentResponse> {
    const res = await apiPost<PublishShipmentResponse>(`/create-shipment/drafts/${id}/publish`);
    return res.data;
  },

  async deleteDraft(id: number | string): Promise<void> {
    await apiDelete(`/create-shipment/drafts/${id}`);
  },

  async checkPublicLoadLimit(draftId?: number): Promise<import('../types/createShipment').PublicLoadQuotaResponse> {
    const res = await apiPost<import('../types/createShipment').PublicLoadQuotaResponse>(
      '/create-shipment/check-public-limit',
      draftId ? { draft_id: draftId } : {}
    );
    return res.data;
  },

  async fetchAiSuggestedPrice(draftId: number | string): Promise<import('../types/createShipment').AiSuggestedPriceResult> {
    const res = await apiPost<import('../types/createShipment').AiSuggestedPriceResult>(
      `/create-shipment/drafts/${draftId}/ai-suggested-price`,
      {}
    );
    return res.data;
  },
};
