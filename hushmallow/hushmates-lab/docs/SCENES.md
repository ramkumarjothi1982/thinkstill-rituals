# Hushmates scenes: the contract

Every Hushmates screen is a **scene**: one living composition in the
hushmallow landing page's visual world, not a dashboard page. This file is the
contract the scenes, the lab autoplay (`lab/lab.js`) and the QA tool
(`tools/shots.cjs`) share.

## 1. What a scene module exports

```js
// ui/screens/<name>.js
export function <name>(device, params) {
  return {
    el,            // the scene's root element (use class "hm-scene <prefix>")
    mood,          // atmosphere: 'dawn' | 'day' | 'sky' | 'warm' | 'hush' | 'dusk' | 'calm' | 'play'
    tint, glow,    // optional, for mood 'play' (a Mallow's tint / glow colours)
    quiet,         // optional boolean: the atmosphere softens and dims
    live,          // optional: rebuild the whole scene when client state changes
    mounted() {},  // optional: after insertion (entrances, data loading)
    update(state, detail) {},  // optional: incremental updates instead of `live`
    destroy() {},  // required if the scene made Mallows/timers (MallowSet.destroy())
  };
}
```

`device` gives you:

| API | Use |
|---|---|
| `device.client` | the person's client (see §3). Never touch the service directly. |
| `device.state` | `client.state`: `{ online, me, invitations, hushmates, blocked, conversations }` |
| `device.go(name, params, { transition })` | navigate. Transitions: `'soft'` (default), `'portal'` (a bloom of light into a shared place: accept → Hushspace, opening a Hushspace), `'back'`, `'none'` |
| `device.back()`, `device.home()` | navigate back |
| `device.sheet({ title, body, actions, art, label, dismissible, onClose })` | bottom sheet (spring in). `art` is an element shown above the title (e.g. a Mallow). Returns `{ close, panel }` |
| `device.closeSheet()` | |
| `device.confirm({ title, text, confirmLabel, cancelLabel, danger, art })` | Promise<boolean>; its confirm button has `data-test="confirm"` |
| `device.toast(text, { tone: 'calm' | 'warn' })` | a soft notice pill for system feedback only |
| `device.run(fn, { ok })` | runs an action; on error shows the service's own message as a warn notice; returns `undefined` on failure |
| `device.atmo` | the Atmosphere: `.set(mood, {tint, glow})`, `.quiet(bool)`, `.bloom({x, y, colour})` |
| `device.memory` | per-device scratch object for remembered UI state (drafts, filters, step) |
| `device.prefs` | `{ textSize: 0|1|2, safetyNoteSeen }` |
| `device.onScreen?.(event, data)` | tell the lab about things it tracks (see hooks) |
| `device.name` | `'moon'` or `'cloud'` (use it to make element ids unique per phone) |

## 2. The foundation (import, don't re-implement)

- `ui/dom.js`: `h(tag, attrs, ...kids)` (people's text must only ever go in as children/text, never `innerHTML`), `icon(name, label?)` (hand-drawn 1.9 stroke icons: back, arrow, more, send, x, check, chevron, heart, shield, help, mail, search, moon, flag, block, leave, bellOff, eyeOff, pause, download, trash, refresh, key, sparkle, wifiOff, text, plus, filter), `testTag()`, `statusPill(status)`, `styleLabel`, `availabilityLabel`, `statusOf`, `intentOf`, `fmtTime`, `fmtDay`, `fmtWhen`, `fmtUntil`.
- `ui/mallow.js`: `new Mallow(id, { size, shadow, interactive, label, onSqueeze, eager, float, still, pressSeconds, particleScale })` → `.el` plus `.press(depth, s)`, `.release(soft)`, `.signature(intensity)`, `.settle()` (a small real-event reaction), `.pulseBlush()`, `.cheer(delay)` (hop), `.leanTo(-1..1)`, `.sleepy(bool)` (half-closed eyes, for quiet), `.stepBack()` (calm goodbye), `.emit(kind, n)`, `.destroy()`. Use `MallowSet` (`set.make(id, opts)`, `set.destroy()`) per scene. `face(id, { size, float, label })` is the still art for small places. `bindPress(el, { onDown, onUp })`.
- `ui/mallows-data.js`: `MALLOWS[id]` (`name, title, vibe, alt, body, deep, tint, glow, blush, hello, …`), `ORDER`, `LOGO`, `MASCOT`.
- `ui/kit.js`: `pillow()`, `glow(colour)`, `eyebrow(text, { tag, center })`, `headline(level, plain, em, { grad: 'mates'|'softer'|'pace'|'warm', cls })`, `hairline(text)`, `hint(text, { tone: 'pink'|'lilac' })`, `round(icon, label, onclick, attrs)`, `sentenceSwitch({ id, label, hint, checked, onChange, test })` (onChange may return `false` to revert), `chip(label, pressed, onclick, { dot, test, small })`, `tags(list, mallow)`, `arc({ flow, cls })` (the glowing connection line, viewBox 400×160, position it with CSS), `travel(container, { from, via, to, kind: 'light'|'heart', duration })` ([left%, top%] points; resolves on landing), `caption(zone, { who, text, colour })`.
- `ui/motion.js`: `dropIn(el, opts)`, `rise(els, opts)`, `springCurve`, `Channel`, `EASE`, `CSS_EASE`, `reducedMotion()`, `wait`, `rand`, `clamp`.
- `styles/world.css`: tokens (`--hm-ink`, `--hm-ink-2`, `--hm-ink-3`, `--hm-cream`, `--hm-display` Fraunces SOFT, `--hm-body` Nunito Sans, `--hm-ui` Manrope, `--hm-ease`, shadows `--hm-shadow-pill|bubble|card|panel`, `--hm-gutter`), and classes: `hm-scene`, `hm-scroll` (the scrolling body), `hm-top` (+ `hm-top-label`, `hm-top-spacer`), `kit-title` (+ `--xl`, `--md`, `--sm`), `kit-support`, `kit-lede`, `kit-body`, `kit-note`, `kit-name`, `kit-label`, `kit-btn` (+ `--ink`, `--ghost`, `--white`, `--text`, `--link`, `--quiet-danger`, `--lg`, `--sm`, `--xs`, `--block`), `kit-row`, `kit-round`, `kit-chips` (+ `--scroll`), `kit-tags`, `kit-hint`, `kit-status`, `kit-switch`, `kit-field` (pill input), `kit-select`, `kit-textarea`, `kit-error`, `kit-caption`, `kit-pillow`, `kit-glow`, `kit-arc`, `kit-stack`, `kit-section`, `kit-rows`, `kit-person` (+ `-name`, `-sub`), `mw` (Mallow).
- Scene CSS goes in `styles/scenes/<file>.css` with a short class prefix per scene. Use the tokens; no new colours except Mallow colours from `MALLOWS`.

## 3. The client (data and actions)

`device.client` (`client/client.js`):
- `state.me` → `{ accountState, test, isModerator, limits: { maxActiveHushmates, messageMaxChars }, profile, activeHushmates, pendingReceived }`; `profile` → `{ handle, pseudonym, avatar, interests[], style, language, availability, discoverable, acceptingInvites, status: 'available'|'quiet'|'break', inviteCode }`.
- `state.invitations[]` → `{ id, direction: 'received'|'sent', status: 'pending'|'accepted'|'declined'|'cancelled'|'expired', createdAt, expiresAt, other: { handle, pseudonym, avatar, test, interests?, style?, language?, availability? }, conversationId }`.
- `state.hushmates[]` (one per Hushspace) → `{ id, open, closedByMe: null|'blocked'|'disconnected'|'deleted', other: { handle, pseudonym, avatar, test, status }, intent: { mine, theirs }, quiet: { mine, theirs }, muted, unread, lastSeq, lastAt }`.
- `state.blocked[]` → `{ handle, pseudonym, avatar, at }`.
- `state.conversations[id]` → `{ view, messages[], hasMore, loaded, outbox[] }`; message `{ id, seq, mine, at, body, deleted }`; outbox item `{ clientId, body, state: 'sending'|'failed' }`.
- `client.api(method, args)` (raw call), `client.act(method, args, refreshScopes[])`, `client.openConversation(id)`, `client.closeConversation(id)`, `client.loadEarlier(id)`, `client.sendMessage(id, text)` → `{ ok, error? }`, `client.retry(id, clientId)`, `client.discard(id, clientId)`, `client.markRead(id)`.
- Service methods (via `act`/`api`): `saveProfile(patch)`, `regenerateInviteCode`, `discover({ style, interests })` → `{ cards[] }` (card: `{ handle, pseudonym, avatar, interests, style, language, availability, acceptingInvites, test, invitation: null|'sent'|'received' }`), `sendInvitation({ handle })`, `redeemInviteCode({ code })`, `respondToInvitation({ id, accept })` (accepted view has `conversationId`), `cancelInvitation({ id })`, `removeHushmate({ conversationId })`, `getConversation`, `setIntent({ conversationId, intent })`, `setConversationQuiet({ conversationId, quiet })`, `setConversationMuted({ conversationId, muted })`, `deleteMessage({ conversationId, messageId })`, `block({ handle })`, `unblock({ handle })`, `report({ conversationId?, messageId?, handle?, category, details, alsoBlock })` → `{ expectation }`, `exportMyData()`, `deleteMyIdentity({ confirm: 'DELETE' })`.
- Lists: `INTENTS`, `STYLES`, `INTERESTS`, `LANGUAGES`, `AVAILABILITY`, `STATUSES`, `REPORT_CATEGORIES`, `LIMITS` in `core/config.js`; `checkMessage`, `checkPseudonym`, `charCount` in `core/text-policy.js`.

## 4. data-test hooks (required: the lab autoplay and QA depend on them)

| Scene | Hooks |
|---|---|
| welcome | `create-identity` |
| identity | `id-next` (continue on each step), `save-identity` (final save), `pseudonym` (name input), `id-pick-<mallowId>`, `suggest-name` |
| home | `go-find`, `go-invitations` (always present), `go-hushmates`, `go-boundaries`, `go-safety`, `edit-identity`, `status`, `hushmate-<Pseudonym>` (each Hushmate's Mallow: opens the Hushspace) |
| find | `pick-<Pseudonym>` (one per candidate), `card-<Pseudonym>` (the focused candidate's card, present only while focused), `invite-<Pseudonym>`, `send-invite` (sheet), `code-input`, `code-use`, `filters`; call `device.onScreen('find:results', { names })` after each load |
| invitations | `received-<Pseudonym>` (container) with `accept` and `decline` inside; `withdraw` on sent rows |
| hushmates | `hushmate-<Pseudonym>` rows |
| hushspace | `composer`, `send`, `back`, `hs-more`, `intent-mine`, `intent-theirs`, `intent-<intentId>` (sheet options), `their-intent-line`, `their-quiet`, `my-quiet`, `quiet-toggle`, `mute-toggle`, `report-conversation`, `report-message`, `cat-<categoryId>`, `submit-report`, `disconnect`, `block`, `msg`, `msg-pending`, `msg-failed`, `retry`, `closed-text` |
| boundaries | `status-<id>`, `accept-toggle`, `discover-toggle`, `invite-code`, `unblock-<Pseudonym>`, `export`, `delete-identity` |

## 5. Rules (non-negotiable)

1. **No AI and no fabricated humans.** Mallows never speak inside a Hushspace and never react to message content. Mallow animations follow touches or real events only (a message really arrived, you really sent one). No typing indicators, read receipts, "last seen" or presence. No guilt or pressure copy ("misses you", "you haven't replied").
2. **Safety is never decoration-gated.** Blocking, reporting, disconnecting, quiet mode, mute, status and the privacy controls stay one or two taps away and fully labelled.
3. **Readable first.** Text on the atmosphere needs strong contrast: body copy is `--hm-ink-2` or darker on light washes; messages sit on solid bubbles. Nothing animates behind text that's being read.
4. **Accessible.** Every control is a real `button`/`input` with a visible label or `aria-label`; 44px minimum touch targets; focus order makes sense; `prefers-reduced-motion` keeps everything usable (the foundation handles the Mallows, the atmosphere and transitions; your own CSS animations must be in keyframes that the global reduced-motion rule neutralises, and JS entrances should use `dropIn`/`rise`, which already respect it).
5. **Phone first.** Must look right at 320×568 (device ≈ 320×538), 375×812, 390×844 (device ≈ 390×784) and inside the desktop phone frame (≈ 370×824). No horizontal scroll, no clipped text, no overlaps, safe-area aware.
6. **The landing look.** Cream and pastel light, Fraunces SOFT headlines (italic gradient second halves for hero lines), Manrope UI, Nunito body, ink pill primaries, white/ghost pills, hairline insets instead of borders, long soft lilac shadows, Mallows on pillows with ground shadows. **No dark containers, no boxed tile menus, no heavy borders.** Characters are the focal point and, where possible, the navigation.
7. **British spelling, plain warm copy**, lowercase "hushmallow", "Hushmates", "Hushspace", "Mallow".
8. Keep `test identity` labels visible on simulated people (`testTag()`).
