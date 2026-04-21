import type { Task, ApiResponse } from '../types';

const BASE = '/api/tasks';

export const tasksApi = {
  getAll: async (): Promise<ApiResponse<Task[]>> => {
    const r = await fetch(BASE);
    return r.json();
  },

  create: async (data: { title: string; notes?: string; due_date?: string | null }): Promise<ApiResponse<Task>> => {
    const r = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return r.json();
  },

  update: async (id: string, data: Partial<{ title: string; notes: string; due_date: string | null; completed: boolean }>): Promise<ApiResponse<Task>> => {
    const r = await fetch(`${BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return r.json();
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const r = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
    return r.json();
  },

  clearCompleted: async (): Promise<ApiResponse<void>> => {
    const r = await fetch(`${BASE}/completed`, { method: 'DELETE' });
    return r.json();
  },
};
