// auth-router.js — GigLega Phase 1: Centralised role-based routing v1.0
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export const ROLE_ROUTES = {
  poster:     'dashboard-poster.html',
  tasker:     'dashboard-tasker.html',
  worker:     'dashboard-tasker.html',
  enterprise: 'enterprise.html',
  admin:      'dashboard-admin.html'
};

/**
 * Checks auth state, reads role from Firestore, redirects to correct dashboard.
 * @param {string|null} currentRole - Role this page is restricted to. Null = just enforce login.
 */
export function routeByRole(currentRole = null) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'login.html'; return; }
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists() || !snap.data().onboardingComplete) {
        window.location.href = 'onboarding.html'; return;
      }
      const role = snap.data().role || 'tasker';
      const target = ROLE_ROUTES[role];
      if (currentRole && role !== currentRole && role !== 'admin') {
        if (target) window.location.href = target;
        return;
      }
      if (!target) window.location.href = 'onboarding.html';
    } catch (err) {
      console.warn('[GigLega] routeByRole error:', err);
    }
  });
}

/**
 * Returns the current user's role string, or null if not logged in / not set.
 */
export async function getCurrentRole() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) { resolve(null); return; }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        resolve(snap.exists() ? (snap.data().role || null) : null);
      } catch (e) {
        console.warn('[GigLega] getCurrentRole error:', e);
        resolve(null);
      }
    });
  });
}
