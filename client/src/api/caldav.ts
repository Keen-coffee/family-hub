import api from './client';
import type { ApiResponse, CalDAVCalendar, CalDAVEvent, CalDAVTodo } from '../types';

export const caldavApi = {
  getCalendars: () =>
    api.get<ApiResponse<CalDAVCalendar[]>>('/caldav/calendars').then(r => r.data),

  getEvents: (calendarHref: string, start: string, end: string) =>
    api
      .get<ApiResponse<CalDAVEvent[]>>('/caldav/events', { params: { calendarHref, start, end } })
      .then(r => r.data),

  createEvent: (calendarHref: string, event: Omit<CalDAVEvent, 'uid' | 'href' | 'etag' | 'icalString'>) =>
    api.post<ApiResponse<{ uid: string; href: string }>>('/caldav/events', { calendarHref, ...event }).then(r => r.data),

  updateEvent: (event: Pick<CalDAVEvent, 'href' | 'etag'> & Partial<CalDAVEvent>) =>
    api.put<ApiResponse<void>>('/caldav/events', event).then(r => r.data),

  deleteEvent: (href: string) =>
    api.delete<ApiResponse<void>>('/caldav/events', { params: { href } }).then(r => r.data),

  getTodos: (calendarHref: string) =>
    api.get<ApiResponse<CalDAVTodo[]>>('/caldav/todos', { params: { calendarHref } }).then(r => r.data),

  createTodo: (calendarHref: string, todo: Omit<CalDAVTodo, 'uid' | 'href' | 'etag' | 'icalString'>) =>
    api.post<ApiResponse<{ uid: string; href: string }>>('/caldav/todos', { calendarHref, ...todo }).then(r => r.data),

  updateTodo: (todo: Pick<CalDAVTodo, 'href' | 'etag'> & Partial<CalDAVTodo>) =>
    api.put<ApiResponse<void>>('/caldav/todos', todo).then(r => r.data),

  deleteTodo: (href: string) =>
    api.delete<ApiResponse<void>>('/caldav/todos', { params: { href } }).then(r => r.data),
};
