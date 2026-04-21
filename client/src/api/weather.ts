import api from './client';
import type { ApiResponse, WeatherCurrent, WeatherForecast } from '../types';

export const weatherApi = {
  getCurrent: () =>
    api.get<ApiResponse<WeatherCurrent>>('/weather/current').then(r => r.data),

  getForecast: () =>
    api.get<ApiResponse<WeatherForecast>>('/weather/forecast').then(r => r.data),
};
