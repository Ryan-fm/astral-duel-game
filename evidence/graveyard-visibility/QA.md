# Graveyard visibility revision — 2026-10-26

Local review on `codex/arena-graveyard-fx-20261026`; no deployment, Toy update or remote push.

## Visible changes

- Distinct raised stone Graveyard seal and golden banishment prism, with projected public counts and clickable archives.
- 2.3-second face lift, curved travel and landing seal. Simultaneous transfers are staggered; summon spotlights wait 1.9 seconds so the initial card flight stays visible. All timings affect presentation only.
- Public movement names and thumbnails remain in a dismissible feed for 5.5 seconds, with a recent-history toggle afterward.
- Large courtyard flagstones share the ground elevation; directional daylight, retained stone PBR surfaces and four batched warm braziers add scene depth.
- Optional movement/pulsing respects effects-off and reduced motion; essential public counts/history remain available.

## Verification

- `npm run test:game`: 191 / 191 passed.
- `npm run build:game`: passed, including protected runtime check and TypeScript. Existing bundle-size advisory remains.
- `git diff --check`: passed.
- Real browser checks at 1280×720 and 844×390: manually dragged Miracle Fusion, selected both Graveyard materials, confirmed fusion, observed one spell entering GY and two materials entering the banished area; no changes to deliberate material choices or result rewards.
- Both tactical and immersive views checked. Mobile archive opens, card list scrolls and primary action area stays clear. Captured browser error log was empty.
- Environment tests preserve scene geometry/draw budgets, ground ray intersections and texture disposal. Public-pile tests cover initial/reconnect suppression, borrowed card ownership, public identities, transfer staging and altar bounds.
- Fixed an unrelated intermittent offline test fixture: a randomly drawn Fusion is now placed in the Extra Deck instead of introducing a possibly illegal fourth main-deck fallback card.

## Evidence

- `scene.jpg`: final immersive scene.
- `actual-transfer.mp4`: actual 1280×720 UI capture after the summon timing fix; no audio or synthetic frames.
- `transfer.jpg`: a frame from that capture.
- `mobile-scene.jpg`, `mobile-transfer.jpg`, `mobile-archive.jpg`: actual 844×390 browser captures.

Preview: http://127.0.0.1:5205/game.html (local production build). Enter 人机决斗 → 新手教学 → 07 GX · 奇迹融合 to reproduce the public pile transfers.
