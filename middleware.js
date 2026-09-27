import { next } from '@vercel/functions';

const COOKIE_NAME = 'psu_coffee_access';
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const encoder = new TextEncoder();

function equalBytes(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function passwordMatches(candidate, password) {
  const [candidateHash, passwordHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(candidate)),
    crypto.subtle.digest('SHA-256', encoder.encode(password)),
  ]);
  return equalBytes(new Uint8Array(candidateHash), new Uint8Array(passwordHash));
}

async function sign(value, password) {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return toHex(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

async function hasValidSession(request, password) {
  const cookie = request.headers.get('cookie')?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!cookie) return false;
  const match = /^v1\.(\d{10})\.([a-f0-9]{64})$/.exec(cookie);
  if (!match || Number(match[1]) < Math.floor(Date.now() / 1000)) return false;
  const expected = await sign(`v1.${match[1]}`, password);
  return equalBytes(encoder.encode(match[2]), encoder.encode(expected));
}

function safeDestination(value) {
  if (!value?.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) return '/';
  return value;
}

function entryPage(destination, incorrect = false) {
  const action = `/__enter?next=${encodeURIComponent(destination)}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f6f0e3">
  <title>Enter | Penn State Coffee Club</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100svh; display: grid; place-items: center; padding: 28px; background: #f6f0e3; color: #261c15; font-family: Georgia, 'Times New Roman', serif; }
    main { width: min(100%, 440px); }
    .rule { display: block; height: 1px; margin-bottom: 30px; background: #b9ab98; }
    .eyebrow { margin: 0 0 18px; color: #886247; font-size: 14px; }
    h1 { margin: 0 0 38px; font-size: clamp(48px, 11vw, 70px); font-weight: 400; letter-spacing: -.065em; line-height: .95; }
    h1 em { color: #946c50; font-weight: 400; }
    label { display: block; margin-bottom: 10px; font-size: 16px; }
    input { width: 100%; height: 52px; padding: 0 15px; border: 1px solid #8a7b6e; border-radius: 0; outline-offset: 3px; background: #fbf8f0; color: #261c15; font: inherit; font-size: 18px; }
    button { width: 100%; height: 52px; margin-top: 12px; border: 0; border-radius: 0; background: #261c15; color: #f6f0e3; cursor: pointer; font: inherit; font-size: 17px; }
    button:hover { background: #3d2b20; }
    .error { margin: 12px 0 0; color: #9a3e25; font-size: 15px; }
    .fine { margin: 29px 0 0; color: #786d61; font-size: 14px; }
  </style>
</head>
<body>
  <main>
    <span class="rule" aria-hidden="true"></span>
    <p class="eyebrow">Penn State Coffee Club</p>
    <h1>Come on <em>in.</em></h1>
    <form method="post" action="${action}">
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required autofocus aria-describedby="${incorrect ? 'error' : 'note'}">
      <button type="submit">Enter the site &rarr;</button>
      ${incorrect ? '<p class="error" id="error" role="alert">That password didn’t work. Try again.</p>' : ''}
    </form>
    <p class="fine" id="note">A little early access for our club.</p>
  </main>
</body>
</html>`;
}

function privateResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}

export default async function middleware(request) {
  const password = process.env.COFFEE_SITE_PASSWORD;
  if (!password || password.length < 8) {
    return privateResponse('Site access is not configured.', 503);
  }

  const url = new URL(request.url);
  if (url.pathname === '/__enter' && request.method === 'POST') {
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return privateResponse('Forbidden', 403);
    const destination = safeDestination(url.searchParams.get('next'));
    const body = await request.text();
    const candidate = body.length <= 1024 ? new URLSearchParams(body).get('password') : null;
    if (candidate && await passwordMatches(candidate, password)) {
      const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
      const token = `v1.${expires}.${await sign(`v1.${expires}`, password)}`;
      const secure = url.protocol === 'https:' ? '; Secure' : '';
      return new Response(null, {
        status: 303,
        headers: {
          Location: destination,
          'Set-Cookie': `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}${secure}`,
          'Cache-Control': 'no-store',
        },
      });
    }
    return privateResponse(entryPage(destination, true), 401);
  }

  if (await hasValidSession(request, password)) return next();

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return privateResponse('Unauthorized', 401);
  }
  const destination = safeDestination(url.pathname + url.search);
  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html') || url.pathname === '/' || url.pathname === '/__enter') {
    return privateResponse(entryPage(destination));
  }
  return new Response('Unauthorized', { status: 401, headers: { 'Cache-Control': 'no-store' } });
}
