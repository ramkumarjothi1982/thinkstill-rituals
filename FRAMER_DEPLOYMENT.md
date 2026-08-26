# Framer deployment — ThinkStill v6 FINAL

1. Upload every file in this package to the GitHub repository root.
2. Commit/push the files.
3. In Framer, replace the current ThinkStill Code Component with `ThinkStill_UnifiedChat_v6_10of10_FINAL_RELEASE.tsx`.
4. Set **Manifest URL** to the raw `manifest.json` URL.
5. Reconnect the seven bubble avatar images if required.
6. Reconnect up to five transition videos/images for each bubble.
7. Set **Video Before Ritual = ON**.
8. Set **Video Play Time** to the exact transition duration you want. Use 0 to let the source video finish naturally.
9. Adjust **Video Size**, **Circular Crop**, and **Crop Zoom** in Framer.
10. Adjust **Avatar Size / X / Y** in Framer.
11. Adjust **Arrow Size / Arrow Gap** if required; left and right arrows remain equidistant because they occupy equal side columns.
12. Publish and hard-refresh the Framer site.

## Functional release checks

Test all of these after deployment:

- ordinary overthinking input routes to a relevant non-support ritual;
- panic/body-alarm input routes to a relevant ritual;
- explicit safety/high-risk language routes to a SUPPORT FIRST ritual;
- transition video appears before ritual content;
- Next gives another unused best-fit ritual;
- Back returns to the previous ritual;
- ENTER remains separate from Next;
- mic icon accepts speech when the browser supports Web Speech Recognition;
- Mind Bend renders after WIN;
- SUPPORT FIRST renders after Mind Bend when present;
- there is no feedback-question panel;
- RESET CONSOLE clears the browser-local 750-ID seen pool.
