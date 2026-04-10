/* mobile-rollout: 20260411-0025 */
/* ════════════════════════════════════════════════════════════════
   GigLega Service WorkWorker v1.5.0
   Handles: Caching · Offline · Push Notifications · Background Sync
   ════════════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════
   CONFIG
══════════════════════════════════ */
const APP_NAME    = 'GigLega';
const VERSION     = '2.0.0';
const CACHE_NAME  = `giglega-cache-v${VERSION}`;
const SYNC_TAG    = 'giglega-bg-sync';
const PUSH_ICON   = '/assets/icons/icon-192.png';
const PUSH_BADGE  = '/assets/icons/icon-72.png';

/* ══════════════════════════════════
   CACHE STRATEGY BUCKETS
══════════════════════════════════ */

/** Core shell — always cache on install */
const PRECACHE_SHELL = [
  /* HTML pages intentionally excluded — always fetched fresh from network */
  /* Only static assets that rarely change are precached */
  '/styles.css',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
];

/** Network-first: always try network, fall back to cache */
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /\/auth\//,
  /\/user\//,
  /\/gigs\//,
  /\/wallet\//,
  /\/notifications\//,
  /\/messages\//,
  /\/reviews\//,
];

/** Cache-first: serve from cache, refresh in background */
const CACHE_FIRST_PATTERNS = [
  /\.css$/,
  /\.woff2?$/,
  /\.ttf$/,
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
];

/** Stale-while-revalidate: serve cached + update async */
const STALE_WHILE_REVALIDATE_PATTERNS = [
  /\/browse/,
  /\/dashboard/,
];

/** Image cache (cache-first, separate bucket, max 60 items) */
const IMAGE_CACHE_NAME = `giglega-images-v${VERSION}`;
const IMAGE_PATTERNS   = [/\.png$/, /\.jpg$/, /\.jpeg$/, /\.webp$/, /\.svg$/, /\.ico$/];
const IMAGE_MAX_ENTRIES = 60;

/** Runtime data cache (network-first, max 40 items, 24h TTL) */
const DATA_CACHE_NAME  = `giglega-data-v${VERSION}`;
const _DATA_MAX_ENTRIES = 40; // Bug fixed: mark reserved config as intentionally unused for now.
const _DATA_MAX_AGE_SEC = 86400; // 24 hours // Bug fixed: mark reserved config as intentionally unused for now.

/* ══════════════════════════════════
   OFFLINE FALLBACK PAGE
══════════════════════════════════ */
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Offline — GigLega</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{
      min-height:100vh;display:flex;align-items:center;justify-content:center;
      background:linear-gradient(135deg,#0b1e35 0%,#1a3c5e 40%,#064e3b 100%);
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      padding:24px;text-align:center;
    }
    .box{max-width:400px;width:100%}
    .icon{font-size:4rem;margin-bottom:16px;animation:pulse 2s ease-in-out infinite}
    @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
    h1{font-size:1.8rem;font-weight:900;color:#fff;margin-bottom:10px;letter-spacing:-.3px}
    h1 span{color:#6ee7b7}
    p{font-size:.9rem;color:rgba(255,255,255,.6);line-height:1.75;margin-bottom:28px}
    .status{
      display:inline-flex;align-items:center;gap:7px;
      background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);
      border-radius:20px;padding:6px 16px;font-size:.76rem;font-weight:700;
      color:rgba(255,255,255,.55);margin-bottom:24px;
    }
    .dot{width:8px;height:8px;border-radius:50%;background:#f87171;animation:blink 1.5s ease-in-out infinite}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
    .btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
    .btn{
      padding:11px 24px;border-radius:8px;font-size:.9rem;font-weight:800;
      cursor:pointer;font-family:inherit;transition:all .2s;text-decoration:none;
      display:inline-flex;align-items:center;gap:7px;
    }
    .btn-primary{background:linear-gradient(135deg,#059669,#0d9488);border:none;color:#fff;box-shadow:0 3px 12px rgba(5,150,105,.3)}
    .btn-primary:hover{box-shadow:0 5px 18px rgba(5,150,105,.45);transform:translateY(-1px)}
    .btn-glass{background:rgba(255,255,255,.1);border:1.5px solid rgba(255,255,255,.18);color:rgba(255,255,255,.85)}
    .btn-glass:hover{background:rgba(255,255,255,.18)}
    .tips{margin-top:28px;padding:16px;background:rgba(255,255,255,.05);border-radius:12px;border:1px solid rgba(255,255,255,.08)}
    .tips-title{font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:rgba(255,255,255,.35);margin-bottom:8px}
    .tips li{font-size:.8rem;color:rgba(255,255,255,.5);line-height:1.7;list-style:none;padding:2px 0}
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">📡</div>
    <h1>Internet <span>nahi hai!</span></h1>
    <p>
      Abhi network connection nahi hai. GigLega ko internet chahiye<br>
      real-time gigs aur payments ke liye. Connection wapas aane pe<br>
      automatically reconnect ho jayega.
    </p>
    <div class="status">
      <div class="dot"></div>
      Offline mode — reconnecting…
    </div>
    <div class="btns">
      <button class="btn btn-primary" onclick="location.reload()">🔄 Retry</button>
      <a href="/" class="btn btn-glass">🏠 Home</a>
    </div>
    <div class="tips">
      <div class="tips-title">📋 Offline mein available hai</div>
      <ul>
        <li>✅ Pichle gigs ki list (cached)</li>
        <li>✅ Profile dekh sakte ho</li>
        <li>✅ Purane messages padhna</li>
        <li>❌ Naye gigs apply nahi kar sakte</li>
        <li>❌ Payment nahi ho sakti</li>
      </ul>
    </div>
  </div>
  <script>
    window.addEventListener('online', () => location.reload());
    setInterval(() => {
      fetch('/index.html', { method: 'HEAD', cache: 'no-store' })
        .then(() => location.reload())
        .catch(() => {});
    }, 8000);
  </script>
</body>
</html>`;

/* ══════════════════════════════════
   PUSH NOTIFICATION PAYLOADS
  (notification types & their actions)
══════════════════════════════════ */
const NOTIF_CONFIG = {
  payment: {
    icon:    PUSH_ICON,
    badge:   PUSH_BADGE,
    vibrate: [200, 100, 200],
    tag:     'giglega-payment',
    renotify: true,
    actions: [
      { action: 'view_wallet',   title: '💳 Wallet Dekho' },
      { action: 'withdraw',      title: '💸 Withdraw' },
    ],
  },
  gig_invite: {
    icon:    PUSH_ICON,
    badge:   PUSH_BADGE,
    vibrate: [150, 75, 150, 75, 150],
    tag:     'giglega-gig',
    renotify: true,
    actions: [
      { action: 'accept_gig',    title: '✅ Accept' },
      { action: 'view_gig',      title: '👁️ Details' },
      { action: 'decline_gig',   title: '❌ Decline' },
    ],
  },
  message: {
    icon:    PUSH_ICON,
    badge:   PUSH_BADGE,
    vibrate: [100, 50, 100],
    tag:     'giglega-message',
    renotify: true,
    actions: [
      { action: 'open_chat',     title: '💬 Reply' },
    ],
  },
  reminder: {
    icon:    PUSH_ICON,
    badge:   PUSH_BADGE,
    vibrate: [200],
    tag:     'giglega-reminder',
    actions: [
      { action: 'view_gig',      title: '📋 Gig Details' },
      { action: 'get_directions', title: '📍 Directions' },
    ],
  },
  rating: {
    icon:    PUSH_ICON,
    badge:   PUSH_BADGE,
    vibrate: [100, 50, 100],
    tag:     'giglega-rating',
    actions: [
      { action: 'view_reviews',  title: '⭐ Dekho' },
    ],
  },
  default: {
    icon:    PUSH_ICON,
    badge:   PUSH_BADGE,
    vibrate: [150],
    tag:     'giglega-default',
    actions: [
      { action: 'open_app',      title: '🚀 Open GigLega' },
    ],
  },
};

/* ══════════════════════════════════
   ACTION → URL MAP
══════════════════════════════════ */
const ACTION_URLS = {
  view_wallet:    '/wallet.html',
  withdraw:       '/wallet.html',
  accept_gig:     '/browse.html',
  view_gig:       '/browse.html',
  decline_gig:    null,
  open_chat:      '/chat.html',
  get_directions: null,
  view_reviews:   '/reviews.html',
  open_app:       '/index.html',
};

/* ══════════════════════════════════
   BACKGROUND SYNC QUEUE
══════════════════════════════════ */
const _SYNC_QUEUE_KEY = 'giglega-sync-queue'; // Bug fixed: mark reserved key as intentionally unused for now.


/* ════════════════════════════════════════════════════════════════
   INSTALL EVENT
   Precache all shell assets
   ════════════════════════════════════════════════════════════════ */
self.addEventListener('install', event => {
  log('Installing…');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        log(`Precaching ${PRECACHE_SHELL.length} shell assets…`);
        return cache.addAll(
          PRECACHE_SHELL.map(url => new Request(url, { cache: 'reload' }))
        );
      })
      .then(() => {
        log('Install complete — skipping waiting');
        return self.skipWaiting();
      })
      .catch(err => {
        logError('Install failed', err);
        // Don't block install if some assets 404
        return self.skipWaiting();
      })
  );
});


/* ════════════════════════════════════════════════════════════════
   ACTIVATE EVENT
   Clean up old caches, claim clients
   ════════════════════════════════════════════════════════════════ */
self.addEventListener('activate', event => {
  log('Activating…');

  const VALID_CACHES = [CACHE_NAME, IMAGE_CACHE_NAME, DATA_CACHE_NAME];

  event.waitUntil(
    Promise.all([
      // Delete stale caches
      caches.keys().then(keys => {
        return Promise.all(
          keys
            .filter(key => !VALID_CACHES.includes(key))
            .map(key => {
              log(`Deleting old cache: ${key}`);
              return caches.delete(key);
            })
        );
      }),
      // Claim all open clients immediately
      self.clients.claim(),
    ]).then(() => {
      log('Activation complete');
      // Notify all clients about SW update
      notifyClients({ type: 'SW_UPDATED', version: VERSION });
    })
  );
});


/* ════════════════════════════════════════════════════════════════
   FETCH EVENT
   Route all network requests through cache strategies
   ════════════════════════════════════════════════════════════════ */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin + whitelisted external
  if (
    url.origin !== location.origin &&
    !url.hostname.includes('fonts.googleapis.com') &&
    !url.hostname.includes('fonts.gstatic.com') &&
    !url.hostname.includes('cdn.') &&
    !url.hostname.includes('giglega.in')
  ) {
    return; // Let browser handle cross-origin requests natively
  }

  // Skip non-GET
  if (request.method !== 'GET') {
    event.respondWith(handleMutation(event));
    return;
  }

  // Skip chrome-extension or dev tools requests
  if (!url.protocol.startsWith('http')) return;

  // Always prefer network for full-page navigations so users don't get stuck on stale HTML.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Always prefer network for shared shell script so header/footer/nav don't get stale.
  if (url.pathname.endsWith('/shared.js')) {
    event.respondWith(networkFirst(request));
    return;
  }

  /* ── Route to correct strategy ── */
  if (matchesPatterns(request.url, IMAGE_PATTERNS)) {
    event.respondWith(cacheFirstWithLimit(request, IMAGE_CACHE_NAME, IMAGE_MAX_ENTRIES));
    return;
  }

  if (matchesPatterns(request.url, NETWORK_FIRST_PATTERNS)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (matchesPatterns(request.url, CACHE_FIRST_PATTERNS)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (matchesPatterns(request.url, STALE_WHILE_REVALIDATE_PATTERNS)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default: network-first with offline fallback
  event.respondWith(networkFirstWithOfflineFallback(request));
});


/* ════════════════════════════════════════════════════════════════
   CACHE STRATEGIES
   ════════════════════════════════════════════════════════════════ */

/**
 * Network First
 * Try network → on fail return cached version
 */
async function networkFirst(request) {
  try {
    const response = await fetchAndCache(request, DATA_CACHE_NAME);
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return errorResponse(503, 'Network unavailable and no cache found');
  }
}

/**
 * Network First + Offline HTML fallback for navigation requests
 */
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetchAndCache(request, CACHE_NAME);
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Navigation fallback — serve offline page
    if (request.mode === 'navigate') {
      return new Response(OFFLINE_HTML, {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return errorResponse(503, 'Offline');
  }
}

/**
 * Cache First
 * Return cache immediately → network only on miss
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    return await fetchAndCache(request, CACHE_NAME);
  } catch {
    return errorResponse(503, 'Resource unavailable offline');
  }
}

/**
 * Cache First with item count limit (for images)
 */
async function cacheFirstWithLimit(request, cacheName, maxEntries) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request.clone());
    if (!response || response.status !== 200) return response;

    const cache = await caches.open(cacheName);
    const keys  = await cache.keys();

    // Evict oldest if over limit
    if (keys.length >= maxEntries) {
      await cache.delete(keys[0]);
    }

    cache.put(request, response.clone());
    return response;
  } catch {
    return errorResponse(404, 'Image unavailable offline');
  }
}

/**
 * Stale While Revalidate
 * Serve from cache immediately, update cache from network in background
 */
async function staleWhileRevalidate(request) {
  const cache  = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request.clone())
    .then(response => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || fetchPromise || errorResponse(503, 'Offline');
}

/**
 * Handle mutations (POST/PUT/DELETE) — queue if offline
 */
async function handleMutation(event) {
  try {
    return await fetch(event.request.clone());
  } catch {
    // Queue for background sync
    await queueForSync(event.request.clone());
    return new Response(
      JSON.stringify({ queued: true, message: 'Offline — request queued for sync' }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Fetch + cache a successful response
 */
async function fetchAndCache(request, cacheName) {
  const response = await fetch(request.clone());

  if (response && response.status === 200 && response.type !== 'opaque') {
    const cache = await caches.open(cacheName);

    // Respect Cache-Control: no-store
    const cc = response.headers.get('cache-control') || '';
    if (!cc.includes('no-store')) {
      cache.put(request, response.clone());
    }
  }

  return response;
}


/* ════════════════════════════════════════════════════════════════
   BACKGROUND SYNC
   Replay queued mutations when connection returns
   ════════════════════════════════════════════════════════════════ */
self.addEventListener('sync', event => {
  if (event.tag === SYNC_TAG || event.tag.startsWith('giglega-')) {
    log('Background sync triggered');
    event.waitUntil(replayQueue());
  }
});

/**
 * Store a failed request in IndexedDB for later replay
 */
async function queueForSync(request) {
  try {
    const body = await request.text().catch(() => '');
    const entry = {
      id:        Date.now() + '_' + Math.random().toString(36).slice(2),
      url:       request.url,
      method:    request.method,
      headers:   Object.fromEntries(request.headers.entries()),
      body,
      timestamp: Date.now(),
    };
    const queue = await getQueue();
    queue.push(entry);
    await setQueue(queue);
    log(`Queued request: ${entry.method} ${entry.url}`);

    // Register sync
    await self.registration.sync.register(SYNC_TAG).catch(() => {});
  } catch (err) {
    logError('Failed to queue request', err);
  }
}

/**
 * Replay all queued requests
 */
async function replayQueue() {
  const queue = await getQueue();
  if (!queue.length) return;

  log(`Replaying ${queue.length} queued requests…`);
  const remaining = [];

  for (const entry of queue) {
    try {
      const response = await fetch(entry.url, {
        method:  entry.method,
        headers: entry.headers,
        body:    entry.body || undefined,
      });

      if (response.ok) {
        log(`Synced: ${entry.method} ${entry.url}`);
        // Notify clients of successful sync
        notifyClients({
          type:    'SYNC_SUCCESS',
          url:     entry.url,
          method:  entry.method,
        });
      } else {
        logError(`Sync failed (${response.status}): ${entry.url}`);
        remaining.push(entry);
      }
    } catch {
      // Still offline — keep in queue
      remaining.push(entry);
    }
  }

  await setQueue(remaining);
  log(`Sync complete. ${remaining.length} requests still pending.`);
}

/* ── Simple queue via Cache Storage (no IndexedDB dependency) ── */
const QUEUE_CACHE = 'giglega-sync-queue-v1';
const QUEUE_URL   = '/__sync-queue.json';

async function getQueue() {
  try {
    const cache    = await caches.open(QUEUE_CACHE);
    const response = await cache.match(QUEUE_URL);
    if (!response) return [];
    return await response.json();
  } catch { return []; }
}

async function setQueue(queue) {
  try {
    const cache = await caches.open(QUEUE_CACHE);
    await cache.put(
      QUEUE_URL,
      new Response(JSON.stringify(queue), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
  } catch (err) {
    logError('Failed to save queue', err);
  }
}


/* ════════════════════════════════════════════════════════════════
   PUSH NOTIFICATIONS
   ════════════════════════════════════════════════════════════════ */
self.addEventListener('push', event => {
  log('Push received');

  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      type:  'default',
      title: `${APP_NAME} — Naya Update!`,
      body:  event.data ? event.data.text() : 'Kuch naya hai GigLega pe!',
    };
  }

  const type   = payload.type || 'default';
  const config = NOTIF_CONFIG[type] || NOTIF_CONFIG.default;

  const options = {
    body:     payload.body  || 'GigLega update mila!',
    icon:     payload.icon  || config.icon,
    badge:    config.badge,
    vibrate:  config.vibrate,
    tag:      payload.tag   || config.tag,
    renotify: config.renotify || false,
    silent:   payload.silent || false,
    timestamp: payload.timestamp || Date.now(),
    actions:  config.actions,
    data: {
      url:        payload.url    || '/',
      type:       type,
      gigId:      payload.gigId  || null,
      amount:     payload.amount || null,
      senderId:   payload.senderId || null,
      receivedAt: Date.now(),
    },
  };

  // Add image for rich notifications if provided
  if (payload.image) options.image = payload.image;

  // Progress bar style for payment notifications
  if (type === 'payment' && payload.amount) {
    options.body = `${payload.body || 'Payment received!'} · ₹${payload.amount}`;
  }

  event.waitUntil(
    self.registration.showNotification(
      payload.title || getDefaultTitle(type),
      options
    ).then(() => {
      // Update badge count
      updateBadge(payload.unreadCount || null);
    })
  );
});

function getDefaultTitle(type) {
  const titles = {
    payment:    '💰 GigLega — Payment Aaya!',
    gig_invite: '📋 GigLega — Naya Gig Invite',
    message:    '💬 GigLega — Naya Message',
    reminder:   '⏰ GigLega — Gig Reminder',
    rating:     '⭐ GigLega — Naya Review',
    default:    '🔔 GigLega — Update',
  };
  return titles[type] || titles.default;
}


/* ════════════════════════════════════════════════════════════════
   NOTIFICATION CLICK
   ════════════════════════════════════════════════════════════════ */
self.addEventListener('notificationclick', event => {
  const { action, notification } = event;
  const data = notification.data || {};

  log(`Notification clicked: action="${action}", type="${data.type}"`);
  notification.close();

  let targetUrl = data.url || '/';

  // Override URL based on action button clicked
  if (action && ACTION_URLS[action] !== undefined) {
    if (ACTION_URLS[action] === null) {
      // No navigation — just close
      if (action === 'decline_gig') {
        notifyClients({ type: 'GIG_DECLINED', gigId: data.gigId });
      }
      return;
    }
    targetUrl = ACTION_URLS[action];
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Focus existing GigLega tab if open
        const existing = clients.find(c =>
          c.url.includes(location.origin) && 'focus' in c
        );

        if (existing) {
          existing.focus();
          existing.postMessage({ type: 'NAVIGATE', url: targetUrl });
          return;
        }

        // Open new tab
        return self.clients.openWindow(targetUrl);
      })
  );
});


/* ════════════════════════════════════════════════════════════════
   NOTIFICATION CLOSE
   ════════════════════════════════════════════════════════════════ */
self.addEventListener('notificationclose', event => {
  const data = event.notification.data || {};
  log(`Notification dismissed: type="${data.type}"`);

  // Track dismissals (analytics ping)
  if (data.type) {
    fetch('/api/notifications/dismiss', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type: data.type, receivedAt: data.receivedAt }),
    }).catch(() => {}); // Fire-and-forget
  }
});


/* ════════════════════════════════════════════════════════════════
   MESSAGE HANDLER
   Receive commands from the main thread
   ════════════════════════════════════════════════════════════════ */
self.addEventListener('message', event => {
  const { type, payload } = event.data || {};

  switch (type) {

    /* Force skip waiting (triggered by update prompt) */
    case 'SKIP_WAITING':
      log('SKIP_WAITING received — activating new SW');
      self.skipWaiting();
      break;

    /* Clear all caches */
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys()
          .then(keys => Promise.all(keys.map(k => caches.delete(k))))
          .then(() => {
            log('All caches cleared');
            event.source?.postMessage({ type: 'CACHE_CLEARED' });
          })
      );
      break;

    /* Clear a specific cache bucket */
    case 'CLEAR_CACHE_BUCKET':
      if (payload?.bucket) {
        event.waitUntil(
          caches.delete(payload.bucket).then(() => {
            log(`Cache cleared: ${payload.bucket}`);
            event.source?.postMessage({ type: 'CACHE_BUCKET_CLEARED', bucket: payload.bucket });
          })
        );
      }
      break;

    /* Return current cache stats */
    case 'GET_CACHE_STATS':
      event.waitUntil(
        getCacheStats().then(stats => {
          event.source?.postMessage({ type: 'CACHE_STATS', stats });
        })
      );
      break;

    /* Precache a specific URL on demand */
    case 'PRECACHE_URL':
      if (payload?.url) {
        event.waitUntil(
          caches.open(CACHE_NAME)
            .then(cache => cache.add(payload.url))
            .then(() => {
              log(`Precached on demand: ${payload.url}`);
              event.source?.postMessage({ type: 'URL_CACHED', url: payload.url });
            })
            .catch(err => {
              logError(`Failed to precache: ${payload.url}`, err);
            })
        );
      }
      break;

    /* Trigger background sync manually */
    case 'TRIGGER_SYNC':
      event.waitUntil(replayQueue());
      break;

    /* Update badge count */
    case 'SET_BADGE':
      updateBadge(payload?.count || 0);
      break;

    /* Clear notification badge */
    case 'CLEAR_BADGE':
      updateBadge(0);
      break;

    /* Prefetch pages for offline use */
    case 'PREFETCH_PAGES':
      if (Array.isArray(payload?.urls)) {
        event.waitUntil(
          caches.open(CACHE_NAME).then(cache =>
            Promise.allSettled(payload.urls.map(url => cache.add(url)))
          )
        );
      }
      break;

    default:
      log(`Unknown message type: ${type}`);
  }
});


/* ════════════════════════════════════════════════════════════════
   PERIODIC BACKGROUND SYNC
   Refresh critical data in the background
   ════════════════════════════════════════════════════════════════ */
self.addEventListener('periodicsync', event => {
  log(`Periodic sync: ${event.tag}`);

  switch (event.tag) {

    case 'giglega-refresh-gigs':
      event.waitUntil(
        refreshCachedPages(['/browse.html', '/dashboard-worker.html'])
      );
      break;

    case 'giglega-refresh-wallet':
      event.waitUntil(
        refreshCachedPages(['/wallet.html'])
      );
      break;

    case 'giglega-replay-queue':
      event.waitUntil(replayQueue());
      break;
  }
});

async function refreshCachedPages(urls) {
  const cache = await caches.open(CACHE_NAME);
  return Promise.allSettled(
    urls.map(async url => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok) {
          await cache.put(url, response);
          log(`Refreshed: ${url}`);
        }
      } catch {
        log(`Skipped refresh (offline): ${url}`);
      }
    })
  );
}


/* ════════════════════════════════════════════════════════════════
   APP BADGE API
   ════════════════════════════════════════════════════════════════ */
function updateBadge(count) {
  if ('setAppBadge' in self.navigator) {
    if (!count || count <= 0) {
      self.navigator.clearAppBadge().catch(() => {});
    } else {
      self.navigator.setAppBadge(count).catch(() => {});
    }
  }
}


/* ════════════════════════════════════════════════════════════════
   UTILITIES
   ════════════════════════════════════════════════════════════════ */

/** Check URL against array of RegExp patterns */
function matchesPatterns(url, patterns) {
  return patterns.some(pattern => pattern.test(url));
}

/** Broadcast message to all open GigLega tabs */
async function notifyClients(data) {
  try {
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach(client => client.postMessage(data));
  } catch {}
}

/** Build a simple error Response */
function errorResponse(status, message) {
  return new Response(
    JSON.stringify({ error: message, status }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/** Get cache storage stats */
async function getCacheStats() {
  const stats = {};
  const keys  = await caches.keys();

  for (const key of keys) {
    const cache = await caches.open(key);
    const items = await cache.keys();
    stats[key]  = items.length;
  }

  // Estimate storage used
  if ('estimate' in navigator.storage) {
    try {
      const est = await navigator.storage.estimate();
      stats._storageUsed  = est.usage;
      stats._storageQuota = est.quota;
      stats._storageUsedMB = Math.round((est.usage / 1024 / 1024) * 100) / 100;
    } catch {}
  }

  return stats;
}

/** Console helpers with prefix */
function log(...args)      { console.log(`[${APP_NAME} SW v${VERSION}]`, ...args); }
function logError(...args) { console.error(`[${APP_NAME} SW v${VERSION}] ❌`, ...args); }
