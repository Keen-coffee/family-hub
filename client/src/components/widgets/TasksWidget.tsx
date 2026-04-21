import React from 'react';
import { Square, CheckSquare, ClipboardList } from 'lucide-react';
import { useTasks, useUpdateTask } from '../../hooks/useTasks';
import { useSettingsStore } from '../../stores/settingsStore';
import { useWidgetSetting } from '../dashboard/WidgetConfigContext';
import LoadingSpinner from '../common/LoadingSpinner';
import type { CalDAVTodo } from '../../types';

export default function TasksWidget() {
  const { data: tasks = [], isLoading } = useTasks();
  const { mutate: update } = useUpdateTask();
  const calendarHref = useSettingsStore(s => s.settings.caldav_tasks_calendar_href);
  const maxItems = useWidgetSetting<number>('maxItems', 12);
  const showCompleted = useWidgetSetting<boolean>('showCompleted', false);

  const pending = tasks
    .filter(t => showCompleted || t.status !== 'COMPLETED')
    .slice(0, maxItems);

  const toggle = (task: CalDAVTodo) => {
    update({
      href: task.href,
      etag: task.etag,
      uid: task.uid,
      summary: task.summary,
      status: task.status === 'COMPLETED' ? 'NEEDS-ACTION' : 'COMPLETED',
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-700/50 flex items-center gap-2 shrink-0">
        <ClipboardList className="w-4 h-4 text-accent shrink-0" />
        <span className="text-xs font-semibold text-slate-300">Tasks</span>
        {pending.length > 0 && (
          <span className="ml-auto text-[10px] bg-accent/20 text-accent rounded-full px-1.5 py-0.5">
            {pending.length}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {!calendarHref ? (
          <p className="p-3 text-xs text-slate-500">Tasks calendar not set in settings</p>
        ) : isLoading ? (
          <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
        ) : pending.length === 0 ? (
          <p className="p-3 text-xs text-slate-500">No pending tasks</p>
        ) : (
          pending.map(task => (
            <button
              key={task.uid}
              onClick={() => toggle(task)}
              className="w-full flex items-start gap-2 px-3 py-1.5 hover:bg-surface-raised transition-colors text-left"
            >
              <div className="mt-0.5 shrink-0 text-slate-500 hover:text-emerald-400 transition-colors">
                {task.status === 'COMPLETED'
                  ? <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                  : <Square className="w-3.5 h-3.5" />}
              </div>
              <p className="text-xs text-slate-200 truncate">{task.summary}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
