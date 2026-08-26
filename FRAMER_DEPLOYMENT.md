# Framer Deployment

Use `ThinkStill_UnifiedChat_v38.4.7_EXACT_FORMAT_v7_SAFETY.tsx` as the Framer code component.

## Required property
**Manifest URL** = raw GitHub URL to `manifest.json`.

## Exact ritual renderer
The TSX reads `full_ritual` first when it contains all required v7 labels.
It prepends hidden `PLAY TIME` metadata for the `<Bubble> <time> Guided Reset` header, then renders:

1. GAME
2. MISSION
3. ONE RULE
4. PLAY
5. TWIST
6. WIN
7. MIND BEND
8. SAFETY
9. SUPPORT FIRST (only where present)

## Existing UI preserved
The uploaded component's media-player navigation, independent ENTER action,
avatar X/Y/size controls, 5 transition media slots per bubble, and video-before-ritual
flow remain in the file.
