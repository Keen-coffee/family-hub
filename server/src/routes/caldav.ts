import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import ICAL, { Time as ICALTime } from 'ical.js';
import { v4 as uuidv4 } from 'uuid';
import { getSetting } from './settings.js';

import { Router, Request, Response } from 'express';

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

function getConfig() {
  const url = getSetting('caldav_url');
  const username = getSetting('caldav_username');
  const password = getSetting('caldav_password');
  if (!url || !username || !password) return null;
  return { url: url.replace(/\/$/, ''), username, password };
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
});

async function caldavRequest(
  method: string,
  url: string,
  username: string,
  password: string,
  body?: string,
  extraHeaders?: Record<string, string>
) {
  return axios({
    method,
    url,
    data: body,
    auth: { username, password },
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      ...(extraHeaders ?? {}),
    },
    validateStatus: () => true,
  });
}

function parseMultistatus(xml: string): Record<string, string>[] {
  try {
    const parsed = parser.parse(xml);
    const multistatus = parsed?.multistatus;
    if (!multistatus) return [];
    const responses = multistatus.response;
    if (!responses) return [];
    return (Array.isArray(responses) ? responses : [responses]) as Record<string, string>[];
  } catch {
    return [];
  }
}

function parseCalendarObjects(xml: string): { href: string; etag: string; data: string }[] {
  const responses = parseMultistatus(xml);
  return responses
    .filter((r: Record<string, unknown>) => {
      const ps = r.propstat;
      const propstat = Array.isArray(ps) ? ps[0] : ps;
      return propstat?.prop?.['calendar-data'];
    })
    .map((r: Record<string, unknown>) => {
      const ps = r.propstat;
      const propstat = Array.isArray(ps) ? ps[0] : ps;
      return {
        href: r.href as string,
        etag: propstat?.prop?.getetag as string ?? '',
        data: propstat?.prop?.['calendar-data'] as string ?? '',
      };
    });
}

// Convert an ICAL.Time to an ISO string that the client will interpret correctly:
// - All-day (date-only) → "YYYY-MM-DD"  (date-fns parseISO treats this as local)
// - UTC time → ISO with "Z"             (already UTC, client shifts correctly)
// - TZID time → ISO with "Z"            (convert to UTC via toJSDate)
// - Floating time (no zone) → "YYYY-MM-DDTHH:mm:ss" without "Z" (client treats as local)
function icalTimeToISOString(t: ICALTime): string {
  if (t.isDate) {
    return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ICALany = ICAL as any;
  const isUtc = t.zone === ICALany.Timezone.utcTimezone;
  const isFloating = !t.zone || t.zone === ICALany.Timezone.localTimezone;
  if (!isFloating || isUtc) {
    // UTC or real TZID — convert to proper UTC ISO string
    return t.toJSDate().toISOString();
  }
  // Floating time — return without Z so the client treats it as local time
  return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}T${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}:${String(t.second).padStart(2, '0')}`;
}

function parseICalEvent(icalStr: string): Record<string, unknown> | null {
  try {
    const jcal = ICAL.parse(icalStr);
    const comp = new ICAL.Component(jcal);
    const vevent = comp.getFirstSubcomponent('vevent');
    if (!vevent) return null;
    const ev = new ICAL.Event(vevent);
    return {
      uid: ev.uid,
      summary: ev.summary,
      description: ev.description,
      location: ev.location,
      start: ev.startDate ? icalTimeToISOString(ev.startDate) : undefined,
      end: ev.endDate ? icalTimeToISOString(ev.endDate) : undefined,
      allDay: ev.startDate?.isDate ?? false,
      color: vevent.getFirstPropertyValue('x-family-hub-color') ?? undefined,
      icalString: icalStr,
    };
  } catch {
    return null;
  }
}

function parseAndExpandEvents(
  icalStr: string,
  rangeStart: Date,
  rangeEnd: Date,
): Record<string, unknown>[] {
  try {
    const jcal = ICAL.parse(icalStr);
    const comp = new ICAL.Component(jcal);
    const vevent = comp.getFirstSubcomponent('vevent');
    if (!vevent) return [];
    const ev = new ICAL.Event(vevent);

    const base = {
      uid: ev.uid,
      summary: ev.summary,
      description: ev.description,
      location: ev.location,
      allDay: ev.startDate?.isDate ?? false,
      color: vevent.getFirstPropertyValue('x-family-hub-color') ?? undefined,
      icalString: icalStr,
    };

    if (!ev.isRecurring()) {
      return [{ ...base, start: ev.startDate ? icalTimeToISOString(ev.startDate) : undefined, end: ev.endDate ? icalTimeToISOString(ev.endDate) : undefined }];
    }

    // Expand recurring occurrences within the requested range
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ICALany = ICAL as any;
    const startIcal = ICALany.Time.fromJSDate(rangeStart, false);
    const endIcal = ICALany.Time.fromJSDate(rangeEnd, false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const iter = (ev as any).iterator();
    const results: Record<string, unknown>[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let next: any;
    let safety = 0;

    while ((next = iter.next()) && ++safety < 1000) {
      if (next.compare(endIcal) >= 0) break;
      if (next.compare(startIcal) >= 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const details = (ev as any).getOccurrenceDetails(next);
        results.push({
          ...base,
          uid: `${ev.uid}_${next.toString()}`,
          summary: details.item.summary || ev.summary,
          start: icalTimeToISOString(details.startDate),
          end: icalTimeToISOString(details.endDate),
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}

function parseICalTodo(icalStr: string): Record<string, unknown> | null {
  try {
    const jcal = ICAL.parse(icalStr);
    const comp = new ICAL.Component(jcal);
    const vtodo = comp.getFirstSubcomponent('vtodo');
    if (!vtodo) return null;
    return {
      uid: vtodo.getFirstPropertyValue('uid'),
      summary: vtodo.getFirstPropertyValue('summary'),
      description: vtodo.getFirstPropertyValue('description'),
      status: vtodo.getFirstPropertyValue('status'),
      priority: vtodo.getFirstPropertyValue('priority'),
      due: (vtodo.getFirstProperty('due')?.getFirstValue() as import('ical.js').Time | null)?.toJSDate?.()?.toISOString(),
      categories: vtodo.getFirstPropertyValue('categories'),
      assignee: vtodo.getFirstPropertyValue('x-assignee'),
      icalString: icalStr,
    };
  } catch {
    return null;
  }
}

function buildVEvent(data: {
  uid?: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay?: boolean;
  rrule?: string;
  color?: string;
}): string {
  const uid = data.uid ?? uuidv4();
  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  // Pad datetime-local strings that omit seconds: "2026-04-19T14:00" → "2026-04-19T14:00:00"
  const pad = (s: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) ? s + ':00' : s;
  // Parse as UTC to avoid server-timezone effects on date arithmetic (append Z to force UTC)
  const toMs = (s: string) => new Date(pad(s) + (s.includes('T') ? 'Z' : '')).getTime();
  // Format as iCal floating datetime (YYYYMMDDTHHMMSS, no Z) so calendar clients use local timezone
  const fmtFloat = (s: string) => pad(s).replace(/[-:]/g, '').slice(0, 15);
  const fmt = (s: string, allDay: boolean) =>
    allDay ? s.slice(0, 10).replace(/-/g, '') : fmtFloat(s);
  const allDay = data.allDay ?? false;

  // For all-day events DTEND must be exclusive next-day; for timed events DTEND must be after DTSTART
  const startMs = toMs(allDay ? data.start.slice(0, 10) : data.start);
  let endMs = toMs(allDay ? (data.end ?? data.start).slice(0, 10) : (data.end ?? data.start));
  if (allDay && endMs <= startMs) endMs = startMs + 86400000; // next day
  if (!allDay && endMs <= startMs) endMs = startMs + 3600000; // +1 hour
  // Convert back to floating-time string (treat UTC result as local by dropping Z)
  const endLocal = new Date(endMs).toISOString().slice(0, allDay ? 10 : 19);
  const endDate = endLocal.slice(0, 10); // YYYY-MM-DD for all-day

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FamilyHub//FamilyHub//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    allDay ? `DTSTART;VALUE=DATE:${fmt(data.start, true)}` : `DTSTART:${fmt(data.start, false)}`,
    allDay ? `DTEND;VALUE=DATE:${endDate.replace(/-/g, '')}` : `DTEND:${fmtFloat(endLocal)}`,
    `SUMMARY:${data.summary}`,
    data.rrule ? `RRULE:${data.rrule}` : '',
    data.description ? `DESCRIPTION:${data.description.replace(/\n/g, '\\n')}` : '',
    data.location ? `LOCATION:${data.location}` : '',
    data.color ? `X-FAMILY-HUB-COLOR:${data.color}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
  return lines;
}

function buildVTodo(data: {
  uid?: string;
  summary: string;
  description?: string;
  due?: string;
  status?: string;
  priority?: number;
  assignee?: string;
  categories?: string;
  rrule?: string;
}): string {
  const uid = data.uid ?? uuidv4();
  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  // Format DUE: date-only → VALUE=DATE, datetime → YYYYMMDDTHHMMSSZ
  const fmtDue = (s: string): string => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return `DUE;VALUE=DATE:${s.replace(/-/g, '')}`;
    }
    // Pad missing seconds: "2026-04-25T10:00" → "2026-04-25T10:00:00"
    const padded = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) ? s + ':00' : s;
    return `DUE:${new Date(padded).toISOString().replace(/[-:.]/g, '').slice(0, 15)}Z`;
  };
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FamilyHub//FamilyHub//EN',
    'BEGIN:VTODO',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `SUMMARY:${data.summary}`,
    data.rrule ? `RRULE:${data.rrule}` : '',
    data.description ? `DESCRIPTION:${data.description.replace(/\n/g, '\\n')}` : '',
    data.due ? fmtDue(data.due) : '',
    data.status ? `STATUS:${data.status.toUpperCase()}` : 'STATUS:NEEDS-ACTION',
    data.priority != null ? `PRIORITY:${data.priority}` : '',
    data.assignee ? `X-ASSIGNEE:${data.assignee}` : '',
    data.categories ? `CATEGORIES:${data.categories}` : '',
    'END:VTODO',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
  return lines;
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// GET /api/caldav/calendars
router.get('/calendars', async (_req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'CalDAV not configured' });

  const body = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:cs="http://calendarserver.org/ns/">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
    <cs:getctag/>
    <c:supported-calendar-component-set/>
  </d:prop>
</d:propfind>`;

  try {
    const response = await caldavRequest('PROPFIND', `${cfg.url}/`, cfg.username, cfg.password, body, {
      Depth: '1',
    });

    const responses = parseMultistatus(response.data as string);
    const calendars = responses
      .filter((r: Record<string, unknown>) => {
        const ps = r.propstat;
        const propstat = Array.isArray(ps) ? ps[0] : ps;
        const resourcetype = propstat?.prop?.resourcetype;
        return resourcetype?.calendar !== undefined;
      })
      .map((r: Record<string, unknown>) => {
        const ps = r.propstat;
        const propstat = Array.isArray(ps) ? ps[0] : ps;
        return {
          href: r.href,
          name: propstat?.prop?.displayname ?? 'Unnamed',
        };
      });

    res.json({ success: true, data: calendars });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/caldav/events?calendarHref=...&start=ISO&end=ISO
router.get('/events', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'CalDAV not configured' });

  const calendarHref = (req.query.calendarHref as string) ?? '/';
  const start = (req.query.start as string) ?? new Date().toISOString();
  const end = (req.query.end as string) ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const fmt = (iso: string) => iso.replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const url = calendarHref.startsWith('http') ? calendarHref : `${cfg.url}${calendarHref}`;

  const body = `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${fmt(start)}" end="${fmt(end)}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

  try {
    const response = await caldavRequest('REPORT', url, cfg.username, cfg.password, body, {
      Depth: '1',
      'Content-Type': 'application/xml; charset=utf-8',
    });

    const objects = parseCalendarObjects(response.data as string);
    const rangeStartDate = new Date(start);
    const rangeEndDate = new Date(end);
    const events = objects.flatMap(o => {
      const expanded = parseAndExpandEvents(o.data, rangeStartDate, rangeEndDate);
      return expanded.map(ev => ({ ...ev, href: o.href, etag: o.etag }));
    }).filter(Boolean);

    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/caldav/events — create event
router.post('/events', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'CalDAV not configured' });

  const { calendarHref, ...eventData } = req.body as { calendarHref: string; [k: string]: unknown };
  const uid = uuidv4();
  const ical = buildVEvent({ uid, ...(eventData as Parameters<typeof buildVEvent>[0]) });
  const baseHref = calendarHref.endsWith('/') ? calendarHref : calendarHref + '/';
  const url = `${baseHref.startsWith('http') ? '' : cfg.url}${baseHref}${uid}.ics`;

  try {
    const response = await caldavRequest('PUT', url, cfg.username, cfg.password, ical, {
      'Content-Type': 'text/calendar; charset=utf-8',
    });
    if (response.status >= 400) {
      return res.status(502).json({ success: false, error: `CalDAV error ${response.status}: ${String(response.data).slice(0, 200)}` });
    }
    res.json({ success: true, data: { uid, href: url } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/caldav/events — update event
router.put('/events', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'CalDAV not configured' });

  const { href, etag, ...eventData } = req.body as { href: string; etag?: string; [k: string]: unknown };
  const ical = buildVEvent(eventData as Parameters<typeof buildVEvent>[0]);
  const url = href.startsWith('http') ? href : `${cfg.url}${href}`;

  try {
    const response = await caldavRequest('PUT', url, cfg.username, cfg.password, ical, {
      'Content-Type': 'text/calendar; charset=utf-8',
      ...(etag ? { 'If-Match': etag } : {}),
    });
    if (response.status >= 400) {
      return res.status(502).json({ success: false, error: `CalDAV error ${response.status}: ${String(response.data).slice(0, 200)}` });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/caldav/events
router.delete('/events', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'CalDAV not configured' });

  const href = req.query.href as string;
  const url = href.startsWith('http') ? href : `${cfg.url}${href}`;

  try {
    await caldavRequest('DELETE', url, cfg.username, cfg.password);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/caldav/todos?calendarHref=...
router.get('/todos', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'CalDAV not configured' });

  // Prefer the DB-configured chores calendar; fall back to query param if not set
  const dbHref = getSetting('caldav_chores_calendar_href');
  const calendarHref = (dbHref || (req.query.calendarHref as string) || '/');
  const url = calendarHref.startsWith('http') ? calendarHref : `${cfg.url}${calendarHref}`;

  const body = `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VTODO"/>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

  try {
    const response = await caldavRequest('REPORT', url, cfg.username, cfg.password, body, { Depth: '1' });
    const objects = parseCalendarObjects(response.data as string);
    const todos = objects
      .map(o => ({ ...parseICalTodo(o.data), href: o.href, etag: o.etag }))
      .filter(Boolean);
    res.json({ success: true, data: todos });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/caldav/todos
router.post('/todos', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'CalDAV not configured' });

  const { calendarHref: clientHref, ...todoData } = req.body as { calendarHref?: string; [k: string]: unknown };
  // Always prefer the DB-configured chores calendar to avoid stale client values
  const dbHref = getSetting('caldav_chores_calendar_href');
  const calendarHref = dbHref || clientHref || '';
  if (!calendarHref) return res.status(400).json({ success: false, error: 'No chores calendar configured' });
  const uid = uuidv4();
  const ical = buildVTodo({ uid, ...(todoData as Parameters<typeof buildVTodo>[0]) });
  const baseHref = calendarHref.endsWith('/') ? calendarHref : calendarHref + '/';
  const url = `${baseHref.startsWith('http') ? '' : cfg.url}${baseHref}${uid}.ics`;

  try {
    const response = await caldavRequest('PUT', url, cfg.username, cfg.password, ical, {
      'Content-Type': 'text/calendar; charset=utf-8',
    });
    if (response.status >= 400) {
      return res.status(502).json({ success: false, error: `CalDAV error ${response.status}: ${String(response.data).slice(0, 200)}` });
    }
    res.json({ success: true, data: { uid, href: url } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PUT /api/caldav/todos
router.put('/todos', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'CalDAV not configured' });

  const { href, etag, ...todoData } = req.body as { href: string; etag?: string; [k: string]: unknown };
  const ical = buildVTodo(todoData as Parameters<typeof buildVTodo>[0]);
  const url = href.startsWith('http') ? href : `${cfg.url}${href}`;

  try {
    await caldavRequest('PUT', url, cfg.username, cfg.password, ical, {
      'Content-Type': 'text/calendar; charset=utf-8',
      ...(etag ? { 'If-Match': etag } : {}),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// DELETE /api/caldav/todos
router.delete('/todos', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'CalDAV not configured' });

  const href = req.query.href as string;
  const url = href.startsWith('http') ? href : `${cfg.url}${href}`;

  try {
    await caldavRequest('DELETE', url, cfg.username, cfg.password);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
