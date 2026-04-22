// auth-router.js — GigLega v2.1: Centralised role-based routing
// ES Module — import in any <script type="module"> page
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

/* ── Role → dashboard mapping ─────────────────────────────── */
export const ROLE_ROUTES = {
  tasker:     'dashboard-worker.html',
  worker:     'dashboard-worker.html',
  poster:     'dashboard-client.html',
  client:     'dashboard-client.html',
  enterprise: 'dashboard-enterprise.html',
  admin:      'dashboard-admin.html',
};

/* ── Normalize role aliases ──────────────────────────────── */
export function normalizeRole(role) {
  if (!role) return 'tasker';
  if (role === 'worker') return 'tasker';
  if (role === 'client') return 'poster';
  return role;
}

/* ── Internal helpers ─────────────────────────────────────── */
function redirectToLogin(currentPage) {
  window.location.href = 'login.html?redirect=' + encodeURIComponent(currentPage || '');
}

function redirectToDashboard(role) {
  const target = ROLE_ROUTES[role] || ROLE_ROUTES[normalizeRole(role)] || 'dashboard-worker.html';
  if (!window.location.href.includes(target)) {
    window.location.href = target;
  }
}

async function getUserData(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.warn('[GigLega] auth-router getUserData:', e);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════
   routeByRole(requiredRole, onSuccess)
   ─ Enforces login + role. Admins bypass role check.
   ─ requiredRole: 'tasker'|'poster'|'enterprise'|'admin'|null
   ─ Pass null to allow any authenticated + onboarded user
   ─ onSuccess(user, userData) called when all checks pass
════════════════════════════════════════════════════════════ */
export function routeByRole(requiredRole, onSuccess) {
  const currentPage = window.location.pathname.split('/').pop();
  onAuthStateChanged(auth, async (user) => {
    if (!user) { redirectToLogin(currentPage); return; }
    const data = await getUserData(user.uid);
    if (!data || !data.onboardingComplete) {
      window.location.href = 'onboarding.html'; return;
    }
    const role     = data.role || 'tasker';
    const normRole = normalizeRole(role);
    const normReq  = requiredRole ? normalizeRole(requiredRole) : null;
    /* Admin bypasses all role checks */
    if (role === 'admin') {
      if (typeof onSuccess === 'function') onSuccess(user, data);
      return;
    }
    if (normReq && normRole !== normReq) {
      redirectToDashboard(role); return;
    }
    if (typeof onSuccess === 'function') onSuccess(user, data);
  });
}

/* ═══════════════════════════════════════════════════════════
   requireAuth(onSuccess)
   ─ Enforces login only — no role check, no onboarding check
════════════════════════════════════════════════════════════ */
export function requireAuth(onSuccess) {
  const currentPage = window.location.pathname.split('/').pop();
  onAuthStateChanged(auth, (user) => {
    if (!user) { redirectToLogin(currentPage); return; }
    if (typeof onSuccess === 'function') onSuccess(user);
  });
}

/* ═══════════════════════════════════════════════════════════
   getCurrentRole() → Promise<string|null>
════════════════════════════════════════════════════════════ */
export async function getCurrentRole() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) { resolve(null); return; }
      const data = await getUserData(user.uid);
      resolve(data ? normalizeRole(data.role) : null);
    });
  });
}
