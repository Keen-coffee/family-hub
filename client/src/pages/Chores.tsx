import React, { useState } from 'react';
import { CheckCheck, Plus, Square, CheckSquare, Trash2, User } from 'lucide-react';
import { useChores, useCreateChore, useUpdateChore, useDeleteChore } from '../hooks/useChores';
import { useSettingsStore } from '../stores/settingsStore';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { CalDAVTodo } from '../types';

interface ChoreForm {
  summary: string;
  description: string;
  assignee: string;
  due: string;
  categories: string;
  freq: '' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  byDay: string[];
  endType: 'never' | 'count' | 'until';
  count: string;
  until: string;
}

const EMPTY_FORM: ChoreForm = { summary: '', description: '', assignee: '', due: '', categories: '', freq: '', byDay: [], endType: 'never', count: '', until: '' };

const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function buildRRule(f: ChoreForm): string | undefined {
  if (!f.freq) return undefined;
  let rule = `FREQ=${f.freq}`;
  if (f.freq === 'WEEKLY' && f.byDay.length > 0) rule += `;BYDAY=${f.byDay.join(',')}`;
  if (f.endType === 'count' && Number(f.count) > 0) rule += `;COUNT=${Number(f.count)}`;
  if (f.endType === 'until' && f.until) rule += `;UNTIL=${f.until.replace(/-/g, '')}T000000Z`;
  return rule;
}

export default function ChoresPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState<ChoreForm>(EMPTY_FORM);
  const [filterMember, setFilterMember] = useState<string>('All');

  const [choreError, setChoreError] = useState<string | null>(null);

  const { data: chores, isLoading } = useChores();
  const { mutate: createChore } = useCreateChore();
  const { mutate: updateChore } = useUpdateChore();
  const { mutate: deleteChore } = useDeleteChore();
  const familyMembers = useSettingsStore(s => s.settings.family_members)
    .split(',').map(m => m.trim()).filter(Boolean);

  const filtered = (chores ?? []).filter(c =>
    filterMember === 'All' || c.assignee === filterMember
  );

  const pending = filtered.filter(c => c.status !== 'COMPLETED');
  const completed = filtered.filter(c => c.status === 'COMPLETED');

  const handleToggle = (chore: CalDAVTodo) => {
    updateChore({
      href: chore.href,
      etag: chore.etag,
      uid: chore.uid,
      summary: chore.summary,
      description: chore.description,
      assignee: chore.assignee,
      due: chore.due,
      categories: chore.categories,
      status: chore.status === 'COMPLETED' ? 'NEEDS-ACTION' : 'COMPLETED',
    });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setChoreError(null);
    const rrule = buildRRule(formData);
    createChore({
      summary: formData.summary,
      description: formData.description,
      assignee: formData.assignee,
      due: formData.due || undefined,
      categories: formData.categories || undefined,
      status: 'NEEDS-ACTION',
      ...(rrule ? { rrule } : {}),
    }, {
      onSuccess: () => { setFormData(EMPTY_FORM); setShowAdd(false); },
      onError: (err: unknown) => {
        const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
        setChoreError(axiosErr.response?.data?.error ?? axiosErr.message ?? 'Failed to save chore');
      },
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 shrink-0">
        <CheckCheck className="w-5 h-5 text-accent" />
        <h1 className="text-base font-semibold text-slate-100 mr-auto">Chores</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Chore
        </button>
      </div>

      {/* Error banner */}
      {choreError && (
        <div className="mx-4 mt-2 px-3 py-2 bg-red-900/40 border border-red-700/50 rounded-lg text-xs text-red-300 shrink-0">
          {choreError}
        </div>
      )}

      {/* Filter by member */}
      {familyMembers.length > 0 && (
        <div className="flex gap-2 px-4 py-2 border-b border-slate-700/50 shrink-0 overflow-x-auto">
          {['All', ...familyMembers].map(member => (
            <button
              key={member}
              onClick={() => setFilterMember(member)}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                filterMember === member
                  ? 'bg-accent/20 text-accent border border-accent/30'
                  : 'text-slate-500 border border-slate-700 hover:text-slate-300'
              }`}
            >
              {member !== 'All' && <User className="w-3 h-3" />}
              {member}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && <div className="flex justify-center py-8"><LoadingSpinner /></div>}

        {/* Pending */}
        {pending.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Pending ({pending.length})
            </p>
            <div className="space-y-1.5">
              {pending.map(chore => (
                <div
                  key={chore.uid}
                  className="flex items-center gap-3 bg-surface border border-slate-700/50 hover:border-slate-600 rounded-xl px-4 py-3 transition-colors group"
                >
                  <button onClick={() => handleToggle(chore)} className="shrink-0 text-slate-500 hover:text-accent transition-colors">
                    <Square className="w-4 h-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">{chore.summary}</p>
                    {chore.description && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{chore.description}</p>
                    )}
                    <div className="flex gap-3 mt-1">
                      {chore.assignee && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <User className="w-2.5 h-2.5" />{chore.assignee}
                        </span>
                      )}
                      {chore.due && (
                        <span className={`text-[10px] ${new Date(chore.due) < new Date() ? 'text-red-400' : 'text-amber-400'}`}>
                          Due {new Date(chore.due).toLocaleDateString()}
                        </span>
                      )}
                      {chore.categories && (
                        <span className="text-[10px] text-slate-500">{chore.categories}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => { if (confirm('Delete chore?')) deleteChore(chore.href); }}
                    className="opacity-0 group-hover:opacity-100 shrink-0 p-1.5 text-slate-500 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Completed ({completed.length})
            </p>
            <div className="space-y-1 opacity-60">
              {completed.map(chore => (
                <div
                  key={chore.uid}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-700/30 group"
                >
                  <button onClick={() => handleToggle(chore)} className="shrink-0 text-emerald-500">
                    <CheckSquare className="w-4 h-4" />
                  </button>
                  <p className="flex-1 text-sm text-slate-400 line-through truncate">{chore.summary}</p>
                  {chore.assignee && <span className="text-[10px] text-slate-600 mr-1">{chore.assignee}</span>}
                  <button
                    onClick={() => deleteChore(chore.href)}
                    className="shrink-0 p-1.5 text-slate-600 hover:text-red-400 transition-colors"
                    title="Delete chore"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && pending.length === 0 && completed.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12">
            <CheckCheck className="w-12 h-12 text-slate-700" />
            <p className="text-sm text-slate-500">No chores yet</p>
          </div>
        )}
      </div>

      {/* Add chore modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Chore" size="md">
        <form onSubmit={handleAdd} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Title *</label>
            <input
              required
              value={formData.summary}
              onChange={e => setFormData(f => ({ ...f, summary: e.target.value }))}
              className="w-full bg-surface-raised border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-accent"
              placeholder="e.g. Vacuum living room"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Assigned to</label>
              {familyMembers.length > 0 ? (
                <select
                  value={formData.assignee}
                  onChange={e => setFormData(f => ({ ...f, assignee: e.target.value }))}
                  className="w-full bg-surface-raised border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-accent"
                >
                  <option value="">Unassigned</option>
                  {familyMembers.map(m => <option key={m}>{m}</option>)}
                </select>
              ) : (
                <input
                  value={formData.assignee}
                  onChange={e => setFormData(f => ({ ...f, assignee: e.target.value }))}
                  className="w-full bg-surface-raised border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-accent"
                  placeholder="Name"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Due date</label>
              <input
                type="date"
                value={formData.due}
                onChange={e => setFormData(f => ({ ...f, due: e.target.value }))}
                className="w-full bg-surface-raised border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
            <input
              value={formData.categories}
              onChange={e => setFormData(f => ({ ...f, categories: e.target.value }))}
              className="w-full bg-surface-raised border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-accent"
              placeholder="e.g. Kitchen, Bathroom"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-surface-raised border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-accent resize-none"
            />
          </div>

          {/* Recurrence */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-slate-400 w-14 shrink-0">Repeat</label>
              <select
                value={formData.freq}
                onChange={e => setFormData(f => ({ ...f, freq: e.target.value as ChoreForm['freq'], byDay: [], endType: 'never', count: '', until: '' }))}
                className="flex-1 bg-surface-raised border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-accent"
              >
                <option value="">Does not repeat</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>

            {formData.freq === 'WEEKLY' && (
              <div className="flex items-center gap-2 pl-[74px]">
                {WEEKDAYS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setFormData(f => ({
                      ...f,
                      byDay: f.byDay.includes(d) ? f.byDay.filter(x => x !== d) : [...f.byDay, d],
                    }))}
                    className={`w-7 h-7 rounded-full text-[10px] font-semibold transition-colors ${
                      formData.byDay.includes(d)
                        ? 'bg-accent text-white'
                        : 'bg-surface-raised text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {WEEKDAY_LABELS[i]}
                  </button>
                ))}
              </div>
            )}

            {formData.freq && (
              <div className="pl-[74px] space-y-1.5">
                <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">Ends</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="choreEndType" value="never" checked={formData.endType === 'never'} onChange={() => setFormData(f => ({ ...f, endType: 'never' }))} className="accent-accent" />
                  <span className="text-xs text-slate-300">Never</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="choreEndType" value="count" checked={formData.endType === 'count'} onChange={() => setFormData(f => ({ ...f, endType: 'count' }))} className="accent-accent" />
                  <span className="text-xs text-slate-300">After</span>
                  <input
                    type="number"
                    min={1}
                    value={formData.count}
                    onFocus={() => setFormData(f => ({ ...f, endType: 'count' }))}
                    onChange={e => setFormData(f => ({ ...f, endType: 'count', count: e.target.value }))}
                    className="w-16 bg-surface-raised border border-slate-600 rounded px-2 py-0.5 text-xs text-slate-100 focus:outline-none focus:border-accent"
                    placeholder="10"
                  />
                  <span className="text-xs text-slate-300">occurrences</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="choreEndType" value="until" checked={formData.endType === 'until'} onChange={() => setFormData(f => ({ ...f, endType: 'until' }))} className="accent-accent" />
                  <span className="text-xs text-slate-300">On date</span>
                  <input
                    type="date"
                    value={formData.until}
                    onFocus={() => setFormData(f => ({ ...f, endType: 'until' }))}
                    onChange={e => setFormData(f => ({ ...f, endType: 'until', until: e.target.value }))}
                    className="bg-surface-raised border border-slate-600 rounded px-2 py-0.5 text-xs text-slate-100 focus:outline-none focus:border-accent"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-surface-raised rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs bg-accent hover:bg-accent-hover text-white rounded-lg">Add Chore</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
