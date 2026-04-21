import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db/database.js';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const recipes = db.prepare('SELECT * FROM recipes ORDER BY name').all() as any[];
    const ingredients = db.prepare(
      'SELECT * FROM recipe_ingredients ORDER BY recipe_id, sort_order, ingredient_name'
    ).all() as any[];
    const byRecipe: Record<string, any[]> = {};
    for (const ing of ingredients) {
      if (!byRecipe[ing.recipe_id]) byRecipe[ing.recipe_id] = [];
      byRecipe[ing.recipe_id].push(ing);
    }
    const result = recipes.map(r => ({ ...r, ingredients: byRecipe[r.id] ?? [] }));
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id) as any;
    if (!recipe) return res.status(404).json({ success: false, error: 'not found' });
    const ingredients = db.prepare(
      'SELECT * FROM recipe_ingredients WHERE recipe_id = ? ORDER BY sort_order, ingredient_name'
    ).all(req.params.id);
    res.json({ success: true, data: { ...recipe, ingredients } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, description = '', servings = 4, ingredients = [] } = req.body as {
      name: string; description?: string; servings?: number;
      ingredients: { ingredient_name: string; notes?: string }[];
    };
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'name required' });
    const id = randomUUID();
    db.prepare(
      'INSERT INTO recipes (id, name, description, servings) VALUES (?, ?, ?, ?)'
    ).run(id, name.trim(), description, servings);

    const insertIng = db.prepare(
      'INSERT INTO recipe_ingredients (id, recipe_id, ingredient_name, notes, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    ingredients.forEach((ing, i) => {
      insertIng.run(randomUUID(), id, ing.ingredient_name.trim(), ing.notes ?? '', i);
    });

    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id) as any;
    const ings = db.prepare('SELECT * FROM recipe_ingredients WHERE recipe_id = ? ORDER BY sort_order').all(id);
    res.json({ success: true, data: { ...recipe, ingredients: ings } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name, description, servings, ingredients } = req.body as {
      name?: string; description?: string; servings?: number;
      ingredients?: { ingredient_name: string; notes?: string }[];
    };
    const existing = db.prepare('SELECT id FROM recipes WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'not found' });

    db.prepare(
      `UPDATE recipes SET
        name        = COALESCE(?, name),
        description = COALESCE(?, description),
        servings    = COALESCE(?, servings)
       WHERE id = ?`
    ).run(name ?? null, description ?? null, servings ?? null, req.params.id);

    if (Array.isArray(ingredients)) {
      db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(req.params.id);
      const insertIng = db.prepare(
        'INSERT INTO recipe_ingredients (id, recipe_id, ingredient_name, notes, sort_order) VALUES (?, ?, ?, ?, ?)'
      );
      ingredients.forEach((ing, i) => {
        insertIng.run(randomUUID(), req.params.id, ing.ingredient_name.trim(), ing.notes ?? '', i);
      });
    }

    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id) as any;
    const ings = db.prepare(
      'SELECT * FROM recipe_ingredients WHERE recipe_id = ? ORDER BY sort_order'
    ).all(req.params.id);
    res.json({ success: true, data: { ...recipe, ingredients: ings } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM recipes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
