import axios from 'axios';
import { Router, Request, Response } from 'express';
import { getSetting } from './settings.js';

const router = Router();

function getConfig() {
  const url = getSetting('mealie_url');
  const token = getSetting('mealie_api_token');
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ''), token };
}

async function mealie(cfg: { url: string; token: string }, path: string, method = 'get', data?: unknown) {
  return axios({
    method,
    url: `${cfg.url}/api${path}`,
    data,
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    validateStatus: () => true,
  });
}

// ── Recipes ──────────────────────────────────────────────────────────────────

router.get('/recipes', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Mealie not configured' });
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  const r = await mealie(cfg, `/recipes?${qs}`);
  res.status(r.status).json({ success: r.status < 400, data: r.data });
});

router.get('/recipes/:slug', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Mealie not configured' });
  const r = await mealie(cfg, `/recipes/${req.params.slug}`);
  res.status(r.status).json({ success: r.status < 400, data: r.data });
});

// ── Meal Plans ────────────────────────────────────────────────────────────────

router.get('/meal-plan', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Mealie not configured' });
  // Mealie: GET /api/groups/mealplans?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  const r = await mealie(cfg, `/households/mealplans?${qs}`);
  res.status(r.status).json({ success: r.status < 400, data: r.data });
});

router.post('/meal-plan', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Mealie not configured' });
  const r = await mealie(cfg, '/households/mealplans', 'post', req.body);
  res.status(r.status).json({ success: r.status < 400, data: r.data });
});

router.delete('/meal-plan/:id', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Mealie not configured' });
  const r = await mealie(cfg, `/households/mealplans/${req.params.id}`, 'delete');
  res.status(r.status).json({ success: r.status < 400 });
});

// ── Shopping Lists ────────────────────────────────────────────────────────────

// GET /api/mealie/shopping-lists — returns all shopping lists
router.get('/shopping-lists', async (_req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Mealie not configured' });
  const r = await mealie(cfg, '/households/shopping/lists');
  res.status(r.status).json({ success: r.status < 400, data: r.data });
});

// GET /api/mealie/shopping — items from the first (default) shopping list
router.get('/shopping', async (_req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Mealie not configured' });

  // Fetch lists, pick first
  const listsR = await mealie(cfg, '/households/shopping/lists');
  const lists = (listsR.data as { items?: { id: string }[] })?.items ?? [];
  if (!lists.length) return res.json({ success: true, data: [] });

  const listId = lists[0].id;
  const r = await mealie(cfg, `/households/shopping/lists/${listId}/items`);
  res.status(r.status).json({ success: r.status < 400, data: r.data });
});

// PUT /api/mealie/shopping/:id — check/uncheck item
router.put('/shopping/:id', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Mealie not configured' });
  const r = await mealie(cfg, `/households/shopping/items/${req.params.id}`, 'put', req.body);
  res.status(r.status).json({ success: r.status < 400, data: r.data });
});

router.delete('/shopping/:id', async (req: Request, res: Response) => {
  const cfg = getConfig();
  if (!cfg) return res.status(503).json({ success: false, error: 'Mealie not configured' });
  const r = await mealie(cfg, `/households/shopping/items/${req.params.id}`, 'delete');
  res.status(r.status).json({ success: r.status < 400 });
});

export default router;
