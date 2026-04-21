import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db/database.js';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const items = db.prepare(
      'SELECT * FROM shopping_list ORDER BY checked, created_at DESC'
    ).all();
    res.json({ success: true, data: items });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, quantity = 1, unit = '', source = 'manual' } = req.body as {
      name: string; quantity?: number; unit?: string; source?: string;
    };
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'name required' });
    const id = randomUUID();
    db.prepare(
      'INSERT INTO shopping_list (id, name, quantity, unit, source) VALUES (?, ?, ?, ?, ?)'
    ).run(id, name.trim(), quantity, unit, source);
    const row = db.prepare('SELECT * FROM shopping_list WHERE id = ?').get(id);
    res.json({ success: true, data: row });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name, quantity, unit, checked } = req.body as {
      name?: string; quantity?: number; unit?: string; checked?: boolean;
    };
    const existing = db.prepare('SELECT id FROM shopping_list WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'not found' });
    db.prepare(
      `UPDATE shopping_list SET
        name     = COALESCE(?, name),
        quantity = COALESCE(?, quantity),
        unit     = COALESCE(?, unit),
        checked  = COALESCE(?, checked)
       WHERE id = ?`
    ).run(name ?? null, quantity ?? null, unit ?? null, checked !== undefined ? (checked ? 1 : 0) : null, req.params.id);
    const row = db.prepare('SELECT * FROM shopping_list WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: row });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/checked', (_req, res) => {
  try {
    db.prepare('DELETE FROM shopping_list WHERE checked = 1').run();
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM shopping_list WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
