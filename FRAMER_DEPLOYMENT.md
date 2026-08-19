# Framer deployment checklist

1. Upload every file from this package to the GitHub repository root.
2. Commit/push.
3. In Framer, replace the current ThinkStill code component with `ThinkStill_UnifiedChat_v58_20_9_FINAL_RELEASE.tsx`.
4. Set **Manifest URL** to:
   `https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/refs/heads/main/manifest.json`
5. Keep the existing transition video/image property-control assets connected.
6. Keep your desired transition **Video Play Time** setting; short clips loop until the configured window ends and long clips are cut at that window.
7. Hard-refresh the published Framer site after GitHub updates.
8. Test one ordinary ritual, one `Panic & body alarm` input, and one Tier-3 support ritual before public release.

Expected runtime:
- transition video appears first on its own screen;
- ritual appears only after transition finishes/cuts off;
- Return Key renders after WIN;
- feedback prompt/buttons come from the selected ritual;
- LESS STEADY stops and points to Safety;
- Tier-3 stays support-first;
- no ritual repeats until the 750-ID pool is exhausted.
