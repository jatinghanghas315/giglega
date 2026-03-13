/* ============================================================
   shared.js — GigLega Master Script
   Load in <head> WITHOUT defer or async:
   <script src="shared.js"></script>
   ============================================================ */

/* ══════════════════════════════════════════════════════════
   PART 1 — IMMEDIATE EXECUTION
   Runs before ANY inline script on the page.
   Auth, constants, and utilities are available instantly.
══════════════════════════════════════════════════════════ */

/* ── Global constants ── */
var GL = {
  STORAGE_KEY_USER:  "gl_user",
  STORAGE_KEY_USERS: "gl_users",
  STORAGE_KEY_GIGS:  "gl_gigs",
  STORAGE_KEY_CHATS: "gl_chats",
  FEE_RATE:          0.06,
  VERSION:           "1.0.0-beta",
  APP_NAME:          "GigLega",
  SUPPORT_EMAIL:     "Giglega.official@gmail.com",
  SUPPORT_PHONE:     "+91 9319635257"
};

/* ── Auth helpers ── */
function getCurrentUser() {
  try {
    var raw = localStorage.getItem(GL.STORAGE_KEY_USER);
    if (!raw) return null;
    var u = JSON.parse(raw);
    return (u && u.id) ? u : null;
  } catch (e) { return null; }
}

function safeLogout() {
  localStorage.removeItem(GL.STORAGE_KEY_USER);
  window.location.href = "index.html";
}

function requireAuth(redirectPage) {
  var user = getCurrentUser();
  if (!user) {
    var page = redirectPage || window.location.pathname.split("/").pop() || "index.html";
    window.location.href = "login.html?redirect=" + encodeURIComponent(page);
    return null;
  }
  return user;
}

/* ── Utility: escape HTML ── */
function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── Utility: time ago ── */
function timeAgo(isoStr) {
  var diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diff < 60)    return diff + "s ago";
  if (diff < 3600)  return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}

/* ── Utility: URL param ── */
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/* ── Utility: current page name ── */
function currentPage() {
  return window.location.pathname.split("/").pop() || "index.html";
}


/* ══════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
   showToast(message, type)
   type: "success" | "error" | "info" | "warning"
══════════════════════════════════════════════════════════ */
(function () {
  var _style = document.createElement("style");
  _style.textContent = [
    "#toast-container{position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none}",
    ".gl-toast{display:flex;align-items:center;gap:10px;padding:13px 18px;border-radius:12px;font-size:.88rem;font-weight:600;color:#fff;box-shadow:0 4px 20px rgba(0,0,0,.18);pointer-events:all;animation:toastIn .3s ease;max-width:320px;line-height:1.4}",
    ".gl-toast.removing{animation:toastOut .3s ease forwards}",
    ".gl-toast.success{background:linear-gradient(135deg,#059669,#0d9488)}",
    ".gl-toast.error{background:linear-gradient(135deg,#dc2626,#b91c1c)}",
    ".gl-toast.info{background:linear-gradient(135deg,#1a3c5e,#0d9488)}",
    ".gl-toast.warning{background:linear-gradient(135deg,#b45309,#d97706)}",
    ".gl-toast-close{margin-left:auto;background:none;border:none;color:rgba(255,255,255,.7);font-size:1rem;cursor:pointer;padding:0;line-height:1;flex-shrink:0}",
    ".gl-toast-close:hover{color:#fff}",
    "@keyframes toastIn{from{opacity:0;transform:translateY(12px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}",
    "@keyframes toastOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(8px)}}"
  ].join("");
  document.head.appendChild(_style);
})();

function showToast(message, type, duration) {
  type     = type     || "info";
  duration = duration || 3500;

  var container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  var icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };

  var toast = document.createElement("div");
  toast.className = "gl-toast " + type;
  toast.innerHTML =
    "<span>" + icons[type] + "</span>" +
    "<span>" + escHtml(message) + "</span>" +
    '<button class="gl-toast-close" aria-label="Close">✕</button>';

  container.appendChild(toast);

  function remove() {
    toast.classList.add("removing");
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }

  toast.querySelector(".gl-toast-close").addEventListener("click", remove);
  setTimeout(remove, duration);
}


/* ══════════════════════════════════════════════════════════
   BREADCRUMB
   buildBreadcrumb(elementId, items)
   items: [{ label, href }] — last item has no href
══════════════════════════════════════════════════════════ */
(function () {
  var _style = document.createElement("style");
  _style.textContent = [
    ".gl-breadcrumb{display:flex;align-items:center;flex-wrap:wrap;gap:4px;font-size:.78rem;color:var(--gray-400,#9ca3af);margin-bottom:20px;padding:0}",
    ".gl-breadcrumb a{color:var(--teal,#0d9488);text-decoration:none;font-weight:600}",
    ".gl-breadcrumb a:hover{text-decoration:underline}",
    ".gl-breadcrumb .sep{opacity:.5}",
    ".gl-breadcrumb .current{color:var(--gray-600,#4b5563);font-weight:600}"
  ].join("");
  document.head.appendChild(_style);
})();

function buildBreadcrumb(elementId, items) {
  var el = document.getElementById(elementId);
  if (!el || !items || !items.length) return;

  var html = items.map(function (item, i) {
    var isLast = i === items.length - 1;
    var part   = isLast
      ? '<span class="current">' + escHtml(item.label) + '</span>'
      : '<a href="' + escHtml(item.href) + '">' + escHtml(item.label) + '</a>';
    return part + (isLast ? "" : '<span class="sep"> / </span>');
  }).join("");

  el.innerHTML = '<nav class="gl-breadcrumb" aria-label="breadcrumb">' + html + '</nav>';
}


/* ══════════════════════════════════════════════════════════
   PART 2 — DOM-DEPENDENT
   Everything below needs HTML elements to exist.
   Runs after DOMContentLoaded.
══════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", function () {

  initTheme();
  renderAnnounceBar();
  renderNav();
  renderFooter();

});


/* ══════════════════════════════════════════════════════════
   DARK MODE
══════════════════════════════════════════════════════════ */
(function () {
  /* Apply saved theme immediately — prevents flash */
  var saved = localStorage.getItem("gl_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
})();

function initTheme() {
  var saved = localStorage.getItem("gl_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
}

function toggleTheme() {
  var current = document.documentElement.getAttribute("data-theme") || "light";
  var next    = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("gl_theme", next);
  updateThemeBtn();
}

function updateThemeBtn() {
  var btn = document.getElementById("themToggleBtn");
  if (!btn) return;
  var isDark = document.documentElement.getAttribute("data-theme") === "dark";
  btn.textContent = isDark ? "☀️" : "🌙";
  btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  btn.title = isDark ? "Light mode" : "Dark mode";
}


/* ══════════════════════════════════════════════════════════
   ANNOUNCE BAR
══════════════════════════════════════════════════════════ */
function renderAnnounceBar() {
  var el = document.getElementById("announce-bar");
  if (!el) return;

  var msg = "🚀 GigLega Beta is LIVE in Gurugram! &nbsp;·&nbsp; Post or find gigs instantly &nbsp;·&nbsp; 6% support fee only on completion";

  el.innerHTML = [
    '<div class="announce-bar">',
      '<span class="announce-text">' + msg + '</span>',
      '<button class="announce-close" id="announceClose" aria-label="Close">✕</button>',
    '</div>'
  ].join("");

  var style = document.createElement("style");
  style.textContent = [
    ".announce-bar{background:linear-gradient(90deg,var(--primary,#1a3c5e) 0%,var(--teal,#0d9488) 100%);color:#fff;text-align:center;padding:9px 48px 9px 16px;font-size:.8rem;font-weight:600;position:relative;line-height:1.5}",
    ".announce-close{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;color:rgba(255,255,255,.7);font-size:1rem;cursor:pointer;padding:4px;line-height:1}",
    ".announce-close:hover{color:#fff}"
  ].join("");
  document.head.appendChild(style);

  var closeBtn = document.getElementById("announceClose");
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      el.style.display = "none";
      sessionStorage.setItem("gl_announce_closed", "1");
    });
  }

  if (sessionStorage.getItem("gl_announce_closed") === "1") {
    el.style.display = "none";
  }
}


/* ══════════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════════ */
(function () {
  var _style = document.createElement("style");
  _style.textContent = [
    /* Nav base */
    ".gl-nav{background:var(--surface,#fff);border-bottom:1.5px solid var(--gray-200,#e5e7eb);position:sticky;top:0;z-index:1000;box-shadow:0 1px 8px rgba(0,0,0,.06)}",
    ".gl-nav-inner{max-width:1200px;margin:0 auto;padding:0 16px;display:flex;align-items:center;height:64px;gap:12px}",

    /* Logo */
    ".gl-logo{font-size:1.4rem;font-weight:900;color:var(--primary,#1a3c5e);text-decoration:none;letter-spacing:-1px;flex-shrink:0}",
    ".gl-logo span{color:var(--teal,#0d9488)}",
    ".gl-logo .badge-beta{font-size:.55rem;font-weight:800;background:var(--accent,#f59e0b);color:#fff;padding:2px 6px;border-radius:8px;vertical-align:super;letter-spacing:.3px;margin-left:3px}",

    /* Desktop links */
    ".gl-nav-links{display:flex;align-items:center;gap:2px;margin-left:16px}",
    ".gl-nav-link{padding:8px 14px;border-radius:8px;font-size:.875rem;font-weight:600;color:var(--gray-600,#4b5563);text-decoration:none;transition:all .2s;white-space:nowrap}",
    ".gl-nav-link:hover{background:var(--gray-50,#f9fafb);color:var(--primary,#1a3c5e)}",
    ".gl-nav-link.active{background:rgba(13,148,136,.1);color:var(--teal,#0d9488)}",

    /* Spacer */
    ".gl-nav-spacer{flex:1}",

    /* Right actions */
    ".gl-nav-actions{display:flex;align-items:center;gap:8px}",

    /* Theme toggle */
    ".gl-theme-btn{background:none;border:1.5px solid var(--gray-200,#e5e7eb);border-radius:10px;width:38px;height:38px;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;transition:all .2s;color:var(--gray-600,#4b5563);flex-shrink:0}",
    ".gl-theme-btn:hover{border-color:var(--teal,#0d9488);color:var(--teal,#0d9488)}",

    /* CTA buttons */
    ".gl-btn-ghost{padding:8px 16px;border:1.5px solid var(--gray-200,#e5e7eb);border-radius:10px;font-size:.85rem;font-weight:700;color:var(--gray-600,#4b5563);background:transparent;cursor:pointer;text-decoration:none;transition:all .2s;white-space:nowrap}",
    ".gl-btn-ghost:hover{border-color:var(--teal,#0d9488);color:var(--teal,#0d9488)}",
    ".gl-btn-cta{padding:8px 18px;background:linear-gradient(135deg,var(--primary,#1a3c5e) 0%,var(--teal,#0d9488) 100%);color:#fff;border:none;border-radius:10px;font-size:.85rem;font-weight:700;cursor:pointer;text-decoration:none;transition:opacity .2s,transform .15s;white-space:nowrap}",
    ".gl-btn-cta:hover{opacity:.88;transform:translateY(-1px)}",

    /* User menu */
    ".gl-user-menu{position:relative}",
    ".gl-user-trigger{display:flex;align-items:center;gap:8px;padding:6px 12px 6px 6px;border:1.5px solid var(--gray-200,#e5e7eb);border-radius:12px;background:var(--surface,#fff);cursor:pointer;transition:border .2s;font-size:.85rem;font-weight:600;color:var(--gray-700,#374151)}",
    ".gl-user-trigger:hover{border-color:var(--teal,#0d9488)}",
    ".gl-user-avatar{width:30px;height:30px;border-radius:50%;background:var(--primary,#1a3c5e);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;overflow:hidden;flex-shrink:0}",
    ".gl-user-avatar img{width:100%;height:100%;object-fit:cover}",
    ".gl-user-name{max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",

    /* Dropdown */
    ".gl-dropdown{position:absolute;top:calc(100% + 8px);right:0;background:var(--surface,#fff);border:1.5px solid var(--gray-200,#e5e7eb);border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.12);min-width:200px;z-index:1001;overflow:hidden;display:none}",
    ".gl-dropdown.open{display:block;animation:ddIn .18s ease}",
    "@keyframes ddIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}",
    ".gl-dd-header{padding:14px 16px;border-bottom:1px solid var(--gray-100,#f3f4f6)}",
    ".gl-dd-name{font-size:.9rem;font-weight:700;color:var(--primary,#1a3c5e)}",
    ".gl-dd-email{font-size:.75rem;color:var(--gray-400,#9ca3af);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".gl-dd-item{display:flex;align-items:center;gap:10px;padding:11px 16px;font-size:.85rem;font-weight:600;color:var(--gray-700,#374151);text-decoration:none;cursor:pointer;transition:background .15s;border:none;background:none;width:100%;text-align:left}",
    ".gl-dd-item:hover{background:var(--gray-50,#f9fafb);color:var(--primary,#1a3c5e)}",
    ".gl-dd-item.danger{color:var(--danger,#ef4444)}",
    ".gl-dd-item.danger:hover{background:rgba(239,68,68,.06)}",
    ".gl-dd-divider{height:1px;background:var(--gray-100,#f3f4f6);margin:4px 0}",

    /* Hamburger */
    ".gl-hamburger{display:none;flex-direction:column;justify-content:center;gap:5px;width:38px;height:38px;border:1.5px solid var(--gray-200,#e5e7eb);border-radius:10px;background:none;cursor:pointer;padding:8px;flex-shrink:0}",
    ".gl-hamburger span{display:block;height:2px;background:var(--gray-600,#4b5563);border-radius:1px;transition:all .25s}",
    ".gl-hamburger.open span:nth-child(1){transform:translateY(7px) rotate(45deg)}",
    ".gl-hamburger.open span:nth-child(2){opacity:0;transform:scaleX(0)}",
    ".gl-hamburger.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}",

    /* Mobile drawer */
    ".gl-mobile-menu{display:none;flex-direction:column;border-top:1.5px solid var(--gray-200,#e5e7eb);background:var(--surface,#fff);padding:12px 16px 16px}",
    ".gl-mobile-menu.open{display:flex}",
    ".gl-mobile-link{padding:11px 14px;border-radius:10px;font-size:.9rem;font-weight:600;color:var(--gray-700,#374151);text-decoration:none;transition:background .15s;border:none;background:none;cursor:pointer;text-align:left;width:100%}",
    ".gl-mobile-link:hover{background:var(--gray-50,#f9fafb);color:var(--primary,#1a3c5e)}",
    ".gl-mobile-link.active{color:var(--teal,#0d9488);background:rgba(13,148,136,.08)}",
    ".gl-mobile-divider{height:1px;background:var(--gray-200,#e5e7eb);margin:8px 0}",
    ".gl-mobile-actions{display:flex;gap:8px;margin-top:8px}",
    ".gl-mobile-actions .gl-btn-ghost,.gl-mobile-actions .gl-btn-cta{flex:1;text-align:center;padding:10px}",

    /* Dark mode nav overrides */
    "[data-theme=dark] .gl-nav{background:var(--gray-900,#111827);border-color:var(--gray-700,#374151)}",
    "[data-theme=dark] .gl-dropdown{background:var(--gray-900,#111827);border-color:var(--gray-700,#374151)}",
    "[data-theme=dark] .gl-dd-header{border-color:var(--gray-700,#374151)}",
    "[data-theme=dark] .gl-dd-item:hover{background:var(--gray-800,#1f2937)}",
    "[data-theme=dark] .gl-dd-divider{background:var(--gray-700,#374151)}",
    "[data-theme=dark] .gl-user-trigger{background:var(--gray-900,#111827);border-color:var(--gray-700,#374151);color:var(--gray-200,#e5e7eb)}",
    "[data-theme=dark] .gl-mobile-menu{background:var(--gray-900,#111827);border-color:var(--gray-700,#374151)}",
    "[data-theme=dark] .gl-nav-link:hover{background:var(--gray-800,#1f2937)}",
    "[data-theme=dark] .gl-mobile-link:hover{background:var(--gray-800,#1f2937)}",
    "[data-theme=dark] .gl-theme-btn{border-color:var(--gray-600,#4b5563);color:var(--gray-300,#d1d5db)}",
    "[data-theme=dark] .gl-btn-ghost{border-color:var(--gray-600,#4b5563);color:var(--gray-300,#d1d5db)}",

    /* Responsive */
    "@media(max-width:768px){.gl-nav-links{display:none}.gl-hamburger{display:flex}.gl-user-name{display:none}}"
  ].join("");
  document.head.appendChild(_style);
})();

function renderNav() {
  var el = document.getElementById("main-nav");
  if (!el) return;

  var user    = getCurrentUser();
  var page    = currentPage();
  var isDark  = document.documentElement.getAttribute("data-theme") === "dark";

  var navLinks = [
    { label: "Browse Gigs",  href: "browse.html" },
    { label: "Post a Gig",   href: "post-gig.html" },
    { label: "How It Works", href: "about.html" },
    { label: "Enterprise",   href: "enterprise.html" }
  ];

  /* Desktop nav links */
  var linksHtml = navLinks.map(function (l) {
    var active = page === l.href ? " active" : "";
    return '<a href="' + l.href + '" class="gl-nav-link' + active + '">' + l.label + '</a>';
  }).join("");

  /* Mobile nav links */
  var mobileLinksHtml = navLinks.map(function (l) {
    var active = page === l.href ? " active" : "";
    return '<a href="' + l.href + '" class="gl-mobile-link' + active + '">' + l.label + '</a>';
  }).join("");

  /* Right actions — logged in vs logged out */
  var rightHtml = "";
  var mobileActionsHtml = "";

  if (user) {
    /* Avatar initials or photo */
    var initials = (user.name || "GL").split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
    var avatarInner = user.avatar
      ? '<img src="' + user.avatar + '" alt="avatar" />'
      : initials;

    var firstName  = (user.name || "User").split(" ")[0];
    var emailOrPh  = user.email || user.phone || "";

    rightHtml =
      '<div class="gl-user-menu" id="userMenu">' +
        '<button class="gl-user-trigger" id="userTrigger" aria-haspopup="true" aria-expanded="false">' +
          '<div class="gl-user-avatar">' + avatarInner + '</div>' +
          '<span class="gl-user-name">' + escHtml(firstName) + '</span>' +
          '<span>▾</span>' +
        '</button>' +
        '<div class="gl-dropdown" id="userDropdown" role="menu">' +
          '<div class="gl-dd-header">' +
            '<div class="gl-dd-name">' + escHtml(user.name || "User") + '</div>' +
            '<div class="gl-dd-email">' + escHtml(emailOrPh) + '</div>' +
          '</div>' +
          '<a href="dashboard-worker.html" class="gl-dd-item" role="menuitem">⚡ Worker Dashboard</a>' +
          '<a href="dashboard-client.html" class="gl-dd-item" role="menuitem">📋 Poster Dashboard</a>' +
          '<a href="profile.html" class="gl-dd-item" role="menuitem">👤 My Profile</a>' +
          '<div class="gl-dd-divider"></div>' +
          '<a href="browse.html" class="gl-dd-item" role="menuitem">🔍 Browse Gigs</a>' +
          '<a href="post-gig.html" class="gl-dd-item" role="menuitem">➕ Post a Gig</a>' +
          '<div class="gl-dd-divider"></div>' +
          '<a href="wallet.html" class="gl-dd-item" role="menuitem">💰 My Wallet</a>' +
          '<a href="notifications.html" class="gl-dd-item" role="menuitem">🔔 Notifications</a>' +
          '<a href="help-center.html" class="gl-dd-item" role="menuitem">❓ Help Center</a>' +
          '<button class="gl-dd-item danger" id="ddLogout" role="menuitem">🚪 Logout</button>' +
        '</div>' +
      '</div>';

    mobileActionsHtml =
      '<div class="gl-mobile-divider"></div>' +
      '<a href="dashboard-worker.html" class="gl-mobile-link">⚡ Worker Dashboard</a>' +
      '<a href="dashboard-client.html" class="gl-mobile-link">📋 Poster Dashboard</a>' +
      '<a href="profile.html" class="gl-mobile-link">👤 My Profile</a>' +
'<a href="wallet.html" class="gl-mobile-link">💰 My Wallet</a>' +
'<a href="notifications.html" class="gl-mobile-link">🔔 Notifications</a>' +
'<div class="gl-mobile-divider"></div>' +
'<button class="gl-mobile-link" id="mobileLogout" style="color:var(--danger)">🚪 Logout</button>';
  } else {
    rightHtml =
      '<a href="login.html" class="gl-btn-ghost">Login</a>' +
      '<a href="login.html?tab=register" class="gl-btn-cta">Register Free →</a>';

    mobileActionsHtml =
      '<div class="gl-mobile-divider"></div>' +
      '<div class="gl-mobile-actions">' +
        '<a href="login.html" class="gl-btn-ghost">Login</a>' +
        '<a href="login.html?tab=register" class="gl-btn-cta">Register Free →</a>' +
      '</div>';
  }

  el.innerHTML =
    '<div class="gl-nav">' +
      '<div class="gl-nav-inner">' +
        '<a href="index.html" class="gl-logo">Gig<span>Lega</span><span class="badge-beta">BETA</span></a>' +
        '<nav class="gl-nav-links" aria-label="Main navigation">' + linksHtml + '</nav>' +
        '<div class="gl-nav-spacer"></div>' +
        '<div class="gl-nav-actions">' +
          '<button class="gl-theme-btn" id="themToggleBtn" aria-label="Toggle theme">' + (isDark ? "☀️" : "🌙") + '</button>' +
          rightHtml +
          '<button class="gl-hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false">' +
            '<span></span><span></span><span></span>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="gl-mobile-menu" id="mobileMenu">' +
        mobileLinksHtml +
        mobileActionsHtml +
      '</div>' +
    '</div>';

  /* ── Theme toggle ── */
  document.getElementById("themToggleBtn").addEventListener("click", function () {
    toggleTheme();
  });

  /* ── User dropdown ── */
  var userTrigger  = document.getElementById("userTrigger");
  var userDropdown = document.getElementById("userDropdown");
  if (userTrigger && userDropdown) {
    userTrigger.addEventListener("click", function (e) {
      e.stopPropagation();
      var isOpen = userDropdown.classList.toggle("open");
      userTrigger.setAttribute("aria-expanded", isOpen);
    });
    document.addEventListener("click", function () {
      userDropdown.classList.remove("open");
      if (userTrigger) userTrigger.setAttribute("aria-expanded", "false");
    });
    userDropdown.addEventListener("click", function (e) { e.stopPropagation(); });
  }

  /* ── Logout buttons ── */
  var ddLogout = document.getElementById("ddLogout");
  if (ddLogout) ddLogout.addEventListener("click", function () {
    if (confirm("Are you sure you want to log out?")) safeLogout();
  });

  var mobileLogout = document.getElementById("mobileLogout");
  if (mobileLogout) mobileLogout.addEventListener("click", function () {
    if (confirm("Are you sure you want to log out?")) safeLogout();
  });

  /* ── Hamburger ── */
  var hamburger  = document.getElementById("hamburger");
  var mobileMenu = document.getElementById("mobileMenu");
  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", function () {
      var isOpen = mobileMenu.classList.toggle("open");
      hamburger.classList.toggle("open", isOpen);
      hamburger.setAttribute("aria-expanded", isOpen);
    });
  }

  /* ── Handle register tab param ── */
  if (page === "login.html" && getParam("tab") === "register") {
    var regTab = document.querySelector('[data-tab="register"]');
    if (regTab) regTab.click();
  }
}


/* ══════════════════════════════════════════════════════════
   FOOTER
══════════════════════════════════════════════════════════ */
(function () {
  var _style = document.createElement("style");
  _style.textContent = [
    ".gl-footer{background:var(--primary,#1a3c5e);color:#fff;padding:48px 16px 24px;margin-top:auto}",
    ".gl-footer-inner{max-width:1200px;margin:0 auto}",
    ".gl-footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:40px}",
    "@media(max-width:768px){.gl-footer-grid{grid-template-columns:1fr 1fr;gap:28px}}",
    "@media(max-width:480px){.gl-footer-grid{grid-template-columns:1fr}}",

    ".gl-footer-brand .logo{font-size:1.4rem;font-weight:900;letter-spacing:-1px;margin-bottom:10px}",
    ".gl-footer-brand .logo span{color:var(--teal,#0d9488)}",
    ".gl-footer-brand p{font-size:.83rem;color:rgba(255,255,255,.6);line-height:1.7;max-width:240px;margin-bottom:16px}",
    ".gl-footer-contact{display:flex;flex-direction:column;gap:6px}",
    ".gl-footer-contact a{font-size:.8rem;color:rgba(255,255,255,.65);text-decoration:none;display:flex;align-items:center;gap:6px;transition:color .2s}",
    ".gl-footer-contact a:hover{color:#fff}",

    ".gl-footer-col h4{font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:rgba(255,255,255,.5);margin-bottom:14px}",
    ".gl-footer-col a{display:block;font-size:.85rem;color:rgba(255,255,255,.7);text-decoration:none;margin-bottom:8px;transition:color .2s}",
    ".gl-footer-col a:hover{color:#fff}",

    ".gl-footer-bottom{border-top:1px solid rgba(255,255,255,.12);padding-top:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}",
    ".gl-footer-bottom-left{font-size:.78rem;color:rgba(255,255,255,.45);line-height:1.6}",
    ".gl-footer-bottom-right{display:flex;gap:16px}",
    ".gl-footer-bottom-right a{font-size:.78rem;color:rgba(255,255,255,.5);text-decoration:none;transition:color .2s}",
    ".gl-footer-bottom-right a:hover{color:#fff}",

    ".gl-footer-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.1);padding:6px 12px;border-radius:8px;font-size:.75rem;color:rgba(255,255,255,.7);margin-top:6px}"
  ].join("");
  document.head.appendChild(_style);
})();

function renderFooter() {
  var el = document.getElementById("main-footer");
  if (!el) return;

  var year = new Date().getFullYear();

  el.innerHTML =
    '<footer class="gl-footer">' +
      '<div class="gl-footer-inner">' +
        '<div class="gl-footer-grid">' +

          /* Brand col */
          '<div class="gl-footer-brand">' +
            '<div class="logo">Gig<span>Lega</span></div>' +
            '<p>Gurugram ka #1 hyperlocal & remote gig platform. Bachelors, students, and professionals — karo kaam, kamao daam.</p>' +
            '<div class="gl-footer-contact">' +
              '<a href="mailto:Giglega.official@gmail.com">📧 Giglega.official@gmail.com</a>' +
              '<a href="tel:+919319635257">📱 +91 9319635257</a>' +
              '<a href="#">📍 Gurugram, Haryana — 122017</a>' +
            '</div>' +
            '<div class="gl-footer-badge">🚀 Beta v1.0 — Launching 2026</div>' +
          '</div>' +

          /* For Workers col */
          '<div class="gl-footer-col">' +
            '<h4>For Workers</h4>' +
            '<a href="browse.html">Browse Gigs</a>' +
            '<a href="dashboard-worker.html">My Dashboard</a>' +
            '<a href="profile.html">My Profile</a>' +
            '<a href="trust-safety.html">Trust & Safety</a>' +
            '<a href="help-center.html">Help Center</a>' +
            '<a href="index.html#faq">FAQ</a>' +
          '</div>' +

          /* For Posters col */
          '<div class="gl-footer-col">' +
            '<h4>For Posters</h4>' +
            '<a href="post-gig.html">Post a Gig</a>' +
            '<a href="dashboard-client.html">My Posted Gigs</a>' +
            '<a href="enterprise.html">Enterprise</a>' +
            '<a href="trust-safety.html">Safety Tips</a>' +
            '<a href="index.html#faq">FAQ</a>' +
          '</div>' +

          /* Company col */
          '<div class="gl-footer-col">' +
            '<h4>Company</h4>' +
            '<a href="about.html">About GigLega</a>' +
            '<a href="contact.html">Contact Us</a>' +
            '<a href="terms.html">Terms of Service</a>' +
            '<a href="privacy-policy.html">Privacy Policy</a>' +
            '<a href="trust-safety.html">Trust & Safety</a>' +
          '</div>' +

        '</div>' +

        '<div class="gl-footer-bottom">' +
          '<div class="gl-footer-bottom-left">' +
            '© ' + year + ' GigLega. All rights reserved. &nbsp;·&nbsp; Made with ❤️ in Gurugram, India' +
          '</div>' +
          '<div class="gl-footer-bottom-right">' +
            '<a href="terms.html">Terms</a>' +
            '<a href="privacy-policy.html">Privacy</a>' +
            '<a href="contact.html">Contact</a>' +
          '</div>' +
        '</div>' +

      '</div>' +
    '</footer>';
   /* ── PWA: Register Service Worker ── */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/service-worker.js")
      .then(function (reg) {
        console.log("[GigLega] SW registered:", reg.scope);
      })
      .catch(function (err) {
        console.warn("[GigLega] SW failed:", err);
      });
  });
}

/* ── PWA: Install prompt ── */
var deferredPrompt = null;
window.addEventListener("beforeinstallprompt", function (e) {
  e.preventDefault();
  deferredPrompt = e;

  /* Show "Install App" button if it exists on the page */
  var installBtn = document.getElementById("btnInstallApp");
  if (installBtn) {
    installBtn.style.display = "inline-flex";
    installBtn.addEventListener("click", function () {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (result) {
        if (result.outcome === "accepted") {
          if (typeof showToast === "function") showToast("🎉 GigLega installed!", "success");
        }
        deferredPrompt = null;
        installBtn.style.display = "none";
      });
    });
  }
});
}
