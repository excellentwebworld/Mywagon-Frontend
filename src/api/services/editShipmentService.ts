import { apiGet, apiPost, apiPut } from '../client';
import type {
  ApiEditPreviewDiff,
  ApiEditShipment,
  ApplyEditShipmentResponse,
  SaveStepOnePayload,
  SaveStepThreePayload,
  SaveStepTwoPayload,
} from '../types/createShipment';

const base = (id: number | string) => `/edit-shipment/${id}`;

export const editShipmentService = {
  async getEdit(id: number | string): Promise<ApiEditShipment> {
    const res = await apiGet<ApiEditShipment>(base(id));
    return res.data;
  },

  async saveEditStepOne(id: number | string, payload: SaveStepOnePayload): Promise<ApiEditShipment> {
    const res = await apiPut<ApiEditShipment>(`${base(id)}/step-1`, payload);
    return res.data;
  },

  async saveEditStepTwo(id: number | string, payload: SaveStepTwoPayload): Promise<ApiEditShipment> {
    const res = await apiPut<ApiEditShipment>(`${base(id)}/step-2`, payload);
    return res.data;
  },

  async saveEditStepThree(id: number | string, payload: SaveStepThreePayload): Promise<ApiEditShipment> {
    const res = await apiPut<ApiEditShipment>(`${base(id)}/step-3`, payload);
    return res.data;
  },

  async applyEdit(id: number | string): Promise<ApplyEditShipmentResponse> {
    const res = await apiPost<ApplyEditShipmentResponse>(`${base(id)}/apply`);
    return res.data;
  },

  async previewDiff(id: number | string): Promise<ApiEditPreviewDiff> {
    const res = await apiPost<ApiEditPreviewDiff>(`${base(id)}/preview-diff`);
    return res.data;
  },

  async cancelEdit(id: number | string): Promise<{ id: number; auto_id: string; status: string }> {
    const res = await apiPost<{ id: number; auto_id: string; status: string }>(`${base(id)}/cancel`);
    return res.data;
  },
};
