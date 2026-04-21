"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const fast_xml_parser_1 = require("fast-xml-parser");
const ical_js_1 = __importDefault(require("ical.js"));
const uuid_1 = require("uuid");
const settings_js_1 = require("./settings.js");
const express_1 = require("express");
const router = (0, express_1.Router)();
// ─── Helpers ────────────────────────────────────────────────────────────────
function getConfig() {
    const url = (0, settings_js_1.getSetting)('caldav_url');
    const username = (0, settings_js_1.getSetting)('caldav_username');
    const password = (0, settings_js_1.getSetting)('caldav_password');
    if (!url || !username || !password)
        return null;
    return { url: url.replace(/\/$/, ''), username, password };
}
const parser = new fast_xml_parser_1.XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true,
});
async function caldavRequest(method, url, username, password, body, extraHeaders) {
    return (0, axios_1.default)({
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
function parseMultistatus(xml) {
    const parsed = parser.parse(xml);
    const multistatus = parsed?.multistatus;
    if (!multistatus)
        return [];
    const responses = multistatus.response;
    if (!responses)
        return [];
    return (Array.isArray(responses) ? responses : [responses]);
}
function parseCalendarObjects(xml) {
    const responses = parseMultistatus(xml);
    return responses
        .filter((r) => {
        const ps = r.propstat;
        const propstat = Array.isArray(ps) ? ps[0] : ps;
        return propstat?.prop?.['calendar-data'];
    })
        .map((r) => {
        const ps = r.propstat;
        const propstat = Array.isArray(ps) ? ps[0] : ps;
        return {
            href: r.href,
            etag: propstat?.prop?.getetag ?? '',
            data: propstat?.prop?.['calendar-data'] ?? '',
        };
    });
}
function parseICalEvent(icalStr) {
    try {
        const jcal = ical_js_1.default.parse(icalStr);
        const comp = new ical_js_1.default.Component(jcal);
        const vevent = comp.getFirstSubcomponent('vevent');
        if (!vevent)
            return null;
        const ev = new ical_js_1.default.Event(vevent);
        return {
            uid: ev.uid,
            summary: ev.summary,
            description: ev.description,
            location: ev.location,
            start: ev.startDate?.toJSDate()?.toISOString(),
            end: ev.endDate?.toJSDate()?.toISOString(),
            allDay: ev.startDate?.isDate ?? false,
            icalString: icalStr,
        };
    }
    catch {
        return null;
    }
}
function parseICalTodo(icalStr) {
    try {
        const jcal = ical_js_1.default.parse(icalStr);
        const comp = new ical_js_1.default.Component(jcal);
        const vtodo = comp.getFirstSubcomponent('vtodo');
        if (!vtodo)
            return null;
        return {
            uid: vtodo.getFirstPropertyValue('uid'),
            summary: vtodo.getFirstPropertyValue('summary'),
            description: vtodo.getFirstPropertyValue('description'),
            status: vtodo.getFirstPropertyValue('status'),
            priority: vtodo.getFirstPropertyValue('priority'),
            due: vtodo.getFirstProperty('due')?.getFirstValue()?.toJSDate?.()?.toISOString(),
            categories: vtodo.getFirstPropertyValue('categories'),
            assignee: vtodo.getFirstPropertyValue('x-assignee'),
            icalString: icalStr,
        };
    }
    catch {
        return null;
    }
}
function buildVEvent(data) {
    const uid = data.uid ?? (0, uuid_1.v4)();
    const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
    const fmt = (iso, allDay) => allDay ? iso.slice(0, 10).replace(/-/g, '') : iso.replace(/[-:.]/g, '').slice(0, 15) + 'Z';
    const allDay = data.allDay ?? false;
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//FamilyHub//FamilyHub//EN',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        allDay ? `DTSTART;VALUE=DATE:${fmt(data.start, true)}` : `DTSTART:${fmt(data.start, false)}`,
        allDay ? `DTEND;VALUE=DATE:${fmt(data.end, true)}` : `DTEND:${fmt(data.end, false)}`,
        `SUMMARY:${data.summary}`,
        data.description ? `DESCRIPTION:${data.description.replace(/\n/g, '\\n')}` : '',
        data.location ? `LOCATION:${data.location}` : '',
        'END:VEVENT',
        'END:VCALENDAR',
    ]
        .filter(Boolean)
        .join('\r\n');
    return lines;
}
function buildVTodo(data) {
    const uid = data.uid ?? (0, uuid_1.v4)();
    const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//FamilyHub//FamilyHub//EN',
        'BEGIN:VTODO',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `SUMMARY:${data.summary}`,
        data.description ? `DESCRIPTION:${data.description.replace(/\n/g, '\\n')}` : '',
        data.due ? `DUE:${data.due.replace(/[-:.]/g, '').slice(0, 15)}Z` : '',
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
router.get('/calendars', async (_req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'CalDAV not configured' });
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
        const responses = parseMultistatus(response.data);
        const calendars = responses
            .filter((r) => {
            const ps = r.propstat;
            const propstat = Array.isArray(ps) ? ps[0] : ps;
            const resourcetype = propstat?.prop?.resourcetype;
            return resourcetype?.calendar !== undefined;
        })
            .map((r) => {
            const ps = r.propstat;
            const propstat = Array.isArray(ps) ? ps[0] : ps;
            return {
                href: r.href,
                name: propstat?.prop?.displayname ?? 'Unnamed',
            };
        });
        res.json({ success: true, data: calendars });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/caldav/events?calendarHref=...&start=ISO&end=ISO
router.get('/events', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'CalDAV not configured' });
    const calendarHref = req.query.calendarHref ?? '/';
    const start = req.query.start ?? new Date().toISOString();
    const end = req.query.end ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const fmt = (iso) => iso.replace(/[-:.]/g, '').slice(0, 15) + 'Z';
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
        const objects = parseCalendarObjects(response.data);
        const events = objects
            .map(o => ({ ...parseICalEvent(o.data), href: o.href, etag: o.etag }))
            .filter(Boolean);
        res.json({ success: true, data: events });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
});
// POST /api/caldav/events — create event
router.post('/events', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'CalDAV not configured' });
    const { calendarHref, ...eventData } = req.body;
    const uid = (0, uuid_1.v4)();
    const ical = buildVEvent({ uid, ...eventData });
    const url = `${calendarHref.startsWith('http') ? '' : cfg.url}${calendarHref}${uid}.ics`;
    try {
        await caldavRequest('PUT', url, cfg.username, cfg.password, ical, {
            'Content-Type': 'text/calendar; charset=utf-8',
        });
        res.json({ success: true, data: { uid, href: url } });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
});
// PUT /api/caldav/events — update event
router.put('/events', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'CalDAV not configured' });
    const { href, etag, ...eventData } = req.body;
    const ical = buildVEvent(eventData);
    const url = href.startsWith('http') ? href : `${cfg.url}${href}`;
    try {
        await caldavRequest('PUT', url, cfg.username, cfg.password, ical, {
            'Content-Type': 'text/calendar; charset=utf-8',
            ...(etag ? { 'If-Match': etag } : {}),
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
});
// DELETE /api/caldav/events
router.delete('/events', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'CalDAV not configured' });
    const href = req.query.href;
    const url = href.startsWith('http') ? href : `${cfg.url}${href}`;
    try {
        await caldavRequest('DELETE', url, cfg.username, cfg.password);
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/caldav/todos?calendarHref=...
router.get('/todos', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'CalDAV not configured' });
    const calendarHref = req.query.calendarHref ?? '/';
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
        const objects = parseCalendarObjects(response.data);
        const todos = objects
            .map(o => ({ ...parseICalTodo(o.data), href: o.href, etag: o.etag }))
            .filter(Boolean);
        res.json({ success: true, data: todos });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
});
// POST /api/caldav/todos
router.post('/todos', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'CalDAV not configured' });
    const { calendarHref, ...todoData } = req.body;
    const uid = (0, uuid_1.v4)();
    const ical = buildVTodo({ uid, ...todoData });
    const url = `${calendarHref.startsWith('http') ? '' : cfg.url}${calendarHref}${uid}.ics`;
    try {
        await caldavRequest('PUT', url, cfg.username, cfg.password, ical, {
            'Content-Type': 'text/calendar; charset=utf-8',
        });
        res.json({ success: true, data: { uid, href: url } });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
});
// PUT /api/caldav/todos
router.put('/todos', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'CalDAV not configured' });
    const { href, etag, ...todoData } = req.body;
    const ical = buildVTodo(todoData);
    const url = href.startsWith('http') ? href : `${cfg.url}${href}`;
    try {
        await caldavRequest('PUT', url, cfg.username, cfg.password, ical, {
            'Content-Type': 'text/calendar; charset=utf-8',
            ...(etag ? { 'If-Match': etag } : {}),
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
});
// DELETE /api/caldav/todos
router.delete('/todos', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'CalDAV not configured' });
    const href = req.query.href;
    const url = href.startsWith('http') ? href : `${cfg.url}${href}`;
    try {
        await caldavRequest('DELETE', url, cfg.username, cfg.password);
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
});
exports.default = router;
//# sourceMappingURL=caldav.js.map