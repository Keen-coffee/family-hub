# Family Hub

A self-hosted family dashboard PWA with a 48-column draggable/resizable widget grid for tablets and a mobile-optimized grocery/chores view.

## Features

- **Dashboard** — 48-column drag-and-drop widget grid (Calendar, Weather, Clock, Tasks, Grocery, Chores, Meals)
- **Calendar** — Full CalDAV integration (Nextcloud, Radicale, etc.)
- **Meals & Recipes** — Tandoor integration for meal planning and recipe browsing
- **Grocery** — Tandoor shopping list + local pantry inventory with barcode scanning
- **Chores** — CalDAV VTODO-based chore tracking with family member assignment
- **PWA** — Installable on mobile devices; optimized grocery list + barcode scanner view

## Stack

| Layer    | Tech                                              |
|----------|---------------------------------------------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS          |
| Grid     | react-grid-layout (48 columns)                    |
| State    | Zustand + TanStack Query                          |
| Icons    | Lucide React                                      |
| Barcode  | @zxing/browser                                    |
| PWA      | vite-plugin-pwa (Workbox)                         |
| Backend  | Express, TypeScript, better-sqlite3               |
| CalDAV   | Raw HTTP + fast-xml-parser + ical.js              |
| Weather  | OpenWeatherMap API (proxied)                      |
| Food     | Open Food Facts API                               |

## Quick Start

### 1. Clone & install

```bash
git clone <repo>
cd family-hub
npm install
```

### 2. Configure environment

```bash
cp .env.example server/.env
# Edit server/.env with your CalDAV, Tandoor, and OpenWeatherMap credentials
```

### 3. Start development

```bash
npm run dev
```

- Frontend: http://localhost:5173  
- Backend API: http://localhost:3001

### 4. Configure via Settings page

Open the app and navigate to **Settings** (gear icon in sidebar) to configure:
- CalDAV server URL, username, password
- Tandoor URL and API token
- OpenWeatherMap API key and location
- Family member names

## Production Deployment

```bash
npm run build
npm start
```

Or use the included `docker-compose.yml`:

```bash
docker-compose up -d
```

The server serves the built client files in production.

## Mobile PWA

Visit the app URL on a mobile device and use **Add to Home Screen** for PWA installation. The mobile view shows:
- Grocery list with check-off
- Barcode scanner for pantry management
- Simplified calendar and chores view

## CalDAV Chores Setup

Chores are stored as VTODO items in a dedicated CalDAV calendar. Create a calendar named **"Chores"** in your CalDAV server, then assign it in Settings.

## Directory Structure

```
family-hub/
├── client/          # React PWA
│   └── src/
│       ├── api/         # API client functions
│       ├── components/  # UI components & widgets
│       ├── hooks/       # Data-fetching hooks
│       ├── pages/       # Route pages
│       └── stores/      # Zustand stores
└── server/          # Express API proxy + SQLite
    └── src/
        ├── db/          # SQLite setup
        └── routes/      # API route handlers
```
