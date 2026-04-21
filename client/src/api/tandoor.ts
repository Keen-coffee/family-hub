import type { ApiResponse } from '../types';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export const tandoorApi = {
  // Recipes
  getRecipes: (_params?: Record<string, string>): Promise<ApiResponse<{ results: Any[]; count: number }>> =>
    Promise.reject(new Error('Tandoor removed')),

  getRecipe: (_id: number): Promise<ApiResponse<Any>> =>
    Promise.reject(new Error('Tandoor removed')),

  // All stubs — Tandoor replaced by Mealie
  getMealPlan: (_fromDate?: string, _toDate?: string): Promise<ApiResponse<Any[]>> =>
    Promise.reject(new Error('Tandoor removed')),

  createMealPlan: (_entry: Any): Promise<ApiResponse<Any>> =>
    Promise.reject(new Error('Tandoor removed')),

  updateMealPlan: (_id: number, _entry: Any): Promise<ApiResponse<Any>> =>
    Promise.reject(new Error('Tandoor removed')),

  deleteMealPlan: (_id: number): Promise<ApiResponse<void>> =>
    Promise.reject(new Error('Tandoor removed')),

  getShopping: (): Promise<ApiResponse<Any[]>> =>
    Promise.reject(new Error('Tandoor removed')),

  addShoppingItem: (_item: Any): Promise<ApiResponse<Any>> =>
    Promise.reject(new Error('Tandoor removed')),

  updateShoppingItem: (_id: number, _item: Any): Promise<ApiResponse<Any>> =>
    Promise.reject(new Error('Tandoor removed')),

  deleteShoppingItem: (_id: number): Promise<ApiResponse<void>> =>
    Promise.reject(new Error('Tandoor removed')),

  getKeywords: (): Promise<ApiResponse<Any[]>> =>
    Promise.reject(new Error('Tandoor removed')),
};
