import type { Recipe, ApiResponse } from '../types';

const BASE = '/api/recipes';

export const recipesApi = {
  getAll: async (): Promise<ApiResponse<Recipe[]>> => {
    const r = await fetch(BASE);
    return r.json();
  },
  getById: async (id: string): Promise<ApiResponse<Recipe>> => {
    const r = await fetch(`${BASE}/${id}`);
    return r.json();
  },
  create: async (data: { name: string; description?: string; servings?: number; ingredients: { ingredient_name: string; notes?: string }[] }): Promise<ApiResponse<Recipe>> => {
    const r = await fetch(BASE, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    return r.json();
  },
  update: async (id: string, data: Partial<Recipe> & { ingredients?: { ingredient_name: string; notes?: string }[] }): Promise<ApiResponse<Recipe>> => {
    const r = await fetch(`${BASE}/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    return r.json();
  },
  delete: async (id: string): Promise<ApiResponse<null>> => {
    const r = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
    return r.json();
  },
};
