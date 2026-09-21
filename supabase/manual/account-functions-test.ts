// Run: deno run --allow-env --allow-read --import-map=supabase/manual/account-functions-import-map.json supabase/manual/account-functions-test.ts
// Seed the mock, then load both functions on two ports by patching Deno.serve.
const g = globalThis as any
async function sha(t: string) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('') }
const salt = 'abcdef0123456789'
const hash = await sha(salt + 'CorrectHorse1!')
g.__db = { users: [
  { username: 'alice', password_hash: hash, salt, email: 'alice@example.com', data: { xp: 5, passwordHash: hash, salt, email: 'alice@example.com' } },
  { username: 'oldie', password_hash: '', salt: '', email: null, data: { xp: 1, passwordHash: await sha('s1' + 'pw123456'), salt: 's1', email: 'oldie@example.com' } },
], account_login_attempts: [] }
Deno.env.set('SUPABASE_URL', 'http://mock'); Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'x')
const handlers: any = {}
const realServe = Deno.serve
;(Deno as any).serve = (h: any) => { handlers.current = h; return { finished: Promise.resolve() } }
await import(new URL('../functions/account-login/index.ts', import.meta.url).href); handlers.login = handlers.current
await import(new URL('../functions/account-password/index.ts', import.meta.url).href); handlers.password = handlers.current
;(Deno as any).serve = realServe
const call = async (h: any, body: any) => { const r = await h(new Request('http://x', { method: 'POST', body: JSON.stringify(body) })); return { status: r.status, body: await r.json() } }
const assert = (c: boolean, m: string) => { if (!c) { console.error('FAIL', m); Deno.exit(1) } else console.log('ok ', m) }

let r = await call(handlers.login, { login: 'alice', password: 'CorrectHorse1!' })
assert(r.status === 200 && r.body.ok && r.body.username === 'alice' && r.body.data.xp === 5 && r.body.data.email === 'alice@example.com', 'login by username')
const tok1 = r.body.sessionToken
assert(/^[0-9a-f]{64}$/.test(tok1), 'login returns a 32-byte hex sessionToken')
assert(g.__db.account_sessions.length === 1 && g.__db.account_sessions[0].username === 'alice' && g.__db.account_sessions[0].token_hash === await sha(tok1), 'only the token hash is stored, keyed to the username')
assert(!g.__db.account_sessions.some((s: any) => s.token_hash === tok1), 'the raw token is never stored')
r = await call(handlers.login, { login: 'ALICE@example.com', password: 'CorrectHorse1!' })
assert(r.status === 200 && r.body.username === 'alice', 'login by email, case-insensitive')
assert(r.body.sessionToken && r.body.sessionToken !== tok1 && g.__db.account_sessions.length === 2, 'each sign-in mints its own session')
r = await call(handlers.login, { login: 'oldie@example.com', password: 'pw123456' })
assert(r.status === 200 && r.body.username === 'oldie', 'login for an account whose hash lives only in data')
r = await call(handlers.login, { login: 'nobody', password: 'x' })
assert(r.status === 401 && r.body.error === 'invalid_credentials', 'unknown user is the same generic error')
assert(!('sessionToken' in r.body) && g.__db.account_sessions.every((s: any) => s.username !== 'nobody'), 'a failed sign-in mints nothing')
for (let i = 0; i < 4; i++) { r = await call(handlers.login, { login: 'alice', password: 'wrong' }); assert(r.status === 401, `wrong password ${i + 1} → 401`) }
r = await call(handlers.login, { login: 'alice', password: 'wrong' })
assert(r.status === 429 && r.body.error === 'locked', '5th failure locks')
r = await call(handlers.login, { login: 'alice', password: 'CorrectHorse1!' })
assert(r.status === 429, 'locked even with the right password')
g.__db.account_login_attempts = []
r = await call(handlers.password, { username: 'alice', currentPassword: 'wrong', newPassword: 'NewPass123!' })
assert(r.status === 401, 'change password rejects a wrong current password')
r = await call(handlers.password, { username: 'alice', currentPassword: 'CorrectHorse1!', newPassword: 'NewPass123!' })
assert(r.status === 200 && r.body.ok && /^[0-9a-f]{64}$/.test(r.body.passwordHash), 'change password succeeds')
const aliceSessions = g.__db.account_sessions.filter((s: any) => s.username === 'alice')
assert(/^[0-9a-f]{64}$/.test(r.body.sessionToken) && aliceSessions.length === 1 && aliceSessions[0].token_hash === await sha(r.body.sessionToken), 'password change ends the other sessions and returns a fresh token')
assert(g.__db.account_sessions.some((s: any) => s.username === 'oldie'), 'another account keeps its sessions')
const row = g.__db.users.find((u: any) => u.username === 'alice')
assert(row.password_hash === r.body.passwordHash && row.data.passwordHash === r.body.passwordHash && row.data.xp === 5, 'new hash in column and data, progress kept')
r = await call(handlers.login, { login: 'alice', password: 'NewPass123!' })
assert(r.status === 200, 'login with the new password')
r = await call(handlers.login, { login: 'alice', password: 'CorrectHorse1!' })
assert(r.status === 401, 'old password no longer works')
g.__failInsert = 'account_sessions'
r = await call(handlers.login, { login: 'alice', password: 'NewPass123!' })
assert(r.status === 200 && r.body.ok && r.body.sessionToken === null, 'sign-in still succeeds when the sessions table is missing (step 1 never refuses)')
g.__failInsert = null
console.log('edge functions: all checks passed')
