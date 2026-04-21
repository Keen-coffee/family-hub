"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSetting = getSetting;
const express_1 = require("express");
const database_js_1 = __importDefault(require("../db/database.js"));
const router = (0, express_1.Router)();
// GET all settings (redact sensitive values for the client)
router.get('/', (_req, res) => {
    const rows = database_js_1.default.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    const sensitiveKeys = ['caldav_password', 'tandoor_api_token', 'openweathermap_api_key'];
    for (const row of rows) {
        settings[row.key] = sensitiveKeys.includes(row.key)
            ? row.value ? '••••••••' : ''
            : row.value;
    }
    res.json({ success: true, data: settings });
});
// GET raw setting by key (server-internal use only — returns full value)
router.get('/raw/:key', (req, res) => {
    const row = database_js_1.default.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);
    res.json({ success: true, data: row?.value ?? null });
});
// PUT upsert settings (batch)
router.put('/', (req, res) => {
    const upsert = database_js_1.default.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`);
    const updateMany = database_js_1.default.transaction((entries) => {
        for (const [key, value] of entries) {
            // Don't overwrite sensitive placeholders sent back from client
            if (value === '••••••••')
                continue;
            upsert.run(key, value);
        }
    });
    updateMany(Object.entries(req.body));
    res.json({ success: true });
});
function getSetting(key) {
    const row = database_js_1.default.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row?.value ?? null;
}
exports.default = router;
//# sourceMappingURL=settings.js.map