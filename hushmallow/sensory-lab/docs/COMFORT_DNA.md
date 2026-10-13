# Comfort DNA: data, privacy and integration

Comfort DNA is optional personalisation. It remembers what a person chose, and
it remembers what they use only if they say so. It never stores words,
feelings or anything typed, and it never infers anyone's state.

Code: `core/comfort-dna.js` (engine), `adapters/comfort-store.js` (local and
memory stores), `adapters/supabase-comfort.js` (future account store, not
connected), `features/comfort-dna.js` (screen).

## What is stored (profile version 1)

```json
{
  "version": 1,
  "enabled": true,
  "learn": false,
  "prefs": { "favouriteMallow": "loomi", "responses": "gentle", "comfort": ["breathe", "float"] },
  "favourites": [ { "kind": "pocket", "id": "soft-breath" }, { "kind": "softbody", "id": "softbody", "mallow": "blubi", "material": "jelly" } ],
  "history": { "pocket:let-it-float": { "kind": "pocket", "id": "let-it-float", "n": 3, "last": 1791900000000 } }
}
```

| Field | Values | Default | Used by |
|---|---|---|---|
| `favouriteMallow` | the seven Mallow ids | boppo | every experience, home |
| `responses` | gentle / balanced / playful | balanced | the Mallow's answers (gentle = smaller, slower, no jumps) |
| `animationSpeed` | slower / natural / livelier | natural | rig and physics clock (0.82 / 1 / 1.14), Soft Breath pace |
| `motion` | soft / normal / bouncy | normal | impulse strength of touches and reactions (0.6 / 1 / 1.25) |
| `voice` | true / false | true | the Mallow's voice sounds |
| `touchSounds` | true / false | true | squish, stretch, breath, bubble and chime sounds |
| `colours` | mallow / warm / cool / lavender / rose | mallow | stage glow, light orb, breath ring, floating things |
| `environment` | auto / stage / one of the seven realms | auto | backdrop (auto = Pocket Hush in the Mallow's own realm, plain stage elsewhere) |
| `comfort` | any of squeeze, hold, stroke, breathe, glow, float, quiet | none | "For you" offers, Pocket Hush order, Surprise Me weights |

Only values that differ from the defaults are stored. Volume, sound on/off,
haptics, reduced motion, theme and quality are device settings in
`core/prefs.js`, not personalisation; the volume slider appears in both
places but is one setting.

## Privacy behaviour (all tested)

- **Off:** with personalisation off, every experience uses the defaults. The
  person's choices stay saved until they delete them.
- **Learning:** off by default. When on, it counts which Pocket Hush moments,
  SoftBody materials and experiences are opened, with a last-used time.
  Free-form data and unknown items are refused.
- **View:** "View everything saved" lists every stored value in plain words.
- **Reset:** returns personal settings and favourites to the defaults.
  History is kept, because it has its own delete.
- **Delete history:** empties the usage counts.
- **Delete everything:** clears the store. A second tap confirms, because
  browser confirm dialogs aren't available in the hosted preview.
- **Storage:** the lab uses one key, `hm.sensorylab.comfort.v1`, in this
  browser only. If storage is blocked, the profile lives in memory for the
  visit and the screen says that nothing is kept.
- **Stored data is untrusted:** it is sanitised on load. Unknown keys,
  invalid values, a wrong version and malformed history are dropped.

## Store interface

```
load()     → Promise<object|null>
save(obj)  → Promise<void>
clear()    → Promise<void>
describe() → { where: string, synced: boolean, persistent: boolean }
```

## Integration with the main app (later, after approval)

1. Claude Account 1's authentication provides an authenticated Supabase client
   and the user id.
2. Review and apply `docs/drafts/comfort_profiles.sql` in a non-production
   project first. It has one row per user, a JSON profile, and RLS so people
   can only read and write their own row. **It has not been applied anywhere.**
3. Construct `new ComfortDNA(new SupabaseComfortStore({ client, userId }))`.
   Keep `LocalComfortStore` for signed-out use.
4. Decide with the product owner how to merge a local profile into an account
   at first sign-in (suggested: ask, never merge silently).
5. Run the Phase 2 suites against the real backend before claiming that
   account sync works.

The Supabase store is tested only against a fake client (query shape and user
scoping). It hasn't been run against a real database.
