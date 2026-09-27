const form = document.querySelector('#enquiry-form');
const type = form.elements.type;
const requestedType = new URLSearchParams(location.search).get('type');
if ([...type.options].some(option => option.value === requestedType)) {
  type.value = requestedType;
  for (const anchor of document.querySelectorAll('.language-switch a')) {
    const url = new URL(anchor.href);
    url.searchParams.set('type', requestedType);
    anchor.href = url.href;
  }
}
const de = document.documentElement.lang === 'de';
const copy = de ? {
  disabled: 'Der Onlineversand ist noch nicht aktiviert. Sie können uns direkt über die E-Mail-Adresse auf dieser Seite kontaktieren.',
  unavailable: 'Der Onlineversand ist derzeit nicht verfügbar. Bitte nutzen Sie die E-Mail-Adresse auf dieser Seite.',
  sending: 'Wird gesendet…',
  success: '<h2>Vielen Dank — Ihre Nachricht ist eingegangen.</h2><p>Wir prüfen Ihr Anliegen und antworten an die angegebene E-Mail-Adresse.</p>',
  error: '<h2>Das hat leider nicht geklappt.</h2><p>Bitte versuchen Sie es erneut oder schreiben Sie direkt an <a href="mailto:info@drblackburndigital.com">info@drblackburndigital.com</a>.</p>'
} : {
  disabled: 'Online sending is not enabled yet. You can email us directly using the address on this page.',
  unavailable: 'Online sending is currently unavailable. You can email us directly using the address on this page.',
  sending: 'Sending…',
  success: '<h2>Thank you — your message has been received.</h2><p>We’ll review it and respond to the email address you provided.</p>',
  error: '<h2>Something went wrong.</h2><p>Please try again, or email us directly at <a href="mailto:info@drblackburndigital.com">info@drblackburndigital.com</a>.</p>'
};

const result = document.querySelector('#form-result');
const note = document.querySelector('#delivery-note');
const button = form.querySelector('button');
const originalButton = button.innerHTML;
let delivered = false;
button.disabled = false;

// Status contains no visitor-entered data. No cookies, storage or external scripts.
fetch('/api/contact/', { credentials: 'omit', cache: 'no-store' })
  .then(response => response.ok ? response.json() : { enabled: false })
  .then(status => {
    if (!status.enabled) {
      note.textContent = copy.disabled;
      note.hidden = false;
    }
  }).catch(() => {
    note.textContent = copy.unavailable;
    note.hidden = false;
  });

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (delivered || !form.reportValidity() || button.disabled) return;
  button.disabled = true;
  button.textContent = copy.sending;
  form.setAttribute('aria-busy', 'true');
  result.hidden = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch('/api/contact/', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'omit', cache: 'no-store', signal: controller.signal,
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    });
    const data = await response.json();
    if (!response.ok || data.ok !== true) throw new Error('Delivery unavailable');
    delivered = true;
    result.className = 'form-result success';
    result.innerHTML = copy.success;
    form.reset();
    form.hidden = true;
    note.hidden = true;
  } catch {
    result.className = 'form-result error';
    result.innerHTML = copy.error;
    // Keep the visitor's input for correction/retry. Never persist it to browser storage.
  } finally {
    clearTimeout(timeout);
    button.disabled = delivered;
    button.innerHTML = originalButton;
    form.removeAttribute('aria-busy');
    result.hidden = false;
    result.focus();
  }
});
