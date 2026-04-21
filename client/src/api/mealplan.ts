import type { MealPlanEntry, CheckGroceriesResult, ApiResponse } from '../types';

const BASE = '/api/mealplan';

export const mealplanApi = {
  getAll: async (start?: string, end?: string): Promise<ApiResponse<MealPlanEntry[]>> => {
    const params = start && end ? `?start=${start}&end=${end}` : '';
    const r = await fetch(`${BASE}${params}`);
    return r.json();
  },
  create: async (data: { date: string; meal_type?: string; recipe_id?: string | null; custom_name?: string }): Promise<ApiResponse<MealPlanEntry>> => {
    const r = await fetch(BASE, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    return r.json();
  },
  delete: async (id: string): Promise<ApiResponse<null>> => {
    const r = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
    return r.json();
  },
  checkGroceries: async (id: string): Promise<ApiResponse<CheckGroceriesResult>> => {
    const r = await fetch(`${BASE}/${id}/check-groceries`, { method: 'POST' });
    return r.json();
  },
};
