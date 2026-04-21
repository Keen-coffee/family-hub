import type { ApiResponse } from '../types';

export interface BabysitterContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  notes: string;
  sort_order: number;
  created_at: string;
}

export interface BabysitterNote {
  id: string;
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
}

const BASE = '/api/babysitter';

export const babysitterApi = {
  getContacts: (): Promise<ApiResponse<BabysitterContact[]>> =>
    fetch(`${BASE}/contacts`).then(r => r.json()),

  createContact: (data: Omit<BabysitterContact, 'id' | 'sort_order' | 'created_at'>): Promise<ApiResponse<{ id: string }>> =>
    fetch(`${BASE}/contacts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }).then(r => r.json()),

  updateContact: (id: string, data: Partial<BabysitterContact>): Promise<ApiResponse<null>> =>
    fetch(`${BASE}/contacts/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }).then(r => r.json()),

  deleteContact: (id: string): Promise<ApiResponse<null>> =>
    fetch(`${BASE}/contacts/${id}`, { method: 'DELETE' }).then(r => r.json()),

  getNotes: (): Promise<ApiResponse<BabysitterNote[]>> =>
    fetch(`${BASE}/notes`).then(r => r.json()),

  createNote: (data: { title: string; content: string }): Promise<ApiResponse<{ id: string }>> =>
    fetch(`${BASE}/notes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }).then(r => r.json()),

  updateNote: (id: string, data: Partial<BabysitterNote>): Promise<ApiResponse<null>> =>
    fetch(`${BASE}/notes/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }).then(r => r.json()),

  deleteNote: (id: string): Promise<ApiResponse<null>> =>
    fetch(`${BASE}/notes/${id}`, { method: 'DELETE' }).then(r => r.json()),
};
