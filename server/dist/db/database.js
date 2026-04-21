"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const DB_PATH = process.env.DB_PATH || './data/familyhub.db';
const dbDir = path_1.default.dirname(path_1.default.resolve(DB_PATH));
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
}
const db = new better_sqlite3_1.default(path_1.default.resolve(DB_PATH));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
function initializeDatabase() {
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
  `);
}
exports.default = db;
//# sourceMappingURL=database.js.map