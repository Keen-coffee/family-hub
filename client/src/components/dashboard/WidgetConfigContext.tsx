import { createContext, useContext } from 'react';
import type { WidgetConfig } from '../../types';

export const WidgetConfigContext = createContext<WidgetConfig | null>(null);

/**
 * Read the current widget's full config (including settings) from inside any widget.
 * Returns null if called outside a WidgetWrapper.
 */
export function useWidgetConfig(): WidgetConfig | null {
  return useContext(WidgetConfigContext);
}

/**
 * Helper to read a typed setting value with a fallback default.
 */
export function useWidgetSetting<T>(key: string, defaultValue: T): T {
  const config = useWidgetConfig();
  if (!config?.settings || !(key in config.settings)) return defaultValue;
  return config.settings[key] as T;
}
