import type { PantrySection, PantryItem, ApiResponse } from '../types';

const BASE = '/api/pantry';

export const pantryApi = {
  getSections: async (): Promise<ApiResponse<PantrySection[]>> => {
    const r = await fetch(`${BASE}/sections`);
    return r.json();
  },
  createSection: async (data: { name: string; icon?: string }): Promise<ApiResponse<PantrySection>> => {
    const r = await fetch(`${BASE}/sections`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    return r.json();
  },
  updateSection: async (id: string, data: Partial<PantrySection>): Promise<ApiResponse<PantrySection>> => {
    const r = await fetch(`${BASE}/sections/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    return r.json();
  },
  deleteSection: async (id: string): Promise<ApiResponse<null>> => {
    const r = await fetch(`${BASE}/sections/${id}`, { method: 'DELETE' });
    return r.json();
  },

  getItems: async (section_id?: string): Promise<ApiResponse<PantryItem[]>> => {
    const url = section_id ? `${BASE}/items?section_id=${section_id}` : `${BASE}/items`;
    const r = await fetch(url);
    return r.json();
  },
  createItem: async (data: {
    section_id: string; name: string; generic_name?: string; brand?: string;
    quantity?: number; unit?: string; min_quantity?: number; barcode?: string;
  }): Promise<ApiResponse<PantryItem>> => {
    const r = await fetch(`${BASE}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    return r.json();
  },
  updateItem: async (id: string, data: Partial<Omit<PantryItem, 'id' | 'created_at'>>): Promise<ApiResponse<PantryItem>> => {
    const r = await fetch(`${BASE}/items/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    return r.json();
  },
  deleteItem: async (id: string): Promise<ApiResponse<null>> => {
    const r = await fetch(`${BASE}/items/${id}`, { method: 'DELETE' });
    return r.json();
  },
  bulkDeleteItems: async (ids: string[]): Promise<ApiResponse<{ deleted: number }>> => {
    const r = await fetch(`${BASE}/items/bulk-delete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }),
    });
    return r.json();
  },
  addToShopping: async (id: string, quantity?: number): Promise<ApiResponse<any>> => {
    const r = await fetch(`${BASE}/items/${id}/add-to-shopping`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: quantity ?? 1 }),
    });
    return r.json();
  },
};
