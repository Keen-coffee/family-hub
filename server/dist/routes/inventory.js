"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const express_1 = require("express");
const uuid_1 = require("uuid");
const database_js_1 = __importDefault(require("../db/database.js"));
const router = (0, express_1.Router)();
// ── Barcode Lookup (Open Food Facts) ─────────────────────────────────────────
router.get('/lookup/:barcode', async (req, res) => {
    const { barcode } = req.params;
    // First check local inventory
    const local = database_js_1.default
        .prepare('SELECT * FROM inventory WHERE barcode = ?')
        .get(barcode);
    if (local) {
        return res.json({ success: true, data: { ...local, source: 'local' } });
    }
    // Look up Open Food Facts
    try {
        const r = await axios_1.default.get(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
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
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
});
// ── Inventory ─────────────────────────────────────────────────────────────────
router.get('/', (_req, res) => {
    const rows = database_js_1.default.prepare('SELECT * FROM inventory ORDER BY name').all();
    res.json({ success: true, data: rows });
});
router.post('/', (req, res) => {
    const { barcode, name, category, quantity, unit, minimum_quantity, image_url, notes } = req.body;
    if (!name)
        return res.status(400).json({ success: false, error: 'name required' });
    const id = (0, uuid_1.v4)();
    database_js_1.default.prepare(`INSERT INTO inventory (id, barcode, name, category, quantity, unit, minimum_quantity, image_url, notes, last_scanned)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).run(id, barcode ?? null, name, category ?? null, quantity ?? 1, unit ?? 'each', minimum_quantity ?? 1, image_url ?? null, notes ?? null);
    res.json({ success: true, data: { id } });
});
router.put('/:id', (req, res) => {
    const { name, category, quantity, unit, minimum_quantity, image_url, notes } = req.body;
    database_js_1.default.prepare(`UPDATE inventory SET
       name = COALESCE(?, name),
       category = COALESCE(?, category),
       quantity = COALESCE(?, quantity),
       unit = COALESCE(?, unit),
       minimum_quantity = COALESCE(?, minimum_quantity),
       image_url = COALESCE(?, image_url),
       notes = COALESCE(?, notes),
       last_scanned = CURRENT_TIMESTAMP
     WHERE id = ?`).run(name, category, quantity, unit, minimum_quantity, image_url, notes, req.params.id);
    res.json({ success: true });
});
// PATCH decrement — used when scanning empty item
router.patch('/:id/empty', (_req, res) => {
    const item = database_js_1.default
        .prepare('SELECT * FROM inventory WHERE id = ?')
        .get(_req.params.id);
    if (!item)
        return res.status(404).json({ success: false, error: 'Not found' });
    database_js_1.default.prepare('UPDATE inventory SET quantity = 0, last_scanned = CURRENT_TIMESTAMP WHERE id = ?').run(item.id);
    // Auto-add to grocery list if at or below minimum
    const existing = database_js_1.default
        .prepare('SELECT id FROM grocery_list WHERE name = ? AND checked = 0')
        .get(item.name);
    if (!existing) {
        database_js_1.default.prepare(`INSERT INTO grocery_list (id, name, barcode, quantity, unit, category, source)
       VALUES (?, ?, ?, ?, ?, ?, 'inventory')`).run((0, uuid_1.v4)(), item.name, item.barcode, item.minimum_quantity, item.unit, item.category);
    }
    res.json({ success: true });
});
router.delete('/:id', (req, res) => {
    database_js_1.default.prepare('DELETE FROM inventory WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});
// ── Grocery List ──────────────────────────────────────────────────────────────
router.get('/grocery', (_req, res) => {
    const rows = database_js_1.default
        .prepare('SELECT * FROM grocery_list ORDER BY category, name')
        .all();
    res.json({ success: true, data: rows });
});
router.post('/grocery', (req, res) => {
    const { name, barcode, quantity, unit, category } = req.body;
    if (!name)
        return res.status(400).json({ success: false, error: 'name required' });
    const id = (0, uuid_1.v4)();
    database_js_1.default.prepare(`INSERT INTO grocery_list (id, name, barcode, quantity, unit, category)
     VALUES (?, ?, ?, ?, ?, ?)`).run(id, name, barcode ?? null, quantity ?? 1, unit ?? 'each', category ?? null);
    res.json({ success: true, data: { id } });
});
router.put('/grocery/:id', (req, res) => {
    const { name, quantity, unit, category, checked } = req.body;
    database_js_1.default.prepare(`UPDATE grocery_list SET
       name = COALESCE(?, name),
       quantity = COALESCE(?, quantity),
       unit = COALESCE(?, unit),
       category = COALESCE(?, category),
       checked = COALESCE(?, checked)
     WHERE id = ?`).run(name, quantity, unit, category, checked, req.params.id);
    res.json({ success: true });
});
router.delete('/grocery/:id', (req, res) => {
    database_js_1.default.prepare('DELETE FROM grocery_list WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});
// DELETE all checked grocery items
router.delete('/grocery', (_req, res) => {
    database_js_1.default.prepare('DELETE FROM grocery_list WHERE checked = 1').run();
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=inventory.js.map