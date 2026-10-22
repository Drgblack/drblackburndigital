(() => {
  'use strict';
  const config = JSON.parse(document.querySelector('#analytics-config').textContent);
  const key = 'dbd-consent-v1';
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  const de = document.documentElement.lang === 'de';
  const banner = document.querySelector('.consent-banner');
  const dialog = document.querySelector('#consent-dialog');
  let choice = null;
  let timer;
  let loading = false;
  const queued = new Set();
  function read() {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      const now = Date.now();
      const valid = saved?.version === 1 && typeof saved.analytics === 'boolean'
        && Number.isFinite(saved.createdAt) && saved.createdAt <= now
        && saved.expiresAt === saved.createdAt + lifetime && saved.expiresAt > now;
      if (!valid && saved !== null) localStorage.removeItem(key);
      return valid ? saved : null;
    } catch { return null; }
  }
  const allowed = () => config.enabled && choice?.analytics === true && choice.expiresAt > Date.now();
  function track(name) {
    if (!allowed() || !['ContactSubmission', 'PartnerSubmission'].includes(name)) return;
    if (window.dbdAnalytics) window.dbdAnalytics.track(name);
    else queued.add(name); // Only events after consent; never form contents.
  }
  window.dbdConsent = Object.freeze({ allowed, track });
  function update() {
    clearTimeout(timer);
    if (!allowed()) queued.clear();
    banner.hidden = !config.enabled || Boolean(choice);
    document.querySelector('#consent-current').textContent = allowed()
      ? (de ? 'Aktuelle Auswahl: Analyse erlaubt.' : 'Current choice: analytics allowed.')
      : (de ? 'Aktuelle Auswahl: Analyse ausgeschaltet.' : 'Current choice: analytics off.');
    document.dispatchEvent(new Event('dbd:consentchange'));
    if (allowed() && !window.dbdAnalytics && !loading) {
      loading = true;
      const script = document.createElement('script');
      script.src = '/assets/analytics.js';
      script.async = true;
      script.onload = () => {
        if (allowed()) for (const name of queued) window.dbdAnalytics?.track(name);
        queued.clear();
      };
      script.onerror = () => { loading = false; queued.clear(); script.remove(); };
      document.head.append(script);
    }
    // Recheck long-lived tabs without exceeding the browser's timeout limit.
    if (choice) timer = setTimeout(() => {
      if (choice.expiresAt <= Date.now()) {
        choice = null;
        try { localStorage.removeItem(key); } catch { /* Storage can be unavailable. */ }
      }
      update();
    }, Math.min(choice.expiresAt - Date.now(), 2147483647));
  }
  document.querySelectorAll('[data-consent-open]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => dialog.showModal());
  });
  document.querySelector('[data-consent-close]').addEventListener('click', () => dialog.close());
  document.querySelectorAll('[data-consent-choice]').forEach(button => button.addEventListener('click', () => {
    const analytics = button.dataset.consentChoice === 'analytics';
    if (analytics && !config.enabled) return;
    const now = Date.now();
    choice = { version: 1, analytics, createdAt: now, expiresAt: now + lifetime };
    try { localStorage.setItem(key, JSON.stringify(choice)); } catch { /* Memory-only choice; no tracking fallback. */ }
    const wasModal = dialog.open;
    if (wasModal) dialog.close();
    update();
    if (!wasModal) document.querySelector('#main').focus();
  }));
  window.addEventListener('storage', event => { if (event.key === key || event.key === null) { choice = read(); update(); } });
  window.addEventListener('pageshow', event => { if (event.persisted) { choice = read(); update(); } });
  choice = read();
  update();
})();
