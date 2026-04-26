import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '../types';

const DEFAULTS: AppSettings = {
  caldav_url: '',
  caldav_username: '',
  caldav_password: '',
  caldav_calendar_href: '',
  caldav_chores_calendar_href: '',
  caldav_tasks_calendar_href: '',
  pirateweather_api_key: '',
  weather_lat: '',
  weather_lon: '',
  weather_units: 'imperial',
  family_members: '',
  openrouter_api_key: '',
  openrouter_model: '',
};

interface SettingsState {
  settings: AppSettings;
  isConfigured: boolean;
  setSettings: (s: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULTS,
      get isConfigured() {
        const s = get().settings;
        return !!(s.caldav_url && s.pirateweather_api_key && s.weather_lat && s.weather_lon);
      },
      setSettings: (s) =>
        set(state => ({ settings: { ...state.settings, ...s } })),
    }),
    { name: 'family-hub-settings' }
  )
);
