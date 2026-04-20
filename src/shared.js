/* CACHE BUSTER v1.3.0 */
(function(){
  const APP_BUILD = '1.9.0';
  const stored = localStorage.getItem('gl_app_build');
  if (stored !== APP_BUILD) {
    localStorage.setItem('gl_app_build', APP_BUILD);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        if (regs.length) {
          Promise.all(regs.map(r => r.unregister())).then(() => {
            caches.keys().then(keys => {
              Promise.all(keys.map(k => caches.delete(k))).then(() => window.location.reload());
            });
          });
        }
      });
    }
  }
})();

/* ============================================================
   GigLega v1.3 — shared.js
   Foundation: config, auth, navbar, footer, toast
   ============================================================ */

(function (global) {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     0. FONT — Inter via Google Fonts
  ══════════════════════════════════════════════════════════ */
  (function injectFonts() {
    if (document.querySelector('link[data-gl-fonts]')) return;
    const pc = document.createElement('link');
    pc.rel = 'preconnect'; pc.href = 'https://fonts.googleapis.com';
    document.head.insertBefore(pc, document.head.firstChild);
    const pc2 = document.createElement('link');
    pc2.rel = 'preconnect'; pc2.href = 'https://fonts.gstatic.com'; pc2.crossOrigin = 'anonymous';
    document.head.insertBefore(pc2, document.head.firstChild);
    const fl = document.createElement('link');
    fl.rel = 'stylesheet';
    fl.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    fl.setAttribute('data-gl-fonts', '1');
    document.head.appendChild(fl);
  })();

  /* ══════════════════════════════════════════════════════════
     1. CONSTANTS
  ══════════════════════════════════════════════════════════ */
  const FEE_RATE = 0.10;

  const GL = {
    VERSION:   '1.3',
    APP_NAME:  'GigLega',
    TAGLINE:   "Gurugram's Trusted Gig Marketplace",
    FEE_RATE,

    STORAGE_KEY_THEME:  'gl_theme',
    STORAGE_KEY_BUILD:  'gl_app_build',

    PUBLIC_NAV: [
      { label: 'Browse Gigs',  href: 'browse.html',     iconKey: 'search' },
      { label: 'How It Works', href: 'about.html',      iconKey: 'info' },
      { label: 'Enterprise',   href: 'enterprise.html', iconKey: 'building' }
    ],

    PROTECTED_PAGES: [
      'post-gig.html', 'gig-edit.html',
      'dashboard.html', 'dashboard-worker.html', 'dashboard-client.html',
      'chat.html', 'profile.html', 'wallet.html',
      'notifications.html', 'reviews.html', 'admin.html'
    ]
  };

  global.GL = GL;
  global.FEE_RATE = FEE_RATE;

  /* ══════════════════════════════════════════════════════════
     2. CURRENCY
  ══════════════════════════════════════════════════════════ */
  function formatINR(paise) {
    return '\u20B9' + (Number(paise || 0) / 100).toLocaleString('en-IN');
  }
  global.formatINR = formatINR;
  global.formatCurrency = formatINR;

  /* ══════════════════════════════════════════════════════════
     3. AUTH HELPERS — Firebase Auth based, no localStorage for user data
  ══════════════════════════════════════════════════════════ */

  let _cachedFirebaseUser = null;

  function redirectByRole(role) {
    const map = {
      worker:     'dashboard-worker.html',
      tasker:     'dashboard-worker.html',
      poster:     'dashboard-client.html',
      client:     'dashboard-client.html',
      admin:      'admin.html',
      enterprise: 'enterprise.html'
    };
    window.location.href = map[role] || 'dashboard-client.html';
  }
  global.redirectByRole = redirectByRole;

  function logoutUser() {
    showToast('Logged out successfully.', 'success');
    try {
      import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')
        .then(m => {
          return import('./firebase-config.js').then(fb => m.signOut(fb.auth));
        })
        .catch(e => console.error('[GigLega] signOut:', e));
    } catch (e) { console.error('[GigLega] logoutUser:', e); }
    setTimeout(() => { window.location.href = 'index.html'; }, 900);
  }
  global.logoutUser = logoutUser;

  function requireAuth() {
    document.addEventListener('DOMContentLoaded', () => {
      import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')
        .then(m => import('./firebase-config.js').then(fb => {
          m.onAuthStateChanged(fb.auth, user => {
            if (!user) {
              const page = window.location.pathname.split('/').pop() || 'index.html';
              window.location.href = 'login.html?redirect=' + encodeURIComponent(page);
            }
          });
        }))
        .catch(e => console.error('[GigLega] requireAuth:', e));
    });
  }
  global.requireAuth = requireAuth;

  /* ══════════════════════════════════════════════════════════
     4. THEME (DARK / LIGHT)
  ══════════════════════════════════════════════════════════ */
  function getTheme() {
    return localStorage.getItem(GL.STORAGE_KEY_THEME) || 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(GL.STORAGE_KEY_THEME, theme);
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.innerHTML = theme === 'dark'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
  }

  function toggleTheme() {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  global.toggleTheme = toggleTheme;
  global.applyTheme  = applyTheme;

  /* ══════════════════════════════════════════════════════════
     5. TOAST NOTIFICATIONS
  ══════════════════════════════════════════════════════════ */
  const TOAST_ICONS = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
  };

  function showToast(message, type, duration) {
    type     = type     || 'info';
    duration = duration || 3000;

    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML =
      '<span class="toast-icon">' + (TOAST_ICONS[type] || TOAST_ICONS.info) + '</span>' +
      '<span class="toast-msg">'  + escHtml(String(message)) + '</span>' +
      '<button class="toast-close" aria-label="Close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';

    toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(toast));
    container.appendChild(toast);

    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));

    const timer = setTimeout(() => dismissToast(toast), duration);
    toast._timer = timer;
  }

  function dismissToast(toast) {
    clearTimeout(toast._timer);
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
  }

  global.showToast = showToast;

  /* ══════════════════════════════════════════════════════════
     6. SPINNER
  ══════════════════════════════════════════════════════════ */
  function showSpinner() {
    let s = document.getElementById('gl-spinner-overlay');
    if (!s) {
      s = document.createElement('div');
      s.id = 'gl-spinner-overlay';
      s.innerHTML = '<div class="gl-spinner"></div>';
      document.body.appendChild(s);
    }
    s.style.display = 'flex';
  }

  function hideSpinner() {
    const s = document.getElementById('gl-spinner-overlay');
    if (s) s.style.display = 'none';
  }

  global.showSpinner = showSpinner;
  global.hideSpinner = hideSpinner;
  global.showPageLoader = showSpinner;
  global.hidePageLoader = hideSpinner;

  /* ══════════════════════════════════════════════════════════
     7. ICONS
  ══════════════════════════════════════════════════════════ */
  const ICONS = {
    search:      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
    info:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    building:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/></svg>',
    zap:         '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    clipboard:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>',
    user:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    message:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    wallet:      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h2v-4h-2z"/></svg>',
    bell:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    star:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    help:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
    logout:      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    login:       '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
    'user-plus': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
    plus:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    home:        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    'search-lg': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
    'zap-lg':    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    'user-lg':   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    'plus-lg':   '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    grid:        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'
  };

  /* ══════════════════════════════════════════════════════════
     8. NAVBAR
  ══════════════════════════════════════════════════════════ */

  function dropdownItem(iconKey, label, href, currentPage) {
    const active = (currentPage === href) ? ' style="background:rgba(26,143,160,.1);color:var(--primary)"' : '';
    const ico = ICONS[iconKey] || '';
    return '<a href="' + href + '" class="nav-dd-item" role="menuitem"' + active + '>' +
             '<span class="nav-dd-icon">' + ico + '</span>' +
             '<span>' + label + '</span>' +
           '</a>';
  }

  function renderNav() {
    const el = document.getElementById('main-nav');
    if (!el) return;

    if (!document.getElementById('gl-skip-link')) {
      const skip = document.createElement('a');
      skip.id = 'gl-skip-link';
      skip.href = '#main-content';
      skip.className = 'sr-only-focusable';
      skip.textContent = 'Skip to content';
      document.body.insertBefore(skip, document.body.firstChild);
    }

    const theme = getTheme();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    const pubLinks = GL.PUBLIC_NAV.map(link => {
      const active = (currentPage === link.href) ? ' active' : '';
      const ico = ICONS[link.iconKey] || '';
      return '<a href="' + link.href + '" class="nav-link' + active + '">' +
               '<span class="nav-link-icon">' + ico + '</span> ' + link.label +
             '</a>';
    }).join('');

    const themeIconSun = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    const themeIconMoon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

    el.className = 'main-nav';
    el.innerHTML =
      '<div class="nav-inner">' +
        '<a href="index.html" class="nav-logo" aria-label="GigLega Home">Gig<span>Lega</span></a>' +
        '<div class="nav-links" id="navLinks">' + pubLinks + '</div>' +
        '<div class="nav-right">' +
          '<button class="nav-icon-btn" id="themeToggle" aria-label="Toggle theme" title="Toggle theme">' +
            (theme === 'dark' ? themeIconSun : themeIconMoon) +
          '</button>' +
          '<div id="nav-auth-section">' +
            '<a href="login.html" class="btn btn-ghost nav-btn-login">' + ICONS.login + ' Login</a>' +
            '<a href="login.html#mode=register" class="btn btn-primary nav-btn-signup">' + ICONS['user-plus'] + ' Join Free</a>' +
          '</div>' +
        '</div>' +
        '<button class="nav-hamburger" id="navHamburger" aria-label="Toggle menu" aria-expanded="false">' +
          '<span></span><span></span><span></span>' +
        '</button>' +
      '</div>' +
      '<div class="nav-mobile-menu" id="navMobileMenu" aria-hidden="true">' +
        pubLinks +
        '<div class="nav-mobile-divider"></div>' +
        '<a href="login.html" class="nav-mobile-link" id="mobileLoginLink">Login</a>' +
        '<a href="login.html#mode=register" class="nav-mobile-link" id="mobileRegisterLink">Register Free</a>' +
        '<button class="nav-mobile-link nav-mobile-logout" id="mobileLogoutBtn" style="display:none">Logout</button>' +
      '</div>';

    bindNavEvents();

    try {
      Promise.all([
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js'),
        import('./firebase-config.js')
      ]).then(([authMod, fsMod, fb]) => {
        authMod.onAuthStateChanged(fb.auth, async user => {
          const authSection = document.getElementById('nav-auth-section');
          const mobileLogin = document.getElementById('mobileLoginLink');
          const mobileReg   = document.getElementById('mobileRegisterLink');
          const mobileOut   = document.getElementById('mobileLogoutBtn');
          if (!user) {
            if (authSection) {
              authSection.innerHTML =
                '<a href="login.html" class="btn btn-ghost nav-btn-login">' + ICONS.login + ' Login</a>' +
                '<a href="login.html#mode=register" class="btn btn-primary nav-btn-signup">' + ICONS['user-plus'] + ' Join Free</a>';
            }
            return;
          }
          let userData = {};
          try {
            const snap = await fsMod.getDoc(fsMod.doc(fb.db, 'users', user.uid));
            if (snap.exists()) userData = snap.data();
          } catch (e) { console.error('[GigLega] nav user fetch:', e); }

          const role = userData.role || 'poster';
          const name = userData.name || user.displayName || 'User';
          const isVerified = userData.aadhaarVerified === true;
          const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

          const dashLink = role === 'worker' || role === 'tasker'
            ? 'dashboard-worker.html'
            : role === 'admin' ? 'admin.html'
            : role === 'enterprise' ? 'enterprise.html'
            : 'dashboard-client.html';

          const dashLabel = role === 'worker' || role === 'tasker' ? 'Worker Dashboard'
            : role === 'admin' ? 'Admin Panel'
            : role === 'enterprise' ? 'Enterprise Dashboard'
            : 'Poster Dashboard';

          const verifiedBadge = isVerified
            ? '<span class="verified-badge" title="Aadhaar Verified">Verified</span>'
            : '';

          if (authSection) {
            authSection.innerHTML =
              '<a href="post-gig.html" class="btn btn-primary nav-post-btn">' + ICONS.plus + ' Post Gig</a>' +
              '<div class="nav-user-menu" id="navUserMenu">' +
                '<button class="nav-avatar-btn" id="navAvatarBtn" aria-expanded="false" aria-haspopup="true">' +
                  '<div class="nav-avatar">' + initials + '</div>' +
                  '<span class="nav-username">' + escHtml(name.split(' ')[0]) + '</span>' +
                  '<span class="nav-chevron">&#9660;</span>' +
                '</button>' +
                '<div class="nav-dropdown" id="navDropdown" role="menu">' +
                  '<div class="nav-dropdown-header">' +
                    '<div class="nav-dropdown-name">' + escHtml(name) + verifiedBadge + '</div>' +
                    '<div class="nav-dropdown-email">' + escHtml(user.email || '') + '</div>' +
                  '</div>' +
                  '<div class="nav-dropdown-divider"></div>' +
                  dropdownItem('zap', dashLabel, dashLink, currentPage) +
                  dropdownItem('user', 'My Profile', 'profile.html', currentPage) +
                  dropdownItem('message', 'My Chats', 'chat.html', currentPage) +
                  '<div class="nav-dropdown-divider"></div>' +
                  dropdownItem('search', 'Browse Gigs', 'browse.html', currentPage) +
                  dropdownItem('plus', 'Post a Gig', 'post-gig.html', currentPage) +
                  '<div class="nav-dropdown-divider"></div>' +
                  dropdownItem('wallet', 'My Wallet', 'wallet.html', currentPage) +
                  '<a href="notifications.html" class="nav-dd-item" role="menuitem">' +
                    '<span class="nav-dd-icon">' + ICONS.bell + '</span>' +
                    '<span>Notifications</span>' +
                    '<span class="dd-badge" id="navNotifBadge" style="display:none"></span>' +
                  '</a>' +
                  dropdownItem('star', 'My Reviews', 'reviews.html', currentPage) +
                  dropdownItem('help', 'Help Center', 'help-center.html', currentPage) +
                  '<div class="nav-dropdown-divider"></div>' +
                  '<button class="nav-dd-item nav-dd-logout" id="navLogoutBtn" role="menuitem">' +
                    '<span class="nav-dd-icon">' + ICONS.logout + '</span><span>Logout</span>' +
                  '</button>' +
                '</div>' +
              '</div>';
          }

          if (mobileLogin) mobileLogin.style.display = 'none';
          if (mobileReg)   mobileReg.style.display   = 'none';
          if (mobileOut)   mobileOut.style.display    = '';

          const avatarBtn = document.getElementById('navAvatarBtn');
          const dropdown  = document.getElementById('navDropdown');
          if (avatarBtn && dropdown) {
            avatarBtn.addEventListener('click', e => {
              e.stopPropagation();
              const isOpen = dropdown.classList.contains('open');
              dropdown.classList.toggle('open', !isOpen);
              avatarBtn.setAttribute('aria-expanded', String(!isOpen));
            });
          }
          document.addEventListener('click', () => {
            if (dropdown) dropdown.classList.remove('open');
            if (avatarBtn) avatarBtn.setAttribute('aria-expanded', 'false');
          }, { once: false });

          const logoutBtn = document.getElementById('navLogoutBtn');
          if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);

          startNotifBadgeListener(user.uid, fb.db, fsMod);
        });
      }).catch(e => console.error('[GigLega] nav auth init:', e));
    } catch (e) { console.error('[GigLega] nav init:', e); }
  }

  function bindNavEvents() {
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => { toggleTheme(); renderNav(); renderFooter(); });
    }

    const hamburger  = document.getElementById('navHamburger');
    const mobileMenu = document.getElementById('navMobileMenu');
    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = mobileMenu.classList.contains('open');
        mobileMenu.classList.toggle('open', !isOpen);
        hamburger.classList.toggle('open', !isOpen);
        hamburger.setAttribute('aria-expanded', String(!isOpen));
        mobileMenu.setAttribute('aria-hidden', String(isOpen));
      });
      document.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
      });
      mobileMenu.addEventListener('click', e => e.stopPropagation());
    }

    const mobileLogout = document.getElementById('mobileLogoutBtn');
    if (mobileLogout) mobileLogout.addEventListener('click', logoutUser);
  }

  /* ══════════════════════════════════════════════════════════
     9. BOTTOM MOBILE NAV
  ══════════════════════════════════════════════════════════ */
  function renderBottomNav() {
    if (document.getElementById('gl-bottom-nav')) return;

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    function bnTab(iconKey, label, href) {
      const active = (currentPage === href) ? ' bn-active' : '';
      return '<a href="' + href + '" class="bn-tab' + active + '" aria-label="' + label + '">' +
               '<span class="bn-icon">' + (ICONS[iconKey] || '') + '</span>' +
               '<span class="bn-label">' + label + '</span>' +
             '</a>';
    }

    const nav = document.createElement('nav');
    nav.id = 'gl-bottom-nav';
    nav.className = 'gl-bottom-nav';
    nav.setAttribute('aria-label', 'Main navigation');
    nav.innerHTML =
      bnTab('home', 'Home', 'index.html') +
      bnTab('search-lg', 'Browse', 'browse.html') +
      '<a href="post-gig.html" class="bn-tab bn-post" aria-label="Post Gig">' +
        '<span class="bn-post-fab">' + ICONS['plus-lg'] + '</span>' +
        '<span class="bn-label">Post</span>' +
      '</a>' +
      '<a href="dashboard-client.html" class="bn-tab' + (currentPage === 'dashboard-client.html' || currentPage === 'dashboard-worker.html' ? ' bn-active' : '') + '" aria-label="Dashboard">' +
        '<span class="bn-icon">' + ICONS['grid'] + '</span>' +
        '<span class="bn-label">Dashboard</span>' +
      '</a>' +
      '<a href="profile.html" class="bn-tab' + (currentPage === 'profile.html' ? ' bn-active' : '') + '" aria-label="Profile">' +
        '<span class="bn-icon" style="position:relative">' + ICONS['user-lg'] + '<span class="bn-badge" id="bnNotifBadge" style="display:none"></span></span>' +
        '<span class="bn-label">Profile</span>' +
      '</a>';

    document.body.appendChild(nav);
  }

  /* ══════════════════════════════════════════════════════════
     10. FOOTER
  ══════════════════════════════════════════════════════════ */
  function renderFooter() {
    const el = document.getElementById('main-footer');
    if (!el) return;
    el.className = 'main-footer';
    el.innerHTML =
      '<div class="footer-inner">' +
        '<div class="footer-brand">' +
          '<a href="index.html" class="footer-logo">Gig<span>Lega</span></a>' +
          '<p class="footer-tagline">' + GL.TAGLINE + '</p>' +
          '<p class="footer-city">Gurugram, Haryana</p>' +
        '</div>' +
        '<div class="footer-links">' +
          '<div class="footer-col">' +
            '<div class="footer-col-title">Platform</div>' +
            '<a href="browse.html">Browse Gigs</a>' +
            '<a href="post-gig.html">Post a Gig</a>' +
            '<a href="dashboard-worker.html">Worker Dashboard</a>' +
            '<a href="dashboard-client.html">Poster Dashboard</a>' +
          '</div>' +
          '<div class="footer-col">' +
            '<div class="footer-col-title">Company</div>' +
            '<a href="about.html">About Us</a>' +
            '<a href="enterprise.html">Enterprise</a>' +
            '<a href="trust-safety.html">Trust &amp; Safety</a>' +
            '<a href="contact.html">Contact</a>' +
          '</div>' +
          '<div class="footer-col">' +
            '<div class="footer-col-title">Legal &amp; Support</div>' +
            '<a href="help-center.html">Help Center</a>' +
            '<a href="faq.html">FAQ</a>' +
            '<a href="privacy-policy.html">Privacy Policy</a>' +
            '<a href="terms.html">Terms of Service</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="footer-bottom">' +
        '<span>&copy; 2026 GigLega. Built for Gurugram.</span>' +
        '<span><a href="https://wa.me/919319635257" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline">WhatsApp Support</a></span>' +
      '</div>';
  }

  /* ══════════════════════════════════════════════════════════
     11. NOTIFICATION BADGE (Firestore)
  ══════════════════════════════════════════════════════════ */
  let _unsubNotif = null;

  function startNotifBadgeListener(uid, db, fsMod) {
    if (_unsubNotif) { try { _unsubNotif(); } catch (_) {} _unsubNotif = null; }
    try {
      const q = fsMod.query(
        fsMod.collection(db, 'notifications', uid, 'items'),
        fsMod.where('read', '==', false),
        fsMod.limit(50)
      );
      _unsubNotif = fsMod.onSnapshot(q, snap => {
        const count = snap.size;
        document.querySelectorAll('#navNotifBadge, #bnNotifBadge, .nav-notif-badge, .dd-badge').forEach(el => {
          el.textContent = count > 9 ? '9+' : String(count);
          el.style.display = count > 0 ? '' : 'none';
        });
      }, e => console.warn('[GigLega] notif badge:', e.message));
    } catch (e) { console.warn('[GigLega] startNotifBadgeListener:', e); }
  }

  global.startNotifBadgeListener = startNotifBadgeListener;

  /* ══════════════════════════════════════════════════════════
     12. UTILITY HELPERS
  ══════════════════════════════════════════════════════════ */
  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function timeAgo(isoStrOrTimestamp) {
    let ms;
    if (isoStrOrTimestamp && typeof isoStrOrTimestamp.toDate === 'function') {
      ms = isoStrOrTimestamp.toDate().getTime();
    } else {
      ms = new Date(isoStrOrTimestamp).getTime();
    }
    const diff = Math.floor((Date.now() - ms) / 1000);
    if (diff < 60)    return diff + 's ago';
    if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function generateId(prefix) {
    return (prefix || 'id') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function renderStars(rating) {
    const full  = Math.floor(rating || 0);
    const empty = 5 - full;
    let html = '';
    for (let i = 0; i < full;  i++) html += '<span class="star-filled" aria-hidden="true">&#9733;</span>';
    for (let i = 0; i < empty; i++) html += '<span class="star-empty" aria-hidden="true">&#9734;</span>';
    return '<span class="star-rating" aria-label="Rating: ' + (rating || 0) + ' out of 5">' + html + '</span>';
  }

  function verifiedBadgeHTML(isVerified) {
    if (!isVerified) return '';
    return '<span class="verified-badge" title="Aadhaar Verified">Verified &#10003;</span>';
  }

  global.escHtml          = escHtml;
  global.timeAgo          = timeAgo;
  global.getParam         = getParam;
  global.generateId       = generateId;
  global.renderStars      = renderStars;
  global.verifiedBadgeHTML = verifiedBadgeHTML;

  /* ══════════════════════════════════════════════════════════
     13. BREADCRUMB
  ══════════════════════════════════════════════════════════ */
  function buildBreadcrumb(elementId, items) {
    const el = document.getElementById(elementId);
    if (!el || !items || !items.length) return;
    el.className = 'breadcrumb';
    let html = '<ol class="breadcrumb-list" itemscope itemtype="https://schema.org/BreadcrumbList">';
    items.forEach((item, i) => {
      const isLast = i === items.length - 1;
      html +=
        '<li class="breadcrumb-item' + (isLast ? ' active' : '') + '" ' +
          'itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">' +
          (isLast
            ? '<span itemprop="name">' + escHtml(item.label) + '</span>'
            : '<a href="' + item.href + '" itemprop="item"><span itemprop="name">' + escHtml(item.label) + '</span></a>' +
              '<span class="breadcrumb-sep" aria-hidden="true">&rsaquo;</span>'
          ) +
          '<meta itemprop="position" content="' + (i + 1) + '" />' +
        '</li>';
    });
    html += '</ol>';
    el.innerHTML = html;
  }
  global.buildBreadcrumb = buildBreadcrumb;

  /* ══════════════════════════════════════════════════════════
     14. AUTO-INIT
  ══════════════════════════════════════════════════════════ */
  function init() {
    applyTheme(getTheme());
    renderNav();
    renderFooter();
    renderBottomNav();
    hideSpinner();
    injectSharedStyles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ══════════════════════════════════════════════════════════
     15. SHARED STYLES
  ══════════════════════════════════════════════════════════ */
  function injectSharedStyles() {
    if (document.getElementById('gl-shared-styles')) return;
    const style = document.createElement('style');
    style.id = 'gl-shared-styles';
    style.textContent = [
      ':root{--primary:#1a8fa0;--accent:#6366f1;--bg:#0d1117;--surface:#161b22;--card-bg:#161b22;--border:rgba(255,255,255,0.10);--text:#e6edf3;--text-muted:#8b949e;--success:#3fb950;--warning:#d29922;--danger:#f85149;--radius:12px;--shadow:0 4px 24px rgba(0,0,0,0.4);font-family:Inter,system-ui,sans-serif}',
      'body{background:var(--bg);color:var(--text);font-family:Inter,system-ui,sans-serif;margin:0}',
      /* Verified badge */
      '.verified-badge{display:inline-block;background:rgba(63,185,80,.15);color:var(--success);border:1px solid rgba(63,185,80,.3);border-radius:4px;font-size:.7rem;font-weight:700;padding:1px 6px;margin-left:4px;vertical-align:middle;letter-spacing:.3px}',
      /* Star rating */
      '.star-filled{color:#d29922}.star-empty{color:var(--text-muted)}',
      /* Toast */
      '#toast-container{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none}',
      '.toast{display:flex;align-items:center;gap:12px;padding:13px 18px;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.22);font-size:.9rem;font-weight:600;color:#fff;max-width:420px;width:calc(100% - 32px);pointer-events:all;opacity:0;transform:translateY(14px) scale(.97);transition:opacity .28s cubic-bezier(.34,1.56,.64,1),transform .28s cubic-bezier(.34,1.56,.64,1)}',
      '.toast.show{opacity:1;transform:translateY(0) scale(1)}.toast.hide{opacity:0;transform:scale(.94)}',
      '.toast-success{background:linear-gradient(135deg,#059669,#047857)}',
      '.toast-error{background:linear-gradient(135deg,#dc2626,#b91c1c)}',
      '.toast-warning{background:linear-gradient(135deg,#d97706,#b45309)}',
      '.toast-info{background:linear-gradient(135deg,#1a3c5e,#0f2a42)}',
      '.toast-icon{flex-shrink:0;font-size:1.1rem}.toast-msg{flex:1;line-height:1.45}',
      '.toast-close{background:rgba(255,255,255,.2);border:none;cursor:pointer;color:#fff;padding:3px 7px;line-height:1;margin-left:4px;border-radius:5px;font-size:.8rem}',
      /* Spinner */
      '#gl-spinner-overlay{position:fixed;inset:0;background:rgba(13,17,23,.6);z-index:99999;display:none;align-items:center;justify-content:center}',
      '.gl-spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:gl-spin .8s linear infinite}',
      '@keyframes gl-spin{to{transform:rotate(360deg)}}',
      /* Navbar */
      '.main-nav{background:var(--surface);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:1000;box-shadow:0 2px 12px rgba(0,0,0,.3)}',
      '.nav-inner{max-width:1200px;margin:0 auto;padding:0 20px;height:62px;display:flex;align-items:center;gap:20px}',
      '.nav-logo{font-size:1.4rem;font-weight:900;letter-spacing:-1px;color:var(--primary);text-decoration:none;flex-shrink:0}',
      '.nav-logo span{color:var(--accent)}',
      '.nav-links{display:flex;align-items:center;gap:4px;flex:1}',
      '.nav-link{padding:8px 12px;border-radius:8px;font-size:.86rem;font-weight:600;color:var(--text-muted);text-decoration:none;transition:all .2s;white-space:nowrap}',
      '.nav-link:hover,.nav-link.active{color:var(--primary);background:rgba(26,143,160,.1)}',
      '.nav-right{display:flex;align-items:center;gap:10px;flex-shrink:0}',
      '.nav-icon-btn{background:none;border:1px solid var(--border);border-radius:8px;width:36px;height:36px;cursor:pointer;color:var(--text);display:flex;align-items:center;justify-content:center;transition:all .2s}',
      '.nav-icon-btn:hover{border-color:var(--primary)}',
      '.btn{display:inline-flex;align-items:center;gap:6px;padding:12px 24px;border-radius:8px;font-weight:600;font-size:.9rem;cursor:pointer;border:none;text-decoration:none;transition:all .2s}',
      '.btn-primary{background:var(--primary);color:#fff}.btn-primary:hover{opacity:.9}',
      '.btn-ghost{background:transparent;border:1px solid var(--border);color:var(--text)}.btn-ghost:hover{border-color:var(--primary);color:var(--primary)}',
      '.nav-btn-login,.nav-btn-signup,.nav-post-btn{font-size:.84rem;padding:8px 16px}',
      '.nav-user-menu{position:relative}',
      '.nav-avatar-btn{display:flex;align-items:center;gap:8px;background:none;border:1px solid var(--border);border-radius:10px;padding:6px 12px 6px 6px;cursor:pointer;transition:all .2s;color:var(--text)}',
      '.nav-avatar-btn:hover{border-color:var(--primary)}',
      '.nav-avatar{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:800;flex-shrink:0}',
      '.nav-username{font-size:.84rem;font-weight:700;color:var(--text);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.nav-chevron{font-size:.7rem;color:var(--text-muted)}',
      '.nav-notif-badge,.dd-badge{background:var(--danger);color:#fff;font-size:.65rem;font-weight:800;border-radius:10px;padding:1px 6px;min-width:18px;text-align:center}',
      '.nav-dropdown{position:absolute;top:calc(100% + 10px);right:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);min-width:220px;padding:6px;z-index:2000;opacity:0;visibility:hidden;transform:translateY(-8px);transition:all .2s}',
      '.nav-dropdown.open{opacity:1;visibility:visible;transform:translateY(0)}',
      '.nav-dropdown-header{padding:10px 12px 8px}',
      '.nav-dropdown-name{font-weight:800;font-size:.9rem;color:var(--text)}',
      '.nav-dropdown-email{font-size:.74rem;color:var(--text-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.nav-dropdown-divider{height:1px;background:var(--border);margin:4px 0}',
      '.nav-dd-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;font-size:.86rem;font-weight:600;color:var(--text);text-decoration:none;cursor:pointer;transition:all .15s;background:none;border:none;width:100%;text-align:left}',
      '.nav-dd-item:hover{background:rgba(26,143,160,.1);color:var(--primary)}',
      '.nav-dd-icon{width:20px;text-align:center;flex-shrink:0}',
      '.nav-dd-logout{color:var(--danger)}.nav-dd-logout:hover{background:rgba(248,81,73,.07);color:var(--danger)}',
      '.nav-hamburger{display:none;flex-direction:column;gap:5px;background:none;border:1px solid var(--border);border-radius:8px;padding:8px;cursor:pointer;margin-left:auto}',
      '.nav-hamburger span{display:block;width:18px;height:2px;background:var(--text-muted);border-radius:2px;transition:all .3s}',
      '.nav-hamburger.open span:nth-child(1){transform:translateY(7px) rotate(45deg)}.nav-hamburger.open span:nth-child(2){opacity:0}.nav-hamburger.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}',
      '.nav-mobile-menu{display:none;flex-direction:column;gap:2px;padding:12px 16px 16px;border-top:1px solid var(--border);background:var(--surface)}',
      '.nav-mobile-menu.open{display:flex}',
      '.nav-mobile-link{display:block;padding:11px 14px;border-radius:8px;font-size:.9rem;font-weight:600;color:var(--text);text-decoration:none;transition:all .2s;background:none;border:none;text-align:left;cursor:pointer;width:100%;min-height:44px}',
      '.nav-mobile-link:hover{background:rgba(26,143,160,.1);color:var(--primary)}',
      '.nav-mobile-divider{height:1px;background:var(--border);margin:6px 0}',
      '.nav-mobile-logout{color:var(--danger)}',
      /* Bottom nav */
      '.gl-bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--surface);border-top:1px solid var(--border);z-index:900;padding:0 0 env(safe-area-inset-bottom,0)}',
      '.bn-tab{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:10px 4px;text-decoration:none;color:var(--text-muted);font-size:.65rem;font-weight:600;gap:3px;min-height:56px;min-width:44px;transition:color .2s}',
      '.bn-tab.bn-active,.bn-tab:hover{color:var(--primary)}',
      '.bn-icon{display:flex;align-items:center;justify-content:center}',
      '.bn-post{color:var(--primary)}.bn-post-fab{display:flex;align-items:center;justify-content:center;width:40px;height:40px;background:var(--primary);border-radius:50%;color:#fff}',
      '.bn-badge{position:absolute;top:-4px;right:-4px;background:var(--danger);color:#fff;font-size:.6rem;font-weight:800;border-radius:10px;padding:1px 4px;min-width:14px;text-align:center}',
      '@media(max-width:768px){.nav-links{display:none}.nav-right .nav-btn-login,.nav-right .nav-btn-signup,.nav-right .nav-post-btn{display:none}.nav-hamburger{display:flex}.nav-username{display:none}.gl-bottom-nav{display:flex}}',
      /* Footer */
      '.main-footer{background:#0a0d14;color:var(--text-muted);padding:48px 20px 0;margin-top:80px}',
      '.footer-inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 2fr;gap:48px;padding-bottom:40px}',
      '.footer-logo{font-size:1.5rem;font-weight:900;letter-spacing:-1px;color:var(--text);text-decoration:none;display:inline-block;margin-bottom:10px}',
      '.footer-logo span{color:var(--primary)}',
      '.footer-tagline,.footer-city{font-size:.83rem;color:var(--text-muted);line-height:1.5;margin-bottom:4px}',
      '.footer-links{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}',
      '.footer-col{display:flex;flex-direction:column;gap:10px}',
      '.footer-col-title{font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:var(--text-muted);margin-bottom:4px}',
      '.footer-col a{font-size:.83rem;color:var(--text-muted);text-decoration:none;transition:color .2s}',
      '.footer-col a:hover{color:var(--primary)}',
      '.footer-bottom{max-width:1200px;margin:0 auto;border-top:1px solid var(--border);padding:16px 0;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:.76rem;color:var(--text-muted)}',
      '@media(max-width:768px){.footer-inner{grid-template-columns:1fr}.footer-links{grid-template-columns:repeat(2,1fr)}.footer-bottom{flex-direction:column;text-align:center}}',
      /* Breadcrumb */
      '.breadcrumb{margin-bottom:20px}.breadcrumb-list{display:flex;flex-wrap:wrap;align-items:center;gap:4px;list-style:none;padding:0;margin:0;font-size:.8rem}',
      '.breadcrumb-item{display:flex;align-items:center;gap:4px;color:var(--text-muted)}',
      '.breadcrumb-item a{color:var(--text-muted);text-decoration:none;font-weight:600;transition:color .2s}',
      '.breadcrumb-item a:hover{color:var(--primary)}.breadcrumb-item.active{color:var(--text);font-weight:700}',
      '.breadcrumb-sep{color:var(--border);font-size:.75rem}'
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ══════════════════════════════════════════════════════════
     16. SERVICE WORKER
  ══════════════════════════════════════════════════════════ */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      try {
        navigator.serviceWorker.register(new URL('service-worker.js', window.location.href).toString(), {
          scope: './',
          updateViaCache: 'none'
        }).then(reg => {
          reg.addEventListener('updatefound', () => {
            const newSW = reg.installing;
            if (!newSW) return;
            newSW.addEventListener('statechange', () => {
              if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                newSW.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          });
        }).catch(e => console.error('[GigLega] SW register:', e));

        let swRefreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (swRefreshing) return;
          swRefreshing = true;
          window.location.reload();
        });
      } catch (e) { console.error('[GigLega] SW init:', e); }
    });
  }

  /* ══════════════════════════════════════════════════════════
     17. PUSH NOTIFICATIONS
  ══════════════════════════════════════════════════════════ */
  global.initPushNotifications = async function() {
    try {
      if (!('Notification' in window)) { showToast('Browser does not support push notifications.', 'warning'); return false; }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { showToast('Notifications blocked — enable in browser settings.', 'warning'); return false; }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'BNgxPMRhO2KFnWODfY8e1_ggJB3L5kY4h7mXqZvT3R0pN1sWz9dCuAeVbFjHKxIiYmOlPcQtSuXwZaBcDe'
        }).catch(e => { console.warn('[GigLega] push subscribe:', e.message); return null; });
      }
      if (sub) {
        try {
          const [fsMod, fb] = await Promise.all([
            import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js'),
            import('./firebase-config.js')
          ]);
          const authMod = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
          const user = authMod.getAuth(fb.app).currentUser;
          if (user) {
            const subJSON = sub.toJSON();
            await fsMod.setDoc(fsMod.doc(fb.db, 'users', user.uid), {
              pushEndpoint: subJSON.endpoint || '',
              pushKeys: subJSON.keys || {},
              pushEnabled: true
            }, { merge: true });
          }
        } catch (e) { console.warn('[GigLega] push save:', e.message); }
      }
      showToast('Push notifications enabled.', 'success');
      return true;
    } catch (e) {
      console.error('[GigLega] initPushNotifications:', e.message);
      showToast('Push setup failed: ' + e.message, 'error');
      return false;
    }
  };

})(window);
