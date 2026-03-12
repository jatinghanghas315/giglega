"use strict";

/* =========================================================
   GigLega — shared.js
   Shared JavaScript for all pages
   ========================================================= */

const GL = {
  STORAGE_KEY_AUTH: "giglega_auth_token",
  STORAGE_KEY_USER: "giglega_user",
  STORAGE_KEY_USERS: "giglega_users",
  STORAGE_KEY_GIGS: "giglega_gigs",
  STORAGE_KEY_APPS: "giglega_applications",
  STORAGE_KEY_CONTACTS: "giglega_contacts",
  STORAGE_KEY_ANNOUNCE: "giglega_announce_dismissed",
  STORAGE_KEY_THEME: "giglega_theme",
  TOAST_DURATION: 4000,
  DEBOUNCE_SEARCH: 300,
  SCROLL_THRESHOLD: 300,
  WA_NUMBER: "919319635257",
  PHONE: "+91 93196 35257",
  EMAIL: "Giglega.official@gmail.com",
  ADDRESS: "H.no 82 Om Vihar Phase 1, Palam Vihar Extn, Gurugram",
  VERSION: "Beta"
};

/* =========================================================
   Utilities
   ========================================================= */

function formatCurrency(amount, compact = false) {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "₹0";
  if (compact && amount >= 1000) {
    const k = amount / 1000;
    return `₹${k % 1 === 0 ? k : k.toFixed(1)}k`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatRelativeTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";

  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Abhi";
  if (diffMin < 60) return `${diffMin} min pehle`;
  if (diffH < 24) return `${diffH} ghante pehle`;
  if (diffD < 7) return `${diffD} din pehle`;
  return formatDate(d);
}

function truncateText(str, len) {
  if (typeof str !== "string") return "";
  return str.length <= len ? str : `${str.slice(0, len).trimEnd()}…`;
}

function getInitials(name) {
  if (!name || typeof name !== "string") return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

function throttle(fn, ms) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn.apply(this, args);
    }
  };
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function safeJSON(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function lsGet(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value !== null ? safeJSON(value, value) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  } catch (err) {
    console.warn("GigLega lsSet error:", err);
  }
}

function lsRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

function showEl(elOrId) {
  const el = typeof elOrId === "string" ? document.getElementById(elOrId) : elOrId;
  if (!el) return;
  el.classList.remove("hidden");
  if (el.style.display === "none") el.style.display = "";
}

function hideEl(elOrId) {
  const el = typeof elOrId === "string" ? document.getElementById(elOrId) : elOrId;
  if (!el) return;
  el.style.display = "none";
}

function toggleEl(elOrId) {
  const el = typeof elOrId === "string" ? document.getElementById(elOrId) : elOrId;
  if (!el) return;
  el.style.display = el.style.display === "none" ? "" : "none";
}

/* =========================================================
   Auth
   ========================================================= */

function isLoggedIn() {
  return lsGet(GL.STORAGE_KEY_AUTH) === "logged_in";
}

function getCurrentUser() {
  return lsGet(GL.STORAGE_KEY_USER, null);
}

function logout(redirect = "index.html") {
  lsRemove(GL.STORAGE_KEY_AUTH);
  lsRemove(GL.STORAGE_KEY_USER);
  showToast("Aap log out ho gaye! 👋", "info");
  setTimeout(() => {
    window.location.href = redirect;
  }, 800);
}

/* 🔴 BUG #1 FIX — Logout confirmation modal */
function showLogoutConfirm(onConfirm) {
  if (document.getElementById("glLogoutModal")) return;
  const overlay = document.createElement("div");
  overlay.id = "glLogoutModal";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);" +
    "display:flex;align-items:center;justify-content:center;padding:20px;";
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:22px;padding:32px 28px;
      max-width:360px;width:100%;text-align:center;
      box-shadow:0 24px 64px rgba(0,0,0,0.22);font-family:inherit;">
      <div style="font-size:2.8rem;margin-bottom:12px;">👋</div>
      <h3 style="margin:0 0 8px;font-size:1.15rem;font-weight:800;letter-spacing:-0.02em;">
        Logout karna chahte ho?
      </h3>
      <p style="margin:0 0 24px;font-size:0.9rem;color:#64748b;line-height:1.6;">
        Tumhari session clear ho jayegi.<br>Wapas login karke access kar sakte ho.
      </p>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button id="glLogoutCancel"
          style="padding:11px 24px;border-radius:12px;border:1.5px solid #e2e8f0;
          background:#fff;font-size:0.9rem;font-weight:700;cursor:pointer;
          font-family:inherit;color:#334155;">
          Cancel
        </button>
        <button id="glLogoutConfirm"
          style="padding:11px 24px;border-radius:12px;border:none;
          background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;
          font-size:0.9rem;font-weight:800;cursor:pointer;font-family:inherit;">
          Logout 🚪
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById("glLogoutCancel").onclick = () => overlay.remove();
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById("glLogoutConfirm").onclick = () => {
    overlay.remove();
    if (typeof onConfirm === "function") onConfirm();
  };
}

function safeLogout() {
  showLogoutConfirm(() => logout("index.html"));
}

function requireAuth(redirectBack = "") {
  if (!isLoggedIn()) {
    const dest = "signup.html" + (redirectBack ? `?next=${encodeURIComponent(redirectBack)}` : "");
    window.location.href = dest;
    return false;
  }
  return true;
}

/* =========================================================
   Announcement Bar
   ========================================================= */

function initAnnounceBar() {
  let bar = document.getElementById("announce-bar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "announce-bar";
    document.body.prepend(bar);
  }

  const dismissed = sessionStorage.getItem(GL.STORAGE_KEY_ANNOUNCE) === "yes";
  if (dismissed) {
    bar.classList.add("hidden");
    return;
  }

  bar.innerHTML = `
    <span class="announce-text">
      <strong>GigLega ${GL.VERSION}</strong> ab Gurugram mein live hai!
      <a href="signup.html" style="font-weight:800;text-decoration:underline;">Join Karo, Free Hai</a>
    </span>
    <button id="announce-close" aria-label="Close announcement">×</button>
  `;

  const closeBtn = document.getElementById("announce-close");
  closeBtn?.addEventListener("click", () => {
    bar.classList.add("hidden");
    sessionStorage.setItem(GL.STORAGE_KEY_ANNOUNCE, "yes");
  });
}

/* =========================================================
   Navbar
   ========================================================= */

function initNavbar() {
  const navEl = document.getElementById("navbar");
  if (!navEl) return;

  const user = getCurrentUser();
  const loggedIn = isLoggedIn();

  const guestCTAs = `
    <div class="nav-ctas" id="nav-guest">
      <a href="signup.html?tab=login" class="btn-login">Log In</a>
      <a href="signup.html" class="btn-signup">Free Mein Judo!</a>
    </div>
  `;

  /* 🔴 BUG #1 FIX — teal avatar link (not red logout circle) + BUG #8 role-aware dashLink */
  const dashLink = user?.role === "client" ? "dashboard-client.html" : "dashboard-worker.html";

  const userCTAs = `
    <div class="nav-user visible" id="nav-user">
      <a href="${dashLink}"
        style="width:34px;height:34px;border-radius:50%;
        background:linear-gradient(135deg,var(--teal,#0d9488),#0369a1);
        color:#fff;font-weight:900;font-size:0.85rem;
        display:flex;align-items:center;justify-content:center;
        text-decoration:none;flex-shrink:0;border:2px solid rgba(255,255,255,0.3);"
        title="Dashboard — ${user?.name || "User"}">
        ${getInitials(user?.name || "User")}
      </a>
      <span class="user-name-nav">${truncateText(user?.name || "User", 14)}</span>
      <a href="${dashLink}" class="btn-login btn-sm">Dashboard</a>
      <button class="btn-logout btn-sm" id="nav-logout-btn"
        style="background:#fff5f5;color:#dc2626;border:1.5px solid #fecaca;">
        Logout
      </button>
    </div>
  `;

  navEl.innerHTML = `
    <div class="nav-inner">
      <a href="index.html" class="nav-logo" aria-label="GigLega Home">
        <span class="gig">Gig</span><span class="lega">Lega</span><sup>${GL.VERSION}</sup>
      </a>

      <div class="nav-location">
        <button class="location-btn" id="location-btn" aria-expanded="false">
          <span class="pin"></span>
          <span id="selected-city">Gurugram</span>
          <span class="chevron"></span>
        </button>
        <ul class="location-dropdown" id="location-dropdown" role="listbox">
          <li class="active" data-city="Gurugram">Gurugram <span class="coming-soon-badge">Active</span></li>
          <li data-city="Delhi">Delhi <span class="coming-soon-badge">Soon</span></li>
          <li data-city="Noida">Noida <span class="coming-soon-badge">Soon</span></li>
          <li data-city="Faridabad">Faridabad <span class="coming-soon-badge">Soon</span></li>
        </ul>
      </div>

      <nav class="nav-links" aria-label="Main Navigation">
        <a href="index.html" data-nav="home">Home</a>
        <a href="browse.html" data-nav="browse">Browse Gigs</a>
        <a href="post-gig.html" data-nav="post">Post a Gig</a>
        <a href="index.html#how-it-works" data-nav="how">How It Works</a>
        <a href="${dashLink}" data-nav="dashboard">Dashboard</a>
        <a href="contact.html" data-nav="contact">Contact</a>
      </nav>

      ${loggedIn ? userCTAs : guestCTAs}

      <button class="hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  `;

  let mobileNav = document.getElementById("mobile-nav");
  if (!mobileNav) {
    mobileNav = document.createElement("div");
    mobileNav.id = "mobile-nav";
    mobileNav.setAttribute("aria-label", "Mobile Navigation");
    document.body.appendChild(mobileNav);
  }

  mobileNav.innerHTML = `
    <a href="index.html" data-nav="home">Home</a>
    <a href="browse.html" data-nav="browse">Browse Gigs</a>
    <a href="post-gig.html" data-nav="post">Post a Gig</a>
    <a href="index.html#how-it-works" data-nav="how">How It Works</a>
    <a href="${dashLink}" data-nav="dashboard">Dashboard</a>
    <a href="contact.html" data-nav="contact">Contact</a>
    <div class="mobile-ctas">
      ${
        loggedIn
          ? `<a href="${dashLink}" class="btn btn-secondary btn-sm">Dashboard</a>
             <button class="btn btn-outline btn-sm" id="mobile-logout-btn">Logout</button>`
          : `<a href="signup.html?tab=login" class="btn btn-outline-teal btn-sm">Log In</a>
             <a href="signup.html" class="btn btn-primary btn-sm">Free Mein Judo!</a>`
      }
    </div>
  `;

  const page = location.pathname.split("/").pop() || "index.html";
  const pageMap = {
    "index.html": "home",
    "browse.html": "browse",
    "post-gig.html": "post",
    "dashboard.html": "dashboard",
    "dashboard-client.html": "dashboard",
    "dashboard-worker.html": "dashboard",
    "contact.html": "contact"
  };
  const activeKey = pageMap[page];
  if (activeKey) {
    document.querySelectorAll(`[data-nav="${activeKey}"]`).forEach((el) => el.classList.add("active"));
  }

  const hamburger = document.getElementById("hamburger");
  hamburger?.addEventListener("click", () => {
    const isOpen = mobileNav.classList.toggle("open");
    hamburger.classList.toggle("open", isOpen);
    hamburger.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (e) => {
    if (!navEl.contains(e.target) && !mobileNav.contains(e.target)) {
      mobileNav.classList.remove("open");
      hamburger?.classList.remove("open");
      hamburger?.setAttribute("aria-expanded", "false");
    }
  });

  mobileNav.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      mobileNav.classList.remove("open");
      hamburger?.classList.remove("open");
      hamburger?.setAttribute("aria-expanded", "false");
    });
  });

  /* 🔴 BUG #11 FIX — safeLogout instead of logout */
  document.getElementById("nav-logout-btn")?.addEventListener("click", () => safeLogout());
  document.getElementById("mobile-logout-btn")?.addEventListener("click", () => safeLogout());

  const locBtn = document.getElementById("location-btn");
  const locDrop = document.getElementById("location-dropdown");

  locBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = locDrop.classList.toggle("open");
    locBtn.setAttribute("aria-expanded", String(isOpen));
  });

  locDrop?.querySelectorAll("li").forEach((li) => {
    li.addEventListener("click", () => {
      const city = li.dataset.city;
      if (city !== "Gurugram") {
        showToast(`${city} jald aayega! Abhi Gurugram enjoy karo 😄`, "info");
        locDrop.classList.remove("open");
        locBtn?.setAttribute("aria-expanded", "false");
        return;
      }
      locDrop.querySelectorAll("li").forEach((item) => item.classList.remove("active"));
      li.classList.add("active");
      const cityEl = document.getElementById("selected-city");
      if (cityEl) cityEl.textContent = city;
      locDrop.classList.remove("open");
      locBtn?.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", (e) => {
    if (!locBtn?.contains(e.target) && !locDrop?.contains(e.target)) {
      locDrop?.classList.remove("open");
      locBtn?.setAttribute("aria-expanded", "false");
    }
  });

  const stickyHandler = throttle(() => {
    navEl.style.boxShadow =
      window.scrollY > 8
        ? "0 4px 24px rgba(26,60,94,.14), 0 2px 18px rgba(26,60,94,.08)"
        : "";
  }, 100);

  window.addEventListener("scroll", stickyHandler, { passive: true });
}

/* =========================================================
   Footer
   ========================================================= */

function initFooter() {
  const footer = document.getElementById("footer");
  if (!footer) return;

  footer.innerHTML = `
    <div class="footer-inner">
      <div class="footer-brand">
        <a href="index.html" class="footer-logo" aria-label="GigLega Home">
          <span class="gig">Gig</span><span class="lega">Lega</span><sup>${GL.VERSION}</sup>
        </a>
        <p class="footer-tagline">
          Gurugram ka #1 hyperlocal gig platform.<br />
          Kaam Dhundo. Kaam Do. Saath Badhte Hain.
        </p>
        <div class="footer-social">
          <!-- 🟡 BUG #9 FIX — real GigLega social URLs -->
          <a href="https://www.instagram.com/giglega.official/" target="_blank" rel="noopener" class="social-icon" aria-label="Instagram"></a>
          <a href="https://wa.me/${GL.WA_NUMBER}" target="_blank" rel="noopener" class="social-icon" aria-label="WhatsApp"></a>
          <a href="https://www.linkedin.com/company/giglega/" target="_blank" rel="noopener" class="social-icon" aria-label="LinkedIn"></a>
          <a href="https://www.youtube.com/@giglega" target="_blank" rel="noopener" class="social-icon" aria-label="YouTube"></a>
        </div>
      </div>

      <div class="footer-col">
        <h4>Workers ke Liye</h4>
        <ul>
          <li><a href="browse.html">Find Gigs</a></li>
          <li><a href="signup.html">Register Karo</a></li>
          <li><a href="trust-safety.html">Trust & Safety</a></li>
          <li><a href="help-center.html">Resources</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4>Clients ke Liye</h4>
        <ul>
          <li><a href="post-gig.html">Post a Gig</a></li>
          <li><a href="enterprise.html">Enterprise</a></li>
          <li><a href="browse.html">Browse Workers</a></li>
          <li><a href="contact.html">Hire Fast</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4>Support</h4>
        <ul>
          <li><a href="contact.html">Contact Us</a></li>
          <li><a href="help-center.html">Help Center</a></li>
          <li><a href="trust-safety.html">Trust & Safety</a></li>
          <li><a href="terms.html">Terms of Service</a></li>
          <li><a href="privacy-policy.html">Privacy Policy</a></li>
        </ul>
      </div>

      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} GigLega. Sab rights reserved.</span>
        <div class="footer-bottom-links">
          <a href="terms.html">Terms</a>
          <a href="privacy-policy.html">Privacy Policy</a>
          <a href="contact.html">Contact</a>
        </div>
        <span class="footer-made">Made with ❤️ in Gurugram</span>
      </div>
    </div>
  `;
}

/* =========================================================
   Floating Action Buttons
   ========================================================= */

function initFABs() {
  let waFab = document.getElementById("fab-whatsapp");
  if (!waFab) {
    waFab = document.createElement("a");
    waFab.id = "fab-whatsapp";
    waFab.href = `https://wa.me/${GL.WA_NUMBER}`;
    waFab.target = "_blank";
    waFab.rel = "noopener noreferrer";
    waFab.title = "WhatsApp par baat karo";
    waFab.setAttribute("aria-label", "WhatsApp support");
    document.body.appendChild(waFab);
  }

  let topFab = document.getElementById("fab-top");
  if (!topFab) {
    topFab = document.createElement("button");
    topFab.id = "fab-top";
    topFab.title = "Wapas upar jao";
    topFab.setAttribute("aria-label", "Back to top");
    document.body.appendChild(topFab);
  }

  topFab.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const scrollHandler = throttle(() => {
    topFab.classList.toggle("visible", window.scrollY > GL.SCROLL_THRESHOLD);
  }, 150);

  window.addEventListener("scroll", scrollHandler, { passive: true });
}

/* =========================================================
   Toasts
   ========================================================= */

function getToastContainer() {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "false");
    document.body.appendChild(container);
  }
  return container;
}

const TOAST_ICONS = {
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️"
};

function showToast(message, type = "info", duration = GL.TOAST_DURATION) {
  const container = getToastContainer();
  const id = `toast-${uid()}`;
  const toast = document.createElement("div");
  toast.id = id;
  toast.className = `toast ${type}`;
  toast.setAttribute("role", "alert");
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
    <span class="toast-msg" style="flex:1;">${message}</span>
    <button class="toast-close" aria-label="Close notification" style="background:none;border:none;color:inherit;font-size:1rem;padding:0 0 0 8px;">×</button>
  `;
  container.appendChild(toast);

  toast.querySelector(".toast-close")?.addEventListener("click", () => dismissToast(id));

  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration);
  }

  return id;
}

function dismissToast(id) {
  const toast = document.getElementById(id);
  if (!toast) return;
  toast.style.opacity = "0";
  toast.style.transform = "translateX(24px)";
  setTimeout(() => toast.remove(), 250);
}

/* =========================================================
   Modals
   ========================================================= */

let _modalScrollY = 0;

function openModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  _modalScrollY = window.scrollY;
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.position = "fixed";
  document.body.style.top = `-${_modalScrollY}px`;
  document.body.style.width = "100%";
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";
  document.body.style.overflow = "";
  window.scrollTo({ top: _modalScrollY, behavior: "instant" });
}

function closeAllModals() {
  document.querySelectorAll(".modal-overlay.open").forEach((el) => closeModal(el.id));
}

function initModals() {
  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-modal-open]");
    if (opener) {
      e.preventDefault();
      openModal(opener.dataset.modalOpen);
      return;
    }

    if (e.target.closest("[data-modal-close]") || e.target.closest(".modal-close")) {
      const overlay = e.target.closest(".modal-overlay");
      if (overlay) closeModal(overlay.id);
      return;
    }

    if (e.target.classList.contains("modal-overlay")) {
      closeModal(e.target.id);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllModals();
  });
}

/* =========================================================
   Tabs
   ========================================================= */

function initTabs() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tab]");
    if (!btn) return;

    const group = btn.closest("[data-tab-group]");
    if (!group) return;

    const tabId = btn.dataset.tab;
    group.querySelectorAll("[data-tab]").forEach((b) => b.classList.remove("active"));
    group.querySelectorAll("[data-tab-panel]").forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    const panel = group.querySelector(`[data-tab-panel="${tabId}"]`);
    panel?.classList.add("active");
  });

  document.querySelectorAll("[data-tab-group]").forEach((group) => {
    const active = group.querySelector("[data-tab].active");
    const first = active || group.querySelector("[data-tab]");
    first?.click();
  });
}

/* =========================================================
   Forms
   ========================================================= */

function showFieldError(fieldOrId, message) {
  const field = typeof fieldOrId === "string" ? document.getElementById(fieldOrId) : fieldOrId;
  if (!field) return;

  field.classList.add("error");
  field.classList.remove("success");

  let fb = field.parentElement?.querySelector(".field-feedback");
  if (!fb) {
    fb = document.createElement("div");
    fb.className = "field-feedback error";
    field.parentElement?.appendChild(fb);
  }
  fb.className = "field-feedback error";
  fb.textContent = message;
}

function showFieldSuccess(fieldOrId, message = "") {
  const field = typeof fieldOrId === "string" ? document.getElementById(fieldOrId) : fieldOrId;
  if (!field) return;

  field.classList.remove("error");
  field.classList.add("success");

  let fb = field.parentElement?.querySelector(".field-feedback");
  if (!fb) {
    fb = document.createElement("div");
    fb.className = "field-feedback success";
    field.parentElement?.appendChild(fb);
  }
  fb.className = "field-feedback success";
  fb.textContent = message;
}

function clearFieldState(fieldOrId) {
  const field = typeof fieldOrId === "string" ? document.getElementById(fieldOrId) : fieldOrId;
  if (!field) return;
  field.classList.remove("error", "success");
  const fb = field.parentElement?.querySelector(".field-feedback");
  if (fb) fb.textContent = "";
}

function validateForm(rules = {}) {
  let valid = true;
  const errors = {};

  Object.entries(rules).forEach(([id, rule]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const value = String(el.value || "").trim();

    clearFieldState(el);

    if (rule.required && !value) {
      showFieldError(el, `${rule.label || "Yeh field"} required hai`);
      valid = false;
      errors[id] = "required";
      return;
    }

    if (rule.minLength && value && value.length < rule.minLength) {
      showFieldError(el, `${rule.label || "Field"} kam se kam ${rule.minLength} characters ka hona chahiye`);
      valid = false;
      errors[id] = "minLength";
      return;
    }

    if (rule.maxLength && value && value.length > rule.maxLength) {
      showFieldError(el, `${rule.label || "Field"} max ${rule.maxLength} characters ka hona chahiye`);
      valid = false;
      errors[id] = "maxLength";
      return;
    }

    if (rule.pattern && value && !rule.pattern.test(value)) {
      showFieldError(el, rule.patternMsg || `${rule.label || "Field"} valid format mein dalo`);
      valid = false;
      errors[id] = "pattern";
      return;
    }

    if (value) showFieldSuccess(el, "");
  });

  return { valid, errors };
}

function formatIndianPhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith("91")) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return raw;
}

function isValidIndianPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "").replace(/^91/, "");
  return /^[6-9]\d{9}$/.test(digits);
}

function initForms() {
  document.querySelectorAll("[data-counter]").forEach((input) => {
    const targetId = input.dataset.counter;
    const counter = document.getElementById(targetId);
    if (!counter) return;

    const update = () => {
      const max = input.maxLength > 0 ? input.maxLength : null;
      counter.textContent = max ? `${input.value.length}/${max} characters` : `${input.value.length} characters`;
    };

    update();
    input.addEventListener("input", update);
  });

  document.querySelectorAll("input[data-phone]").forEach((input) => {
    input.addEventListener("blur", () => {
      input.value = formatIndianPhone(input.value);
    });
  });

  document.querySelectorAll(".pw-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.closest(".pw-wrap")?.querySelector("input");
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "Hide" : "Show";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });
}

/* =========================================================
   Chips / Search / FAQ / Accordion
   ========================================================= */

function initFilterChips() {
  document.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip[data-filter]");
    if (chip) {
      const group = chip.closest("[data-chip-group]");
      if (group?.dataset.chipGroup === "single") {
        group.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      }
      chip.classList.toggle("active");
      chip.dispatchEvent(
        new CustomEvent("chipchange", {
          bubbles: true,
          detail: {
            filter: chip.dataset.filter,
            value: chip.dataset.value,
            active: chip.classList.contains("active")
          }
        })
      );
      return;
    }

    const clearBtn = e.target.closest(".chip-clear-all");
    if (clearBtn) {
      const bar = clearBtn.closest(".chip-bar");
      bar?.querySelectorAll(".chip.active").forEach((c) => c.classList.remove("active"));
      document.dispatchEvent(new CustomEvent("chipscleared", { bubbles: true }));
    }
  });
}

function initSearch() {
  document.querySelectorAll("[data-search]").forEach((input) => {
    const handler = debounce((e) => {
      const query = e.target.value.trim();
      input.dispatchEvent(
        new CustomEvent("searchquery", {
          bubbles: true,
          detail: { query, input: e.target }
        })
      );
    }, GL.DEBOUNCE_SEARCH);

    input.addEventListener("input", handler);

    if (input.dataset.searchClear) {
      const clearBtn = document.getElementById(input.dataset.searchClear);
      clearBtn?.addEventListener("click", () => {
        input.value = "";
        input.dispatchEvent(new Event("input"));
        input.focus();
      });
    }
  });
}

function initAccordions() {
  document.addEventListener("click", (e) => {
    const header = e.target.closest(".accordion-header");
    if (!header) return;

    const item = header.closest(".accordion-item");
    const section = item?.closest(".accordion-section");
    if (!item) return;

    const single = section?.dataset.accordionSingle !== "false";
    if (single && section) {
      section.querySelectorAll(".accordion-item.open").forEach((el) => {
        if (el !== item) el.classList.remove("open");
      });
    }

    item.classList.toggle("open");
  });
}

function initFaqSearch() {
  const input = document.getElementById("faq-search");
  if (!input) return;

  const filter = debounce((query) => {
    const q = query.toLowerCase().trim();
    document.querySelectorAll(".accordion-item").forEach((item) => {
      const match = !q || item.textContent.toLowerCase().includes(q);
      item.style.display = match ? "" : "none";
      if (match && q) item.classList.add("open");
    });
  }, GL.DEBOUNCE_SEARCH);

  input.addEventListener("input", (e) => filter(e.target.value));
}

/* =========================================================
   Smooth Scroll / Stats / Lazy / Fade
   ========================================================= */

function initSmoothScroll() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute("href");
    if (!hash || hash === "#") return;
    const target = document.querySelector(hash);
    if (!target) return;

    e.preventDefault();
    const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h") || "76", 10);
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
    history.pushState(null, "", hash);
  });
}

function initStatCounters() {
  const counters = document.querySelectorAll("[data-count-target]");
  if (!counters.length) return;

  const runCounter = (el) => {
    const target = parseInt(el.dataset.countTarget || "0", 10);
    const prefix = el.dataset.countPrefix || "";
    const suffix = el.dataset.countSuffix || "";
    const duration = parseInt(el.dataset.countDuration || "1800", 10);
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = `${prefix}${Math.floor(target * eased).toLocaleString("en-IN")}${suffix}`;
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      runCounter(entry.target);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.4 });

  counters.forEach((el) => observer.observe(el));
}

function initLazyImages() {
  const imgs = document.querySelectorAll("img[data-src]");
  if (!imgs.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      img.src = img.dataset.src;
      img.removeAttribute("data-src");
      img.classList.add("img-loaded");
      obs.unobserve(img);
    });
  }, { rootMargin: "200px 0px" });

  imgs.forEach((img) => observer.observe(img));
}

function initFadeAnimations() {
  const fadeEls = document.querySelectorAll(".fade-up");
  if (!fadeEls.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  fadeEls.forEach((el) => observer.observe(el));
}

/* =========================================================
   Loader / Skeleton
   ========================================================= */

function showLoader(message = "Thoda ruko...") {
  let overlay = document.getElementById("page-loader");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "page-loader";
    overlay.className = "loader-overlay";
    overlay.innerHTML = `
      <div class="loader-wrap">
        <div class="loader-ring"></div>
        <p class="loader-text">${message}</p>
      </div>
    `;
    document.body.appendChild(overlay);
  } else {
    const txt = overlay.querySelector(".loader-text");
    if (txt) txt.textContent = message;
  }
  void overlay.offsetWidth;
  overlay.classList.add("active");
}

function hideLoader() {
  document.getElementById("page-loader")?.classList.remove("active");
}

function showSkeleton(containerId, count = 6, variant = "gig") {
  const container = document.getElementById(containerId);
  if (!container) return;

  const html = Array(count)
    .fill(
      variant === "list"
        ? `<div class="skeleton-card"><div class="skeleton skeleton-line h-lg"></div><div class="skeleton skeleton-line"></div></div>`
        : `<div class="skeleton-card"><div class="skeleton skeleton-line h-lg"></div><div style="display:flex;gap:8px;margin-bottom:10px;"><div class="skeleton skeleton-badge"></div><div class="skeleton skeleton-badge"></div></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line h-sm" style="margin-top:8px;"></div></div>`
    )
    .join("");

  container.innerHTML = html;
  container.setAttribute("aria-busy", "true");
}

function hideSkeleton(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  container.setAttribute("aria-busy", "false");
}

/* =========================================================
   Pagination / Breadcrumb / Infinite Scroll
   ========================================================= */

function buildBreadcrumb(containerId, crumbs) {
  const el = document.getElementById(containerId);
  if (!el || !Array.isArray(crumbs)) return;

  const parts = crumbs.map((crumb, i) => {
    if (i === crumbs.length - 1) {
      return `<span class="breadcrumb-current" aria-current="page">${crumb.label}</span>`;
    }
    return `<a href="${crumb.href || "#"}">${crumb.label}</a><span class="breadcrumb-sep" aria-hidden="true"></span>`;
  });

  el.innerHTML = `<nav class="breadcrumb" aria-label="Breadcrumb">${parts.join("")}</nav>`;
}

function renderPagination(containerId, total, perPage, current, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  const btn = (label, page, cls = "", disabled = false) =>
    `<button class="page-btn ${cls}" data-page="${page}" ${disabled ? "disabled" : ""}>${label}</button>`;

  let html = `<nav class="pagination" aria-label="Pagination">`;
  html += btn("‹", current - 1, "prev", current === 1);

  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - current) <= 1) {
      html += btn(p, p, p === current ? "active" : "");
    } else if (p === current - 2 || p === current + 2) {
      html += `<span class="page-ellipsis">…</span>`;
    }
  }

  html += btn("›", current + 1, "next", current === totalPages);
  html += `</nav>`;

  container.innerHTML = html;

  container.querySelectorAll(".page-btn:not([disabled])").forEach((button) => {
    button.addEventListener("click", () => {
      const page = parseInt(button.dataset.page, 10);
      if (page >= 1 && page <= totalPages && page !== current) {
        onPageChange(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });
}

function setupLoadMore(sentinelId, callback, options = {}) {
  const sentinel = document.getElementById(sentinelId);
  if (!sentinel || typeof callback !== "function") return null;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      callback();
      if (options.once) observer.unobserve(sentinel);
    });
  }, { rootMargin: options.rootMargin || "100px" });

  observer.observe(sentinel);
  return observer;
}

/* =========================================================
   Role Cards / Dashboard Nav / Rating
   ========================================================= */

function initRoleCards() {
  document.querySelectorAll(".role-cards").forEach((group) => {
    group.querySelectorAll(".role-card").forEach((card) => {
      card.addEventListener("click", () => {
        group.querySelectorAll(".role-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        const hiddenInput = group.closest("form")?.querySelector('input[name="role"]');
        if (hiddenInput) hiddenInput.value = card.dataset.role || "";
      });
    });
  });
}

function initDashboardNav() {
  const items = document.querySelectorAll(".sidebar-nav-item[data-panel]");
  if (!items.length) return;

  items.forEach((item) => {
    item.addEventListener("click", () => {
      items.forEach((i) => i.classList.remove("active"));
      document.querySelectorAll(".dashboard-panel").forEach((p) => p.classList.remove("active"));
      item.classList.add("active");
      document.getElementById(item.dataset.panel)?.classList.add("active");
    });
  });

  const hash = location.hash.slice(1);
  const target = hash
    ? document.querySelector(`.sidebar-nav-item[data-panel="${hash}"]`)
    : items[0];

  target?.click();
}

function initStarRating() {
  document.querySelectorAll(".star-input-wrap").forEach((wrap) => {
    const caption = wrap.closest(".star-input-group")?.querySelector(".star-input-caption");
    const captions = {
      1: "Bahut bura",
      2: "Theek nahi tha",
      3: "Average raha",
      4: "Accha tha!",
      5: "Ekdum badhiya!"
    };

    wrap.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.addEventListener("change", () => {
        const val = parseInt(input.value, 10);
        if (caption) caption.textContent = captions[val] || "";
        wrap.dispatchEvent(new CustomEvent("ratingchange", { bubbles: true, detail: { rating: val } }));
      });
    });
  });
}

/* =========================================================
   Clipboard / Theme / WhatsApp
   ========================================================= */

async function copyToClipboard(text, successMsg = "Copy ho gaya!") {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    showToast(successMsg, "success", 2500);
    return true;
  } catch {
    showToast("Copy nahi ho saka. Manually copy karo.", "error");
    return false;
  }
}

function initClipboard() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    const text =
      btn.dataset.copy ||
      (btn.dataset.copyTarget ? document.getElementById(btn.dataset.copyTarget)?.textContent : "");
    if (text) copyToClipboard(text, btn.dataset.copyMsg || "Copy ho gaya!");
  });
}

function applyTheme(theme) {
  document.documentElement.classList.toggle("dark-mode", theme === "dark");
}

function toggleTheme() {
  const next = document.documentElement.classList.contains("dark-mode") ? "light" : "dark";
  applyTheme(next);
  lsSet(GL.STORAGE_KEY_THEME, next);
  showToast(next === "dark" ? "Dark mode on" : "Light mode on", "info", 1800);
}

function initTheme() {
  const saved = lsGet(GL.STORAGE_KEY_THEME);
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (systemDark ? "dark" : "light"));
}

function initThemeToggle() {
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-theme-toggle]")) toggleTheme();
  });
}

function openWhatsApp(message, number = GL.WA_NUMBER) {
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

function buildGigWAMessage(gig) {
  return `GigLega pe Naya Kaam!\n${gig.title}\n${gig.location}\n${formatCurrency(Number(gig.budget || 0))}\n${gig.category || "Gig"}\nAb apply karo: https://giglega.in/browse.html`;
}

/* =========================================================
   Gig Data Helpers
   ========================================================= */

function getAllGigs() {
  return lsGet(GL.STORAGE_KEY_GIGS, []);
}

function saveGig(gig) {
  const gigs = getAllGigs();
  const entry = {
    ...gig,
    id: uid(),
    postedAt: new Date().toISOString(),
    status: "active"
  };
  gigs.unshift(entry);
  lsSet(GL.STORAGE_KEY_GIGS, gigs);
  return entry;
}

function saveApplication(application) {
  const apps = lsGet(GL.STORAGE_KEY_APPS, []);
  const entry = {
    ...application,
    id: uid(),
    appliedAt: new Date().toISOString(),
    status: "pending"
  };
  apps.unshift(entry);
  lsSet(GL.STORAGE_KEY_APPS, apps);
  return entry;
}

function getApplicationsForGig(gigId) {
  return lsGet(GL.STORAGE_KEY_APPS, []).filter((a) => a.gigId === gigId);
}

function getApplicationsByUser(userId) {
  return lsGet(GL.STORAGE_KEY_APPS, []).filter((a) => a.userId === userId);
}

function getGigsByUser(userId) {
  return getAllGigs().filter((g) => g.postedBy === userId);
}

/* =========================================================
   User / Profile
   ========================================================= */

function saveUserProfile(updatedUser) {
  lsSet(GL.STORAGE_KEY_USER, updatedUser);
  const users = lsGet(GL.STORAGE_KEY_USERS, []);
  const idx = users.findIndex((u) => u.id === updatedUser.id);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updatedUser };
    lsSet(GL.STORAGE_KEY_USERS, users);
  }
}

/* 🟡 BUG #7 FIX — weighted profile completion */
function calcProfileCompletion(user) {
  if (!user) return 0;
  const fields = [
    { key: "name",     weight: 20 },
    { key: "phone",    weight: 20 },
    { key: "email",    weight: 15 },
    { key: "location", weight: 15 },
    { key: "role",     weight: 10 },
    { key: "bio",      weight: 10 },
    { key: "skills",   weight: 10 }
  ];
  return fields.reduce((total, f) => {
    return total + (user[f.key] && String(user[f.key]).trim().length > 0 ? f.weight : 0);
  }, 0);
}

/* 🟡 BUG #7 FIX — show what's missing to reach 100% */
function getCompletionTips(user) {
  if (!user) return [];
  const tips = [];
  if (!user.bio      || !String(user.bio).trim())      tips.push("About / Bio add karo (+10%)");
  if (!user.skills   || !String(user.skills).trim())   tips.push("Skills add karo (+10%)");
  if (!user.location || !String(user.location).trim()) tips.push("Location set karo (+15%)");
  if (!user.phone    || !String(user.phone).trim())    tips.push("Phone number dalo (+20%)");
  return tips;
}

function setButtonLoading(btn, loading, loadingText = "Loading...") {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = loadingText;
    btn.disabled = true;
    btn.classList.add("loading");
  } else {
    btn.textContent = btn.dataset.originalText || btn.textContent;
    btn.disabled = false;
    btn.classList.remove("loading");
  }
}

function saveContactForm(data) {
  const contacts = lsGet(GL.STORAGE_KEY_CONTACTS, []);
  const entry = { ...data, id: uid(), submittedAt: new Date().toISOString() };
  contacts.unshift(entry);
  lsSet(GL.STORAGE_KEY_CONTACTS, contacts);
  return entry;
}

/* =========================================================
   Init All
   ========================================================= */

function initAll() {
  initTheme();
  initAnnounceBar();
  initNavbar();
  initFooter();
  initFABs();
  initModals();
  initTabs();
  initForms();
  initFilterChips();
  initSearch();
  initAccordions();
  initFaqSearch();
  initSmoothScroll();
  initStatCounters();
  initLazyImages();
  initFadeAnimations();
  initClipboard();
  initThemeToggle();
  initRoleCards();
  initDashboardNav();
  initStarRating();
}

document.addEventListener("DOMContentLoaded", initAll);

/* =========================================================
   Global Exports
   ========================================================= */

Object.assign(window, {
  GL,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  truncateText,
  getInitials,
  debounce,
  throttle,
  uid,
  safeJSON,
  lsGet,
  lsSet,
  lsRemove,
  showEl,
  hideEl,
  toggleEl,
  isLoggedIn,
  getCurrentUser,
  logout,
  safeLogout,
  showLogoutConfirm,
  requireAuth,
  showToast,
  dismissToast,
  openModal,
  closeModal,
  closeAllModals,
  showLoader,
  hideLoader,
  showSkeleton,
  hideSkeleton,
  buildBreadcrumb,
  renderPagination,
  setupLoadMore,
  copyToClipboard,
  applyTheme,
  toggleTheme,
  openWhatsApp,
  buildGigWAMessage,
  getAllGigs,
  saveGig,
  saveApplication,
  getApplicationsForGig,
  getApplicationsByUser,
  getGigsByUser,
  saveUserProfile,
  calcProfileCompletion,
  getCompletionTips,
  setButtonLoading,
  saveContactForm,
  validateForm,
  showFieldError,
  showFieldSuccess,
  clearFieldState,
  formatIndianPhone,
  isValidIndianPhone
});
