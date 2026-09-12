// Country of the request, for the homepage's Turkish banner.
//
// 2026-09-12, founder's cleanup item 11: "TR IP sees the banner, US does not."
// The homepage is a static file and cannot read request headers, and until
// today it decided from `navigator.language` — a Turkish-locale browser in
// Berlin saw the banner, a Turkish user on an en-US laptop in Ankara did not.
// Vercel stamps `x-vercel-ip-country` on every request; this function echoes
// that one header and nothing else. No IP address is read, logged or
// returned; nothing is stored; the response is never cached.
export default function handler(req, res) {
  const raw = req.headers['x-vercel-ip-country'];
  const country = typeof raw === 'string' ? raw.toUpperCase().slice(0, 2) : '';
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).end(JSON.stringify({ country: /^[A-Z]{2}$/.test(country) ? country : null }));
}
