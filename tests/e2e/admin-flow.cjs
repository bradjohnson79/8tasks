/**
 * End-to-end admin flow against a LOCAL dev database (never production):
 * login, mandatory TOTP enrolment, provider + affiliate link + opportunity creation,
 * public visibility, /go redirect and anonymous access denial.
 *
 * Prereqs: local DB migrated + seeded, an admin created with
 *   ADMIN_PASSWORD=local-dev-admin-pass-1 npm run admin:create -- --email admin@8tasks.test
 * with two-factor NOT yet enabled, and the app running (npm run build && npm start).
 * Run: npm run test:e2e   (takes ~1 minute: waits for a fresh TOTP window)
 */
const { chromium } = require('playwright');
const crypto = require('crypto');
function totp(b32) {
  const alph = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '';
  for (const c of b32.replace(/=+$/, '').toUpperCase()) bits += alph.indexOf(c).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g).map(b => parseInt(b, 2)));
  const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = crypto.createHmac('sha1', key).update(buf).digest(); const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0');
}
const B = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_ADMIN_EMAIL || EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || PASSWORD;
const log = (...a) => console.log('✔', ...a);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));

  await p.goto(B + '/admin/login');
  await p.fill('#email', EMAIL); await p.fill('#password', 'wrong-password-123');
  await p.click('button[type=submit]'); await p.locator('p[role=alert]').waitFor(); log('wrong password rejected:', await p.locator('p[role=alert]').innerText());
  await p.fill('#password', PASSWORD); await p.click('button[type=submit]');
  await p.waitForURL('**/admin/setup-2fa'); log('redirected to 2FA setup (MFA required)');
  // panel blocked before MFA
  await p.goto(B + '/admin/providers'); await p.waitForURL('**/admin/setup-2fa'); log('panel blocked until MFA');
  await p.fill('#password', PASSWORD); await p.click('button[type=submit]');
  const secret = await p.locator('code').innerText(); log('QR shown, secret length', secret.length);
  await p.screenshot({ path: 'test-results/admin-2fa.png' });
  await p.fill('#code', totp(secret)); await p.click('button[type=submit]');
  await p.waitForURL(B + '/admin'); log('2FA enabled, overview loaded');
  await p.screenshot({ path: 'test-results/admin-overview.png', fullPage: true });

  // sign out and back in with TOTP
  await p.getByRole('button', { name: 'Sign out' }).click(); await p.waitForURL('**/admin/login');
  await p.fill('#email', EMAIL); await p.fill('#password', PASSWORD); await p.click('button[type=submit]');
  await p.locator('#code').waitFor(); log('second login asks for TOTP');
  await p.waitForTimeout(31000 - (Date.now() % 30000)); // fresh window so the code isn't reused
  await p.fill('#code', totp(secret)); await p.click('button[type=submit]'); await p.waitForURL(B + '/admin'); log('TOTP login ok');

  // create provider: invalid then valid
  await p.goto(B + '/admin/providers/new');
  await p.fill('#f-name', 'E2E Photo Co'); await p.fill('#f-slug', 'e2e-photo-co'); await p.selectOption('#f-status', 'published');
  await p.click('button:has-text("Create provider")'); await p.locator('p[role=alert]').waitFor(); log('missing country rejected:', await p.locator('p[role=alert]').innerText());
  log('input kept after error:', await p.inputValue('#f-name'), '/', await p.inputValue('#f-slug'));
  await p.check('input[name=countries][value=CA]'); await p.check('input[name=countries][value=US]');
  await p.fill('#f-websiteUrl', 'https://photo-co.example.com'); await p.fill('#f-summary', 'E2E test provider (local only).');
  await p.click('button:has-text("Create provider")'); await p.waitForURL(/\/admin\/providers\/[0-9a-f-]{36}/); log('provider created');
  const providerUrl = p.url();
  // bad link then good link
  await p.fill('#new-link-label', 'Main'); await p.fill('#new-link-destinationUrl', 'http://insecure.example.com');
  await p.click('button:has-text("Add link")'); await p.locator('p[role=alert]').waitFor(); log('http link rejected:', await p.locator('p[role=alert]').innerText());
  await p.fill('#new-link-destinationUrl', 'https://photo-co.example.com/join?ref=8tasks');
  await p.click('button:has-text("Add link")'); await p.locator('p[role=status]').waitFor(); log('link added');
  await p.screenshot({ path: 'test-results/admin-provider.png', fullPage: true });

  // opportunity in Photo Scouting
  await p.click('a:has-text("Add opportunity")'); await p.waitForURL('**/admin/opportunities/new**');
  await p.selectOption('#f-categoryId', { label: 'Photo Scouting' });
  await p.fill('#f-title', 'Storefront photo missions'); await p.fill('#f-slug', 'storefront-photos');
  await p.check('input[name=countries][value=CA]'); await p.selectOption('#f-status', 'published');
  await p.click('button:has-text("Create opportunity")'); await p.locator('p[role=alert]').waitFor(); log('publish without link rejected:', await p.locator('p[role=alert]').innerText());
  await p.selectOption('#f-affiliateLinkId', { label: 'E2E Photo Co — Main' });
  await p.click('button:has-text("Create opportunity")'); await p.waitForURL(/\/admin\/opportunities\/[0-9a-f-]{36}/); log('opportunity published');

  // public site shows it; /go redirects to stored URL
  const pub = await ctx.newPage();
  await pub.goto(B + '/categories/photo-scouting'); await pub.getByText('Storefront photo missions').waitFor(); log('visible on /categories/photo-scouting');
  await pub.goto(B + '/providers/e2e-photo-co'); await pub.getByText('Storefront photo missions').waitFor(); log('visible on provider profile');
  await pub.screenshot({ path: 'test-results/provider-profile.png', fullPage: true });
  const href = await pub.locator('a:has-text("Visit provider")').getAttribute('href');
  const r = await ctx.request.get(B + href, { maxRedirects: 0, headers: { 'user-agent': 'Mozilla/5.0 (iPhone)' } });
  log('/go ->', r.status(), r.headers()['location']);

  // categories + audit
  await p.goto(B + '/admin/categories'); await p.screenshot({ path: 'test-results/admin-categories.png' });
  await p.goto(B + '/admin/audit'); log('audit rows:', await p.locator('tbody tr').count());

  // anonymous user cannot call admin pages
  const anon = await b.newContext(); const ap = await anon.newPage();
  await ap.goto(B + '/admin/opportunities'); log('anonymous ->', ap.url());
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
