"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_js_1 = __importDefault(require("../db/database.js"));
const router = (0, express_1.Router)();
// GET layout by id (default: 'default')
router.get('/:id?', (req, res) => {
    const id = req.params.id ?? 'default';
    const row = database_js_1.default
        .prepare('SELECT id, name, layout_json, updated_at FROM dashboard_layouts WHERE id = ?')
        .get(id);
    if (!row) {
        return res.json({ success: true, data: null });
    }
    res.json({
        success: true,
        data: { ...row, layout: JSON.parse(row.layout_json) },
    });
});
// PUT save layout
router.put('/:id?', (req, res) => {
    const id = req.params.id ?? 'default';
    const { name, layout } = req.body;
    database_js_1.default.prepare(`INSERT INTO dashboard_layouts (id, name, layout_json, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       layout_json = excluded.layout_json,
       updated_at = CURRENT_TIMESTAMP`).run(id, name ?? 'Default', JSON.stringify(layout));
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map