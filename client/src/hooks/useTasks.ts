import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { caldavApi } from '../api/caldav';
import { useSettingsStore } from '../stores/settingsStore';
import type { CalDAVTodo } from '../types';

export function useTasks() {
  const calendarHref = useSettingsStore(s => s.settings.caldav_tasks_calendar_href);
  return useQuery({
    queryKey: ['tasks', calendarHref],
    queryFn: () => caldavApi.getTodos(calendarHref),
    enabled: !!calendarHref,
    select: d => (d.data ?? []).filter(t => {
      const cat = t.categories?.toUpperCase() ?? '';
      return cat === 'TASK' || cat === 'TASKS';
    }),
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  const calendarHref = useSettingsStore(s => s.settings.caldav_tasks_calendar_href);
  return useMutation({
    mutationFn: (todo: Omit<CalDAVTodo, 'uid' | 'href' | 'etag' | 'icalString'>) =>
      caldavApi.createTodo(calendarHref, { ...todo, categories: 'TASK' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (todo: Pick<CalDAVTodo, 'href' | 'etag'> & Partial<CalDAVTodo>) =>
      caldavApi.updateTodo(todo),
    onMutate: async (todo) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const snapshots = qc.getQueriesData<{ data?: CalDAVTodo[] }>({ queryKey: ['tasks'] });
      qc.setQueriesData<{ data?: CalDAVTodo[] }>({ queryKey: ['tasks'] }, (old) =>
        old ? { ...old, data: (old.data ?? []).map(t => t.href === todo.href ? { ...t, ...todo } : t) } : old,
      );
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, val]) => qc.setQueryData(key, val));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (href: string) => caldavApi.deleteTodo(href),
    onMutate: async (href) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const snapshots = qc.getQueriesData<{ data?: CalDAVTodo[] }>({ queryKey: ['tasks'] });
      qc.setQueriesData<{ data?: CalDAVTodo[] }>({ queryKey: ['tasks'] }, (old) =>
        old ? { ...old, data: (old.data ?? []).filter(t => t.href !== href) } : old,
      );
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, val]) => qc.setQueryData(key, val));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
