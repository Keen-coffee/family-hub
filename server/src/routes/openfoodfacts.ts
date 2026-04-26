import { Router } from 'express';

const router = Router();

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
