import api from './client';
import type { ApiResponse, InventoryItem, GroceryItem } from '../types';

export const inventoryApi = {
  // Barcode lookup
  lookupBarcode: (barcode: string) =>
    api.get<ApiResponse<Partial<InventoryItem> & { source: string }>>(`/inventory/lookup/${barcode}`).then(r => r.data),

  // Inventory
  getInventory: () =>
    api.get<ApiResponse<InventoryItem[]>>('/inventory').then(r => r.data),

  addItem: (item: Omit<InventoryItem, 'id' | 'created_at'>) =>
    api.post<ApiResponse<{ id: string }>>('/inventory', item).then(r => r.data),

  updateItem: (id: string, item: Partial<InventoryItem>) =>
    api.put<ApiResponse<void>>(`/inventory/${id}`, item).then(r => r.data),

  markEmpty: (id: string) =>
    api.patch<ApiResponse<void>>(`/inventory/${id}/empty`).then(r => r.data),

  deleteItem: (id: string) =>
    api.delete<ApiResponse<void>>(`/inventory/${id}`).then(r => r.data),

  // Grocery list
  getGrocery: () =>
    api.get<ApiResponse<GroceryItem[]>>('/inventory/grocery').then(r => r.data),

  addGroceryItem: (item: Omit<GroceryItem, 'id' | 'created_at' | 'checked'>) =>
    api.post<ApiResponse<{ id: string }>>('/inventory/grocery', item).then(r => r.data),

  updateGroceryItem: (id: string, item: Partial<GroceryItem>) =>
    api.put<ApiResponse<void>>(`/inventory/grocery/${id}`, item).then(r => r.data),

  deleteGroceryItem: (id: string) =>
    api.delete<ApiResponse<void>>(`/inventory/grocery/${id}`).then(r => r.data),

  clearCheckedGrocery: () =>
    api.delete<ApiResponse<void>>('/inventory/grocery').then(r => r.data),
};
