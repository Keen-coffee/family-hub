import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, MapPin } from 'lucide-react';
import { settingsApi } from '../api/settings';
import { useSettingsStore } from '../stores/settingsStore';
import LoadingSpinner from '../components/common/LoadingSpinner';
import api from '../api/client';
import type { AppSettings } from '../types';

export default function SettingsPage() {
  const { settings, setSettings } = useSettingsStore();
  const [form, setForm] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [version, setVersion] = useState<string | null>(null);

  // Always load from server on mount — don't trust stale Zustand cache for the form
  useEffect(() => {
    settingsApi.get().then(res => {
      if (res.success && res.data) {
        const merged = { ...settings, ...res.data };
        setForm(merged);
        setSettings(merged);
      } else {
        setForm(settings);
      }
    }).catch(() => setForm(settings));

    api.get<{ version: string }>('/version').then(r => setVersion(r.data.version)).catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      await settingsApi.save(form);
      setSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const field = (
    label: string,
    key: keyof AppSettings,
    opts?: { type?: string; placeholder?: string; hint?: string }
  ) => (
    <div key={key}>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <input
        type={opts?.type ?? 'text'}
        value={(form as AppSettings)[key] ?? ''}
        onChange={e => setForm(f => ({ ...(f as AppSettings), [key]: e.target.value }))}
        placeholder={opts?.placeholder}
        className="w-full bg-surface-raised border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-accent"
      />
      {opts?.hint && <p className="text-[10px] text-slate-600 mt-0.5">{opts.hint}</p>}
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 shrink-0">
        <Settings className="w-5 h-5 text-accent" />
        <h1 className="text-base font-semibold text-slate-100 mr-auto">Settings</h1>
      </div>

      {!form && (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      )}
      {form && <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-8">

          {/* Family */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-2">Family</h2>
            {field('Family Members', 'family_members', {
              placeholder: 'Alice, Bob, Charlie',
              hint: 'Comma-separated names used for chore assignment and filtering',
            })}
          </section>

          {/* CalDAV */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-2">
              CalDAV — Calendar & Tasks
            </h2>
            {field('Server URL', 'caldav_url', { placeholder: 'https://nextcloud.example.com/remote.php/dav' })}
            {field('Username', 'caldav_username')}
            {field('Password', 'caldav_password', { type: 'password' })}
            {field('Calendar Path (href)', 'caldav_calendar_href', {
              placeholder: '/remote.php/dav/calendars/user/personal/',
              hint: 'Full path to your primary calendar. Found via CalDAV discovery.',
            })}
            {field('Chores Calendar Path (href)', 'caldav_chores_calendar_href', {
              placeholder: '/remote.php/dav/calendars/user/chores/',
              hint: 'Path to a separate VTODO calendar used for chores',
            })}
            {field('Tasks Calendar Path (href)', 'caldav_tasks_calendar_href', {
              placeholder: '/remote.php/dav/calendars/user/tasks/',
              hint: 'Path to a separate VTODO calendar used for tasks/to-dos',
            })}
          </section>

          {/* Weather */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-2">
              Weather — Pirate Weather
            </h2>
            {field('API Key', 'pirateweather_api_key', {
              type: 'password',
              hint: 'Free at pirateweather.net — sign in with GitHub',
            })}
            <div className="grid grid-cols-2 gap-3">
              {field('Latitude', 'weather_lat', { placeholder: '40.7128' })}
              {field('Longitude', 'weather_lon', { placeholder: '-74.0060' })}
            </div>
            <select
                value={form.weather_units}
                onChange={e => setForm(f => ({ ...(f as AppSettings), weather_units: e.target.value as AppSettings['weather_units'] }))}
                className="bg-surface-raised border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-accent"
              >
                <option value="imperial">Imperial (°F, mph)</option>
                <option value="metric">Metric (°C, km/h)</option>
              </select>
          </section>

          {/* OpenRouter AI */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-2">
              AI — OpenRouter
            </h2>
            {field('API Key', 'openrouter_api_key', {
              type: 'password',
              hint: 'Get a free key at openrouter.ai — used to parse product names from barcode scans',
            })}
            {field('Model', 'openrouter_model', {
              placeholder: 'anthropic/claude-3-haiku (default)',
              hint: 'Any OpenRouter model ID. Leave blank to use the default.',
            })}
          </section>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2 pb-8">            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
            {saved && <span className="text-xs text-emerald-400">Settings saved ✓</span>}
          </div>

          {/* Version */}
          {version && (
            <div className="pb-6 text-center">
              <span className="text-[10px] text-slate-600 font-mono">
                version: {version}
              </span>
            </div>
          )}
        </div>
      </form>}
    </div>
  );
}
