import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { shoppingApi } from '../api/shopping';
import { pantryApi } from '../api/pantry';
import { recipesApi } from '../api/recipes';
import { mealplanApi } from '../api/mealplan';
import { weatherApi } from '../api/weather';
import { caldavApi } from '../api/caldav';
import { useSettingsStore } from '../stores/settingsStore';
import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns';

/**
 * Eagerly prefetches every API data set on app startup (while online).
 * The service worker intercepts each fetch and stores the response in its
 * runtime cache, so every page has data available even when offline.
 */
export function usePrefetchAll() {
  const qc = useQueryClient();
  const settings = useSettingsStore(s => s.settings);

  useEffect(() => {
    if (!navigator.onLine) return;

    const prefetch = (key: unknown[], fn: () => Promise<unknown>) =>
      qc.prefetchQuery({ queryKey: key, queryFn: fn, staleTime: 2 * 60 * 1000 });

    // ── Simple endpoints (no required params) ──────────────────────────────
    prefetch(['shopping'], () => shoppingApi.getAll().then(r => r.data ?? []));
    prefetch(['pantry', 'sections'], () => pantryApi.getSections().then(r => r.data ?? []));
    prefetch(['pantry', 'items', 'all'], () => pantryApi.getItems().then(r => r.data ?? []));
    prefetch(['recipes'], () => recipesApi.getAll().then(r => r.data ?? []));
    prefetch(['weather', 'current'], () => weatherApi.getCurrent());
    prefetch(['weather', 'forecast'], () => weatherApi.getForecast());

    // ── Meal plan – prefetch current + next week ───────────────────────────
    const now = new Date();
    const weekStart = format(startOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(addWeeks(now, 1), { weekStartsOn: 0 }), 'yyyy-MM-dd');
    prefetch(['mealplan', weekStart, weekEnd], () =>
      mealplanApi.getAll(weekStart, weekEnd).then(r => r.data ?? []),
    );

    // ── CalDAV – only if configured ────────────────────────────────────────
    if (settings.caldav_url) {
      prefetch(['calendars'], () => caldavApi.getCalendars().then(r => r.data ?? []));
    }

    if (settings.caldav_calendar_href) {
      const evStart = format(startOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd'T'00:00:00");
      const evEnd = format(endOfWeek(addWeeks(now, 2), { weekStartsOn: 0 }), "yyyy-MM-dd'T'23:59:59");
      prefetch(
        ['calendar-events', settings.caldav_calendar_href, evStart, evEnd],
        () => caldavApi.getEvents(settings.caldav_calendar_href, evStart, evEnd).then(r => r.data ?? []),
      );
    }

    if (settings.caldav_tasks_calendar_href) {
      prefetch(
        ['tasks', settings.caldav_tasks_calendar_href],
        () => caldavApi.getTodos(settings.caldav_tasks_calendar_href),
      );
    }

    if (settings.caldav_chores_calendar_href) {
      prefetch(
        ['chores', settings.caldav_chores_calendar_href],
        () => caldavApi.getTodos(settings.caldav_chores_calendar_href),
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only
}
