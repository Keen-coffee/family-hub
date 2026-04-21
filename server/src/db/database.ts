import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load .env before reading DB_PATH — this module is evaluated at import time,
// before any code in index.ts body runs, so dotenv must be called here.
const envFromRoot = path.join(process.cwd(), 'server', '.env');
const envFromCwd = path.join(process.cwd(), '.env');
dotenv.config({ path: fs.existsSync(envFromRoot) ? envFromRoot : envFromCwd });

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(),
  fs.existsSync(path.join(process.cwd(), 'server')) ? 'data' : '../data',
  'familyhub.db'
);
const dbDir = path.dirname(DB_PATH);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db: DatabaseType = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dashboard_layouts (
      id         TEXT PRIMARY KEY DEFAULT 'default',
      name       TEXT NOT NULL DEFAULT 'Default',
      layout_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id                TEXT PRIMARY KEY,
      barcode           TEXT,
      name              TEXT NOT NULL,
      category          TEXT,
      quantity          INTEGER NOT NULL DEFAULT 1,
      unit              TEXT DEFAULT 'each',
      minimum_quantity  INTEGER DEFAULT 1,
      image_url         TEXT,
      notes             TEXT,
      last_scanned      DATETIME,
      created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory(barcode);

    CREATE TABLE IF NOT EXISTS grocery_list (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      barcode    TEXT,
      quantity   INTEGER NOT NULL DEFAULT 1,
      unit       TEXT DEFAULT 'each',
      category   TEXT,
      checked    INTEGER NOT NULL DEFAULT 0,
      source     TEXT DEFAULT 'manual',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pantry_sections (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      icon       TEXT NOT NULL DEFAULT '📦',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pantry_items (
      id         TEXT PRIMARY KEY,
      section_id TEXT NOT NULL REFERENCES pantry_sections(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      quantity   REAL NOT NULL DEFAULT 1,
      unit       TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_pantry_items_section ON pantry_items(section_id);

    CREATE TABLE IF NOT EXISTS shopping_list (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      quantity   REAL NOT NULL DEFAULT 1,
      unit       TEXT DEFAULT '',
      checked    INTEGER NOT NULL DEFAULT 0,
      source     TEXT DEFAULT 'manual',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT DEFAULT '',
      servings    INTEGER DEFAULT 4,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id              TEXT PRIMARY KEY,
      recipe_id       TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      ingredient_name TEXT NOT NULL,
      notes           TEXT DEFAULT '',
      sort_order      INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

    CREATE TABLE IF NOT EXISTS meal_plan (
      id          TEXT PRIMARY KEY,
      date        TEXT NOT NULL,
      meal_type   TEXT NOT NULL DEFAULT 'dinner',
      recipe_id   TEXT REFERENCES recipes(id) ON DELETE SET NULL,
      custom_name TEXT DEFAULT '',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_meal_plan_date ON meal_plan(date);

    CREATE TABLE IF NOT EXISTS tasks (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      notes      TEXT DEFAULT '',
      completed  INTEGER NOT NULL DEFAULT 0,
      due_date   TEXT DEFAULT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS babysitter_contacts (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      relationship TEXT NOT NULL DEFAULT '',
      phone        TEXT NOT NULL DEFAULT '',
      email        TEXT DEFAULT '',
      notes        TEXT DEFAULT '',
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS babysitter_notes (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      content    TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export default db;
