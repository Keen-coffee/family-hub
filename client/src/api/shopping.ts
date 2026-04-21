import type { ShoppingItem, ApiResponse } from '../types';

const BASE = '/api/shopping';

export const shoppingApi = {
  getAll: async (): Promise<ApiResponse<ShoppingItem[]>> => {
    const r = await fetch(BASE);
    return r.json();
  },
  create: async (data: { name: string; quantity?: number; unit?: string; source?: string }): Promise<ApiResponse<ShoppingItem>> => {
    const r = await fetch(BASE, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    return r.json();
  },
  update: async (id: string, data: Partial<ShoppingItem>): Promise<ApiResponse<ShoppingItem>> => {
    const r = await fetch(`${BASE}/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    return r.json();
  },
  delete: async (id: string): Promise<ApiResponse<null>> => {
    const r = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
    return r.json();
  },
  clearChecked: async (): Promise<ApiResponse<null>> => {
    const r = await fetch(`${BASE}/checked`, { method: 'DELETE' });
    return r.json();
  },
};
