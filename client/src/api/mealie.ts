import api from './client';
import type { ApiResponse, MealieRecipe, MealieMealPlan, MealieShoppingItem } from '../types';

export const mealieApi = {
  // Recipes — Mealie returns { items: [...], total, page, per_page }
  getRecipes: (params?: Record<string, string>) =>
    api.get<ApiResponse<{ items: MealieRecipe[]; total: number }>>('/mealie/recipes', { params }).then(r => r.data),

  getRecipe: (slug: string) =>
    api.get<ApiResponse<MealieRecipe>>(`/mealie/recipes/${slug}`).then(r => r.data),

  // Meal plans — Mealie returns { items: [...] }
  getMealPlan: (fromDate?: string, toDate?: string) =>
    api
      .get<ApiResponse<{ items: MealieMealPlan[] }>>('/mealie/meal-plan', {
        params: { ...(fromDate ? { start_date: fromDate } : {}), ...(toDate ? { end_date: toDate } : {}) },
      })
      .then(r => r.data),

  createMealPlan: (entry: Partial<MealieMealPlan>) =>
    api.post<ApiResponse<MealieMealPlan>>('/mealie/meal-plan', entry).then(r => r.data),

  deleteMealPlan: (id: string) =>
    api.delete<ApiResponse<void>>(`/mealie/meal-plan/${id}`).then(r => r.data),

  // Shopping list items
  getShopping: () =>
    api.get<ApiResponse<{ items: MealieShoppingItem[] }>>('/mealie/shopping').then(r => r.data),

  updateShoppingItem: (id: string, item: Partial<MealieShoppingItem>) =>
    api.put<ApiResponse<MealieShoppingItem>>(`/mealie/shopping/${id}`, item).then(r => r.data),

  deleteShoppingItem: (id: string) =>
    api.delete<ApiResponse<void>>(`/mealie/shopping/${id}`).then(r => r.data),
};
