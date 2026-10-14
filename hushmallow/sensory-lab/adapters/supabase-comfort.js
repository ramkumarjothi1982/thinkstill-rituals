// Supabase persistence for Comfort DNA: INTERFACE FOR FUTURE INTEGRATION.
//
// Not used by the Sensory Lab and never constructed by it. It is NOT
// connected to any project, and it contains no URL or key. When the main app's
// authentication (owned by Claude Account 1, Supabase project "hushmallow1") is
// live, the app passes in its own authenticated client:
//
//   const store = new SupabaseComfortStore({ client: supabase, userId: session.user.id });
//   const dna = await new ComfortDNA(store).load();
//
// Requires the table and row-level security in docs/drafts/comfort_profiles.sql
// (a DRAFT for review: nothing has been applied to any database). Every query
// is scoped to the signed-in user, and RLS enforces that on the server too.
// Untested against a real backend; treat as a starting point.

export class SupabaseComfortStore {
  /** @param {{client: object, userId: string, table?: string}} o */
  constructor({ client, userId, table = 'comfort_profiles' } = {}) {
    if (!client || !userId) throw new Error('SupabaseComfortStore needs the app\'s authenticated client and the user id');
    this.client = client;
    this.userId = userId;
    this.table = table;
  }

  async load() {
    const { data, error } = await this.client.from(this.table).select('profile').eq('user_id', this.userId).maybeSingle();
    if (error) throw error;
    return data?.profile ?? null;
  }

  async save(profile) {
    const { error } = await this.client.from(this.table)
      .upsert({ user_id: this.userId, profile, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) throw error;
  }

  async clear() {
    const { error } = await this.client.from(this.table).delete().eq('user_id', this.userId);
    if (error) throw error;
  }

  describe() { return { where: 'Your hushmallow account', synced: true, persistent: true }; }
}
