/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();

// Precache all build assets (Vite injects the manifest here)
precacheAndRoute(self.__WB_MANIFEST);

// SPA fallback – serve index.html for all page navigations
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

// ── Shopping list (GET) ───────────────────────────────────────────────────────
// StaleWhileRevalidate: respond from cache instantly, then refresh in background.
registerRoute(
  ({ url, request }: { url: URL; request: Request }) =>
    url.pathname === '/api/shopping' && request.method === 'GET',
  new StaleWhileRevalidate({ cacheName: 'shopping-api' }),
);

// ── All API mutations (POST / PUT / PATCH / DELETE) ───────────────────────────
// One background-sync queue covers every write across the whole app.
// Failed requests are stored in IndexedDB and replayed automatically when the
// device comes back online (up to 24 hours later).
const bgSync = new BackgroundSyncPlugin('api-mutations', {
  maxRetentionTime: 24 * 60,
});

const isMutation = ({ request }: { request: Request }) =>
  request.url.includes('/api/') &&
  ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

registerRoute(isMutation, new NetworkOnly({ plugins: [bgSync] }), 'POST');
registerRoute(isMutation, new NetworkOnly({ plugins: [bgSync] }), 'PUT');
registerRoute(isMutation, new NetworkOnly({ plugins: [bgSync] }), 'PATCH');
registerRoute(isMutation, new NetworkOnly({ plugins: [bgSync] }), 'DELETE');

// ── All other API reads (GET) ────────────────────────────────────────────────
// NetworkFirst with a 5-second timeout; falls back to cache when offline so
// every page shows its last-known data.
registerRoute(
  ({ url, request }: { url: URL; request: Request }) =>
    url.pathname.startsWith('/api/') && request.method === 'GET',
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      {
        cacheWillUpdate: async ({ response }: { response: Response }) =>
          response.status === 200 ? response : null,
      },
    ],
  }),
);
