#!/usr/bin/env bash
# Checks the hushmallow SQL on a throwaway LOCAL PostgreSQL (no Docker, no
# network, never a real project):
#   1. a fresh cluster in a temp folder + tools/auth/pg-supabase-shim.sql
#   2. supabase/migrations/0001…0008 in order, as `postgres` (like the SQL editor)
#   3. the same migrations again (they must be safe to re-run)
#   4. supabase/tests/rls_check.sql (must print ALL … CHECKS PASSED and leave nothing behind)
#   5. supabase/rollback/rollback_all.sql, then the migrations once more
#   6. the owner's production bundle (supabase/production/, tools/auth/bundle-sql.mjs) on a fresh
#      database: up to date, ALL_MIGRATIONS.sql twice and RLS_CHECK.sql, each file sent as ONE query
#      string, the way the Supabase SQL editor sends a pasted script
# Usage: bash hushmallow/tools/auth/sql-check.sh   (needs PostgreSQL 14+ binaries and node; runs as the
# `postgres` OS user when started as root). Exit 0 only if every step passed. The SQL is fed on
# stdin, so the checkout need not be readable by the `postgres` OS user.
set -euo pipefail
here="$(cd "$(dirname "$0")/../.." && pwd)"
bin="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -x "$bin/initdb" ] || { echo "no PostgreSQL binaries (set PG_BIN)" >&2; exit 2; }
work="$(mktemp -d /tmp/hm-sql-check.XXXXXX)"
port="${PG_PORT:-55432}"
as() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
chmod 777 "$work"
cleanup() { as "$bin/pg_ctl" -D "$work/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$work"; }
trap cleanup EXIT
as "$bin/initdb" -D "$work/data" -U supabase_admin -A trust >/dev/null
as "$bin/pg_ctl" -D "$work/data" -o "-p $port -k $work -c listen_addresses=''" -l "$work/log" -w start >/dev/null
psql_as() { local who="$1"; shift; PGOPTIONS="-c client_min_messages=warning" as "$bin/psql" -X -q -v ON_ERROR_STOP=1 -h "$work" -p "$port" -U "$who" "$@"; }
psql_as supabase_admin -d postgres -c "create database hm owner supabase_admin" >/dev/null
psql_as supabase_admin -d hm -f - < "$here/tools/auth/pg-supabase-shim.sql" >/dev/null
psql_as supabase_admin -d hm -c "alter database hm owner to postgres" >/dev/null
# a pristine copy (the stand-in only, nothing run yet) for step 6
psql_as supabase_admin -d postgres -c "create database hm_bundle template hm owner postgres" >/dev/null
# what-if: a project whose postgres role lacks BYPASSRLS (Supabase's has it)
[ "${SHIM_NO_BYPASS:-}" = 1 ] && psql_as supabase_admin -d hm -c "alter role postgres nobypassrls" >/dev/null
migrate() { for f in "$here"/supabase/migrations/0*.sql; do psql_as postgres -d hm -f - < "$f" >/dev/null || { echo "FAILED: $(basename "$f")" >&2; exit 1; }; done; }
echo "1/5 migrations (fresh)"; migrate
echo "2/5 migrations (again: idempotent)"; migrate
echo "3/5 rls_check.sql"
out="$(psql_as postgres -d hm -A -t -f - < "$here/supabase/tests/rls_check.sql")"
echo "$out" | sed 's/^/    /'
echo "$out" | grep -q '^ALL [0-9]* CHECKS PASSED' || { echo "rls_check failed" >&2; exit 1; }
left="$(psql_as postgres -d hm -A -t -c "select (select count(*) from auth.users) + (select count(*) from public.profiles) + (select count(*) from public.sync_consents)")"
[ "$left" = 0 ] || { echo "rls_check left $left rows behind" >&2; exit 1; }
echo "    nothing left behind (auth.users + profiles + consents = 0)"
echo "4/5 rollback"; psql_as postgres -d hm -f - < "$here/supabase/rollback/rollback_all.sql" >/dev/null
kept="$(psql_as postgres -d hm -A -t -c "select count(*) from pg_trigger where tgname = 'on_auth_user_created'")"
[ "$kept" = 0 ] && echo "    sign-up trigger dropped" || echo "    sign-up trigger kept as a no-op (this role may not drop triggers on auth.users)"
gone="$(psql_as postgres -d hm -A -t -c "select count(*) from pg_tables where schemaname in ('public','hm_private')")"
[ "$gone" = 0 ] || { echo "rollback left $gone tables" >&2; exit 1; }
echo "5/5 migrations after rollback"; migrate
psql_as postgres -d hm -A -t -f - < "$here/supabase/tests/rls_check.sql" | tail -1 | sed 's/^/    /'
echo "6/6 production bundle (supabase/production/), each file as one query string like the SQL editor"
node "$here/tools/auth/bundle-sql.mjs" --check | sed 's/^/    /'
prod="$here/supabase/production"
for run in first again; do
  psql_as postgres -d hm_bundle -c "$(cat "$prod/ALL_MIGRATIONS.sql")" >/dev/null || { echo "FAILED: ALL_MIGRATIONS.sql ($run run)" >&2; exit 1; }
done
ran="$(psql_as postgres -d hm_bundle -A -t -c "select count(*) from hm_private.schema_migrations")"
want_ran="$(ls "$here"/supabase/migrations/0*.sql | wc -l | tr -d ' ')"
[ "$ran" = "$want_ran" ] || { echo "ALL_MIGRATIONS.sql recorded $ran of $want_ran migrations" >&2; exit 1; }
echo "    ALL_MIGRATIONS.sql twice: $ran migrations recorded"
want="$(grep -m1 -o 'ALL [0-9]* CHECKS PASSED' "$prod/RLS_CHECK.sql")"
out="$(psql_as postgres -d hm_bundle -A -t -c "$(cat "$prod/RLS_CHECK.sql")")"
echo "$out" | tail -1 | sed 's/^/    /'
echo "$out" | grep -q "^$want" || { echo "RLS_CHECK.sql did not end with: $want" >&2; exit 1; }
! echo "$out" | grep -q '^FAIL' || { echo "RLS_CHECK.sql printed a FAIL" >&2; exit 1; }
left="$(psql_as postgres -d hm_bundle -A -t -c "select (select count(*) from auth.users) + (select count(*) from public.profiles) + (select count(*) from public.sync_consents)")"
[ "$left" = 0 ] || { echo "RLS_CHECK.sql left $left rows behind" >&2; exit 1; }
echo "sql-check: ok"
