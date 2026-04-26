import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db/database.js';

const router = Router();

// ── Sections ──────────────────────────────────────────────────────────────────

router.get('/sections', (_req, res) => {
  try {
    const sections = db.prepare(
      'SELECT * FROM pantry_sections ORDER BY sort_order, name'
    ).all();
    res.json({ success: true, data: sections });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/sections', (req, res) => {
  try {
    const { name, icon = '📦' } = req.body as { name: string; icon?: string };
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'name required' });
    const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM pantry_sections').get() as any)?.m ?? -1;
    const id = randomUUID();
    db.prepare(
      'INSERT INTO pantry_sections (id, name, icon, sort_order) VALUES (?, ?, ?, ?)'
    ).run(id, name.trim(), icon, maxOrder + 1);
    const row = db.prepare('SELECT * FROM pantry_sections WHERE id = ?').get(id);
    res.json({ success: true, data: row });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/sections/:id', (req, res) => {
  try {
    const { name, icon, sort_order } = req.body as { name?: string; icon?: string; sort_order?: number };
    const existing = db.prepare('SELECT * FROM pantry_sections WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'not found' });
    db.prepare(
      'UPDATE pantry_sections SET name = COALESCE(?, name), icon = COALESCE(?, icon), sort_order = COALESCE(?, sort_order) WHERE id = ?'
    ).run(name ?? null, icon ?? null, sort_order ?? null, req.params.id);
    const row = db.prepare('SELECT * FROM pantry_sections WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: row });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/sections/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM pantry_sections WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Items ─────────────────────────────────────────────────────────────────────

router.get('/items', (req, res) => {
  try {
    const { section_id } = req.query as { section_id?: string };
    const items = section_id
      ? db.prepare('SELECT * FROM pantry_items WHERE section_id = ? ORDER BY generic_name, name').all(section_id)
      : db.prepare('SELECT * FROM pantry_items ORDER BY section_id, generic_name, name').all();
    res.json({ success: true, data: items });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/items', (req, res) => {
  try {
    const { section_id, name, generic_name = '', brand = '', quantity = 1, unit = '', min_quantity = 0, barcode = '' } = req.body as {
      section_id: string; name: string; generic_name?: string; brand?: string;
      quantity?: number; unit?: string; min_quantity?: number; barcode?: string;
    };
    if (!section_id || !name?.trim()) return res.status(400).json({ success: false, error: 'section_id and name required' });
    const section = db.prepare('SELECT id FROM pantry_sections WHERE id = ?').get(section_id);
    if (!section) return res.status(404).json({ success: false, error: 'section not found' });

    // Dedup: if a barcode is provided and already exists in this section, increment quantity
    const trimmedBarcode = barcode.trim();
    if (trimmedBarcode) {
      const dupe = db.prepare(
        `SELECT id FROM pantry_items WHERE section_id = ? AND barcode = ? AND barcode != ''`
      ).get(section_id, trimmedBarcode) as any;
      if (dupe) {
        db.prepare('UPDATE pantry_items SET quantity = quantity + ? WHERE id = ?').run(quantity, dupe.id);
        const updated = db.prepare('SELECT * FROM pantry_items WHERE id = ?').get(dupe.id);
        return res.json({ success: true, data: updated });
      }
    }

    const id = randomUUID();
    db.prepare(
      'INSERT INTO pantry_items (id, section_id, name, generic_name, brand, quantity, unit, min_quantity, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, section_id, name.trim(), generic_name.trim(), brand.trim(), quantity, unit, min_quantity, trimmedBarcode);
    const row = db.prepare('SELECT * FROM pantry_items WHERE id = ?').get(id);
    res.json({ success: true, data: row });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/items/:id', (req, res) => {
  try {
    const { name, generic_name, brand, quantity, unit, section_id, min_quantity, barcode } = req.body as {
      name?: string; generic_name?: string; brand?: string;
      quantity?: number; unit?: string; section_id?: string; min_quantity?: number; barcode?: string;
    };
    const existing = db.prepare('SELECT * FROM pantry_items WHERE id = ?').get(req.params.id) as any;
    if (!existing) return res.status(404).json({ success: false, error: 'not found' });
    db.prepare(
      `UPDATE pantry_items SET
        name         = COALESCE(?, name),
        generic_name = COALESCE(?, generic_name),
        brand        = COALESCE(?, brand),
        quantity     = COALESCE(?, quantity),
        unit         = COALESCE(?, unit),
        section_id   = COALESCE(?, section_id),
        min_quantity = COALESCE(?, min_quantity),
        barcode      = COALESCE(?, barcode)
       WHERE id = ?`
    ).run(
      name ?? null, generic_name ?? null, brand ?? null,
      quantity ?? null, unit ?? null, section_id ?? null, min_quantity ?? null,
      barcode ?? null,
      req.params.id
    );
    const row = db.prepare('SELECT * FROM pantry_items WHERE id = ?').get(req.params.id) as any;

    // Auto-add to shopping list if quantity is below min threshold
    const effectiveMin = row.min_quantity ?? 0;
    if (effectiveMin > 0 && row.quantity < effectiveMin) {
      const displayName = row.generic_name?.trim() || row.name;
      const alreadyQueued = db.prepare(
        `SELECT id FROM shopping_list WHERE LOWER(name) = LOWER(?) AND checked = 0`
      ).get(displayName);
      if (!alreadyQueued) {
        db.prepare(
          'INSERT INTO shopping_list (id, name, quantity, unit, source) VALUES (?, ?, ?, ?, ?)'
        ).run(randomUUID(), displayName, effectiveMin, row.unit ?? '', 'pantry');
      }
    }

    res.json({ success: true, data: row });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/items/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM pantry_items WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Bulk delete items
router.post('/items/bulk-delete', (req, res) => {
  try {
    const { ids } = req.body as { ids?: unknown };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'ids array required' });
    }
    const validIds = ids.filter((id): id is string => typeof id === 'string');
    const del = db.transaction(() => {
      for (const id of validIds) db.prepare('DELETE FROM pantry_items WHERE id = ?').run(id);
    });
    del();
    res.json({ success: true, deleted: validIds.length });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Add a pantry item to the shopping list
router.post('/items/:id/add-to-shopping', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM pantry_items WHERE id = ?').get(req.params.id) as any;
    if (!item) return res.status(404).json({ success: false, error: 'not found' });
    const quantity = (req.body as any).quantity ?? 1;
    const displayName = item.generic_name?.trim() || item.name;
    const shoppingId = randomUUID();
    db.prepare(
      'INSERT INTO shopping_list (id, name, quantity, unit, source) VALUES (?, ?, ?, ?, ?)'
    ).run(shoppingId, displayName, quantity, item.unit ?? '', 'pantry');
    const row = db.prepare('SELECT * FROM shopping_list WHERE id = ?').get(shoppingId);
    res.json({ success: true, data: row });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Sections ──────────────────────────────────────────────────────────────────

router.get('/sections', (_req, res) => {
  try {
    const sections = db.prepare(
      'SELECT * FROM pantry_sections ORDER BY sort_order, name'
    ).all();
    res.json({ success: true, data: sections });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/sections', (req, res) => {
  try {
    const { name, icon = '📦' } = req.body as { name: string; icon?: string };
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'name required' });
    const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM pantry_sections').get() as any)?.m ?? -1;
    const id = randomUUID();
    db.prepare(
      'INSERT INTO pantry_sections (id, name, icon, sort_order) VALUES (?, ?, ?, ?)'
    ).run(id, name.trim(), icon, maxOrder + 1);
    const row = db.prepare('SELECT * FROM pantry_sections WHERE id = ?').get(id);
    res.json({ success: true, data: row });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/sections/:id', (req, res) => {
  try {
    const { name, icon, sort_order } = req.body as { name?: string; icon?: string; sort_order?: number };
    const existing = db.prepare('SELECT * FROM pantry_sections WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'not found' });
    db.prepare(
      'UPDATE pantry_sections SET name = COALESCE(?, name), icon = COALESCE(?, icon), sort_order = COALESCE(?, sort_order) WHERE id = ?'
    ).run(name ?? null, icon ?? null, sort_order ?? null, req.params.id);
    const row = db.prepare('SELECT * FROM pantry_sections WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: row });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/sections/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM pantry_sections WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Items ─────────────────────────────────────────────────────────────────────

router.get('/items', (req, res) => {
  try {
    const { section_id } = req.query as { section_id?: string };
    const items = section_id
      ? db.prepare('SELECT * FROM pantry_items WHERE section_id = ? ORDER BY name').all(section_id)
      : db.prepare('SELECT * FROM pantry_items ORDER BY section_id, name').all();
    res.json({ success: true, data: items });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/items', (req, res) => {
  try {
    const { section_id, name, quantity = 1, unit = '' } = req.body as {
      section_id: string; name: string; quantity?: number; unit?: string;
    };
    if (!section_id || !name?.trim()) return res.status(400).json({ success: false, error: 'section_id and name required' });
    const section = db.prepare('SELECT id FROM pantry_sections WHERE id = ?').get(section_id);
    if (!section) return res.status(404).json({ success: false, error: 'section not found' });
    const id = randomUUID();
    db.prepare(
      'INSERT INTO pantry_items (id, section_id, name, quantity, unit) VALUES (?, ?, ?, ?, ?)'
    ).run(id, section_id, name.trim(), quantity, unit);
    const row = db.prepare('SELECT * FROM pantry_items WHERE id = ?').get(id);
    res.json({ success: true, data: row });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/items/:id', (req, res) => {
  try {
    const { name, quantity, unit, section_id } = req.body as {
      name?: string; quantity?: number; unit?: string; section_id?: string;
    };
    const existing = db.prepare('SELECT * FROM pantry_items WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'not found' });
    db.prepare(
      `UPDATE pantry_items SET
        name       = COALESCE(?, name),
        quantity   = COALESCE(?, quantity),
        unit       = COALESCE(?, unit),
        section_id = COALESCE(?, section_id)
       WHERE id = ?`
    ).run(name ?? null, quantity ?? null, unit ?? null, section_id ?? null, req.params.id);
    const row = db.prepare('SELECT * FROM pantry_items WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: row });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/items/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM pantry_items WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Add a pantry item to the shopping list
router.post('/items/:id/add-to-shopping', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM pantry_items WHERE id = ?').get(req.params.id) as any;
    if (!item) return res.status(404).json({ success: false, error: 'not found' });
    const quantity = (req.body as any).quantity ?? 1;
    const shoppingId = randomUUID();
    db.prepare(
      'INSERT INTO shopping_list (id, name, quantity, unit, source) VALUES (?, ?, ?, ?, ?)'
    ).run(shoppingId, item.name, quantity, item.unit ?? '', 'pantry');
    const row = db.prepare('SELECT * FROM shopping_list WHERE id = ?').get(shoppingId);
    res.json({ success: true, data: row });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
