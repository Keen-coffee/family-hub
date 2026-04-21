import React, { lazy, Suspense, useState } from 'react';
import { GripVertical, X, Settings2 } from 'lucide-react';
import clsx from 'clsx';
import { useDashboardStore } from '../../stores/dashboardStore';
import type { WidgetConfig, WidgetType } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import { WidgetConfigContext } from './WidgetConfigContext';

const WIDGET_LABELS: Record<string, string> = {
  clock: 'Clock',
  calendar: 'Calendar',
  weather: 'Weather',
  tasks: 'Tasks',
  grocery: 'Grocery',
  chores: 'Chores',
  meals: 'Meals',
};

// Lazy-loaded widget components
const ClockWidget    = lazy(() => import('../widgets/ClockWidget'));
const CalendarWidget = lazy(() => import('../widgets/CalendarWidget'));
const WeatherWidget  = lazy(() => import('../widgets/WeatherWidget'));
const TasksWidget    = lazy(() => import('../widgets/TasksWidget'));
const GroceryWidget  = lazy(() => import('../widgets/GroceryWidget'));
const ChoresWidget   = lazy(() => import('../widgets/ChoresWidget'));
const MealsWidget    = lazy(() => import('../widgets/MealsWidget'));

const WIDGET_MAP: Record<string, React.ComponentType> = {
  clock: ClockWidget,
  calendar: CalendarWidget,
  weather: WeatherWidget,
  tasks: TasksWidget,
  grocery: GroceryWidget,
  chores: ChoresWidget,
  meals: MealsWidget,
};

interface Props {
  config: WidgetConfig;
}

// ── Per-widget settings fields ─────────────────────────────────────────────
type FieldDef = { key: string; label: string; type: 'number' | 'boolean'; min?: number; max?: number };

const WIDGET_SETTINGS_FIELDS: Partial<Record<WidgetType, FieldDef[]>> = {
  calendar: [
    { key: 'maxEvents',  label: 'Max events to show',  type: 'number', min: 1, max: 50 },
    { key: 'daysAhead',  label: 'Days ahead to include', type: 'number', min: 1, max: 365 },
  ],
  meals: [
    { key: 'daysAhead',  label: 'Days ahead to show',   type: 'number', min: 1, max: 14 },
  ],
  tasks: [
    { key: 'maxItems',   label: 'Max tasks to show',    type: 'number', min: 1, max: 50 },
    { key: 'showCompleted', label: 'Show completed',    type: 'boolean' },
  ],
  chores: [
    { key: 'maxItems',   label: 'Max chores to show',   type: 'number', min: 1, max: 50 },
  ],
  weather: [
    { key: 'forecastDays', label: 'Forecast days',      type: 'number', min: 1, max: 5 },
  ],
};

const WIDGET_SETTINGS_DEFAULTS: Partial<Record<WidgetType, Record<string, unknown>>> = {
  calendar: { maxEvents: 10, daysAhead: 30 },
  meals:    { daysAhead: 3 },
  tasks:    { maxItems: 12, showCompleted: false },
  chores:   { maxItems: 10 },
  weather:  { forecastDays: 5 },
};

function WidgetSettingsModal({ config, onClose }: { config: WidgetConfig; onClose: () => void }) {
  const { updateWidgetSettings } = useDashboardStore();
  const fields = WIDGET_SETTINGS_FIELDS[config.type] ?? [];
  const defaults = WIDGET_SETTINGS_DEFAULTS[config.type] ?? {};
  const current = { ...defaults, ...config.settings };

  if (fields.length === 0) {
    return (
      <div className="absolute inset-x-0 top-full mt-1 z-50 bg-slate-800 border border-slate-600 rounded-xl shadow-xl p-3 mx-2">
        <p className="text-xs text-slate-400">No settings available for this widget.</p>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-x-0 top-full mt-1 z-50 bg-slate-800 border border-slate-600 rounded-xl shadow-xl p-3 mx-2"
      onClick={e => e.stopPropagation()}
    >
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Widget Settings</p>
      <div className="space-y-2">
        {fields.map(field => {
          const value = current[field.key];
          if (field.type === 'boolean') {
            return (
              <label key={field.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={e => updateWidgetSettings(config.i, { [field.key]: e.target.checked })}
                  className="accent-accent w-3.5 h-3.5"
                />
                <span className="text-xs text-slate-300">{field.label}</span>
              </label>
            );
          }
          return (
            <div key={field.key}>
              <label className="text-[10px] text-slate-400 block mb-0.5">{field.label}</label>
              <input
                type="number"
                min={field.min}
                max={field.max}
                value={Number(value)}
                onChange={e => updateWidgetSettings(config.i, { [field.key]: Number(e.target.value) })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-accent"
              />
            </div>
          );
        })}
      </div>
      <button
        onClick={onClose}
        className="mt-3 w-full py-1 text-xs bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 rounded-lg transition-colors"
      >
        Done
      </button>
    </div>
  );
}

export default function WidgetWrapper({ config }: Props) {
  const { isEditing, removeWidget } = useDashboardStore();
  const [showSettings, setShowSettings] = useState(false);
  const Widget = WIDGET_MAP[config.type];
  const hasSettings = (WIDGET_SETTINGS_FIELDS[config.type]?.length ?? 0) > 0;

  return (
    <WidgetConfigContext.Provider value={config}>
      <div
        className={clsx(
          'h-full flex flex-col bg-surface rounded-xl border transition-colors overflow-hidden',
          isEditing ? 'border-accent/40 shadow-lg shadow-accent/10' : 'border-slate-700/50'
        )}
      >
        {/* Widget header (shown when editing) */}
        {isEditing && (
          <div className="relative flex items-center justify-between px-2 py-1 bg-surface-raised border-b border-slate-700/50 shrink-0">
            <div className="widget-drag-handle flex items-center gap-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-200">
              <GripVertical className="w-4 h-4" />
              <span className="text-xs font-medium">{WIDGET_LABELS[config.type]}</span>
            </div>
            <div className="flex items-center gap-1">
              {hasSettings && (
                <button
                  onClick={e => { e.stopPropagation(); setShowSettings(s => !s); }}
                  className={clsx(
                    'p-0.5 rounded transition-colors',
                    showSettings ? 'text-accent' : 'text-slate-500 hover:text-slate-200'
                  )}
                  title="Widget settings"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => removeWidget(config.i)}
                className="p-0.5 text-slate-500 hover:text-red-400 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {showSettings && (
              <WidgetSettingsModal config={config} onClose={() => setShowSettings(false)} />
            )}
          </div>
        )}

        {/* Widget content */}
        <div className="flex-1 min-h-0 overflow-hidden" style={{ containerType: 'inline-size' }}>
          <Suspense
            fallback={
              <div className="h-full flex items-center justify-center">
                <LoadingSpinner />
              </div>
            }
          >
            {Widget ? <Widget /> : <div className="p-4 text-slate-500 text-sm">Unknown widget</div>}
          </Suspense>
        </div>
      </div>
    </WidgetConfigContext.Provider>
  );
}
