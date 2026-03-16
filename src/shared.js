/* CACHE BUSTER v1.5.0 — auto-clears old SW on first load */
(function(){
  var APP_BUILD = '1.5.0';
  var stored = localStorage.getItem('gl_app_build');
  if (stored !== APP_BUILD) {
    localStorage.setItem('gl_app_build', APP_BUILD);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        if (regs.length) {
          Promise.all(regs.map(function(r){return r.unregister();})).then(function(){
            caches.keys().then(function(keys){
              Promise.all(keys.map(function(k){return caches.delete(k);})).then(function(){
                window.location.reload();
              });
            });
          });
        }
      });
    }
  }
})();
/* ============================================================
   GigLega v1.1 — shared.js
   Foundation: config, auth, navbar, footer, toast, breadcrumb
   ============================================================ */

(function (global) {
  "use strict";

  /* ══════════════════════════════════════════════════════════
     1. CONFIG & STORAGE KEYS
  ══════════════════════════════════════════════════════════ */
  var GL = {
    VERSION:          "1.1",
    APP_NAME:         "GigLega",
    TAGLINE:          "Gurugram ka #1 Gig Platform",
    FEE_RATE:         0.06,

    // Storage keys — single source of truth
    STORAGE_KEY_USER:   "gl_user",
    STORAGE_KEY_USERS:  "gl_users",
    STORAGE_KEY_GIGS:   "gl_gigs",
    STORAGE_KEY_CHATS:  "gl_chats",
    STORAGE_KEY_WALLET: "gl_wallet",
    STORAGE_KEY_NOTIFS: "gl_notifs",
    STORAGE_KEY_THEME:  "gl_theme",

    // Nav links shown to everyone
    PUBLIC_NAV: [
      { label: "Browse Gigs",  href: "browse.html",     icon: "🔍" },
      { label: "How It Works", href: "about.html",      icon: "💡" },
      { label: "Enterprise",   href: "enterprise.html", icon: "🏢" }
    ],

    // Pages that require login — redirect if not authed
    PROTECTED_PAGES: [
      "post-gig.html", "gig-edit.html",
      "dashboard.html", "dashboard-worker.html", "dashboard-client.html",
      "chat.html", "profile.html", "wallet.html",
      "notifications.html", "reviews.html"
    ]
  };

  // Expose GL globally
  global.GL = GL;


  /* ══════════════════════════════════════════════════════════
     2. AUTH HELPERS
  ══════════════════════════════════════════════════════════ */

  /**
   * getCurrentUser()
   * Safe user read — checks localStorage only.
   * Returns user object {id, name, email, ...} or null.
   */
  function getCurrentUser() {
    try {
      var raw = localStorage.getItem(GL.STORAGE_KEY_USER);
      if (!raw) return null;
      var u = JSON.parse(raw);
      return (u && u.id) ? u : null;
    } catch (_e) { return null; }
  }

  /**
   * setCurrentUser(user)
   * Saves user to localStorage.
   */
  function setCurrentUser(user) {
    try { localStorage.setItem(GL.STORAGE_KEY_USER, JSON.stringify(user)); }
    catch (_e) {}
  }

  /**
   * logoutUser()
   * Clears session and redirects to index.
   */
  function logoutUser() {
    localStorage.removeItem(GL.STORAGE_KEY_USER);
    sessionStorage.removeItem(GL.STORAGE_KEY_USER);
    showToast("👋 Logged out successfully.", "success");
    setTimeout(function () { window.location.href = "index.html"; }, 900);
  }

  /**
   * requireAuth(redirectBack)
   * Call at top of protected pages.
   * If not logged in → shows error UI and returns null (NO redirect loop).
   * Returns user object if logged in.
   */
  function requireAuth(redirectBack) {
    var user = getCurrentUser();
    if (!user) {
      var page = redirectBack || (window.location.pathname.split("/").pop() || "index.html");
      // Show a full-page auth wall instead of redirecting
      document.addEventListener("DOMContentLoaded", function () {
        var main = document.querySelector("main") || document.body;
        var wall = document.createElement("div");
        wall.style.cssText = "text-align:center;padding:80px 24px;";
        wall.innerHTML =
          '<div style="font-size:3rem;margin-bottom:16px">🔐</div>' +
          '<h2 style="font-size:1.2rem;font-weight:800;color:var(--primary);margin-bottom:8px">Login Required</h2>' +
          '<p style="font-size:.88rem;color:var(--gray-500);margin-bottom:24px;line-height:1.6">' +
            'You need to be logged in to view this page.' +
          '</p>' +
          '<a href="login.html?redirect=' + encodeURIComponent(page) + '" ' +
            'style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,var(--primary),var(--teal));' +
            'color:#fff;border-radius:var(--radius-sm);font-weight:700;text-decoration:none;font-size:.9rem">' +
            '→ Login to Continue' +
          '</a>' +
          '<p style="margin-top:14px;font-size:.82rem;color:var(--gray-400)">' +
            "Don't have an account? <a href='login.html#mode=register' style='color:var(--teal);font-weight:600'>Register free</a>" +
          '</p>';
        // Replace main content with wall
        if (main.firstChild) {
          main.innerHTML = "";
          main.appendChild(wall);
        } else {
          main.appendChild(wall);
        }
      });
      return null;
    }
    return user;
  }

  // Expose auth functions globally
  global.getCurrentUser = getCurrentUser;
  global.setCurrentUser = setCurrentUser;
  global.logoutUser     = logoutUser;
  global.requireAuth    = requireAuth;


  /* ══════════════════════════════════════════════════════════
     3. THEME (DARK / LIGHT)
  ══════════════════════════════════════════════════════════ */

  function getTheme() {
    return localStorage.getItem(GL.STORAGE_KEY_THEME) || "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(GL.STORAGE_KEY_THEME, theme);
    // Update toggle button if it exists
    var btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  function toggleTheme() {
    applyTheme(getTheme() === "dark" ? "light" : "dark");
  }

  global.toggleTheme = toggleTheme;
  global.applyTheme  = applyTheme;


  /* ══════════════════════════════════════════════════════════
     4. TOAST NOTIFICATIONS
  ══════════════════════════════════════════════════════════ */

  function showToast(message, type, duration) {
    type     = type     || "info";
    duration = duration || 3200;

    var container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }

    var icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
    var toast = document.createElement("div");
    toast.className = "toast toast-" + type;
    toast.innerHTML =
      '<span class="toast-icon">' + (icons[type] || "ℹ️") + '</span>' +
      '<span class="toast-msg">'  + escHtml(String(message)) + '</span>' +
      '<button class="toast-close" aria-label="Close">✕</button>';

    toast.querySelector(".toast-close").addEventListener("click", function () {
      dismissToast(toast);
    });

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { toast.classList.add("show"); });
    });

    // Auto dismiss
    var timer = setTimeout(function () { dismissToast(toast); }, duration);
    toast.dataset.timer = timer;
  }

  function dismissToast(toast) {
    clearTimeout(toast.dataset.timer);
    toast.classList.remove("show");
    toast.classList.add("hide");
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 350);
  }

  global.showToast = showToast;


  /* ══════════════════════════════════════════════════════════
     5. ANNOUNCEMENT BAR
  ══════════════════════════════════════════════════════════ */

  function renderAnnounceBar() {
    var el = document.getElementById("announce-bar");
    if (!el) return;

    var msg = "🚀 GigLega v1.1 is live! Gurugram ke best gigs abhi browse karo.";
    var dismissed = sessionStorage.getItem("gl_announce_dismissed");
    if (dismissed) { el.style.display = "none"; return; }

    el.className  = "announce-bar";
    el.innerHTML  =
      '<span>' + msg + '</span>' +
      '<button class="announce-close" aria-label="Dismiss" id="announceClose">✕</button>';

    document.getElementById("announceClose").addEventListener("click", function () {
      el.style.height = el.offsetHeight + "px";
      requestAnimationFrame(function () {
        el.style.transition = "height .3s, opacity .3s";
        el.style.height  = "0";
        el.style.opacity = "0";
        setTimeout(function () { el.style.display = "none"; }, 320);
      });
      sessionStorage.setItem("gl_announce_dismissed", "1");
    });
  }


  /* ══════════════════════════════════════════════════════════
     6. NAVBAR
  ══════════════════════════════════════════════════════════ */

  function renderNav() {
    var el = document.getElementById("main-nav");
    if (!el) return;

    var user      = getCurrentUser();
    var theme     = getTheme();
    var notifCount = getUnreadNotifCount();
    var currentPage = window.location.pathname.split("/").pop() || "index.html";

    // Build public nav links
    var pubLinks = GL.PUBLIC_NAV.map(function (link) {
      var active = (currentPage === link.href) ? " active" : "";
      return '<a href="' + link.href + '" class="nav-link' + active + '">' +
               link.icon + ' ' + link.label +
             '</a>';
    }).join("");

    // Auth section
    var authSection = "";
    if (!user) {
      authSection =
        '<a href="login.html" class="btn btn-ghost nav-btn-login">Login</a>' +
        '<a href="login.html#mode=register" class="btn btn-primary nav-btn-signup">Join Free →</a>';
    } else {
      var initials = (user.name || "U").split(" ").map(function (w) { return w[0]; }).join("").slice(0,2).toUpperCase();
      var notifBadge = notifCount > 0
        ? '<span class="nav-notif-badge">' + (notifCount > 9 ? "9+" : notifCount) + '</span>'
        : "";

      authSection =
        '<a href="post-gig.html" class="btn btn-primary nav-post-btn">+ Post Gig</a>' +

        '<div class="nav-user-menu" id="navUserMenu">' +
          '<button class="nav-avatar-btn" id="navAvatarBtn" aria-expanded="false" aria-haspopup="true">' +
            '<div class="nav-avatar">' + initials + '</div>' +
            '<span class="nav-username">' + escHtml(user.name ? user.name.split(" ")[0] : "Me") + '</span>' +
            notifBadge +
            '<span class="nav-chevron">▾</span>' +
          '</button>' +

          '<div class="nav-dropdown" id="navDropdown" role="menu">' +
            '<div class="nav-dropdown-header">' +
              '<div class="nav-dropdown-name">' + escHtml(user.name || "User") + '</div>' +
              '<div class="nav-dropdown-email">' + escHtml(user.email || user.phone || "") + '</div>' +
            '</div>' +
            '<div class="nav-dropdown-divider"></div>' +

            dropdownItem("⚡", "Worker Dashboard", "dashboard-worker.html", currentPage) +
            dropdownItem("📋", "Poster Dashboard",  "dashboard-client.html", currentPage) +
            dropdownItem("👤", "My Profile",         "profile.html",          currentPage) +

            '<div class="nav-dropdown-divider"></div>' +

            dropdownItem("🔍", "Browse Gigs",  "browse.html",    currentPage) +
            dropdownItem("➕", "Post a Gig",   "post-gig.html",  currentPage) +

            '<div class="nav-dropdown-divider"></div>' +

            dropdownItem("💰", "My Wallet",       "wallet.html",        currentPage) +
            '<a href="notifications.html" class="nav-dd-item" role="menuitem">' +
              '<span class="nav-dd-icon">🔔</span>' +
              '<span>Notifications</span>' +
              (notifCount > 0 ? '<span class="dd-badge">' + notifCount + '</span>' : '') +
            '</a>' +
            dropdownItem("⭐", "My Reviews",    "reviews.html",       currentPage) +
            dropdownItem("❓", "Help Center",   "help-center.html",   currentPage) +

            '<div class="nav-dropdown-divider"></div>' +
            '<button class="nav-dd-item nav-dd-logout" id="navLogoutBtn" role="menuitem">' +
              '<span class="nav-dd-icon">🚪</span><span>Logout</span>' +
            '</button>' +
          '</div>' +
        '</div>';
    }

    el.className = "main-nav";
    el.innerHTML =
      '<div class="nav-inner">' +
        '<a href="index.html" class="nav-logo" aria-label="GigLega Home">' +
          'Gig<span>Lega</span>' +
        '</a>' +

        '<div class="nav-links" id="navLinks">' +
          pubLinks +
        '</div>' +

        '<div class="nav-right">' +
          '<button class="nav-icon-btn" id="themeToggle" aria-label="Toggle theme" title="Toggle theme">' +
            (theme === "dark" ? "☀️" : "🌙") +
          '</button>' +
          authSection +
        '</div>' +

        '<button class="nav-hamburger" id="navHamburger" aria-label="Toggle menu" aria-expanded="false">' +
          '<span></span><span></span><span></span>' +
        '</button>' +
      '</div>' +

      /* Mobile menu */
      '<div class="nav-mobile-menu" id="navMobileMenu" aria-hidden="true">' +
        pubLinks +
        '<div class="nav-mobile-divider"></div>' +
        (user
          ? '<a href="dashboard-worker.html" class="nav-mobile-link">⚡ Worker Dashboard</a>' +
            '<a href="dashboard-client.html" class="nav-mobile-link">📋 Poster Dashboard</a>' +
            '<a href="post-gig.html"         class="nav-mobile-link">➕ Post a Gig</a>' +
            '<a href="profile.html"          class="nav-mobile-link">👤 My Profile</a>' +
            '<a href="wallet.html"           class="nav-mobile-link">💰 My Wallet</a>' +
            '<a href="notifications.html"    class="nav-mobile-link">🔔 Notifications' +
              (notifCount > 0 ? ' <span class="dd-badge">' + notifCount + '</span>' : '') +
            '</a>' +
            '<div class="nav-mobile-divider"></div>' +
            '<button class="nav-mobile-link nav-mobile-logout" id="mobileLogoutBtn">🚪 Logout</button>'
          : '<a href="login.html"  class="nav-mobile-link">🔑 Login</a>' +
            '<a href="login.html#mode=register" class="nav-mobile-link">✨ Register Free</a>'
        ) +
      '</div>';

    bindNavEvents();
  }

  function dropdownItem(icon, label, href, currentPage) {
    var active = (currentPage === href) ? ' style="background:rgba(13,148,136,.07);color:var(--teal)"' : "";
    return '<a href="' + href + '" class="nav-dd-item" role="menuitem"' + active + '>' +
             '<span class="nav-dd-icon">' + icon + '</span>' +
             '<span>' + label + '</span>' +
           '</a>';
  }

  function bindNavEvents() {
    /* Theme toggle */
    var themeBtn = document.getElementById("themeToggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        toggleTheme();
        // Re-render nav so moon/sun icon updates
        renderNav();
        renderFooter();
      });
    }

    /* Avatar dropdown */
    var avatarBtn = document.getElementById("navAvatarBtn");
    var dropdown  = document.getElementById("navDropdown");
    if (avatarBtn && dropdown) {
      avatarBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var isOpen = dropdown.classList.contains("open");
        closeAllDropdowns();
        if (!isOpen) {
          dropdown.classList.add("open");
          avatarBtn.setAttribute("aria-expanded", "true");
        }
      });
    }

    /* Close dropdown on outside click */
    document.addEventListener("click", function () { closeAllDropdowns(); });
    if (dropdown) dropdown.addEventListener("click", function (e) { e.stopPropagation(); });

    /* Logout buttons */
    var logoutBtn = document.getElementById("navLogoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);
    var mobileLogout = document.getElementById("mobileLogoutBtn");
    if (mobileLogout) mobileLogout.addEventListener("click", logoutUser);

    /* Hamburger */
    var hamburger  = document.getElementById("navHamburger");
    var mobileMenu = document.getElementById("navMobileMenu");
    if (hamburger && mobileMenu) {
      hamburger.addEventListener("click", function (e) {
        e.stopPropagation();
        var isOpen = mobileMenu.classList.contains("open");
        mobileMenu.classList.toggle("open", !isOpen);
        hamburger.classList.toggle("open", !isOpen);
        hamburger.setAttribute("aria-expanded", String(!isOpen));
        mobileMenu.setAttribute("aria-hidden", String(isOpen));
      });
      /* Close mobile menu on outside click */
      document.addEventListener("click", function () {
        mobileMenu.classList.remove("open");
        hamburger.classList.remove("open");
        hamburger.setAttribute("aria-expanded", "false");
        mobileMenu.setAttribute("aria-hidden", "true");
      });
      mobileMenu.addEventListener("click", function (e) { e.stopPropagation(); });
    }
  }

  function closeAllDropdowns() {
    var dropdown  = document.getElementById("navDropdown");
    var avatarBtn = document.getElementById("navAvatarBtn");
    if (dropdown)  dropdown.classList.remove("open");
    if (avatarBtn) avatarBtn.setAttribute("aria-expanded", "false");
  }


  /* ══════════════════════════════════════════════════════════
     7. FOOTER
  ══════════════════════════════════════════════════════════ */

  function renderFooter() {
    var el = document.getElementById("main-footer");
    if (!el) return;

    el.className = "main-footer";
    el.innerHTML =
      '<div class="footer-inner">' +

        '<div class="footer-brand">' +
          '<a href="index.html" class="footer-logo">Gig<span>Lega</span></a>' +
          '<p class="footer-tagline">' + GL.TAGLINE + '</p>' +
          '<p class="footer-city">📍 Gurugram, Haryana</p>' +
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
            '<a href="trust-safety.html">Trust & Safety</a>' +
            '<a href="contact.html">Contact</a>' +
          '</div>' +
          '<div class="footer-col">' +
            '<div class="footer-col-title">Support</div>' +
            '<a href="help-center.html">Help Center</a>' +
            '<a href="privacy-policy.html">Privacy Policy</a>' +
            '<a href="terms.html">Terms of Service</a>' +
            '<a href="sitemap.xml">Sitemap</a>' +
          '</div>' +
        '</div>' +

      '</div>' +

      '<div class="footer-bottom">' +
        '<span>© ' + new Date().getFullYear() + ' GigLega. All rights reserved.</span>' +
        '<span>Made with ❤️ in Gurugram</span>' +
      '</div>';
  }


  /* ══════════════════════════════════════════════════════════
     8. BREADCRUMB
  ══════════════════════════════════════════════════════════ */

  /**
   * buildBreadcrumb(elementId, items)
   * items = [{label, href}, ..., {label}]  ← last item has no href (current page)
   */
  function buildBreadcrumb(elementId, items) {
    var el = document.getElementById(elementId);
    if (!el || !items || !items.length) return;

    el.className = "breadcrumb";
    var html = '<ol class="breadcrumb-list" itemscope itemtype="https://schema.org/BreadcrumbList">';
    items.forEach(function (item, i) {
      var isLast = i === items.length - 1;
      html +=
        '<li class="breadcrumb-item' + (isLast ? " active" : "") + '" ' +
          'itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">' +
          (isLast
            ? '<span itemprop="name">' + escHtml(item.label) + '</span>'
            : '<a href="' + item.href + '" itemprop="item"><span itemprop="name">' + escHtml(item.label) + '</span></a>' +
              '<span class="breadcrumb-sep" aria-hidden="true">›</span>'
          ) +
          '<meta itemprop="position" content="' + (i + 1) + '" />' +
        '</li>';
    });
    html += '</ol>';
    el.innerHTML = html;
  }

  global.buildBreadcrumb = buildBreadcrumb;


  /* ══════════════════════════════════════════════════════════
     9. NOTIFICATIONS HELPER
  ══════════════════════════════════════════════════════════ */

  function getNotifs() {
    try { return JSON.parse(localStorage.getItem(GL.STORAGE_KEY_NOTIFS) || "[]"); }
    catch (_e) { return []; }
  }

  function getUnreadNotifCount() {
    return getNotifs().filter(function (n) { return !n.read; }).length;
  }

  function pushNotif(notif) {
    var notifs = getNotifs();
    notifs.unshift({
      id:        "notif_" + Date.now(),
      read:      false,
      createdAt: new Date().toISOString(),
      icon:      notif.icon  || "🔔",
      title:     notif.title || "Notification",
      body:      notif.body  || "",
      href:      notif.href  || null
    });
    // Keep max 50
    if (notifs.length > 50) notifs = notifs.slice(0, 50);
    try { localStorage.setItem(GL.STORAGE_KEY_NOTIFS, JSON.stringify(notifs)); }
    catch (_e) {}
  }

  global.getNotifs           = getNotifs;
  global.getUnreadNotifCount = getUnreadNotifCount;
  global.pushNotif           = pushNotif;


  /* ══════════════════════════════════════════════════════════
     10. UTILITY HELPERS
  ══════════════════════════════════════════════════════════ */

  function escHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function timeAgo(isoStr) {
    var diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (diff < 60)    return diff + "s ago";
    if (diff < 3600)  return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    return Math.floor(diff / 86400) + "d ago";
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function formatCurrency(amount) {
    return "₹" + Number(amount || 0).toLocaleString("en-IN");
  }

  function generateId(prefix) {
    return (prefix || "id") + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  }

  // Expose utilities
  global.escHtml        = escHtml;
  global.timeAgo        = timeAgo;
  global.getParam       = getParam;
  global.formatCurrency = formatCurrency;
  global.generateId     = generateId;


  /* ══════════════════════════════════════════════════════════
     11. PAGE LOADER
  ══════════════════════════════════════════════════════════ */

  function showPageLoader() {
    var loader = document.getElementById("page-loader");
    if (loader) loader.classList.add("show");
  }

  function hidePageLoader() {
    var loader = document.getElementById("page-loader");
    if (loader) {
      setTimeout(function () {
        loader.classList.remove("show");
        loader.classList.add("hide");
      }, 200);
    }
  }

  global.showPageLoader = showPageLoader;
  global.hidePageLoader = hidePageLoader;


  /* ══════════════════════════════════════════════════════════
     12. AUTO-INIT ON DOM READY
  ══════════════════════════════════════════════════════════ */

  function init() {
    // Apply saved theme immediately (prevents flash)
    applyTheme(getTheme());

    // Render shared components
    renderAnnounceBar();
    renderNav();
    renderFooter();

    // Hide page loader when page is ready
    hidePageLoader();

    // Add toast styles if not already in CSS
    injectToastStyles();
  }

  // Run as soon as DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }


  /* ══════════════════════════════════════════════════════════
     13. INJECT TOAST + NAV STYLES (self-contained)
  ══════════════════════════════════════════════════════════ */

  function injectToastStyles() {
    if (document.getElementById("gl-shared-styles")) return;
    var style = document.createElement("style");
    style.id  = "gl-shared-styles";
    style.textContent = [

      /* ── Toast ── */
      "#toast-container{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none}",
      ".toast{display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:10px;background:var(--surface);border:1.5px solid var(--gray-200);box-shadow:0 8px 24px rgba(0,0,0,.12);font-size:.88rem;font-weight:600;color:var(--text);min-width:260px;max-width:360px;pointer-events:all;opacity:0;transform:translateY(12px);transition:opacity .3s,transform .3s}",
      ".toast.show{opacity:1;transform:translateY(0)}",
      ".toast.hide{opacity:0;transform:translateY(12px)}",
      ".toast-success{border-color:rgba(16,185,129,.4);background:rgba(16,185,129,.06)}",
      ".toast-error{border-color:rgba(239,68,68,.4);background:rgba(239,68,68,.06)}",
      ".toast-warning{border-color:rgba(245,158,11,.4);background:rgba(245,158,11,.06)}",
      ".toast-info{border-color:rgba(99,102,241,.4);background:rgba(99,102,241,.06)}",
      ".toast-icon{font-size:1rem;flex-shrink:0}",
      ".toast-msg{flex:1;line-height:1.4}",
      ".toast-close{background:none;border:none;cursor:pointer;color:var(--gray-400);font-size:.9rem;padding:2px 4px;line-height:1;margin-left:4px}",
      ".toast-close:hover{color:var(--gray-700)}",

      /* ── Announce bar ── */
      ".announce-bar{background:linear-gradient(90deg,var(--primary) 0%,var(--teal) 100%);color:#fff;text-align:center;padding:9px 40px;font-size:.82rem;font-weight:600;position:relative;overflow:hidden}",
      ".announce-close{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;color:rgba(255,255,255,.75);font-size:1rem;cursor:pointer;padding:4px;line-height:1}",
      ".announce-close:hover{color:#fff}",

      /* ── Navbar ── */
      ".main-nav{background:var(--surface);border-bottom:1.5px solid var(--gray-200);position:sticky;top:0;z-index:1000;box-shadow:0 2px 12px rgba(0,0,0,.06)}",
      ".nav-inner{max-width:1200px;margin:0 auto;padding:0 20px;height:62px;display:flex;align-items:center;gap:20px}",
      ".nav-logo{font-size:1.4rem;font-weight:900;letter-spacing:-1px;color:var(--primary);text-decoration:none;flex-shrink:0}",
      ".nav-logo span{color:var(--teal)}",
      ".nav-links{display:flex;align-items:center;gap:4px;flex:1}",
      ".nav-link{padding:8px 12px;border-radius:8px;font-size:.86rem;font-weight:600;color:var(--gray-600);text-decoration:none;transition:all .2s;white-space:nowrap}",
      ".nav-link:hover,.nav-link.active{color:var(--primary);background:rgba(26,60,94,.06)}",
      ".nav-right{display:flex;align-items:center;gap:10px;flex-shrink:0}",
      ".nav-icon-btn{background:none;border:1.5px solid var(--gray-200);border-radius:8px;width:36px;height:36px;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;transition:all .2s}",
      ".nav-icon-btn:hover{border-color:var(--teal)}",
      ".nav-btn-login{font-size:.86rem;padding:8px 16px}",
      ".nav-btn-signup{font-size:.86rem;padding:8px 16px}",
      ".nav-post-btn{font-size:.84rem;padding:8px 16px;white-space:nowrap}",

      /* Avatar button */
      ".nav-user-menu{position:relative}",
      ".nav-avatar-btn{display:flex;align-items:center;gap:8px;background:none;border:1.5px solid var(--gray-200);border-radius:10px;padding:6px 12px 6px 6px;cursor:pointer;transition:all .2s;color:var(--text)}",
      ".nav-avatar-btn:hover{border-color:var(--teal)}",
      ".nav-avatar{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--teal));color:#fff;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:800;flex-shrink:0}",
      ".nav-username{font-size:.84rem;font-weight:700;color:var(--text);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".nav-chevron{font-size:.7rem;color:var(--gray-400);transition:transform .2s}",
      ".nav-avatar-btn[aria-expanded=true] .nav-chevron{transform:rotate(180deg)}",
      ".nav-notif-badge{background:var(--danger);color:#fff;font-size:.65rem;font-weight:800;border-radius:10px;padding:1px 6px;min-width:18px;text-align:center}",

      /* Dropdown */
      ".nav-dropdown{position:absolute;top:calc(100% + 10px);right:0;background:var(--surface);border:1.5px solid var(--gray-200);border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.14);min-width:220px;padding:6px;z-index:2000;opacity:0;visibility:hidden;transform:translateY(-8px);transition:all .2s}",
      ".nav-dropdown.open{opacity:1;visibility:visible;transform:translateY(0)}",
      ".nav-dropdown-header{padding:10px 12px 8px}",
      ".nav-dropdown-name{font-weight:800;font-size:.9rem;color:var(--text)}",
      ".nav-dropdown-email{font-size:.74rem;color:var(--gray-400);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".nav-dropdown-divider{height:1px;background:var(--gray-200);margin:4px 0}",
      ".nav-dd-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;font-size:.86rem;font-weight:600;color:var(--gray-700);text-decoration:none;cursor:pointer;transition:all .15s;background:none;border:none;width:100%;text-align:left}",
      ".nav-dd-item:hover{background:rgba(13,148,136,.07);color:var(--teal)}",
      ".nav-dd-icon{font-size:1rem;width:20px;text-align:center;flex-shrink:0}",
      ".nav-dd-logout{color:var(--danger)}",
      ".nav-dd-logout:hover{background:rgba(239,68,68,.07);color:var(--danger)}",
      ".dd-badge{background:var(--danger);color:#fff;font-size:.65rem;font-weight:800;border-radius:10px;padding:1px 6px;margin-left:auto}",

      /* Hamburger */
      ".nav-hamburger{display:none;flex-direction:column;gap:5px;background:none;border:1.5px solid var(--gray-200);border-radius:8px;padding:8px;cursor:pointer;margin-left:auto}",
      ".nav-hamburger span{display:block;width:18px;height:2px;background:var(--gray-600);border-radius:2px;transition:all .3s}",
      ".nav-hamburger.open span:nth-child(1){transform:translateY(7px) rotate(45deg)}",
      ".nav-hamburger.open span:nth-child(2){opacity:0}",
      ".nav-hamburger.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}",

      /* Mobile menu */
      ".nav-mobile-menu{display:none;flex-direction:column;gap:2px;padding:12px 16px 16px;border-top:1.5px solid var(--gray-200);background:var(--surface)}",
      ".nav-mobile-menu.open{display:flex}",
      ".nav-mobile-link{display:block;padding:11px 14px;border-radius:8px;font-size:.9rem;font-weight:600;color:var(--gray-700);text-decoration:none;transition:all .2s;background:none;border:none;text-align:left;cursor:pointer;width:100%}",
      ".nav-mobile-link:hover{background:rgba(13,148,136,.07);color:var(--teal)}",
      ".nav-mobile-divider{height:1px;background:var(--gray-200);margin:6px 0}",
      ".nav-mobile-logout{color:var(--danger)}",

      /* Responsive */
      "@media(max-width:768px){",
        ".nav-links{display:none}",
        ".nav-right .nav-btn-login,.nav-right .nav-btn-signup,.nav-right .nav-post-btn{display:none}",
        ".nav-hamburger{display:flex}",
        ".nav-username{display:none}",
      "}",

      /* ── Breadcrumb ── */
      ".breadcrumb{margin-bottom:20px}",
      ".breadcrumb-list{display:flex;flex-wrap:wrap;align-items:center;gap:4px;list-style:none;padding:0;margin:0;font-size:.8rem}",
      ".breadcrumb-item{display:flex;align-items:center;gap:4px;color:var(--gray-400)}",
      ".breadcrumb-item a{color:var(--gray-500);text-decoration:none;font-weight:600;transition:color .2s}",
      ".breadcrumb-item a:hover{color:var(--teal)}",
      ".breadcrumb-item.active{color:var(--gray-600);font-weight:700}",
      ".breadcrumb-sep{color:var(--gray-300);font-size:.75rem}",

      /* ── Footer ── */
      ".main-footer{background:var(--gray-900);color:var(--gray-300);padding:48px 20px 0;margin-top:80px}",
      ".footer-inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 2fr;gap:48px;padding-bottom:40px}",
      ".footer-logo{font-size:1.5rem;font-weight:900;letter-spacing:-1px;color:#fff;text-decoration:none;display:inline-block;margin-bottom:10px}",
      ".footer-logo span{color:var(--teal)}",
      ".footer-tagline{font-size:.83rem;color:var(--gray-400);line-height:1.5;margin-bottom:6px}",
      ".footer-city{font-size:.78rem;color:var(--gray-500)}",
      ".footer-links{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}",
      ".footer-col{display:flex;flex-direction:column;gap:10px}",
      ".footer-col-title{font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:var(--gray-400);margin-bottom:4px}",
      ".footer-col a{font-size:.83rem;color:var(--gray-400);text-decoration:none;transition:color .2s}",
      ".footer-col a:hover{color:var(--teal)}",
      ".footer-bottom{max-width:1200px;margin:0 auto;border-top:1px solid rgba(255,255,255,.08);padding:16px 0;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:.76rem;color:var(--gray-500)}",
      "@media(max-width:768px){.footer-inner{grid-template-columns:1fr}.footer-links{grid-template-columns:repeat(2,1fr)}.footer-bottom{flex-direction:column;text-align:center}}",

      /* ── Dark mode overrides ── */
      "[data-theme=dark] .main-nav{border-color:var(--gray-700);background:var(--bg)}",
      "[data-theme=dark] .nav-link:hover,[data-theme=dark] .nav-link.active{background:rgba(13,148,136,.1)}",
      "[data-theme=dark] .nav-icon-btn{border-color:var(--gray-700);color:var(--gray-300)}",
      "[data-theme=dark] .nav-avatar-btn{border-color:var(--gray-700)}",
      "[data-theme=dark] .nav-dropdown{border-color:var(--gray-700);background:var(--surface)}",
      "[data-theme=dark] .nav-dropdown-divider{background:var(--gray-700)}",
      "[data-theme=dark] .nav-dd-item{color:var(--gray-300)}",
      "[data-theme=dark] .nav-mobile-menu{border-color:var(--gray-700)}",
      "[data-theme=dark] .nav-mobile-link{color:var(--gray-300)}",
      "[data-theme=dark] .nav-hamburger{border-color:var(--gray-700)}",
      "[data-theme=dark] .nav-hamburger span{background:var(--gray-300)}",
      "[data-theme=dark] .announce-bar{opacity:.9}",
      "[data-theme=dark] .main-footer{background:#020617;color:var(--gray-400)}",
      "[data-theme=dark] .footer-logo{color:var(--gray-700)}",
      "[data-theme=dark] .footer-col a{color:var(--gray-500)}",
      "[data-theme=dark] .footer-bottom{color:var(--gray-400);border-color:rgba(148,163,184,.2)}",
      "[data-theme=dark] .toast{border-color:var(--gray-700);background:var(--surface)}"

    ].join("\n");
    document.head.appendChild(style);
  }


  /* ══════════════════════════════════════════════════════════
     14. REGISTER SERVICE WORKER + UPDATE BANNER
  ══════════════════════════════════════════════════════════ */

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      try {
        var swUrl = new URL('service-worker.js', window.location.href).toString();
        navigator.serviceWorker.register(swUrl, {
          scope: './',
          updateViaCache: 'none'
        }).then(function (reg) {
          console.log('[GigLega] SW registered:', reg.scope);

          // Detect new SW waiting — show update prompt
          reg.addEventListener('updatefound', function () {
            var newSW = reg.installing;
            if (!newSW) return;
            newSW.addEventListener('statechange', function () {
              if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                // Activate update immediately so users don't keep stale shell assets.
                newSW.postMessage({ type: 'SKIP_WAITING' });
                showUpdateBanner(newSW);
              }
            });
          });
        });

        // Reload once when a new service worker takes control.
        var swRefreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', function () {
          if (swRefreshing) return;
          swRefreshing = true;
          window.location.reload();
        });

        // Listen for messages from SW
        navigator.serviceWorker.addEventListener('message', function (event) {
          var data = event.data || {};
          var type = data.type;
          var url  = data.url;
          if (type === 'NAVIGATE' && url) window.location.href = url;
          if (type === 'SW_UPDATED') console.log('[GigLega] SW updated to', data.version);
          if (type === 'SYNC_SUCCESS') console.log('[GigLega] Synced:', data.url);
        });

      } catch (err) {
        console.error('[GigLega] SW registration failed:', err);
      }
    });
  }

  function showUpdateBanner(newSW) {
    var banner = document.createElement('div');
    banner.style.cssText =
      'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);' +
      'background:#1a3c5e;color:#fff;padding:12px 20px;border-radius:10px;' +
      'display:flex;align-items:center;gap:12px;z-index:9999;' +
      'box-shadow:0 4px 20px rgba(0,0,0,.3);font-family:inherit;' +
      'border:1.5px solid rgba(13,148,136,.3);font-size:.86rem;';

    banner.innerHTML =
      '<span>🚀 <strong>GigLega update ready!</strong></span>' +
      '<button style="padding:6px 14px;background:linear-gradient(135deg,#059669,#0d9488);border:none;' +
        'border-radius:6px;color:#fff;font-weight:800;cursor:pointer;font-family:inherit;font-size:.82rem">' +
        'Update Karo ↻' +
      '</button>' +
      '<button style="background:none;border:none;color:rgba(255,255,255,.5);cursor:pointer;font-size:1rem">✕</button>';

    var updateBtn = banner.querySelector('button:nth-child(2)');
    var closeBtn  = banner.querySelector('button:nth-child(3)');

    updateBtn.addEventListener('click', function () {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
      if (newSW && newSW.state === 'installed' && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      }
      window.location.reload();
    });

    closeBtn.addEventListener('click', function () {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    });

    document.body.appendChild(banner);
  }

})(window);
