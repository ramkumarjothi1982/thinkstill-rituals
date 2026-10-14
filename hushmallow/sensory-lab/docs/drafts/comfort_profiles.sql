-- DRAFT: Comfort DNA storage for hushmallow. For review only.
-- NOT APPLIED to any database. Do not run against production (project
-- "hushmallow1") until authentication, the privacy policy and this schema are
-- approved. Owner of production Supabase: Claude Account 1.

create table if not exists public.comfort_profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  -- the whole ComfortDNA profile (see sensory-lab/core/comfort-dna.js, version 1):
  -- { version, enabled, learn, prefs{...}, favourites[...], history{...} }
  -- prefs/favourites/history hold choices and usage counts only: no free text,
  -- no feelings, nothing typed by the person.
  profile    jsonb not null check (jsonb_typeof(profile) = 'object' and (profile->>'version')::int = 1),
  updated_at timestamptz not null default now()
);

alter table public.comfort_profiles enable row level security;

-- A person can only ever see, create, change or delete their own row.
create policy "comfort: read own"   on public.comfort_profiles for select using (auth.uid() = user_id);
create policy "comfort: insert own" on public.comfort_profiles for insert with check (auth.uid() = user_id);
create policy "comfort: update own" on public.comfort_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "comfort: delete own" on public.comfort_profiles for delete using (auth.uid() = user_id);

-- Keep rows small (the app caps favourites at 12 and history to known items).
alter table public.comfort_profiles add constraint comfort_profile_size check (pg_column_size(profile) < 16384);
