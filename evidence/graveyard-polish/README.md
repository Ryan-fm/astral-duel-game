# Graveyard scene and effects — local review

2026-10-26 · branch `codex/arena-graveyard-fx-20261026`

- Ground-bound stone/metal Graveyard and banished receptacles on both sides; visible top public card and count, with projected 44 px controls.
- State-derived card travel to the owning player's public destination; warm gold for banishing, cool violet for Graveyard. No hidden engine state, stale replay or authoritative delay.
- Compact archive with player/area/type filters, latest-first cards, selected-card preview, full Chinese reader and per-instance return context.
- Desktop and 844×390 landscape screenshots are actual in-app-browser captures. Close controls remain outside the scrollable card panes.

Validation: 189 game tests; final 13 focused transition/resource/camera tests; runtime lock and game build passed. The existing large-bundle advisory remains.

Reference direction: https://www.konami.com/yugioh/duel_links/en/game/ and the user's earlier Duel Links screenshots. This is an adaptation to the current five-column game, not a pixel-identical reconstruction or an official product.

The existing 3D studies were previously pushed at `4840643`. This scene iteration has not been deployed or uploaded to Toy.
