import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import db from '../db/database.js';

const router = Router();

// ── Contacts ─────────────────────────────────────────────────────────────────

router.get('/contacts', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM babysitter_contacts ORDER BY sort_order, created_at').all();
  res.json({ success: true, data: rows });
});

router.post('/contacts', (req: Request, res: Response) => {
  const { name, relationship = '', phone = '', email = '', notes = '' } = req.body as {
    name: string; relationship?: string; phone?: string; email?: string; notes?: string;
  };
  if (!name?.trim()) return res.status(400).json({ success: false, error: 'name required' });
  const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM babysitter_contacts').get() as any)?.m ?? -1;
  const id = randomUUID();
  db.prepare(
    'INSERT INTO babysitter_contacts (id, name, relationship, phone, email, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name.trim(), relationship, phone, email, notes, maxOrder + 1);
  res.json({ success: true, data: { id } });
});

router.put('/contacts/:id', (req: Request, res: Response) => {
  const { name, relationship, phone, email, notes, sort_order } = req.body as {
    name?: string; relationship?: string; phone?: string; email?: string; notes?: string; sort_order?: number;
  };
  const existing = db.prepare('SELECT id FROM babysitter_contacts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'not found' });
  db.prepare(
    `UPDATE babysitter_contacts SET
      name         = COALESCE(?, name),
      relationship = COALESCE(?, relationship),
      phone        = COALESCE(?, phone),
      email        = COALESCE(?, email),
      notes        = COALESCE(?, notes),
      sort_order   = COALESCE(?, sort_order)
     WHERE id = ?`
  ).run(name ?? null, relationship ?? null, phone ?? null, email ?? null, notes ?? null, sort_order ?? null, req.params.id);
  res.json({ success: true });
});

router.delete('/contacts/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM babysitter_contacts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Notes / Info Sections ─────────────────────────────────────────────────────

router.get('/notes', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM babysitter_notes ORDER BY sort_order, created_at').all();
  res.json({ success: true, data: rows });
});

router.post('/notes', (req: Request, res: Response) => {
  const { title, content = '' } = req.body as { title: string; content?: string };
  if (!title?.trim()) return res.status(400).json({ success: false, error: 'title required' });
  const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM babysitter_notes').get() as any)?.m ?? -1;
  const id = randomUUID();
  db.prepare(
    'INSERT INTO babysitter_notes (id, title, content, sort_order) VALUES (?, ?, ?, ?)'
  ).run(id, title.trim(), content, maxOrder + 1);
  res.json({ success: true, data: { id } });
});

router.put('/notes/:id', (req: Request, res: Response) => {
  const { title, content, sort_order } = req.body as { title?: string; content?: string; sort_order?: number };
  const existing = db.prepare('SELECT id FROM babysitter_notes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'not found' });
  db.prepare(
    `UPDATE babysitter_notes SET
      title      = COALESCE(?, title),
      content    = COALESCE(?, content),
      sort_order = COALESCE(?, sort_order)
     WHERE id = ?`
  ).run(title ?? null, content ?? null, sort_order ?? null, req.params.id);
  res.json({ success: true });
});

router.delete('/notes/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM babysitter_notes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
