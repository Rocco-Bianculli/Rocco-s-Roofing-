// Estimate-request handler. Runs as a Vercel serverless function.
//
// It talks to Resend over plain HTTPS rather than the `resend` npm package, so
// this repo needs no package.json, no node_modules and no build step — you can
// still edit every file in this project by hand.
//
// Required environment variables (set them in the Vercel dashboard, never in
// this file — anything committed here is public):
//
//   RESEND_API_KEY   from resend.com/api-keys
//   LEAD_TO          where estimate requests land, e.g. joe@roccos-roofing.com
//   LEAD_FROM        a verified sender on your Resend domain,
//                    e.g. "Rocco's Roofing Website <website@roccosroofing.com>"
//
// Until the Resend domain is verified you can set LEAD_FROM to
// "onboarding@resend.dev", which only delivers to the address that owns the
// Resend account — fine for testing, not for going live.

const MAX = { name: 80, email: 160, phone: 40, address: 200, message: 4000 };

function clean(value, limit) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Deliberately loose: the goal is to reject typos and bots, not to police
// exotic-but-valid addresses.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;

  const raw = await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 100_000) reject(new Error('body too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

  const type = req.headers['content-type'] || '';
  if (type.includes('application/json')) {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return Object.fromEntries(new URLSearchParams(raw));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = await readBody(req).catch(() => ({}));

  // A form posted by the browser expects a page back; fetch() expects JSON.
  const wantsJson = (req.headers.accept || '').includes('application/json');

  const fail = (status, message) => (
    wantsJson
      ? res.status(status).json({ ok: false, error: message })
      : res.redirect(303, '/contact.html?error=1')
  );

  // Honeypot: a hidden field no human ever fills in. Bots fill everything.
  // Answer 200 so the bot believes it succeeded and doesn't retry.
  if (clean(body.company, 100)) {
    return wantsJson ? res.status(200).json({ ok: true }) : res.redirect(303, '/thanks.html');
  }

  const first = clean(body.first_name, MAX.name);
  const last = clean(body.last_name, MAX.name);
  const email = clean(body.email, MAX.email);
  const phone = clean(body.phone, MAX.phone);
  const address = clean(body.address, MAX.address);
  const message = clean(body.message, MAX.message);

  if (!first) return fail(400, 'Please tell us your first name.');
  if (!EMAIL_RE.test(email)) return fail(400, 'Please enter a valid email address.');
  if (!phone && !message) return fail(400, 'Please add a phone number or a short note.');

  const { RESEND_API_KEY, LEAD_TO, LEAD_FROM } = process.env;
  if (!RESEND_API_KEY || !LEAD_TO || !LEAD_FROM) {
    console.error('contact: missing env', {
      key: !!RESEND_API_KEY, to: !!LEAD_TO, from: !!LEAD_FROM,
    });
    return fail(500, 'The form is not finished being set up yet.');
  }

  const name = [first, last].filter(Boolean).join(' ');
  const rows = [
    ['Name', name],
    ['Email', email],
    ['Phone', phone || '—'],
    ['Address', address || '—'],
    ['Message', message || '—'],
  ];

  const html = `
    <h2 style="font-family:system-ui,sans-serif">New estimate request</h2>
    <table style="font-family:system-ui,sans-serif;border-collapse:collapse">
      ${rows.map(([k, v]) => `
        <tr>
          <td style="padding:6px 14px 6px 0;vertical-align:top;color:#5c6b7a">${k}</td>
          <td style="padding:6px 0"><strong>${escapeHtml(v)}</strong></td>
        </tr>`).join('')}
    </table>
    <p style="font-family:system-ui,sans-serif;color:#5c6b7a;font-size:13px">
      Sent from the contact form on roccosroofing.com
    </p>`;

  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');

  try {
    const resend = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: LEAD_FROM,
        to: LEAD_TO.split(',').map((a) => a.trim()).filter(Boolean),
        reply_to: email,
        subject: `New estimate request — ${name}`,
        html,
        text,
      }),
    });

    if (!resend.ok) {
      // Log the reason for us; never leak provider detail to the visitor.
      console.error('contact: resend rejected', resend.status, await resend.text());
      return fail(502, 'We could not send that just now.');
    }
  } catch (err) {
    console.error('contact: resend threw', err);
    return fail(502, 'We could not send that just now.');
  }

  return wantsJson
    ? res.status(200).json({ ok: true })
    : res.redirect(303, '/thanks.html');
}
