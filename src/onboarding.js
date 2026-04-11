/* ════════════════════════════════════════════════════════════════
   GigLega Onboarding Tour v1.0
   ─ Spotlight-based step-by-step tour for new users
   ─ Separate flows: Worker (5 steps) | Poster (5 steps)
   ─ One-time only: tracked in Firestore users/{uid}.onboardingWorkerDone / onboardingPosterDone
   ─ Works on mobile (375px) and desktop
   ════════════════════════════════════════════════════════════════ */

(function (global) {
  "use strict";

  /* ──────────────────────────────────────
     TOUR DEFINITIONS
  ────────────────────────────────────── */
  var TOURS = {

    worker: [
      {
        targetId: "searchInput",
        title:    "Gigs Dhundho",
        body:     "Yahan apna kaam type karo — cleaning, delivery, web dev — sab milega.",
        position: "bottom"
      },
      {
        targetId: "chipRow",
        title:    "Category Filter",
        body:     "Yeh chips se apni category choose karo — sirf relevant gigs dikhenge.",
        position: "bottom"
      },
      {
        targetId: "gigsGrid",
        title:    "Gig Cards",
        body:     "Har card mein budget, location aur kaam ki detail hai. Card pe click karo details dekhne ke liye.",
        position: "top"
      },
      {
        targetId: "main-nav",
        title:    "Worker Dashboard",
        body:     "Upar menu mein 'Dashboard' se apne active gigs, earnings aur wallet dekh sakte ho.",
        position: "bottom"
      },
      {
        targetId: "main-nav",
        title:    "Bilkul Taiyar Ho!",
        body:     "Ab koi bhi gig open karo aur 'Book This Gig' dabao. Poster approve karega aur tumhare dashboard mein dikhega.",
        position: "bottom",
        isLast:   true
      }
    ],

    poster: [
      {
        targetId: "catGrid",
        title:    "Category Chuno",
        body:     "Pehle kaam ka type select karo — isi se workers ko filter karke dikhaya jaayega.",
        position: "bottom"
      },
      {
        targetId: "fTitle",
        title:    "Gig Title Daalo",
        body:     "Seedha aur clear title likho — 'Packing Helper Sector 37' jaisa. Workers yahi pehle padhte hain.",
        position: "bottom"
      },
      {
        targetId: "fBudget",
        title:    "Budget Set Karo",
        body:     "Kitna doge? Realistic rakho — zyada budget waale gigs pe zyada workers apply karte hain.",
        position: "bottom"
      },
      {
        targetId: "btnGps",
        title:    "Location Add Karo",
        body:     "Yeh button dabao — GPS se exact location pick ho jaayegi. Nearby workers hi dikhenge tumhara gig.",
        position: "bottom"
      },
      {
        targetId: "btnNext1",
        title:    "Bas 2 Steps Aur!",
        body:     "Date, time aur review ke baad gig live ho jaayega — bilkul free. Workers turant apply karna shuru kar denge.",
        position: "top",
        isLast:   true
      }
    ]
  };

  /* ──────────────────────────────────────
     FIRESTORE FLAG HELPERS
  ────────────────────────────────────── */
  async function getOnboardingFlags(uid) {
    try {
      var m = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
      var cfg = await import('./firebase-config.js');
      var snap = await m.getDoc(m.doc(cfg.db, 'users', uid));
      if (snap.exists()) return snap.data();
    } catch (e) {}
    return {};
  }

  async function markOnboardingDone(uid, type) {
    try {
      var m = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
      var cfg = await import('./firebase-config.js');
      var update = {};
      update['onboarding' + (type === 'poster' ? 'Poster' : 'Worker') + 'Done'] = true;
      await m.updateDoc(m.doc(cfg.db, 'users', uid), update);
    } catch (e) {}
    // Also store in localStorage as fast fallback
    try { localStorage.setItem('gl_ob_' + type, '1'); } catch(e) {}
  }

  function isMarkedLocally(type) {
    try { return localStorage.getItem('gl_ob_' + type) === '1'; } catch(e) { return false; }
  }

  /* ──────────────────────────────────────
     SPOTLIGHT OVERLAY BUILDER
  ────────────────────────────────────── */
  function buildOverlay() {
    var existing = document.getElementById('gl-tour-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'gl-tour-overlay';
    overlay.innerHTML =
      '<svg id="gl-tour-svg" style="position:fixed;inset:0;width:100%;height:100%;pointer-events:none;" aria-hidden="true">' +
        '<defs><mask id="gl-tour-mask"><rect width="100%" height="100%" fill="white"/>' +
          '<rect id="gl-tour-cutout" rx="8" ry="8" fill="black"/>' +
        '</mask></defs>' +
        '<rect width="100%" height="100%" fill="rgba(0,0,0,0.68)" mask="url(#gl-tour-mask)"/>' +
      '</svg>' +
      '<div id="gl-tour-tooltip">' +
        '<div id="gl-tour-step-dots"></div>' +
        '<div id="gl-tour-title"></div>' +
        '<div id="gl-tour-body"></div>' +
        '<div id="gl-tour-actions">' +
          '<button id="gl-tour-skip">Skip Tour</button>' +
          '<button id="gl-tour-next">Next →</button>' +
        '</div>' +
      '</div>';

    var style = document.createElement('style');
    style.textContent = `
      #gl-tour-overlay {
        position: fixed; inset: 0; z-index: 99999;
        font-family: var(--font, 'Satoshi', sans-serif);
      }
      #gl-tour-tooltip {
        position: fixed;
        background: var(--surface, #fff);
        border-radius: 14px;
        padding: 20px 20px 16px;
        max-width: 300px;
        width: calc(100vw - 48px);
        box-shadow: 0 24px 64px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.15);
        z-index: 100000;
        border: 1.5px solid var(--gray-200, #e5e7eb);
        transition: top 0.3s cubic-bezier(0.16,1,0.3,1),
                    left 0.3s cubic-bezier(0.16,1,0.3,1),
                    opacity 0.2s ease;
      }
      [data-theme="dark"] #gl-tour-tooltip {
        background: #1c1b19;
        border-color: #393836;
      }
      #gl-tour-step-dots {
        display: flex; gap: 5px; margin-bottom: 12px;
      }
      .gl-tour-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: var(--gray-200, #e5e7eb);
        transition: all 0.2s;
      }
      .gl-tour-dot.active {
        background: var(--primary, #1a3c5e);
        width: 18px; border-radius: 3px;
      }
      [data-theme="dark"] .gl-tour-dot { background: #393836; }
      [data-theme="dark"] .gl-tour-dot.active { background: var(--teal, #0d9488); }
      #gl-tour-title {
        font-size: .97rem; font-weight: 800;
        color: var(--primary, #1a3c5e); margin-bottom: 7px; line-height: 1.3;
      }
      [data-theme="dark"] #gl-tour-title { color: var(--teal, #4f98a3); }
      #gl-tour-body {
        font-size: .84rem; color: var(--gray-500, #6b7280);
        line-height: 1.65; margin-bottom: 16px;
      }
      #gl-tour-actions {
        display: flex; justify-content: space-between; align-items: center; gap: 8px;
      }
      #gl-tour-skip {
        font-size: .78rem; color: var(--gray-400, #9ca3af);
        background: none; border: none; cursor: pointer;
        padding: 6px 0; font-family: inherit; text-decoration: underline;
        transition: color 0.15s;
      }
      #gl-tour-skip:hover { color: var(--gray-600, #4b5563); }
      #gl-tour-next {
        padding: 9px 20px; border-radius: 8px; border: none;
        background: var(--primary, #1a3c5e); color: #fff;
        font-weight: 700; font-size: .87rem; cursor: pointer;
        font-family: inherit; transition: background 0.15s, transform 0.1s;
        white-space: nowrap;
      }
      #gl-tour-next:hover { background: var(--teal, #0d9488); }
      #gl-tour-next:active { transform: scale(0.96); }
      .gl-tour-finish {
        background: var(--teal, #0d9488) !important;
      }
      #gl-tour-highlight-ring {
        position: fixed;
        border: 2.5px solid var(--teal, #0d9488);
        border-radius: 10px;
        pointer-events: none;
        z-index: 99998;
        transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
        box-shadow: 0 0 0 4px rgba(13,148,136,0.18);
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(overlay);

    // Highlight ring (separate from SVG so it can animate independently)
    var ring = document.createElement('div');
    ring.id = 'gl-tour-highlight-ring';
    document.body.appendChild(ring);

    return overlay;
  }

  /* ──────────────────────────────────────
     POSITION TOOLTIP NEAR TARGET
  ────────────────────────────────────── */
  function positionTooltip(tooltip, targetRect, position) {
    var tw = tooltip.offsetWidth  || 300;
    var th = tooltip.offsetHeight || 160;
    var pad = 16;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var top, left;

    if (position === 'bottom') {
      top  = targetRect.bottom + 14;
      left = targetRect.left + (targetRect.width / 2) - (tw / 2);
    } else { // top
      top  = targetRect.top - th - 14;
      left = targetRect.left + (targetRect.width / 2) - (tw / 2);
    }

    // Clamp to viewport
    left = Math.max(pad, Math.min(left, vw - tw - pad));
    top  = Math.max(pad + 60, Math.min(top, vh - th - pad));

    // If bottom tooltip goes off screen, flip to top
    if (position === 'bottom' && top + th > vh - pad) {
      top = targetRect.top - th - 14;
      top = Math.max(pad + 60, top);
    }

    tooltip.style.top  = top  + 'px';
    tooltip.style.left = left + 'px';
  }

  /* ──────────────────────────────────────
     UPDATE CUTOUT + RING
  ────────────────────────────────────── */
  function updateSpotlight(el) {
    var r = el.getBoundingClientRect();
    var padding = 8;
    var x = r.left   - padding;
    var y = r.top    - padding;
    var w = r.width  + padding * 2;
    var h = r.height + padding * 2;

    // SVG cutout
    var cutout = document.getElementById('gl-tour-cutout');
    if (cutout) {
      cutout.setAttribute('x',      x);
      cutout.setAttribute('y',      y);
      cutout.setAttribute('width',  w);
      cutout.setAttribute('height', h);
    }

    // Highlight ring
    var ring = document.getElementById('gl-tour-highlight-ring');
    if (ring) {
      ring.style.left   = x + 'px';
      ring.style.top    = y + 'px';
      ring.style.width  = w + 'px';
      ring.style.height = h + 'px';
    }
  }

  /* ──────────────────────────────────────
     CONFETTI BURST (finish step)
  ────────────────────────────────────── */
  function fireConfetti() {
    var colors = ['#0d9488','#1a3c5e','#fbbf24','#34d399','#60a5fa'];
    for (var i = 0; i < 38; i++) {
      (function(i) {
        var el = document.createElement('div');
        var size = Math.random() * 8 + 5;
        el.style.cssText = 'position:fixed;z-index:999999;pointer-events:none;' +
          'width:' + size + 'px;height:' + size + 'px;' +
          'border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') + ';' +
          'background:' + colors[i % colors.length] + ';' +
          'left:' + (30 + Math.random() * 40) + 'vw;' +
          'top:50vh;' +
          'transition:transform ' + (0.7 + Math.random() * 0.6) + 's ease-out, opacity 0.8s ease;';
        document.body.appendChild(el);
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            el.style.transform = 'translateY(' + (-120 - Math.random() * 180) + 'px) ' +
              'translateX(' + (-80 + Math.random() * 160) + 'px) ' +
              'rotate(' + (Math.random() * 720) + 'deg)';
            el.style.opacity = '0';
          });
        });
        setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 1600);
      })(i);
    }
  }

  /* ──────────────────────────────────────
     MAIN TOUR RUNNER
  ────────────────────────────────────── */
  function runTour(steps, uid, type, onComplete) {
    var currentStep = 0;
    var overlay = buildOverlay();
    var tooltip  = document.getElementById('gl-tour-tooltip');
    var titleEl  = document.getElementById('gl-tour-title');
    var bodyEl   = document.getElementById('gl-tour-body');
    var nextBtn  = document.getElementById('gl-tour-next');
    var skipBtn  = document.getElementById('gl-tour-skip');
    var dotsEl   = document.getElementById('gl-tour-step-dots');

    // Build dots
    steps.forEach(function(_, i) {
      var dot = document.createElement('div');
      dot.className = 'gl-tour-dot' + (i === 0 ? ' active' : '');
      dotsEl.appendChild(dot);
    });

    function renderStep(idx) {
      var step = steps[idx];
      var target = document.getElementById(step.targetId);

      // Fallback: if element not found, use body center
      if (!target) {
        target = document.querySelector('main') || document.body;
      }

      // Scroll target into view
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });

      setTimeout(function() {
        var rect = target.getBoundingClientRect();
        updateSpotlight(target);
        titleEl.textContent = step.title;
        bodyEl.textContent  = step.body;

        // Update dots
        var dots = dotsEl.querySelectorAll('.gl-tour-dot');
        dots.forEach(function(d, i) {
          d.classList.toggle('active', i === idx);
        });

        // Update button
        if (step.isLast) {
          nextBtn.textContent = 'Shuruaat Karo!';
          nextBtn.className   = 'gl-tour-finish';
        } else {
          nextBtn.textContent = 'Next →';
          nextBtn.className   = '';
        }

        positionTooltip(tooltip, rect, step.position);
        tooltip.style.opacity = '1';
      }, 280);

      tooltip.style.opacity = '0';
    }

    function advance() {
      if (currentStep < steps.length - 1) {
        currentStep++;
        renderStep(currentStep);
      } else {
        finish();
      }
    }

    function finish() {
      if (uid) markOnboardingDone(uid, type);
      fireConfetti();
      // Fade out overlay
      overlay.style.transition = 'opacity 0.35s ease';
      overlay.style.opacity = '0';
      var ring = document.getElementById('gl-tour-highlight-ring');
      if (ring) { ring.style.transition = 'opacity 0.35s ease'; ring.style.opacity = '0'; }
      setTimeout(function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (ring && ring.parentNode) ring.parentNode.removeChild(ring);
        // Show completion toast
        if (typeof showToast === 'function') {
          showToast(type === 'worker'
            ? 'Tour complete! Ab apna pehla gig book karo.'
            : 'Tour complete! Ab apna pehla gig post karo.',
            'success', 4000
          );
        }
        if (typeof onComplete === 'function') onComplete();
      }, 380);
    }

    function skipTour() {
      if (uid) markOnboardingDone(uid, type);
      var ring = document.getElementById('gl-tour-highlight-ring');
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (ring && ring.parentNode) ring.parentNode.removeChild(ring);
    }

    nextBtn.addEventListener('click', advance);
    skipBtn.addEventListener('click', skipTour);

    // Re-position on resize
    var resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        var step = steps[currentStep];
        var target = document.getElementById(step.targetId) || document.querySelector('main');
        if (target) {
          updateSpotlight(target);
          positionTooltip(tooltip, target.getBoundingClientRect(), step.position);
        }
      }, 150);
    });

    renderStep(0);
  }

  /* ──────────────────────────────────────
     PUBLIC API — GigLegaTour.start(type, uid)
  ────────────────────────────────────── */
  global.GigLegaTour = {

    /**
     * start(type, uid)
     *   type: 'worker' | 'poster'
     *   uid:  Firebase Auth UID (string) — pass null to skip Firestore check (testing)
     */
    start: async function(type, uid) {
      var steps = TOURS[type];
      if (!steps) return;

      // Fast-path: already done (localStorage cache)
      if (uid && isMarkedLocally(type)) return;

      // Firestore check
      if (uid) {
        var flags = await getOnboardingFlags(uid);
        var flagKey = 'onboarding' + (type === 'poster' ? 'Poster' : 'Worker') + 'Done';
        if (flags[flagKey] === true) {
          // Sync to localStorage cache so next time is instant
          try { localStorage.setItem('gl_ob_' + type, '1'); } catch(e) {}
          return;
        }
      }

      runTour(steps, uid, type);
    },

    /** Force-reset for testing: GigLegaTour.reset('worker') */
    reset: function(type) {
      try {
        localStorage.removeItem('gl_ob_' + (type || 'worker'));
        localStorage.removeItem('gl_ob_poster');
        localStorage.removeItem('gl_ob_worker');
      } catch(e) {}
      if (typeof showToast === 'function') showToast('Tour reset — refresh the page.', 'info');
    }
  };

})(window);
