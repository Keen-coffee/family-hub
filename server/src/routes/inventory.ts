import axios from 'axios';
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';

const router = Router();

interface InventoryRow {
  id: string;
  barcode: string | null;
  name: string;
  category: string | null;
  quantity: number;
  unit: string;
  minimum_quantity: number;
  image_url: string | null;
  notes: string | null;
  last_scanned: string | null;
  created_at: string;
}

interface GroceryRow {
  id: string;
  name: string;
  barcode: string | null;
  quantity: number;
  unit: string;
  category: string | null;
  checked: number;
  source: string;
  created_at: string;
}

// ── Barcode Lookup (Open Food Facts) ─────────────────────────────────────────

router.get('/lookup/:barcode', async (req: Request, res: Response) => {
  const { barcode } = req.params;

  // First check local inventory
  const local = db
    .prepare('SELECT * FROM inventory WHERE barcode = ?')
    .get(barcode) as InventoryRow | undefined;

  if (local) {
    return res.json({ success: true, data: { ...local, source: 'local' } });
  }

  // Look up Open Food Facts
  try {
    const r = await axios.get(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
      timeout: 8000,
    });
    const product = r.data?.product;
    if (!product) {
      return res.json({ success: false, error: 'Product not found' });
    }
    res.json({
      success: true,
      data: {
        barcode,
        name: product.product_name ?? product.product_name_en ?? 'Unknown',
        category: product.categories_tags?.[0]?.replace('en:', '') ?? null,
        image_url: product.image_front_small_url ?? product.image_url ?? null,
        source: 'openfoodfacts',
        nutriments: product.nutriments ?? null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ── Inventory ─────────────────────────────────────────────────────────────────

router.get('/', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM inventory ORDER BY name').all() as InventoryRow[];
  res.json({ success: true, data: rows });
});

router.post('/', (req: Request, res: Response) => {
  const { barcode, name, category, quantity, unit, minimum_quantity, image_url, notes } =
    req.body as Partial<InventoryRow>;
  if (!name) return res.status(400).json({ success: false, error: 'name required' });

  const id = uuidv4();
  db.prepare(
    `INSERT INTO inventory (id, barcode, name, category, quantity, unit, minimum_quantity, image_url, notes, last_scanned)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).run(
    id,
    barcode ?? null,
    name,
    category ?? null,
    quantity ?? 1,
    unit ?? 'each',
    minimum_quantity ?? 1,
    image_url ?? null,
    notes ?? null
  );
  res.json({ success: true, data: { id } });
});

router.put('/:id', (req: Request, res: Response) => {
  const { name, category, quantity, unit, minimum_quantity, image_url, notes } =
    req.body as Partial<InventoryRow>;
  db.prepare(
    `UPDATE inventory SET
       name = COALESCE(?, name),
       category = COALESCE(?, category),
       quantity = COALESCE(?, quantity),
       unit = COALESCE(?, unit),
       minimum_quantity = COALESCE(?, minimum_quantity),
       image_url = COALESCE(?, image_url),
       notes = COALESCE(?, notes),
       last_scanned = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(name, category, quantity, unit, minimum_quantity, image_url, notes, req.params.id);
  res.json({ success: true });
});

// PATCH decrement — used when scanning empty item
router.patch('/:id/empty', (_req: Request, res: Response) => {
  const item = db
    .prepare('SELECT * FROM inventory WHERE id = ?')
    .get(_req.params.id) as InventoryRow | undefined;
  if (!item) return res.status(404).json({ success: false, error: 'Not found' });

  db.prepare('UPDATE inventory SET quantity = 0, last_scanned = CURRENT_TIMESTAMP WHERE id = ?').run(
    item.id
  );

  // Auto-add to grocery list if at or below minimum
  const existing = db
    .prepare('SELECT id FROM grocery_list WHERE name = ? AND checked = 0')
    .get(item.name);
  if (!existing) {
    db.prepare(
      `INSERT INTO grocery_list (id, name, barcode, quantity, unit, category, source)
       VALUES (?, ?, ?, ?, ?, ?, 'inventory')`
    ).run(uuidv4(), item.name, item.barcode, item.minimum_quantity, item.unit, item.category);
  }

  res.json({ success: true });
});

// ── Grocery List ──────────────────────────────────────────────────────────────
// NOTE: specific grocery routes must come BEFORE /:id to avoid being swallowed

router.get('/grocery', (_req: Request, res: Response) => {
  const rows = db
    .prepare('SELECT * FROM grocery_list ORDER BY category, name')
    .all() as GroceryRow[];
  res.json({ success: true, data: rows });
});

router.post('/grocery', (req: Request, res: Response) => {
  const { name, barcode, quantity, unit, category } = req.body as Partial<GroceryRow>;
  if (!name) return res.status(400).json({ success: false, error: 'name required' });
  const id = uuidv4();
  db.prepare(
    `INSERT INTO grocery_list (id, name, barcode, quantity, unit, category)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, name, barcode ?? null, quantity ?? 1, unit ?? 'each', category ?? null);
  res.json({ success: true, data: { id } });
});

router.put('/grocery/:id', (req: Request, res: Response) => {
  const { name, quantity, unit, category, checked } = req.body as Partial<GroceryRow>;
  db.prepare(
    `UPDATE grocery_list SET
       name = COALESCE(?, name),
       quantity = COALESCE(?, quantity),
       unit = COALESCE(?, unit),
       category = COALESCE(?, category),
       checked = COALESCE(?, checked)
     WHERE id = ?`
  ).run(name, quantity, unit, category, checked, req.params.id);
  res.json({ success: true });
});

router.delete('/grocery/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM grocery_list WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// DELETE all checked grocery items
router.delete('/grocery', (_req: Request, res: Response) => {
  db.prepare('DELETE FROM grocery_list WHERE checked = 1').run();
  res.json({ success: true });
});

// ── Inventory CRUD (must come after /grocery routes) ─────────────────────────

router.delete('/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM inventory WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
