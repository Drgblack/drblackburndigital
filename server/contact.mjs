import nodemailer from 'nodemailer';
import { createHash } from 'node:crypto';
import { domainToASCII } from 'node:url';
import { checkContactRateLimit } from './contact-rate-limit.mjs';

const recipient = 'info@drblackburndigital.com';
const origin = 'https://www.drblackburndigital.com';
export const sender = 'website@drblackburndigital.com';
// The authenticated account can own the verified send-as alias. It is not the From.
// Preserve the approved account allowlist without publishing its private login address.
// This fingerprint is an identifier, not a credential. The login remains a Vercel secret.
const approvedAccountHash = 'a029d16a702f2b0686ad16ba48e01ce7e191797b33ba8f5989c840d17283b063';
function permittedWorkspaceUser(user) {
  return typeof user === 'string' && (user === sender || createHash('sha256').update(user).digest('hex') === approvedAccountHash);
}
const types = { partnership: 'Partnership', acquisition: 'Acquisition opportunity', professional: 'Media / professional enquiry', general: 'General enquiry' };
const maxBytes = 28000;
function normaliseEmail(value) {
  const parts = value.split('@');
  if (parts.length !== 2) return null;
  const [local, host] = parts;
  if (local.length > 64 || !/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/.test(local)) return null;
  const domain = domainToASCII(host).toLowerCase();
  if (!domain.includes('.') || !domain.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
  const address = `${local}@${domain}`;
  return address.length <= 254 ? address : null;
}

export function deliveryEnabled(env) {
  return env.VERCEL === '1' && env.NODE_ENV === 'production' && env.NODEJS_HELPERS === '0' && env.VERCEL_ENV === 'production' && env.VERCEL_REGION === 'fra1' && env.CONTACT_FORM_ENABLED === 'true'
    && env.CONTACT_SENDER_VERIFIED === 'true'
    && env.CONTACT_EMAIL_AUTH_VERIFIED === 'true' && env.CONTACT_LOG_RETENTION_REVIEWED === 'true'
    && permittedWorkspaceUser(env.GOOGLE_WORKSPACE_USER)
    && Boolean(env.GOOGLE_WORKSPACE_APP_PASSWORD)
    && (env.CONTACT_RATE_LIMIT_KEY_SECRET?.length ?? 0) >= 32;
}

export function validateEnquiry(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const limits = { name: 120, organisation: 180, email: 254, type: 30, message: 6000, website: 200 };
  if (Object.keys(input).some(key => !Object.hasOwn(limits, key))) return null;
  const data = {};
  for (const [key, max] of Object.entries(limits)) {
    if (input[key] !== undefined && typeof input[key] !== 'string') return null;
    const raw = input[key] ?? '';
    if (raw.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/.test(raw)) return null;
    data[key] = raw.trim();
    if (key !== 'message' && /[\r\n]/.test(data[key])) return null;
  }
  const normalised = normaliseEmail(data.email);
  if (!data.name || !data.message || !normalised || !Object.hasOwn(types, data.type) || data.website) return null;
  data.email = normalised;
  return data;
}

export function makeMessage(data) {
  return {
    from: { name: 'DBD website enquiries', address: sender },
    to: recipient,
    envelope: { from: sender, to: [recipient] },
    replyTo: { name: data.name, address: data.email },
    subject: `DBD enquiry: ${types[data.type]}`,
    text: `Type of enquiry: ${types[data.type]}\nName: ${data.name}\nOrganisation: ${data.organisation || 'Not supplied'}\nEmail: ${data.email}\n\n${data.message}`,
    disableFileAccess: true, disableUrlAccess: true
  };
}

async function sendThroughWorkspace(message, env) {
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: env.GOOGLE_WORKSPACE_USER, pass: env.GOOGLE_WORKSPACE_APP_PASSWORD },
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    connectionTimeout: 6000, greetingTimeout: 6000, socketTimeout: 10000,
    dnsTimeout: 6000, logger: false, debug: false,
    disableFileAccess: true, disableUrlAccess: true
  });
  try { return await transport.sendMail(message); } finally { transport.close(); }
}

async function readPayload(req) {
  if (Number(req.headers['content-length'] || 0) > maxBytes) throw new Error('Too large');
  // Require the original stream: a parsed object cannot prove the raw byte limit.
  // NODEJS_HELPERS=0 prevents Vercel from parsing/buffering it before this handler.
  if (typeof req[Symbol.asyncIterator] === 'function') {
    const chunks = [];
    let length = 0;
    const stream = typeof req.iterator === 'function' ? req.iterator({ destroyOnReturn: false }) : req;
    for await (const chunk of stream) {
      length += Buffer.byteLength(chunk);
      if (length > maxBytes) { req.resume?.(); throw new Error('Too large'); }
      chunks.push(Buffer.from(chunk));
    }
    if (length) return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  throw new Error('Missing payload');
}

export function createContactHandler({ env = process.env, send = sendThroughWorkspace, rateLimit = checkContactRateLimit } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const reply = (status, payload) => { res.statusCode = status; res.end(JSON.stringify(payload)); };
    if (req.method === 'GET') return reply(200, { enabled: deliveryEnabled(env) });
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return reply(405, { ok: false }); }
    // Local/preview environments cannot send, even if credentials accidentally exist.
    if (!deliveryEnabled(env)) return reply(503, { ok: false });
    if (req.headers.origin !== origin || req.headers.host !== 'www.drblackburndigital.com') return reply(403, { ok: false });
    if (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') return reply(403, { ok: false });
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return reply(415, { ok: false });
    if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') return reply(415, { ok: false });
    try {
      if (!(await rateLimit(req, env))) { res.setHeader('Retry-After', '600'); return reply(429, { ok: false }); }
    } catch { return reply(503, { ok: false }); }
    let data;
    try { data = validateEnquiry(await readPayload(req)); } catch { return reply(400, { ok: false }); }
    if (!data) return reply(400, { ok: false });
    try {
      const receipt = await send(makeMessage(data), env);
      if (!receipt.accepted?.some(address => address.toLowerCase() === recipient)) return reply(502, { ok: false });
      // SMTP acceptance is not a guarantee of final mailbox delivery. No retry is automatic.
      return reply(200, { ok: true });
    } catch {
      // Do not log SMTP errors: they can contain message content or account details.
      return reply(502, { ok: false });
    }
  };
}
