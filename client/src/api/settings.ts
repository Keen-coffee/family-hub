import api from './client';
import type { ApiResponse, AppSettings } from '../types';

export const settingsApi = {
  get: () =>
    api.get<ApiResponse<AppSettings>>('/settings').then(r => r.data),

  save: (settings: Partial<AppSettings>) =>
    api.put<ApiResponse<void>>('/settings', settings).then(r => r.data),
};
