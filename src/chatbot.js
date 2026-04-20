/**
 * GigLega Chatbot Widget — Phase 5
 * Usage:
 *   <link rel="stylesheet" href="chatbot.css">
 *   <script src="chatbot.js"></script>
 *   <script>GigLegaBot.init({ page: 'contact' });</script>
 *   OR
 *   <script>GigLegaBot.init({ page: 'help' });</script>
 */

(function () {
  'use strict';

  // ── Knowledge Base ──────────────────────────────────────────────────────────
  const KB = [
    {
      keys: ['post', 'gig', 'create', 'listing', 'new gig'],
      answer: '📋 To post a gig, tap <b>Post a Gig</b> from your Poster Dashboard. Fill in the title, category, location, budget, and timeline — your gig goes live instantly with a unique <b>GIG-YYYYMMDD-XXXXX</b> ID.',
      chips: ['What is a Gig ID?', 'How do I find taskers?', 'Contact support']
    },
    {
      keys: ['gig id', 'gigid', 'gig-', 'tracking id', 'reference', 'id format'],
      answer: '🔖 Every gig gets a unique <b>GIG-YYYYMMDD-XXXXX</b> ID the moment it\'s posted. You\'ll see it as a clickable badge on the browse card, gig detail page, and in your chat header. Click the badge to copy it instantly.',
      chips: ['How do I share my Gig ID?', 'Post a gig', 'Contact support']
    },
    {
      keys: ['payment', 'pay', 'razorpay', 'checkout', 'money', 'transfer', 'wallet'],
      answer: '💳 GigLega uses <b>Razorpay</b> for secure payments. Funds are held in escrow and released to the tasker only after you confirm completion. You can track all transactions in your <a href="wallet.html">Wallet</a>.',
      chips: ['Refund policy', 'Payment failed', 'Contact support']
    },
    {
      keys: ['fee', 'commission', 'charge', 'cost', 'pricing', 'platform fee', 'how much'],
      answer: '💰 GigLega offers <b>transparent pricing</b> — the exact platform fees are shown at checkout before you confirm any payment. No hidden charges.',
      chips: ['How payments work', 'Post a gig', 'Contact support']
    },
    {
      keys: ['refund', 'cancel', 'dispute', 'money back'],
      answer: '🔄 Refunds are available if the tasker doesn\'t complete the work. Raise a dispute from your Active Gig page and our team reviews it within 24 hours. For urgent issues, contact support directly.',
      chips: ['How to raise a dispute', 'Contact support', 'Payment info']
    },
    {
      keys: ['tasker', 'find', 'worker', 'apply', 'browse'],
      answer: '🔍 Taskers browse open gigs on the <a href="browse.html">Browse page</a>. Once they apply, you\'ll get a notification and can review their profile before accepting.',
      chips: ['Post a gig', 'How payments work', 'Contact support']
    },
    {
      keys: ['account', 'signup', 'register', 'login', 'profile', 'verification'],
      answer: '👤 Sign up takes under 2 minutes. After signup, complete onboarding to set your role (Poster or Tasker) and verify your profile for trust badges.',
      chips: ['Post a gig', 'Browse gigs', 'Contact support']
    },
    {
      keys: ['safety', 'report', 'scam', 'fraud', 'block', 'trust'],
      answer: '🛡️ GigLega verifies all users and monitors activity for fraud. You can report any user or gig from the detail page. Visit our <a href="trust-safety.html">Trust & Safety</a> page for full guidelines.',
      chips: ['Raise a dispute', 'Contact support', 'Terms of service']
    },
    {
      keys: ['contact', 'human', 'support', 'help', 'agent', 'talk', 'email'],
      answer: '📩 Reach our support team via the <a href="contact.html">Contact page</a> or email <b>support@giglega.com</b>. We typically respond within 2–4 hours on business days.',
      chips: ['Payment issue', 'Report a problem', 'Raise a dispute']
    },
    {
      keys: ['enterprise', 'business', 'bulk', 'team', 'company'],
      answer: '🏢 GigLega Enterprise lets businesses post bulk gigs with dedicated account management. Visit our <a href="enterprise.html">Enterprise page</a> to apply.',
      chips: ['Post a gig', 'Contact support']
    }
  ];

  const FALLBACK = '🤔 I\'m not sure about that one. Try rephrasing, or <a href="contact.html">contact our support team</a> directly — they\'ll sort you out fast.';

  // ── Page-specific quick replies ─────────────────────────────────────────────
  const PAGE_CHIPS = {
    contact: ['Post a gig', 'Payment info', 'Gig ID help', 'Raise a dispute', 'Talk to human'],
    help:    ['Post a gig', 'Gig ID help', 'Payment info', 'Account & signup', 'Trust & Safety']
  };

  // ── Widget HTML ─────────────────────────────────────────────────────────────
  function buildHTML(page) {
    const chips = (PAGE_CHIPS[page] || PAGE_CHIPS.contact)
      .map(c => `<button class="gl-chip" data-q="${c}">${c}</button>`).join('');
    return `
    <button id="gl-chat-fab" aria-label="Open support chat">
      💬<span class="gl-fab-badge">?</span>
    </button>
    <div id="gl-chatbot" role="dialog" aria-label="GigLega Support Chat">
      <div class="gl-chat-header">
        <div class="gl-chat-header-info">
          <div class="gl-chat-avatar">🤖</div>
          <div>
            <div class="gl-chat-header-title">GigLega Support</div>
            <div class="gl-chat-header-sub">Typically replies instantly</div>
          </div>
        </div>
        <button class="gl-chat-close-btn" id="gl-chat-close" aria-label="Close chat">✕</button>
      </div>
      <div class="gl-chat-messages" id="gl-chat-messages"></div>
      <div class="gl-quick-replies" id="gl-quick-replies">${chips}</div>
      <div class="gl-chat-input-row">
        <input type="text" id="gl-chat-input" placeholder="Type your question…" autocomplete="off" />
        <button id="gl-chat-send" aria-label="Send">➤</button>
      </div>
    </div>`;
  }

  // ── Core logic ──────────────────────────────────────────────────────────────
  function getReply(text) {
    const q = text.toLowerCase();
    for (const entry of KB) {
      if (entry.keys.some(k => q.includes(k))) return entry;
    }
    return null;
  }

  function addMsg(type, html) {
    const msgs = document.getElementById('gl-chat-messages');
    const div = document.createElement('div');
    div.className = `gl-msg ${type}`;
    div.innerHTML = html;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function showTyping() {
    const msgs = document.getElementById('gl-chat-messages');
    const t = document.createElement('div');
    t.className = 'gl-typing';
    t.id = 'gl-typing-indicator';
    t.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(t);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('gl-typing-indicator');
    if (t) t.remove();
  }

  function setChips(chips) {
    const qr = document.getElementById('gl-quick-replies');
    qr.innerHTML = chips.map(c => `<button class="gl-chip" data-q="${c}">${c}</button>`).join('');
    qr.querySelectorAll('.gl-chip').forEach(btn =>
      btn.addEventListener('click', () => handleSend(btn.dataset.q))
    );
  }

  function handleSend(text) {
    if (!text.trim()) return;
    document.getElementById('gl-chat-input').value = '';
    addMsg('user', text);
    document.getElementById('gl-quick-replies').innerHTML = '';
    showTyping();

    setTimeout(() => {
      removeTyping();
      const match = getReply(text);
      if (match) {
        addMsg('bot', match.answer);
        if (match.chips) setChips(match.chips);
      } else {
        addMsg('bot', FALLBACK);
        setChips(['Post a gig', 'Payment info', 'Contact support']);
      }
    }, 650);
  }

  // ── Init ────────────────────────────────────────────────────────────────────
  window.GigLegaBot = {
    init: function (opts) {
      const page = (opts && opts.page) || 'contact';
      const container = document.createElement('div');
      container.id = 'gl-chatbot-root';
      container.innerHTML = buildHTML(page);
      document.body.appendChild(container);

      const fab   = document.getElementById('gl-chat-fab');
      const bot   = document.getElementById('gl-chatbot');
      const close = document.getElementById('gl-chat-close');
      const input = document.getElementById('gl-chat-input');
      const send  = document.getElementById('gl-chat-send');
      const badge = fab.querySelector('.gl-fab-badge');

      // greet
      addMsg('bot', '👋 Hi! I\'m the GigLega support bot. Ask me anything about posting gigs, payments, Gig IDs, or disputes.');
      document.getElementById('gl-quick-replies').querySelectorAll('.gl-chip').forEach(btn =>
        btn.addEventListener('click', () => handleSend(btn.dataset.q))
      );

      fab.addEventListener('click', () => {
        bot.classList.toggle('open');
        if (badge) badge.style.display = 'none';
      });
      close.addEventListener('click', () => bot.classList.remove('open'));

      send.addEventListener('click', () => handleSend(input.value));
      input.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(input.value); });

      // auto-open on contact page after 3s
      if (page === 'contact') {
        setTimeout(() => {
          bot.classList.add('open');
          if (badge) badge.style.display = 'none';
        }, 3000);
      }
    }
  };
})();
