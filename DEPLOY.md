# Deployment / Fetch Checklist

## Recommended GitHub layout

Keep `public/data` exactly as supplied. Do not move the JSON into `src/` if the app currently fetches it at runtime.

## Expected production URLs

After deployment, these must return HTTP 200 and JSON:

- `/data/thinkstill-manifest.json`
- `/data/thinkstill-rituals.json`
- `/data/thinkstill-routing.json`
- `/data/thinkstill-safety.json`
- `/data/thinkstill-first-session.json`

## If you see a fetch error

1. Open `/data/thinkstill-manifest.json` directly in the deployed browser.
2. Confirm the host serves the `public` directory at `/`.
3. Confirm filename case exactly matches.
4. Do not prepend `/public` to browser URLs.
5. Confirm the deployment did not exclude JSON assets.
6. Run `npm run validate:thinkstill` locally before redeploying.

## Cache strategy

The loader requests the manifest with `cache: "no-store"`. You can cache versioned JSON assets aggressively at the CDN layer because their filenames are immutable.
