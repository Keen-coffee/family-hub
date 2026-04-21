import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db/database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { start, end } = req.query as { start?: string; end?: string };
    let rows: any[];
    if (start && end) {
      rows = db.prepare(
        `SELECT mp.*, r.name AS recipe_name
         FROM meal_plan mp
         LEFT JOIN recipes r ON r.id = mp.recipe_id
         WHERE mp.date >= ? AND mp.date <= ?
         ORDER BY mp.date, mp.meal_type`
      ).all(start, end);
    } else {
      rows = db.prepare(
        `SELECT mp.*, r.name AS recipe_name
         FROM meal_plan mp
         LEFT JOIN recipes r ON r.id = mp.recipe_id
         ORDER BY mp.date, mp.meal_type`
      ).all();
    }
    res.json({ success: true, data: rows });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { date, meal_type = 'dinner', recipe_id = null, custom_name = '' } = req.body as {
      date: string; meal_type?: string; recipe_id?: string | null; custom_name?: string;
    };
    if (!date) return res.status(400).json({ success: false, error: 'date required' });
    if (!recipe_id && !custom_name?.trim()) {
      return res.status(400).json({ success: false, error: 'recipe_id or custom_name required' });
    }
    const id = randomUUID();
    db.prepare(
      'INSERT INTO meal_plan (id, date, meal_type, recipe_id, custom_name) VALUES (?, ?, ?, ?, ?)'
    ).run(id, date, meal_type, recipe_id ?? null, custom_name ?? '');

    const row = db.prepare(
      `SELECT mp.*, r.name AS recipe_name
       FROM meal_plan mp LEFT JOIN recipes r ON r.id = mp.recipe_id
       WHERE mp.id = ?`
    ).get(id);
    res.json({ success: true, data: row });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM meal_plan WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /api/mealplan/:id/check-groceries
 * Compares the recipe's ingredients to the pantry.
 * Any ingredient not found in the pantry (case-insensitive substring match) is added to the shopping list.
 * Returns { added: string[], alreadyHave: string[] }
 */
router.post('/:id/check-groceries', (req, res) => {
  try {
    const entry = db.prepare('SELECT * FROM meal_plan WHERE id = ?').get(req.params.id) as any;
    if (!entry) return res.status(404).json({ success: false, error: 'meal plan entry not found' });
    if (!entry.recipe_id) {
      return res.json({ success: true, data: { added: [], alreadyHave: [], message: 'No recipe linked' } });
    }

    const ingredients = db.prepare(
      'SELECT ingredient_name FROM recipe_ingredients WHERE recipe_id = ?'
    ).all(entry.recipe_id) as { ingredient_name: string }[];

    const pantryItems = db.prepare('SELECT name, quantity FROM pantry_items').all() as { name: string; quantity: number }[];

    const added: string[] = [];
    const alreadyHave: string[] = [];

    const insertShopping = db.prepare(
      'INSERT INTO shopping_list (id, name, quantity, unit, source) VALUES (?, ?, ?, ?, ?)'
    );

    for (const { ingredient_name } of ingredients) {
      const lower = ingredient_name.toLowerCase();
      const match = pantryItems.find(p => p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase()));
      const inPantry = match && (match.quantity ?? 0) > 0;
      if (inPantry) {
        alreadyHave.push(ingredient_name);
      } else {
        // Only add if not already on the shopping list
        const existing = db.prepare(
          'SELECT id FROM shopping_list WHERE LOWER(name) = ? AND checked = 0'
        ).get(lower);
        if (!existing) {
          insertShopping.run(randomUUID(), ingredient_name, 1, '', 'recipe');
          added.push(ingredient_name);
        } else {
          alreadyHave.push(ingredient_name + ' (already on list)');
        }
      }
    }

    res.json({ success: true, data: { added, alreadyHave } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
