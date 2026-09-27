import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { checkRateLimit } from '@vercel/firewall';

export const rateLimitRules = { ip: 'dbd-contact-ip', global: 'dbd-contact-global' };

export async function checkContactRateLimit(req, env, check = checkRateLimit) {
  // The SDK skips enforcement outside NODE_ENV=production. Never treat that as approval.
  if (env.NODE_ENV !== 'production' || env.VERCEL !== '1' || env.VERCEL_REGION !== 'fra1') throw new Error('Unavailable');
  const address = req.headers['x-real-ip']; // Overwritten by the Vercel proxy in production.
  if (typeof address !== 'string' || !isIP(address) || (env.CONTACT_RATE_LIMIT_KEY_SECRET?.length ?? 0) < 32) throw new Error('Unavailable');
  // Forward no visitor cookies, authorization, user-agent, email or message to the SDK.
  // The HMAC is pseudonymous, not anonymous; Vercel already processes the source IP.
  const key = createHmac('sha256', env.CONTACT_RATE_LIMIT_KEY_SECRET).update(address).digest('hex');
  const headers = { host: 'www.drblackburndigital.com' };
  for (const [id, rateLimitKey] of [[rateLimitRules.ip, `ip:${key}`], [rateLimitRules.global, 'dbd-contact-total']]) {
    const result = await check(id, { headers, rateLimitKey });
    // A missing rule returns rateLimited:false plus error:not-found. Fail closed.
    if (!result || result.error || typeof result.rateLimited !== 'boolean') throw new Error('Unavailable');
    if (result.rateLimited) return false;
  }
  return true;
}
