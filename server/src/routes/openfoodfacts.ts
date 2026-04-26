import { Router } from 'express';

const router = Router();

// ── Batch lookup ──────────────────────────────────────────────────────────────
router.post('/batch', async (req, res) => {
  const { barcodes } = req.body as { barcodes?: unknown };
  if (!Array.isArray(barcodes) || barcodes.length === 0) {
    return res.status(400).json({ success: false, error: 'barcodes array required' });
  }
  const unique = [...new Set(barcodes.filter((b): b is string => typeof b === 'string' && /^\d{6,14}$/.test(b)))];
  if (unique.length === 0) {
    return res.status(400).json({ success: false, error: 'No valid barcodes provided' });
  }

  const lookup = async (barcode: string) => {
    try {
      const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`;
      const response = await fetch(url, { headers: { 'User-Agent': 'FamilyHub/1.0 (home-assistant)' } });
      const data = await response.json() as any;
      if (data.status === 0 || !data.product) return { barcode, found: false, name: null, brand: null, quantity: null };
      const p = data.product;
      const name = (p.product_name_en || p.product_name || '').trim() || null;
      const brand = (p.brands || '').split(',')[0].trim() || null;
      const qty = (p.quantity || '').trim() || null;
      return { barcode, found: !!name, name, brand, quantity: qty };
    } catch {
      return { barcode, found: false, name: null, brand: null, quantity: null };
    }
  };

  try {
    const results = await Promise.all(unique.map(lookup));
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Batch lookup failed' });
  }
});

router.get('/:barcode', async (req, res) => {
  const { barcode } = req.params;
  if (!/^\d{6,14}$/.test(barcode)) {
    return res.json({ success: false, error: 'Invalid barcode format' });
  }
  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'FamilyHub/1.0 (home-assistant)' },
    });
    const data = await response.json() as any;

    if (data.status === 0 || !data.product) {
      return res.json({ success: false, error: 'Product not found' });
    }

    const p = data.product;
    const name = (p.product_name_en || p.product_name || '').trim();
    const brand = (p.brands || '').split(',')[0].trim();

    res.json({
      success: true,
      data: {
        name: name || null,
        brand: brand || null,
        quantity: (p.quantity || '').trim() || null,
      },
    });
  } catch (err) {
    console.error('[openfoodfacts]', err);
    res.status(500).json({ success: false, error: 'Lookup failed' });
  }
});

export default router;
