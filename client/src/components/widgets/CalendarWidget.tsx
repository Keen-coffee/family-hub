import React from 'react';
import { format, isToday, isTomorrow, startOfDay, addDays, parseISO } from 'date-fns';
import { Calendar, Star } from 'lucide-react';
import { useCalendarEvents } from '../../hooks/useCalendar';
import { getUSHolidays } from '../../utils/usHolidays';
import { useWidgetSetting } from '../dashboard/WidgetConfigContext';
import LoadingSpinner from '../common/LoadingSpinner';

const EVENT_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
];

function colorForEvent(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) | 0;
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length];
}

function dayLabel(dateStr: string): string {
  // Append T12:00:00 so date-only strings are parsed as local noon,
  // not UTC midnight (which shifts the date in negative-offset timezones).
  const d = new Date(dateStr.length === 10 ? dateStr + 'T12:00:00' : dateStr);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEE, MMM d');
}

export default function CalendarWidget() {
  const maxEvents = useWidgetSetting<number>('maxEvents', 10);
  const daysAhead = useWidgetSetting<number>('daysAhead', 30);
  const { data: events, isLoading, isError } = useCalendarEvents();

  const now = new Date();
  const cutoff = addDays(now, daysAhead);
  const holidays = getUSHolidays([now.getFullYear(), now.getFullYear() + 1]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !events) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500 p-4">
        <Calendar className="w-8 h-8" />
        <p className="text-xs text-center">Calendar not available. Check settings.</p>
      </div>
    );
  }

  // Group upcoming events by day
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const upcoming = [...events]
    .filter(e => parseISO(e.end) >= startOfDay(new Date()) && parseISO(e.start) <= cutoff)
    .sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime())
    .slice(0, maxEvents);

  // Merge upcoming holidays (within daysAhead) into display
  const in30 = cutoff;
  const upcomingHolidays = holidays.filter(h => h.date >= todayStr && h.date <= format(in30, 'yyyy-MM-dd'));

  // Build unified day map: key → { events, holidays }
  type DayEntry = { events: typeof upcoming; holidays: typeof upcomingHolidays };
  const dayMap = new Map<string, DayEntry>();

  upcoming.forEach(ev => {
    const key = format(parseISO(ev.start), 'yyyy-MM-dd');
    if (!dayMap.has(key)) dayMap.set(key, { events: [], holidays: [] });
    dayMap.get(key)!.events.push(ev);
  });

  upcomingHolidays.forEach(h => {
    if (!dayMap.has(h.date)) dayMap.set(h.date, { events: [], holidays: [] });
    dayMap.get(h.date)!.holidays.push(h);
  });

  const grouped = new Map([...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0])));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-700/50 flex items-center gap-2 shrink-0">
        <Calendar className="w-4 h-4 text-accent shrink-0" />
        <span className="text-xs font-semibold text-slate-300">Upcoming Events</span>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {grouped.size === 0 ? (
          <p className="p-3 text-xs text-slate-500">No upcoming events</p>
        ) : (
          [...grouped.entries()].map(([day, { events: evs, holidays: hols }]) => (
            <div key={day} className="px-2 py-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                {dayLabel(day)}
              </p>
              {hols.map(h => (
                <div key={h.name} className="flex items-center gap-2 py-1 px-2 rounded-lg mb-0.5 bg-amber-600/10">
                  <Star className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                  <p className="text-xs font-medium text-amber-300 truncate">{h.name}</p>
                </div>
              ))}
              {evs.map(ev => (
                <div
                  key={ev.uid}
                  className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-surface-raised transition-colors cursor-default mb-0.5"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${colorForEvent(ev.uid)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{ev.summary}</p>
                    {!ev.allDay && (
                      <p className="text-[10px] text-slate-500">
                        {format(parseISO(ev.start), 'h:mm a')} – {format(parseISO(ev.end), 'h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
