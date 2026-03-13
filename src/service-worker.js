var CACHE_NAME    = "giglega-v1";
var OFFLINE_PAGE  = "/404.html";

/* ── Pages & assets to cache on install ── */
var PRECACHE = [
  "/",
  "/index.html",
  "/browse.html",
  "/post-gig.html",
  "/login.html",
  "/profile.html",
  "/dashboard-client.html",
  "/dashboard-worker.html",
  "/wallet.html",
  "/notifications.html",
  "/about.html",
  "/help-center.html",
  "/contact.html",
  "/404.html",
  "/styles.css",
  "/shared.js",
  "/manifest.json",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png"
];

/* ══════════════════════════════
   INSTALL — cache all core files
══════════════════════════════ */
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* ══════════════════════════════
   ACTIVATE — delete old caches
══════════════════════════════ */
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) { return k !== CACHE_NAME; })
          .map(function (k)   { return caches.delete(k);  })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ══════════════════════════════
   FETCH — Cache First, then Network
══════════════════════════════ */
self.addEventListener("fetch", function (e) {
  /* Skip non-GET and chrome-extension requests */
  if (e.request.method !== "GET") return;
  if (e.request.url.startsWith("chrome-extension://")) return;

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;

      /* Not in cache — fetch from network */
      return fetch(e.request).then(function (response) {
        /* Cache valid responses dynamically */
        if (response && response.status === 200 && response.type === "basic") {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function () {
        /* Offline fallback — show 404 page */
        return caches.match(OFFLINE_PAGE);
      });
    })
  );
});

/* ══════════════════════════════
   PUSH — Show notification
   (ready for when you add backend)
══════════════════════════════ */
self.addEventListener("push", function (e) {
  var data = e.data ? e.data.json() : {};
  var title   = data.title   || "GigLega";
  var options = {
    body:    data.body    || "You have a new notification.",
    icon:    data.icon    || "/assets/icons/icon-192.png",
    badge:   data.badge   || "/assets/icons/icon-72.png",
    data:    { url: data.url || "/" },
    actions: data.actions || [
      { action: "open",    title: "Open App" },
      { action: "dismiss", title: "Dismiss"  }
    ]
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

/* ══════════════════════════════
   NOTIFICATION CLICK
══════════════════════════════ */
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  if (e.action === "dismiss") return;
  var url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url === url && "focus" in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
