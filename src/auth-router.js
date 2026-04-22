// auth-router.js — GigLega v2.0: Centralised role-based routing
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
  enterprise: 'enterprise.html',
  admin:      'dashboard-admin.html',
};

/* ── Internal helpers ─────────────────────────────────────── */
function redirectToLogin(currentPage) {
  window.location.href = 'login.html?redirect=' + encodeURIComponent(currentPage || '');
}

function redirectToDashboard(role) {
  const target = ROLE_ROUTES[role] || 'dashboard-worker.html';
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
   ─ requiredRole: 'tasker' | 'poster' | 'admin' | null
   ─ onSuccess(user, userData) called when all checks pass
   ─ Usage:
       import { routeByRole } from './auth-router.js';
       routeByRole('poster', (user, data) => {
         currentUser = user;
         loadDashboard(data);
       });
════════════════════════════════════════════════════════════ */
export function routeByRole(requiredRole, onSuccess) {
  const currentPage = window.location.pathname.split('/').pop();
  onAuthStateChanged(auth, async (user) => {
    if (!user) { redirectToLogin(currentPage); return; }
    const data = await getUserData(user.uid);
    if (!data || !data.onboardingComplete) {
      window.location.href = 'onboarding.html'; return;
    }
    const role = data.role || 'tasker';
    if (requiredRole && role !== requiredRole && role !== 'admin') {
      redirectToDashboard(role); return;
    }
    if (typeof onSuccess === 'function') onSuccess(user, data);
  });
}

/* ═══════════════════════════════════════════════════════════
   requireAuth(onSuccess)
   ─ Enforces login only — no role check
   ─ Usage:
       import { requireAuth } from './auth-router.js';
       requireAuth((user) => { currentUser = user; init(); });
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
   ─ Usage:
       import { getCurrentRole } from './auth-router.js';
       const role = await getCurrentRole();
════════════════════════════════════════════════════════════ */
export async function getCurrentRole() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) { resolve(null); return; }
      const data = await getUserData(user.uid);
      resolve(data ? (data.role || null) : null);
    });
  });
}
