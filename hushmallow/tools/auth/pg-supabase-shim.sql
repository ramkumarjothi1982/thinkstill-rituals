-- A SMALL STAND-IN for the parts of a Supabase database the hushmallow
-- migrations touch, for checking the SQL on a plain local PostgreSQL in a
-- sandbox with no Docker (tools/auth/sql-check.sh). NEVER run this against a
-- real project. The real check is supabase/tests/rls_check.sql on the
-- project itself (and the CI job on a local Supabase stack).
--
-- Mirrors Supabase: roles anon / authenticated / service_role /
-- supabase_auth_admin / authenticator; `postgres` is NOT a superuser but has
-- BYPASSRLS and owns the database; auth.users owned by supabase_auth_admin
-- with full access for postgres; auth.uid() / auth.role() / auth.jwt() read
-- request.jwt.claims; default privileges that grant new public tables and
-- functions to anon / authenticated / service_role (which the migrations
-- must revoke). Run as the cluster superuser.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role supabase_auth_admin noinherit createrole login;
create role authenticator noinherit login;
grant anon, authenticated, service_role to authenticator;
create role postgres login createrole createdb bypassrls;
grant anon, authenticated, service_role to postgres;

create schema auth authorization supabase_auth_admin;
grant usage on schema auth to anon, authenticated, service_role, postgres;

create table auth.users (
  instance_id uuid,
  id uuid primary key,
  aud varchar(255),
  role varchar(255),
  email varchar(255),
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  is_sso_user boolean not null default false,
  is_anonymous boolean not null default false
);
create table auth.identities (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users (id) on delete cascade, provider text);
create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users (id) on delete cascade);
alter table auth.users owner to supabase_auth_admin;
alter table auth.identities owner to supabase_auth_admin;
alter table auth.sessions owner to supabase_auth_admin;
grant all on all tables in schema auth to postgres;
grant select on auth.users to service_role;

create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'))::text
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim', true), ''), nullif(current_setting('request.jwt.claims', true), ''))::jsonb
$$;
alter function auth.uid() owner to supabase_auth_admin;
alter function auth.role() owner to supabase_auth_admin;
alter function auth.jwt() owner to supabase_auth_admin;
grant execute on all functions in schema auth to anon, authenticated, service_role, postgres;

-- the public schema as Supabase sets it up
alter schema public owner to postgres;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
