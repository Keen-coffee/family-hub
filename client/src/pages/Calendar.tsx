import React, { useState } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  isSameDay, addMonths, subMonths, parseISO, isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, Star } from 'lucide-react';
import { useCalendarEvents, useCreateEvent, useDeleteEvent } from '../hooks/useCalendar';
import { getUSHolidays } from '../utils/usHolidays';
import { useSettingsStore } from '../stores/settingsStore';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { CalDAVEvent } from '../types';

const EVENT_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500'];
function colorFor(uid: string) {
  let h = 0;
  for (const c of uid) h = (h * 31 + c.charCodeAt(0)) | 0;
  return EVENT_COLORS[Math.abs(h) % EVENT_COLORS.length];
}

interface EventFormData {
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  description: string;
  location: string;
}

const EMPTY_FORM: EventFormData = {
  summary: '', start: '', end: '', allDay: false, description: '', location: '',
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<EventFormData>(EMPTY_FORM);
  const [selectedEvent, setSelectedEvent] = useState<CalDAVEvent | null>(null);

  const [createError, setCreateError] = useState<string | null>(null);

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const { data: events, isLoading } = useCalendarEvents(start, end);

  const holidays = getUSHolidays([
    currentMonth.getFullYear() - 1,
    currentMonth.getFullYear(),
    currentMonth.getFullYear() + 1,
  ]);
  const holidaysForDay = (day: Date) =>
    holidays.filter(h => h.date === format(day, 'yyyy-MM-dd'));
  const { mutate: createEvent } = useCreateEvent();
  const { mutate: deleteEvent } = useDeleteEvent();
  const calendarHref = useSettingsStore(s => s.settings.caldav_calendar_href);
  const days = eachDayOfInterval({ start, end });
  const firstDOW = start.getDay();

  const eventsForDay = (day: Date) =>
    (events ?? []).filter(e => isSameDay(parseISO(e.start), day));

  const selectedDayEvents = selectedDay ? eventsForDay(selectedDay) : [];
  const selectedDayHolidays = selectedDay ? holidaysForDay(selectedDay) : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    createEvent(
      {
        calendarHref,
        event: {
          summary: formData.summary,
          start: formData.start,
          end: formData.end || formData.start,
          allDay: formData.allDay,
          description: formData.description,
          location: formData.location,
        },
      },
      {
        onSuccess: () => { setShowForm(false); setFormData(EMPTY_FORM); },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? String(err);
          setCreateError(msg);
        },
      }
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 shrink-0">
        <CalIcon className="w-5 h-5 text-accent" />
        <h1 className="text-base font-semibold text-slate-100 mr-auto">Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-surface-raised rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-slate-200 min-w-[120px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-surface-raised rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentMonth(new Date())} className="px-2.5 py-1 text-xs text-accent border border-accent/30 hover:bg-accent/10 rounded-lg transition-colors">
            Today
          </button>
        </div>
        <button
          onClick={() => { setFormData({ ...EMPTY_FORM, start: selectedDay ? format(selectedDay, "yyyy-MM-dd'T'HH:mm") : '' }); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Event
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Calendar grid */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading && <div className="flex justify-center py-4"><LoadingSpinner /></div>}

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-slate-500 uppercase py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {/* Leading empty cells */}
            {Array.from({ length: firstDOW }).map((_, i) => <div key={`e${i}`} />)}

            {days.map(day => {
              const dayEvents = eventsForDay(day);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const today = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[60px] p-1 rounded-lg cursor-pointer border transition-colors ${
                    isSelected
                      ? 'bg-accent/20 border-accent/50'
                      : 'border-transparent hover:bg-surface-raised'
                  }`}
                >
                  <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-0.5 ${
                    today ? 'bg-accent text-white' : 'text-slate-400'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {holidaysForDay(day).map(h => (
                      <div key={h.date + h.name} className="text-[9px] text-amber-200 bg-amber-600/40 px-1 py-0.5 rounded truncate" title={h.name}>
                        {h.name}
                      </div>
                    ))}
                    {dayEvents.slice(0, 3).map(ev => (
                      <div
                        key={ev.uid}
                        onClick={e => { e.stopPropagation(); setSelectedEvent(ev); }}
                        className={`text-[9px] text-white px-1 py-0.5 rounded truncate cursor-pointer hover:brightness-110 ${colorFor(ev.uid)}`}
                      >
                        {ev.summary}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] text-slate-500 px-1">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected day panel */}
        {selectedDay && (
          <div className="w-64 border-l border-slate-700/50 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-700/50 shrink-0">
              <p className="text-xs font-semibold text-slate-300">{format(selectedDay, 'EEEE, MMMM d')}</p>
              <p className="text-[10px] text-slate-500">{selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}{selectedDayHolidays.length > 0 ? ` · ${selectedDayHolidays.length} holiday` : ''}</p>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {selectedDayHolidays.map(h => (
                <div key={h.name} className="px-3 py-2 mb-1 mx-2 rounded-lg bg-amber-600/10 border border-amber-600/20 flex items-center gap-2">
                  <Star className="w-3 h-3 text-amber-400 shrink-0" />
                  <p className="text-xs font-medium text-amber-300">{h.name}</p>
                </div>
              ))}
              {selectedDayEvents.length === 0 && selectedDayHolidays.length === 0 ? (
                <p className="px-3 text-xs text-slate-500">No events</p>
              ) : (
                selectedDayEvents.map(ev => (
                  <div
                    key={ev.uid}
                    onClick={() => setSelectedEvent(ev)}
                    className="px-3 py-2 hover:bg-surface-raised cursor-pointer border-l-2 border-transparent hover:border-accent transition-colors mb-1 mx-2 rounded-r-lg"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${colorFor(ev.uid)}`} />
                      <p className="text-xs font-medium text-slate-200 truncate">{ev.summary}</p>
                    </div>
                    {!ev.allDay && (
                      <p className="text-[10px] text-slate-500 ml-3.5">
                        {format(parseISO(ev.start), 'h:mm a')}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create event modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setCreateError(null); }} title="New Event" size="md">
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {createError && (
            <div className="px-3 py-2 bg-red-900/30 border border-red-700/50 rounded-lg text-xs text-red-300">
              {createError}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Title *</label>
            <input
              required
              value={formData.summary}
              onChange={e => setFormData(f => ({ ...f, summary: e.target.value }))}
              className="w-full bg-surface-raised border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-accent"
              placeholder="Event title"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={formData.allDay}
              onChange={e => setFormData(f => ({ ...f, allDay: e.target.checked }))}
              className="accent-accent"
            />
            <label htmlFor="allDay" className="text-xs text-slate-400">All day</label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Start</label>
              <input
                type={formData.allDay ? 'date' : 'datetime-local'}
                value={formData.start}
                onChange={e => setFormData(f => ({ ...f, start: e.target.value }))}
                className="w-full bg-surface-raised border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">End</label>
              <input
                type={formData.allDay ? 'date' : 'datetime-local'}
                value={formData.end}
                onChange={e => setFormData(f => ({ ...f, end: e.target.value }))}
                className="w-full bg-surface-raised border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Location</label>
            <input
              value={formData.location}
              onChange={e => setFormData(f => ({ ...f, location: e.target.value }))}
              className="w-full bg-surface-raised border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-accent"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-surface-raised border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-accent resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-surface-raised rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-xs bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors">
              Save Event
            </button>
          </div>
        </form>
      </Modal>

      {/* View event modal */}
      <Modal isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} title={selectedEvent?.summary ?? ''} size="sm">
        {selectedEvent && (
          <div className="p-5 space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-slate-400">When</p>
              <p className="text-sm text-slate-200">
                {selectedEvent.allDay
                  ? format(parseISO(selectedEvent.start), 'MMMM d, yyyy')
                  : `${format(parseISO(selectedEvent.start), 'MMM d, h:mm a')} – ${format(parseISO(selectedEvent.end), 'h:mm a')}`}
              </p>
            </div>
            {selectedEvent.location && (
              <div>
                <p className="text-xs text-slate-400">Location</p>
                <p className="text-sm text-slate-200">{selectedEvent.location}</p>
              </div>
            )}
            {selectedEvent.description && (
              <div>
                <p className="text-xs text-slate-400">Notes</p>
                <p className="text-sm text-slate-200 whitespace-pre-wrap">{selectedEvent.description}</p>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  if (confirm('Delete this event?')) {
                    deleteEvent(selectedEvent.href);
                    setSelectedEvent(null);
                  }
                }}
                className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
