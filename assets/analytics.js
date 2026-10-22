(() => {
  'use strict';
  if (window.dbdAnalytics) return;
  const config = JSON.parse(document.querySelector('#analytics-config').textContent);
  const pending = new Set();
  const sent = new Set();
  function track(name) {
    if (!['pageview', 'ContactSubmission', 'PartnerSubmission'].includes(name)
      || !config.enabled || !window.dbdConsent?.allowed() || sent.has(name)) return;
    sent.add(name);
    const controller = new AbortController();
    pending.add(controller);
    // Fixed canonical URL: no visitor input, query, fragment, referrer or props.
    fetch('https://plausible.io/api/event', {
      method: 'POST', headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ name, domain: config.domain, url: config.url }),
      credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal
    }).catch(() => {}).finally(() => pending.delete(controller));
  }
  window.dbdAnalytics = Object.freeze({ track });
  document.addEventListener('dbd:consentchange', () => {
    if (!window.dbdConsent.allowed()) { for (const request of pending) request.abort(); pending.clear(); }
    else track('pageview');
  });
  track('pageview');
})();
