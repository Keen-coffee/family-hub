import axios from 'axios';
import { Router, Request, Response } from 'express';
import { getSetting } from './settings.js';

const router = Router();

function getConfig() {
  const url = getSetting('tandoor_url');
  const token = getSetting('tandoor_api_token');
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ''), token };
}

async function tandoor(cfg: { url: string; token: string }, path: string, method = 'get', data?: unknown) {
  return axios({
    method,
    url: `${cfg.url}/api/v1${path}`,
    data,
    headers: { Authorization: `Token ${cfg.token}`, 'Content-Type': 'application/json' },
    validateStatus: () => true,
  });
}

// ── Recipes ──────────────────────────────────────────────────────────────────

router.get('/recipes', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Tandoor not configured' });
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  const r = await tandoor(cfg, `/recipe/?${qs}`);
  res.status(r.status).json({ success: r.status < 400, data: r.data });
});

router.get('/recipes/:id', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Tandoor not configured' });
  const r = await tandoor(cfg, `/recipe/${req.params.id}/`);
  res.status(r.status).json({ success: r.status < 400, data: r.data });
});

router.post('/recipes', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Tandoor not configured' });
  const r = await tandoor(cfg, '/recipe/', 'post', req.body);
  res.status(r.status).json({ success: r.status < 400, data: r.data });
});

router.put('/recipes/:id', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Tandoor not configured' });
  const r = await tandoor(cfg, `/recipe/${req.params.id}/`, 'put', req.body);
  res.status(r.status).json({ success: r.status < 400, data: r.data });
});

// ── Meal Plans ────────────────────────────────────────────────────────────────

router.get('/meal-plan', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Tandoor not configured' });
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  const r = await tandoor(cfg, `/meal-plan/?${qs}`);
  res.status(r.status).json({ success: r.status < 400, data: r.data });
});

router.post('/meal-plan', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Tandoor not configured' });
  const r = await tandoor(cfg, '/meal-plan/', 'post', req.body);
  res.status(r.status).json({ success: r.status < 400, data: r.data });
});

router.put('/meal-plan/:id', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Tandoor not configured' });
  const r = await tandoor(cfg, `/meal-plan/${req.params.id}/`, 'put', req.body);
  res.status(r.status).json({ success: r.status < 400, data: r.data });
});

router.delete('/meal-plan/:id', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Tandoor not configured' });
  const r = await tandoor(cfg, `/meal-plan/${req.params.id}/`, 'delete');
  res.status(r.status).json({ success: r.status < 400 });
});

// ── Shopping List ─────────────────────────────────────────────────────────────

router.get('/shopping', async (_req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Tandoor not configured' });
  const r = await tandoor(cfg, '/shopping-list-entry/?checked=false');
  res.status(r.status).json({ success: r.status < 400, data: r.data });
});

router.post('/shopping', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Tandoor not configured' });
  const r = await tandoor(cfg, '/shopping-list-entry/', 'post', req.body);
  res.status(r.status).json({ success: r.status < 400, data: r.data });
});

router.put('/shopping/:id', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Tandoor not configured' });
  const r = await tandoor(cfg, `/shopping-list-entry/${req.params.id}/`, 'put', req.body);
  res.status(r.status).json({ success: r.status < 400, data: r.data });
});

router.delete('/shopping/:id', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Tandoor not configured' });
  const r = await tandoor(cfg, `/shopping-list-entry/${req.params.id}/`, 'delete');
  res.status(r.status).json({ success: r.status < 400 });
});

// ── Keywords / Foods ──────────────────────────────────────────────────────────

router.get('/keywords', async (_req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Tandoor not configured' });
  const r = await tandoor(cfg, '/keyword/');
  res.status(r.status).json({ success: r.status < 400, data: r.data });
});

router.get('/foods', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Tandoor not configured' });
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  const r = await tandoor(cfg, `/food/?${qs}`);
  res.status(r.status).json({ success: r.status < 400, data: r.data });
});

export default router;
