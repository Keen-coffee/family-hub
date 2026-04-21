import { Router, Request, Response } from 'express';
import db from '../db/database.js';

const router = Router();

// GET all settings (redact sensitive values for the client)
router.get('/', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  const sensitiveKeys = ['caldav_password', 'tandoor_api_token', 'pirateweather_api_key'];
  for (const row of rows) {
    settings[row.key] = sensitiveKeys.includes(row.key)
      ? row.value ? '••••••••' : ''
      : row.value;
  }
  res.json({ success: true, data: settings });
});

// GET raw setting by key (server-internal use only — returns full value)
router.get('/raw/:key', (req: Request, res: Response) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key) as { value: string } | undefined;
  res.json({ success: true, data: row?.value ?? null });
});

// PUT upsert settings (batch)
router.put('/', (req: Request, res: Response) => {
  const upsert = db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
  );
  const updateMany = db.transaction((entries: [string, string][]) => {
    for (const [key, value] of entries) {
      // Don't overwrite sensitive placeholders sent back from client
      if (value === '••••••••') continue;
      upsert.run(key, value);
    }
  });
  updateMany(Object.entries(req.body as Record<string, string>));
  res.json({ success: true });
});

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export default router;
