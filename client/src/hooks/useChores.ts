import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { caldavApi } from '../api/caldav';
import { useSettingsStore } from '../stores/settingsStore';
import type { CalDAVTodo } from '../types';

export function useChores() {
  const calendarHref = useSettingsStore(s => s.settings.caldav_chores_calendar_href);
  return useQuery({
    queryKey: ['chores', calendarHref],
    queryFn: () => caldavApi.getTodos(calendarHref),
    enabled: !!calendarHref,
    select: d => (d.data ?? []).filter(t => {
      const cat = t.categories?.toUpperCase() ?? '';
      return cat === 'CHORE' || cat === 'CHORES';
    }),
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useCreateChore() {
  const qc = useQueryClient();
  const calendarHref = useSettingsStore(s => s.settings.caldav_chores_calendar_href);
  return useMutation({
    mutationFn: (todo: Omit<CalDAVTodo, 'uid' | 'href' | 'etag' | 'icalString'>) =>
      caldavApi.createTodo(calendarHref, { ...todo, categories: 'CHORE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chores'] }),
  });
}

export function useUpdateChore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (todo: Pick<CalDAVTodo, 'href' | 'etag'> & Partial<CalDAVTodo>) =>
      caldavApi.updateTodo(todo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chores'] }),
  });
}

export function useDeleteChore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (href: string) => caldavApi.deleteTodo(href),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chores'] }),
  });
}
