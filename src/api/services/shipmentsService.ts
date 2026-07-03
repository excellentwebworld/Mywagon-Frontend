import { apiPost } from '../client';

export const shipmentsService = {
  async createShipment(payload: any): Promise<any> {
    const res = await apiPost<any>('/shipments', payload);
    return res.data;
  },
};
