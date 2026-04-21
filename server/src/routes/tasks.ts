import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db/database.js';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY completed ASC, sort_order ASC, created_at ASC').all();
    res.json({ success: true, data: tasks });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { title, notes = '', due_date = null } = req.body as { title: string; notes?: string; due_date?: string | null };
    if (!title?.trim()) return res.status(400).json({ success: false, error: 'title required' });
    const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM tasks').get() as any)?.m ?? -1;
    const id = randomUUID();
    db.prepare(
      'INSERT INTO tasks (id, title, notes, due_date, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run(id, title.trim(), notes, due_date ?? null, maxOrder + 1);
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.json({ success: true, data: row });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { title, notes, completed, due_date, sort_order } = req.body as {
      title?: string; notes?: string; completed?: boolean; due_date?: string | null; sort_order?: number;
    };
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'not found' });
    db.prepare(`
      UPDATE tasks SET
        title      = COALESCE(?, title),
        notes      = COALESCE(?, notes),
        completed  = CASE WHEN ? IS NOT NULL THEN ? ELSE completed END,
        due_date   = CASE WHEN ? IS NOT NULL THEN ? ELSE due_date END,
        sort_order = COALESCE(?, sort_order)
      WHERE id = ?
    `).run(
      title ?? null,
      notes ?? null,
      completed !== undefined ? 1 : null, completed ? 1 : 0,
      due_date !== undefined ? 1 : null, due_date ?? null,
      sort_order ?? null,
      req.params.id,
    );
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: row });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/completed', (_req, res) => {
  try {
    db.prepare('DELETE FROM tasks WHERE completed = 1').run();
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
