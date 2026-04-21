import { Router, Request, Response } from 'express';
import db from '../db/database.js';

const router = Router();

// GET layout by id (default: 'default')
router.get('/:id?', (req: Request, res: Response) => {
  const id = req.params.id ?? 'default';
  const row = db
    .prepare('SELECT id, name, layout_json, updated_at FROM dashboard_layouts WHERE id = ?')
    .get(id) as { id: string; name: string; layout_json: string; updated_at: string } | undefined;

  if (!row) {
    return res.json({ success: true, data: null });
  }

  res.json({
    success: true,
    data: { ...row, layout: JSON.parse(row.layout_json) },
  });
});

// PUT save layout
router.put('/:id?', (req: Request, res: Response) => {
  const id = req.params.id ?? 'default';
  const { name, layout } = req.body as { name?: string; layout: unknown[] };

  db.prepare(
    `INSERT INTO dashboard_layouts (id, name, layout_json, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       layout_json = excluded.layout_json,
       updated_at = CURRENT_TIMESTAMP`
  ).run(id, name ?? 'Default', JSON.stringify(layout));

  res.json({ success: true });
});

export default router;
