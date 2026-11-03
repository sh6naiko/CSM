'use strict';

const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const nodemailer = require('nodemailer');

const HOST = '127.0.0.1';
const PORT = Number(process.env.MAILER_PORT || 8091);
const SECRET = process.env.CSM_MAILER_SECRET || '';
const APP_BASE_URL = process.env.APP_BASE_URL || '';
const TRANSPORT_MODE = process.env.MAILER_TRANSPORT || 'smtp';
const SMTP_SECURITY = process.env.SMTP_SECURITY || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 0);
const SENDER = process.env.SMTP_FROM || '';
const outbox = [];

function baseConfigIsValid() {
  try {
    const base = new URL(APP_BASE_URL);
    const localHttp = base.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(base.hostname);
    const secureInProduction = process.env.NODE_ENV !== 'production' || base.protocol === 'https:';
    return ['http:', 'https:'].includes(base.protocol) && (localHttp || base.protocol === 'https:') && secureInProduction && !base.username && !base.password &&
      !base.search && !base.hash && SECRET.length >= 32 && !SECRET.startsWith('replace-') &&
      /^\S.{2,254}@\S+\.\S+$/.test(SENDER);
  } catch (_) { return false; }
}

function smtpConfigIsValid() {
  const host = process.env.SMTP_HOST || '';
  const username = process.env.SMTP_USER || '';
  const password = process.env.SMTP_PASS || '';
  return Boolean(host && host !== 'smtp.example.com' && !host.startsWith('replace-') &&
    !username.startsWith('replace-') && !password.startsWith('replace-') && !SENDER.includes('replace-') &&
    SMTP_PORT > 0 && SMTP_PORT <= 65535 &&
    ['implicit', 'starttls', 'none'].includes(SMTP_SECURITY) &&
    process.env.SMTP_USER && process.env.SMTP_PASS &&
    !(SMTP_SECURITY === 'none' && process.env.NODE_ENV === 'production'));
}

const ready = baseConfigIsValid() && (TRANSPORT_MODE === 'stub' || (TRANSPORT_MODE === 'smtp' && smtpConfigIsValid()));
let smtpStatus = TRANSPORT_MODE === 'stub' && ready ? 'verified' : ready ? 'checking' : 'not-configured';
const transport = ready ? (TRANSPORT_MODE === 'stub'
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURITY === 'implicit',
      requireTLS: SMTP_SECURITY === 'starttls',
      ignoreTLS: SMTP_SECURITY === 'none',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    })) : null;

function smtpFailureCode(error) {
  return typeof error?.code === 'string' && /^[A-Z0-9_-]{1,40}$/.test(error.code)
    ? error.code
    : 'verification-failed';
}

function logDeliveryFailure(error) {
  console.error('Recovery email delivery failed.', {
    code: smtpFailureCode(error),
    responseCode: Number.isInteger(error?.responseCode) ? error.responseCode : undefined,
  });
}

if (ready && TRANSPORT_MODE === 'smtp') {
  transport.verify()
    .then(() => {
      smtpStatus = 'verified';
      console.log('SMTP connection and authentication verified.');
    })
    .catch(error => {
      smtpStatus = smtpFailureCode(error);
      console.error('SMTP connection or authentication check failed.', { code: smtpStatus });
    });
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function authorized(req) {
  const header = req.headers.authorization || '';
  const supplied = header.startsWith('Bearer ') ? Buffer.from(header.slice(7)) : Buffer.alloc(0);
  const expected = Buffer.from(SECRET);
  return expected.length >= 32 && supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body) > 16384) {
        reject(new Error('request-too-large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch (_) { reject(new Error('invalid-json')); }
    });
    req.on('error', () => reject(new Error('request-error')));
  });
}

function validRecoveryUrl(value) {
  try {
    const base = new URL(APP_BASE_URL);
    const expectedPath = new URL(`${base.href.replace(/\/+$/, '')}/login.html`).pathname;
    const url = new URL(value);
    const fragment = new URLSearchParams(url.hash.slice(1));
    return url.origin === base.origin && url.pathname === expectedPath &&
      url.searchParams.get('mode') === 'reset' && /^[a-f0-9]{64}$/.test(fragment.get('token') || '');
  } catch (_) { return false; }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  if (req.method === 'GET' && url.pathname === '/health') {
    const healthy = ready && (TRANSPORT_MODE !== 'smtp' || smtpStatus === 'verified');
    return sendJson(res, healthy ? 200 : 503, {
      ok: healthy,
      transport: ready ? TRANSPORT_MODE : 'not-configured',
      ...(ready && TRANSPORT_MODE === 'smtp' ? { smtp: smtpStatus } : {}),
    });
  }
  if (!authorized(req)) return sendJson(res, 401, { error: 'Unauthorized.' });

  if (req.method === 'GET' && url.pathname === '/__test/outbox' && TRANSPORT_MODE === 'stub') {
    const recipient = url.searchParams.get('to') || '';
    return sendJson(res, 200, { messages: outbox.filter(item => item.to.toLowerCase() === recipient.toLowerCase()).slice(-5) });
  }
  if (req.method !== 'POST' || url.pathname !== '/send') return sendJson(res, 404, { error: 'Not found.' });
  if (!ready || (TRANSPORT_MODE === 'smtp' && smtpStatus !== 'verified')) return sendJson(res, 503, { sent: false });
  if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return sendJson(res, 415, { sent: false });

  let payload;
  try { payload = await readJson(req); } catch (_) { return sendJson(res, 400, { sent: false }); }
  const to = typeof payload.to === 'string' ? payload.to.trim() : '';
  const resetUrl = typeof payload.resetUrl === 'string' ? payload.resetUrl : '';
  const expiresMinutes = Number(payload.expiresMinutes);
  if (to.length > 254 || !/^\S+@\S+\.\S+$/.test(to) || !validRecoveryUrl(resetUrl) || expiresMinutes !== 30) {
    return sendJson(res, 400, { sent: false });
  }

  const safeUrl = escapeHtml(resetUrl);
  const message = {
    from: SENDER,
    to,
    subject: 'Reset your Co-StudyMaxx password',
    text: `We received a request to reset your Co-StudyMaxx password. Open this link within 30 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#172235"><p style="color:#f04824;font-weight:700;letter-spacing:.08em">CO-STUDYMAXX</p><h1 style="font-size:24px">Reset your password</h1><p>We received a request to reset your Co-StudyMaxx password. This link can be used once and expires in 30 minutes.</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;padding:13px 22px;border-radius:8px;background:#f04824;color:white;text-decoration:none;font-weight:700">Choose a new password</a></p><p>If you did not request this, you can ignore this email.</p></div>`
  };

  if (TRANSPORT_MODE === 'stub') {
    try {
      await transport.sendMail(message);
      outbox.push({ to, subject: message.subject, text: message.text, html: message.html });
      if (outbox.length > 100) outbox.shift();
      return sendJson(res, 200, { sent: true });
    } catch (error) {
      logDeliveryFailure(error);
      return sendJson(res, 502, { sent: false });
    }
  }

  // Acknowledge before SMTP I/O so account existence cannot be timed.
  sendJson(res, 200, { sent: true });
  setImmediate(async () => {
    try { await transport.sendMail(message); }
    catch (error) {
      smtpStatus = smtpFailureCode(error);
      logDeliveryFailure(error);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Recovery mail service listening on ${HOST}:${PORT} (${ready ? TRANSPORT_MODE : 'not configured'})`);
});
server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Recovery mail service is already running on ${HOST}:${PORT}; keep using that instance.`);
    return;
  }
  console.error(`Recovery mail service could not start: ${error.message}`);
  process.exitCode = 1;
});
