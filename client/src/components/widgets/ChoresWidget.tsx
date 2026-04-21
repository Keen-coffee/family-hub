import React from 'react';
import { CheckSquare, Square, CheckCheck } from 'lucide-react';
import { useChores, useUpdateChore } from '../../hooks/useChores';
import { useSettingsStore } from '../../stores/settingsStore';
import { useWidgetSetting } from '../dashboard/WidgetConfigContext';
import LoadingSpinner from '../common/LoadingSpinner';
import type { CalDAVTodo } from '../../types';

export default function ChoresWidget() {
  const { data: chores, isLoading } = useChores();
  const { mutate: updateChore } = useUpdateChore();
  const familyMembers = useSettingsStore(s => s.settings.family_members)
    .split(',').map(m => m.trim()).filter(Boolean);
  const maxItems = useWidgetSetting<number>('maxItems', 10);

  const pending = (chores ?? []).filter(c => c.status !== 'COMPLETED').slice(0, maxItems);

  const toggle = (chore: CalDAVTodo) => {
    updateChore({
      href: chore.href,
      etag: chore.etag,
      uid: chore.uid,
      summary: chore.summary,
      status: chore.status === 'COMPLETED' ? 'NEEDS-ACTION' : 'COMPLETED',
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-700/50 flex items-center gap-2 shrink-0">
        <CheckCheck className="w-4 h-4 text-accent shrink-0" />
        <span className="text-xs font-semibold text-slate-300">Chores</span>
        {pending.length > 0 && (
          <span className="ml-auto text-[10px] bg-amber-500/20 text-amber-400 rounded-full px-1.5 py-0.5">
            {pending.length}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {isLoading ? (
          <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-4">
            <CheckCheck className="w-5 h-5 text-emerald-500" />
            <p className="text-xs text-slate-500">All done!</p>
          </div>
        ) : (
          pending.map(chore => (
            <button
              key={chore.uid}
              onClick={() => toggle(chore)}
              className="w-full flex items-start gap-2 px-3 py-1.5 hover:bg-surface-raised transition-colors text-left"
            >
              <div className="mt-0.5 shrink-0 text-slate-500">
                <Square className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-200 truncate">{chore.summary}</p>
                {chore.assignee && (
                  <p className="text-[10px] text-slate-500">{chore.assignee}</p>
                )}
                {chore.due && (
                  <p className="text-[10px] text-amber-500">
                    Due {new Date(chore.due).toLocaleDateString()}
                  </p>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
