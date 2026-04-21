import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays, startOfMonth, endOfMonth } from 'date-fns';
import { caldavApi } from '../api/caldav';
import { useSettingsStore } from '../stores/settingsStore';

export function useCalendarEvents(start?: Date, end?: Date) {
  const calendarHref = useSettingsStore(s => s.settings.caldav_calendar_href);
  const s = start ?? startOfMonth(new Date());
  const e = end ?? endOfMonth(addDays(new Date(), 60));

  return useQuery({
    queryKey: ['calendar-events', calendarHref, s.toISOString(), e.toISOString()],
    queryFn: () => caldavApi.getEvents(calendarHref, s.toISOString(), e.toISOString()),
    enabled: !!calendarHref,
    refetchInterval: 5 * 60 * 1000,
    select: d => d.data ?? [],
  });
}

export function useCalendars() {
  return useQuery({
    queryKey: ['calendars'],
    queryFn: () => caldavApi.getCalendars(),
    select: d => d.data ?? [],
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ calendarHref, event }: { calendarHref: string; event: Parameters<typeof caldavApi.createEvent>[1] }) =>
      caldavApi.createEvent(calendarHref, event),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar-events'] }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (event: Parameters<typeof caldavApi.updateEvent>[0]) => caldavApi.updateEvent(event),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar-events'] }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (href: string) => caldavApi.deleteEvent(href),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar-events'] }),
  });
}
