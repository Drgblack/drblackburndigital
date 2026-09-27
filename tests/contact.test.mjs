import test from 'node:test';
import assert from 'node:assert/strict';
import { createContactHandler, makeMessage, validateEnquiry, sender } from '../server/contact.mjs';
import { checkContactRateLimit } from '../server/contact-rate-limit.mjs';
import nodemailer from 'nodemailer';
import { createServer, request as httpRequest } from 'node:http';

const data = { name: 'Example Visitor', organisation: '', email: 'visitor@example.org', type: 'partnership', message: 'We would like to explore a training partnership.', website: '' };
const env = { VERCEL: '1', NODE_ENV: 'production', NODEJS_HELPERS: '0', VERCEL_REGION: 'fra1', CONTACT_EMAIL_AUTH_VERIFIED: 'true', CONTACT_LOG_RETENTION_REVIEWED: 'true', CONTACT_RATE_LIMIT_KEY_SECRET: 'test-only-key-00000000000000000000000000000000', VERCEL_ENV: 'production', CONTACT_FORM_ENABLED: 'true', CONTACT_SENDER_VERIFIED: 'true', GOOGLE_WORKSPACE_USER: 'website@drblackburndigital.com', GOOGLE_WORKSPACE_APP_PASSWORD: 'test-only-not-a-credential' };
async function request({ body = data, headers = {}, method = 'POST', environment = env, send, rateLimit = async () => true, chunks } = {}) {
  let sent = 0;
  const response = { headers: {}, setHeader(k,v) { this.headers[k] = v; }, end(value) { this.body = JSON.parse(value); } };
  const handler = createContactHandler({ env: environment, rateLimit, send: async message => { sent++; return send ? await send(message) : { accepted: ['info@drblackburndigital.com'] }; } });
  await handler({ method, body, async *[Symbol.asyncIterator]() {
    for (const chunk of chunks ?? [typeof body === 'string' ? body : JSON.stringify(body)]) yield Buffer.from(chunk);
  }, headers: { host: 'www.drblackburndigital.com', origin: 'https://www.drblackburndigital.com', 'content-type': 'application/json', ...headers } }, response);
  return { ...response, sent };
}

test('local, preview, missing credentials and unverified sender cannot send or claim success', async () => {
  for (const environment of [{}, { ...env, VERCEL_ENV: 'preview' }, { ...env, CONTACT_FORM_ENABLED: 'false' }, { ...env, CONTACT_SENDER_VERIFIED: 'false' }, { ...env, GOOGLE_WORKSPACE_APP_PASSWORD: '' }, { ...env, GOOGLE_WORKSPACE_USER: 'unapproved@example.org' }, { ...env, GOOGLE_WORKSPACE_USER: 'info@drblackburndigital.com' }, { ...env, CONTACT_EMAIL_AUTH_VERIFIED: 'false' }, { ...env, CONTACT_LOG_RETENTION_REVIEWED: 'false' }, { ...env, CONTACT_RATE_LIMIT_KEY_SECRET: '' }]) {
    const result = await request({ environment });
    assert.equal(result.statusCode, 503); assert.equal(result.sent, 0); assert.equal(result.body.ok, false);
    assert.deepEqual((await request({ environment, method: 'GET' })).body, { enabled: false });
  }
});

test('accepted enquiry goes to fixed DBD recipient and visitor only becomes Reply-To', async () => {
  const result = await request({ send: async message => {
    assert.equal(message.to, 'info@drblackburndigital.com');
    assert.deepEqual(message.envelope, { from: sender, to: ['info@drblackburndigital.com'] });
    assert.equal(message.from.name, 'DBD website enquiries');
    assert.equal(message.from.address, sender);
    assert.notEqual(message.from.address, data.email);
    assert.equal(message.replyTo.address, data.email);
    assert.equal(message.subject, 'DBD enquiry: Partnership');
    assert.match(message.text, /Organisation: Not supplied/);
    assert.equal(message.html, undefined); assert.equal(message.attachments, undefined);
    return { accepted: ['info@drblackburndigital.com'] };
  } });
  assert.equal(result.statusCode, 200); assert.equal(result.sent, 1); assert.deepEqual(result.body, { ok: true });
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(result.headers['Set-Cookie'], undefined);
});

test('invalid fields, spoofed recipients, honeypots, header injection and oversized payloads never reach SMTP', async () => {
  for (const body of [null, [], { ...data, name: '' }, { ...data, email: 'not-an-email' }, { ...data, email: 'one@example.org,two@example.org' }, { ...data, name: 'Name\r\nBcc: victim@example.org' }, { ...data, type: '__proto__' }, { ...data, type: 'other' }, { ...data, email: 'a@..example.org' }, { ...data, email: '.bad@example.org' }, { ...data, organisation: 'a'.repeat(181) }, { ...data, name: ' '.repeat(121) }, { ...data, message: 'a'.repeat(6001) }, { ...data, name: ['bad'] }, { ...data, website: 'https://spam.test/' }, { ...data, to: 'victim@example.org' }, 'bad JSON', ' '.repeat(28001)]) {
    const result = await request({ body });
    assert.equal(result.statusCode, 400); assert.equal(result.sent, 0);
  }
});

test('cross-origin, non-JSON and unsupported methods are refused', async () => {
  for (const [options, status] of [[{ headers: { origin: 'https://attacker.example' } },403], [{ headers: { origin: undefined } },403], [{ headers: { 'content-type': 'text/plain' } },415], [{ method: 'DELETE' },405], [{ headers: { host: 'attacker.example' } },403], [{ headers: { 'sec-fetch-site': 'cross-site' } },403], [{ headers: { 'content-encoding': 'gzip' } },415]]) {
    const result = await request(options); assert.equal(result.statusCode, status); assert.equal(result.sent,0);
  }
});

test('SMTP failure or rejection is a failure and never exposes provider error data', async () => {
  for (const send of [async () => { throw new Error('sensitive SMTP diagnostics'); }, async () => ({ accepted: [] })]) {
    const result = await request({ send });
    assert.equal(result.statusCode,502); assert.deepEqual(result.body,{ ok: false });
  }
});

test('all enquiry types map to fixed subjects while Unicode and multiline message text are preserved', () => {
  for (const type of ['partnership','acquisition','professional','general']) {
    const valid = validateEnquiry({ ...data, type, name: 'Jörg Beispiel', message: 'Guten Tag\nWir möchten zusammenarbeiten.' });
    assert.ok(valid); assert.match(makeMessage(valid, env.GOOGLE_WORKSPACE_USER).text, /Guten Tag\nWir/);
  }
});

test('approved sending identity preserves the fixed website sender and authentication gate', async () => {
  for (const user of [sender]) {
    const environment = { ...env, GOOGLE_WORKSPACE_USER: user };
    const result = await request({ environment, send: async message => {
      assert.equal(message.from.address, sender);
      assert.equal(message.envelope.from, sender);
      assert.equal(message.replyTo.address, data.email);
      assert.equal(message.to, 'info@drblackburndigital.com');
      return { accepted: ['info@drblackburndigital.com'] };
    } });
    assert.equal(result.statusCode, 200);
    for (const flag of ['CONTACT_SENDER_VERIFIED', 'CONTACT_EMAIL_AUTH_VERIFIED']) {
      const blocked = await request({ environment: { ...environment, [flag]: 'false' } });
      assert.equal(blocked.statusCode, 503);
      assert.equal(blocked.sent, 0);
    }
  }
});

test('body cap includes raw bytes, chunking and whitespace; exact field limits are enforced', async () => {
  const valid = { ...data, name: 'n'.repeat(120), organisation: 'o'.repeat(180), message: 'm'.repeat(6000) };
  assert.ok(validateEnquiry(valid));
  assert.equal((await request({ chunks: [JSON.stringify(valid)] })).statusCode, 200);
  assert.equal((await request({ chunks: [' '.repeat(28000), JSON.stringify(data)] })).statusCode, 400);
  assert.equal((await request({ headers: { 'content-length': '28001' } })).statusCode, 400);
  assert.equal((await request({ body: { ...data, message: '😀'.repeat(3001) } })).statusCode, 400);
  assert.equal((await request({ environment: { ...env, NODEJS_HELPERS: '1' } })).statusCode, 503);
  assert.equal((await request({ body: data, chunks: [] })).statusCode, 400, 'Already-parsed body must not bypass original byte counting');
});

test('untrusted markup is rendered only as literal text in the generated MIME email', async () => {
  const message = makeMessage(validateEnquiry({ ...data, message: '<script>alert(1)</script>\n<img src="https://tracker.example/pixel">' }));
  assert.equal(message.html, undefined);
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
  const mime = (await transport.sendMail(message)).message.toString();
  assert.match(mime, /Content-Type: text\/plain;/);
  assert.doesNotMatch(mime, /Content-Type: text\/html/);
  assert.match(mime, /From: DBD website enquiries <website@drblackburndigital.com>/);
  assert.match(mime, /Reply-To: Example Visitor <visitor@example.org>/);
});

test('rate limiting blocks SMTP for quota exhaustion, missing rules and provider failure', async () => {
  for (const [rateLimit, status] of [[async () => false, 429], [async () => { throw new Error('private infrastructure error'); },503]]) {
    const result = await request({ rateLimit });
    assert.equal(result.statusCode, status); assert.equal(result.sent, 0); assert.deepEqual(result.body,{ ok:false });
  }
  for (const result of [{ rateLimited:false, error:'not-found' }, { rateLimited:true, error:'blocked' }, undefined, {}]) {
    await assert.rejects(checkContactRateLimit({ headers:{ 'x-real-ip':'192.0.2.1' } },env,async () => result));
  }
});

test('managed counters are shared across fresh function instances and disclose no form/header content', async () => {
  // Fake only the remote counter service; every invocation creates a fresh handler.
  const counters = new Map();
  const checker = async (id, options) => {
    assert.deepEqual(options.headers, { host: 'www.drblackburndigital.com' });
    assert.doesNotMatch(options.rateLimitKey, /192\.0\.2|visitor|example\.org/);
    const key = id + options.rateLimitKey;
    counters.set(key, (counters.get(key) || 0) + 1);
    return { rateLimited: counters.get(key) > (id === 'dbd-contact-ip' ? 5 : 30) };
  };
  for (let i=0;i<6;i++) {
    const result = await request({ headers:{ 'x-real-ip':'192.0.2.1', cookie:'private', authorization:'private' }, rateLimit:(req,env) => checkContactRateLimit(req,env,checker) });
    assert.equal(result.statusCode, i<5 ? 200 : 429);
  }
  // A new IP gets an independent bucket; an absent/untrusted proxy IP fails closed.
  assert.equal((await request({ headers:{ 'x-real-ip':'192.0.2.2' }, rateLimit:(req,env) => checkContactRateLimit(req,env,checker) })).statusCode,200);
  assert.equal((await request({ rateLimit:(req,env) => checkContactRateLimit(req,env,checker) })).statusCode,503);
  await assert.rejects(checkContactRateLimit({ headers:{ 'x-real-ip':'192.0.2.1' } },{ ...env, NODE_ENV:'development' },checker));
});

test('valid visitor addresses receive identical public results without mailbox lookup or auto-replies', async () => {
  const first = await request({ body: { ...data, email:'exists@example.org' } });
  const second = await request({ body: { ...data, email:'does-not-exist@example.org' } });
  assert.equal(first.statusCode,second.statusCode); assert.deepEqual(first.body,second.body);
});

test('real HTTP streams enforce the raw body cap even for chunked JSON with excess whitespace', async t => {
  let sent = 0;
  const server = createServer(createContactHandler({ env, rateLimit: async () => true, send: async () => {
    sent++;
    return { accepted: ['info@drblackburndigital.com'] };
  } }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const post = chunks => new Promise((resolve, reject) => {
    const req = httpRequest({ hostname: '127.0.0.1', port: server.address().port, path: '/api/contact/', method: 'POST', headers: {
      host: 'www.drblackburndigital.com', origin: 'https://www.drblackburndigital.com', 'content-type': 'application/json'
    } }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on('error', reject);
    for (const chunk of chunks) req.write(chunk);
    req.end();
  });
  assert.deepEqual(await post([JSON.stringify(data)]), { status: 200, body: { ok: true } });
  assert.deepEqual(await post([' '.repeat(28000), JSON.stringify(data)]), { status: 400, body: { ok: false } });
  assert.equal(sent, 1);
});
