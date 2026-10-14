// The gateway's way to the database in development and tests: a direct connection to the
// local Postgres, calling the same hushmates_api functions PostgREST calls on Supabase.
// Tests can move the database's clock (hushmates.fake_now); nothing else can.

export function createPgDb(pool, { now = null } = {}) {
  return {
    async rpc(fn, params = {}) {
      if (!/^[a-z_]+$/.test(fn)) throw new Error(`bad function name ${fn}`);
      const names = Object.keys(params);
      const sql = `select hushmates_api.${fn}(${names.map((n, i) => `${n} => $${i + 1}`).join(', ')}) as r`;
      const values = names.map((n) => (params[n] !== null && typeof params[n] === 'object' ? JSON.stringify(params[n]) : params[n]));
      const client = await pool.connect();
      try {
        await client.query('select set_config($1, $2, false)', ['hushmates.fake_now', now ? new Date(now()).toISOString() : '']);
        const res = await client.query(sql, values);
        return res.rows[0]?.r ?? null;
      } finally {
        client.release();
      }
    },
  };
}
