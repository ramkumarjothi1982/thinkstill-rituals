# Putting Hushmallow on your Framer site

Hushmallow is a complete web app: seven living Mallows, the seven Hushfold
realms, the 1,000 rituals and their touch engines. It is too big
and too interactive to live inside a single Framer code component, so it is
**hosted as its own small static site** and Framer shows it full-bleed with
the `HushmallowEmbed` component.

## 1. Publish the app (GitHub Pages, free)

1. Merge this branch into `main`.
2. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub
   Actions**.
3. **Actions → Publish Hushmallow → Run workflow** (it also runs on every
   push to `main` that changes `hushmallow/`). It runs the tests first and
   only publishes if they pass.
4. Your app is at `https://ramkumarjothi1982.github.io/thinkstill-rituals/`.

The published site contains only the app (`index.html`, `src/`, the Mallow
art, the rig layers and the font). The Studio, the realm gallery, the sound
lab, the source workbook and the Python tools are not published.

Prefer Netlify or Vercel? Publish the same files: `index.html`,
`manifest.webmanifest`, `src/`, `assets/mallows/`, `assets/rig/`,
`assets/fonts/`.

## 2. Add it to Framer

1. In Framer: **Assets → Code → + → New component**, name it
   `HushmallowEmbed`.
2. Replace its contents with [`framer/HushmallowEmbed.tsx`](../framer/HushmallowEmbed.tsx).
3. Drag the component onto your page, set width and height to **Fill**
   (for a phone-style frame, 390 × 844 works well).
4. Paste your app address into **App URL**.

The component allows sound after a tap, share cards, "copy line" and
vibration. On iPhone, Safari doesn't support web vibration, so haptics only
work in the App Store app.

## 3. Payments — read before going public

A website can't take App Store payments. On the web, the plans screen uses a
**test purchase** that unlocks a plan for free. To stop a public site from
giving Hushmallow away, test purchases only work on the hosts listed in
[`src/app/config.js`](../src/app/config.js) (`localhost` by default).
Everywhere else the plans screen says subscriptions aren't on sale on the
web yet, and nothing paid can be opened.

- **To preview the paid experience** on a private address (for example a
  Netlify preview URL that only you know), add that hostname to
  `TEST_PURCHASE_HOSTS`. Never add the domain your customers use.
- **To sell on the web**, Hushmallow needs a web payment provider (for
  example Stripe Checkout) plus a small server that confirms each payment
  and tells the app which plan is active. That needs your payment account
  and isn't built yet. The app is ready for it: `src/app/entitlements.js`
  already takes a store "provider", the same way the App Store build uses
  StoreKit.

Client-side checks alone can always be bypassed by a determined person, so
any paid web launch should confirm the plan on a server.

## 4. Privacy

Nothing typed into Hushmallow leaves the phone. The app only loads its own
files from wherever it's hosted: no analytics, no AI, no font service (the
Fredoka font is bundled). Favourites, history and settings live in the browser's local
storage for that site.
