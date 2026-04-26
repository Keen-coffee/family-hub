import { Router } from 'express';
import { getSetting } from './settings.js';

const router = Router();

/**
 * POST /api/ai/parse-product-name
 * Body: { name: string }
 * Returns: { generic_name: string; brand: string }
 *
 * Uses OpenRouter to split a raw product label (e.g. from a barcode scan) into
 * a human-friendly generic item type and a brand name.
 */
router.post('/parse-product-name', async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    return res.status(400).json({ success: false, error: 'name required' });
  }

  const apiKey = getSetting('openrouter_api_key');
  if (!apiKey) {
    return res.status(503).json({ success: false, error: 'OpenRouter API key not configured' });
  }

  const model = getSetting('openrouter_model') || 'anthropic/claude-3-haiku';

  const prompt = `You are a product name parser. Given a raw product label from a barcode scan, extract:
1. "generic_name" - the simple common name of the item (e.g. "Beef Hot Dog", "Whole Milk", "Pasta Sauce"). Keep it concise, 1-4 words. Title case.
2. "brand" - the brand/manufacturer name (e.g. "Applegate Naturals", "Heinz", "Trader Joe's"). If no brand is identifiable, return an empty string.

Respond ONLY with a JSON object, no explanation, no markdown fences:
{"generic_name": "...", "brand": "..."}

Product label: "${name.trim().replace(/"/g, '')}"`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://family-hub.local',
        'X-Title': 'FamilyHub',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 80,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[ai/parse-product-name] OpenRouter error:', err);
      return res.status(502).json({ success: false, error: 'AI service error' });
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content?.trim() ?? '';

    // Strip accidental markdown fences
    const json = content.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(json) as { generic_name: string; brand: string };

    if (typeof parsed.generic_name !== 'string') {
      return res.status(502).json({ success: false, error: 'Unexpected AI response' });
    }

    res.json({
      success: true,
      data: {
        generic_name: parsed.generic_name.trim(),
        brand: (parsed.brand ?? '').trim(),
      },
    });
  } catch (err) {
    console.error('[ai/parse-product-name]', err);
    res.status(500).json({ success: false, error: 'Parse failed' });
  }
});

export default router;
