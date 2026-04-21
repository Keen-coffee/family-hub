"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const express_1 = require("express");
const settings_js_1 = require("./settings.js");
const router = (0, express_1.Router)();
function getConfig() {
    const url = (0, settings_js_1.getSetting)('tandoor_url');
    const token = (0, settings_js_1.getSetting)('tandoor_api_token');
    if (!url || !token)
        return null;
    return { url: url.replace(/\/$/, ''), token };
}
async function tandoor(cfg, path, method = 'get', data) {
    return (0, axios_1.default)({
        method,
        url: `${cfg.url}/api/v1${path}`,
        data,
        headers: { Authorization: `Token ${cfg.token}`, 'Content-Type': 'application/json' },
        validateStatus: () => true,
    });
}
// ── Recipes ──────────────────────────────────────────────────────────────────
router.get('/recipes', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'Tandoor not configured' });
    const qs = new URLSearchParams(req.query).toString();
    const r = await tandoor(cfg, `/recipe/?${qs}`);
    res.status(r.status).json({ success: r.status < 400, data: r.data });
});
router.get('/recipes/:id', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'Tandoor not configured' });
    const r = await tandoor(cfg, `/recipe/${req.params.id}/`);
    res.status(r.status).json({ success: r.status < 400, data: r.data });
});
router.post('/recipes', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'Tandoor not configured' });
    const r = await tandoor(cfg, '/recipe/', 'post', req.body);
    res.status(r.status).json({ success: r.status < 400, data: r.data });
});
router.put('/recipes/:id', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'Tandoor not configured' });
    const r = await tandoor(cfg, `/recipe/${req.params.id}/`, 'put', req.body);
    res.status(r.status).json({ success: r.status < 400, data: r.data });
});
// ── Meal Plans ────────────────────────────────────────────────────────────────
router.get('/meal-plan', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'Tandoor not configured' });
    const qs = new URLSearchParams(req.query).toString();
    const r = await tandoor(cfg, `/meal-plan/?${qs}`);
    res.status(r.status).json({ success: r.status < 400, data: r.data });
});
router.post('/meal-plan', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'Tandoor not configured' });
    const r = await tandoor(cfg, '/meal-plan/', 'post', req.body);
    res.status(r.status).json({ success: r.status < 400, data: r.data });
});
router.put('/meal-plan/:id', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'Tandoor not configured' });
    const r = await tandoor(cfg, `/meal-plan/${req.params.id}/`, 'put', req.body);
    res.status(r.status).json({ success: r.status < 400, data: r.data });
});
router.delete('/meal-plan/:id', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'Tandoor not configured' });
    const r = await tandoor(cfg, `/meal-plan/${req.params.id}/`, 'delete');
    res.status(r.status).json({ success: r.status < 400 });
});
// ── Shopping List ─────────────────────────────────────────────────────────────
router.get('/shopping', async (_req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'Tandoor not configured' });
    const r = await tandoor(cfg, '/shopping-list-entry/?checked=false');
    res.status(r.status).json({ success: r.status < 400, data: r.data });
});
router.post('/shopping', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'Tandoor not configured' });
    const r = await tandoor(cfg, '/shopping-list-entry/', 'post', req.body);
    res.status(r.status).json({ success: r.status < 400, data: r.data });
});
router.put('/shopping/:id', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'Tandoor not configured' });
    const r = await tandoor(cfg, `/shopping-list-entry/${req.params.id}/`, 'put', req.body);
    res.status(r.status).json({ success: r.status < 400, data: r.data });
});
router.delete('/shopping/:id', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'Tandoor not configured' });
    const r = await tandoor(cfg, `/shopping-list-entry/${req.params.id}/`, 'delete');
    res.status(r.status).json({ success: r.status < 400 });
});
// ── Keywords / Foods ──────────────────────────────────────────────────────────
router.get('/keywords', async (_req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'Tandoor not configured' });
    const r = await tandoor(cfg, '/keyword/');
    res.status(r.status).json({ success: r.status < 400, data: r.data });
});
router.get('/foods', async (req, res) => {
    const cfg = getConfig();
    if (!cfg)
        return res.status(503).json({ success: false, error: 'Tandoor not configured' });
    const qs = new URLSearchParams(req.query).toString();
    const r = await tandoor(cfg, `/food/?${qs}`);
    res.status(r.status).json({ success: r.status < 400, data: r.data });
});
exports.default = router;
//# sourceMappingURL=tandoor.js.map