import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WidgetConfig, WidgetType } from '../types';

const DEFAULT_LAYOUT: WidgetConfig[] = [
  { i: 'clock-1',   type: 'clock',    x: 0,  y: 0,  w: 6,  h: 3,  minW: 6, minH: 2 },
  { i: 'weather-1', type: 'weather',  x: 6,  y: 0,  w: 10, h: 6,  minW: 6, minH: 4 },
  { i: 'calendar-1',type: 'calendar', x: 16, y: 0,  w: 16, h: 12, minW: 8, minH: 6 },
  { i: 'meals-1',   type: 'meals',    x: 32, y: 0,  w: 16, h: 6,  minW: 8, minH: 4 },
  { i: 'tasks-1',   type: 'tasks',    x: 0,  y: 3,  w: 10, h: 9,  minW: 6, minH: 4 },
  { i: 'grocery-1', type: 'grocery',  x: 10, y: 6,  w: 6,  h: 6,  minW: 4, minH: 4 },
  { i: 'chores-1',  type: 'chores',   x: 32, y: 6,  w: 16, h: 6,  minW: 8, minH: 4 },
];

interface DashboardState {
  layout: WidgetConfig[];
  isEditing: boolean;
  setLayout: (layout: WidgetConfig[]) => void;
  setIsEditing: (v: boolean) => void;
  addWidget: (type: WidgetType) => void;
  removeWidget: (id: string) => void;
  resetLayout: () => void;
  updateWidgetSettings: (id: string, settings: Record<string, unknown>) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      layout: DEFAULT_LAYOUT,
      isEditing: false,
      setLayout: (layout) => set({ layout }),
      setIsEditing: (v) => set({ isEditing: v }),
      addWidget: (type) => {
        const id = `${type}-${Date.now()}`;
        const defaults: Record<WidgetType, Partial<WidgetConfig>> = {
          clock:    { w: 6,  h: 3,  minW: 4, minH: 2 },
          weather:  { w: 10, h: 6,  minW: 6, minH: 4 },
          calendar: { w: 16, h: 12, minW: 8, minH: 6 },
          meals:    { w: 12, h: 6,  minW: 8, minH: 4 },
          tasks:    { w: 8,  h: 8,  minW: 6, minH: 4 },
          grocery:  { w: 8,  h: 8,  minW: 6, minH: 4 },
          chores:   { w: 12, h: 6,  minW: 8, minH: 4 },
        };
        const newWidget: WidgetConfig = { i: id, type, x: 0, y: 9999, ...defaults[type] } as WidgetConfig;
        set({ layout: [...get().layout, newWidget] });
      },
      removeWidget: (id) => set({ layout: get().layout.filter(w => w.i !== id) }),
      resetLayout: () => set({ layout: DEFAULT_LAYOUT }),
      updateWidgetSettings: (id, settings) =>
        set({ layout: get().layout.map(w => w.i === id ? { ...w, settings: { ...w.settings, ...settings } } : w) }),
    }),
    { name: 'family-hub-dashboard' }
  )
);
