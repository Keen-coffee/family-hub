import React, { useState } from 'react';
import { ClipboardList, Plus, Square, CheckSquare, Trash2 } from 'lucide-react';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useTasks';
import { useSettingsStore } from '../stores/settingsStore';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { CalDAVTodo } from '../types';

interface TaskForm {
  summary: string;
  description: string;
}
const EMPTY_FORM: TaskForm = { summary: '', description: '' };

export default function TasksPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState<TaskForm>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<CalDAVTodo | null>(null);

  const { data: tasks, isLoading } = useTasks();
  const { mutate: createTask, isPending: creating, error: createError } = useCreateTask();
  const { mutate: updateTask } = useUpdateTask();
  const { mutate: deleteTask } = useDeleteTask();
  const calendarHref = useSettingsStore(s => s.settings.caldav_tasks_calendar_href);

  const pending = (tasks ?? []).filter(t => t.status !== 'COMPLETED');
  const completed = (tasks ?? []).filter(t => t.status === 'COMPLETED');

  const handleToggle = (task: CalDAVTodo) => {
    updateTask({
      href: task.href,
      etag: task.etag,
      uid: task.uid,
      summary: task.summary,
      description: task.description,
      status: task.status === 'COMPLETED' ? 'NEEDS-ACTION' : 'COMPLETED',
    });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.summary.trim()) return;
    createTask(
      { summary: formData.summary.trim(), description: formData.description, status: 'NEEDS-ACTION' },
      { onSuccess: () => { setFormData(EMPTY_FORM); setShowAdd(false); } }
    );
  };

  if (!calendarHref) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500 p-6">
        <ClipboardList className="w-14 h-14 text-slate-700" />
        <p className="text-base text-center">Tasks calendar not configured</p>
        <p className="text-sm text-slate-600 text-center">
          Go to <span className="text-accent">Settings → CalDAV</span> and set a <strong className="text-slate-400">Tasks Calendar Path</strong>.<br />
          You can create a separate VTODO calendar in your CalDAV provider for tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 shrink-0">
        <ClipboardList className="w-5 h-5 text-accent" />
        <h1 className="text-base font-semibold text-slate-100 mr-auto">Tasks</h1>
        <span className="text-xs text-slate-500">{pending.length} pending</span>
        <button
          onClick={() => { setFormData(EMPTY_FORM); setShowAdd(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white text-sm rounded-lg"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : (tasks ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
            <ClipboardList className="w-12 h-12 text-slate-700" />
            <p className="text-base">No tasks yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {pending.map(task => (
              <div key={task.uid} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-raised group">
                <button
                  onClick={() => handleToggle(task)}
                  className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                >
                  <Square className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200">{task.summary}</p>
                  {task.description && <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>}
                </div>
                <button
                  onClick={() => setDeleteConfirm(task)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg shrink-0 text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {completed.length > 0 && (
              <>
                {pending.length > 0 && <div className="pt-3 pb-1 px-3"><p className="text-xs text-slate-600 uppercase tracking-wider">Completed</p></div>}
                {completed.map(task => (
                  <div key={task.uid} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-raised opacity-50">
                    <button
                      onClick={() => handleToggle(task)}
                      className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-emerald-500 hover:text-slate-400 hover:bg-surface transition-colors"
                    >
                      <CheckSquare className="w-5 h-5" />
                    </button>
                    <p className="flex-1 text-sm text-slate-400 line-through">{task.summary}</p>
                    <button
                      onClick={() => setDeleteConfirm(task)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg shrink-0 text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Add modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Task" size="sm">
        <form onSubmit={handleAdd} className="p-5 space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">Task *</label>
            <input
              autoFocus
              value={formData.summary}
              onChange={e => setFormData(f => ({ ...f, summary: e.target.value }))}
              placeholder="What needs to be done?"
              className="w-full px-3 py-3 bg-surface-raised border border-slate-600 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">Notes (optional)</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Additional details…"
              className="w-full px-3 py-3 bg-surface-raised border border-slate-600 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-accent resize-none"
            />
          </div>
          {createError && <p className="text-xs text-red-400">{String(createError)}</p>}
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2.5 text-sm border border-slate-600 rounded-lg text-slate-400 hover:text-slate-200">
              Cancel
            </button>
            <button type="submit" disabled={!formData.summary.trim() || creating} className="px-5 py-2.5 text-sm bg-accent hover:bg-accent/80 text-white rounded-lg disabled:opacity-40 flex items-center gap-2">
              <Plus className="w-4 h-4" /> {creating ? 'Adding…' : 'Add Task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Task" size="sm">
        {deleteConfirm && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-300">
              Delete <span className="font-semibold text-slate-100">"{deleteConfirm.summary}"</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 text-sm border border-slate-600 rounded-lg text-slate-400 hover:text-slate-200">
                Cancel
              </button>
              <button
                onClick={() => { deleteTask(deleteConfirm.href); setDeleteConfirm(null); }}
                className="px-5 py-2.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
