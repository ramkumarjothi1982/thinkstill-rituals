// Development only: runs the real Edge Function entry point (supabase/functions/hushmates/index.ts)
// under Deno on this machine, on the port the dev stack chose, so the local stack can send it
// the app's requests exactly as Supabase would. On Supabase the platform runs index.ts itself
// and this file is never deployed (it isn't under supabase/functions).
//
//   deno run --allow-net=127.0.0.1 --allow-env=<the function's secrets> server/edge-local.ts
//   (server/dev-stack.mjs with edge: 'deno' starts it with the right secrets)

const port = Number(Deno.env.get('HUSHMATES_EDGE_PORT'));
if (!Number.isInteger(port) || port <= 0) throw new Error('HUSHMATES_EDGE_PORT is not set');
const serve = Deno.serve.bind(Deno);
// index.ts calls Deno.serve(handler); here it listens on 127.0.0.1 only, on the chosen port
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (handler: Deno.ServeHandler) => serve({ port, hostname: '127.0.0.1', onListen: () => console.log(`edge function listening on ${port}`) }, handler);
await import('../supabase/functions/hushmates/index.ts');
