import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { initializeDatabase } from './db/database.js';

import settingsRouter from './routes/settings.js';
import dashboardRouter from './routes/dashboard.js';
import caldavRouter from './routes/caldav.js';
import weatherRouter from './routes/weather.js';
import inventoryRouter from './routes/inventory.js';
import pantryRouter from './routes/pantry.js';
import shoppingRouter from './routes/shopping.js';
import recipesRouter from './routes/recipes.js';
import mealplanRouter from './routes/mealplan.js';
import openfoodfactsRouter from './routes/openfoodfacts.js';
import tasksRouter from './routes/tasks.js';
import babysitterRouter from './routes/babysitter.js';
import aiRouter from './routes/ai.js';

// Try loading .env from server/ subdirectory (when run from repo root)
// or from CWD (when run from server/ directly)
const envFromRoot = path.join(process.cwd(), 'server', '.env');
const envFromCwd = path.join(process.cwd(), '.env');
dotenv.config({ path: fs.existsSync(envFromRoot) ? envFromRoot : envFromCwd });

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(compression());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Initialize DB
initializeDatabase();

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api/settings', settingsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/caldav', caldavRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/pantry', pantryRouter);
app.use('/api/shopping', shoppingRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/mealplan', mealplanRouter);
app.use('/api/openfoodfacts', openfoodfactsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/babysitter', babysitterRouter);
app.use('/api/ai', aiRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Version info
app.get('/api/version', (_req, res) => {
  res.json({ version: process.env.COMMIT_SHA ?? 'unknown' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ success: false, error: err.message });
});

// Serve static client files in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../public');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Family Hub server running on http://localhost:${PORT}`);
});

export default app;
