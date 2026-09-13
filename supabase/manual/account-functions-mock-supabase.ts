const g = globalThis as any
g.__db = g.__db || { users: [], account_login_attempts: [] }
function q(table: string) {
  const rows = () => g.__db[table] as any[]
  let filters: [string, any][] = []
  let op = 'select'; let payload: any = null; let lim = Infinity
  const get = (r: any, col: string) => col.startsWith('data->>') ? r.data?.[col.slice(7)] : r[col]
  const run = () => {
    const match = rows().filter(r => filters.every(([c, v]) => get(r, c) === v))
    if (op === 'select') return { data: match.slice(0, lim).map(r => structuredClone(r)), error: null }
    if (op === 'update') { match.forEach(r => Object.assign(r, payload)); return { data: null, error: null } }
    if (op === 'delete') { g.__db[table] = rows().filter(r => !match.includes(r)); return { data: null, error: null } }
    return { data: null, error: null }
  }
  const b: any = {
    select() { op = 'select'; return b },
    eq(c: string, v: any) { filters.push([c, v]); return b },
    limit(n: number) { lim = n; return Promise.resolve(run()) },
    maybeSingle() { const r = run(); return Promise.resolve({ data: r.data?.[0] || null, error: null }) },
    update(p: any) { op = 'update'; payload = p; return b },
    delete() { op = 'delete'; return b },
    upsert(p: any) { const i = rows().findIndex(r => r.login === p.login); if (i >= 0) rows()[i] = { ...rows()[i], ...p }; else rows().push(p); return Promise.resolve({ data: null, error: null }) },
    then(res: any, rej: any) { return Promise.resolve(run()).then(res, rej) },
  }
  return b
}
export function createClient() { return { from: (t: string) => q(t) } }
