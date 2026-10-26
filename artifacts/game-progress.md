# Game Studio / Three.js redesign — 2026-10-26

## Intent and boundaries

The user explicitly asks to apply OpenAI Game Studio and majidmanzarpour/threejs-game-skills to the entire existing game, including style and modes. Continue the nostalgic DM/GX card-duel fantasy. Keep authentic approved card/cutout assets; the rejected Blender character studies stay archived. Work locally on `codex/arena-graveyard-fx-20261026`; no PR, Toy or deployment authorization for this iteration. Preserve protected mobile runtime, saves, server authority, hidden information, clocks and deliberate target/material selection.

## Stack decision

Keep React DOM UI + imperative Three.js rendering adapter + existing Node/offline authoritative rule engine. Game Studio's R3F guidance supports isolating an imperative runtime where it is already the simpler boundary; migrating the tested renderer is unnecessary here. No physics simulation is needed for a turn-based card table. Keep glTF scanned cliffs and existing PBR resources; no paid services or new unapproved hero models.

## Player promise and loop

Feel like a duelist returning to an ancient ceremonial arena. Inspect a hand, pull out a legal card, deliberately choose strategic targets/materials, read the opponent's revealed response and choose when to attack or preserve resources. Each 5–30 seconds is a card/phase/response decision. Across several turns, build advantage or recover from pressure. Winning yields the server's collection pack; first-clear trials add actual tickets and cosmetic progress. Losing explains the result and permits a fast retry. Better players sequence resource use, anticipate traps and understand graveyard/fusion interactions.

Contract: the player constructs and pilots a deck to win a duel while opposing cards, limited summons and optional online deadlines create risk. Success awards actual persisted rewards; failure preserves the archive and offers retry. Rendering communicates state and never changes the authoritative response window.

## Modes and encounter plan

- 王国试炼: arrange the existing twelve executable scenarios into four three-stage chapters: attack/defense; chains/counters; Fusion/Ritual/revival; GX Heroes/Cyber. All scenarios stay accessible. Recommend the next incomplete stage from actual `profile.completed`; never fabricate unlocks or story content.
- 自由决斗: explicit deck, opponent, difficulty and arena selection; repeatable AI wins retain actual pack rewards.
- 玩家对战: clear matching/friend choice, honest service availability, existing room preparation and cancellation/reconnect flows. No fabricated online population, seasons or ranks.
- Collection loop: victory pack → secret summon/collection → deck workshop → next duel. Add a next-trial action after scenario completion without auto-starting or auto-selecting strategic choices.

## Art direction and quality targets

Ancient ruin ritual: layered real stone environment, charcoal/slate UI, aged gold structural trim; cyan for own actions, violet for magic/GY, gold for rewards/banishment. Preserve anime portraits and readable complete card fronts. Quiet authored menu surfaces, purposeful summon/activation/arrival motion. Normal combat keeps the center open and collapses infrequent tools. Desktop 1280×720 and mobile landscape 844×390; 44px controls. Reduced motion removes decorative animation while retaining essential identities.

Environment baseline at 118d32d: continuous PBR floor, ring inlay, broken curved gallery, forecourt physically integrated with terrain; 192 tests pass. Previous rectangular board removed. Further work must be measured rather than adding fog/glow to hide basic forms.

## Ownership

- Lead: Game.tsx integration, battle hierarchy/feel, renderer diagnostics and measured optimization, artifacts, final browser verification.
- studio_modes: new DuelModeHub.tsx/.css, duelJourneyModel.ts and focused model tests. Props contract agreed in task message.
- studio_lobby: new DuelLobby.tsx/.css only. Props contract agreed in task message.

## Verification plan

Production build plus full rule/network tests after integration. Real browser paths: boot/lobby, chapter choice → drag/action → actual reward → next trial, practice setup, unavailable/available PvP intent, deck switching and workshop, pause/settings/retry, activation and graveyard visibility. Capture desktop/mobile lobby, mode hub, active play and result/settings. Collect real renderer draws/triangles/resources and pixel metrics from current-run screenshots. Keep named-hook inspection distinct from manual CUA captures; do not fabricate inspector acknowledgements. Record unresolved visual limitations honestly in final evidence.

## Current status

Skill sources read: OpenAI Game Studio umbrella, foundations, Three WebGL, R3F, frontend, playtest and asset-pipeline skills; installed Three.js director and five production specialists plus relevant design/UI/graphics/QA references. Three.js pack installed under ~/.codex/skills. OpenAI source checkout under work/skill-sources/openai-plugins. No external generation jobs pending.

Implementation and integrated real-input QA complete. New lobby, mode hub, compact combat tools, focus containment and render batching are implemented. Independent review found and fixed public-pile target overlap, drawer keyboard penetration, a Toy-only return overlay collision and undersized lobby inspect buttons. A later real navigation test found practice disconnect forfeits; solo AI now holds while the human is away, covered by a focused regression, while online deadlines remain unchanged.

Final verification: production build/runtime/TypeScript pass; 200/200 game tests pass. Real browser flows covered T01/T02 progression, C01 deliberate tribute, T03 chain response, T07 explicit Fusion/banishment, real first-clear rewards, repeat-reward behavior, practice difficulty/opponent/both arenas, matching/cancel, invalid room code, room prepare/leave, deck switch, workshop/readers and summon entry. No draw tickets or reward packs were spent.

Current final diagnostics (T07 pre-action, tactical view, Apple M4): desktop 152 draws / 415002 triangles / 111 geometries / 35 textures; mobile-sized viewport 127 / 236972 / 110 / 28. These are steady samples and do not establish real phone or full-board stress performance. Earlier snapshots are retained with their own limitations. No generation jobs are pending; no publication or external service changes were made. See final-evidence.md for captures, metrics, review fixes and remaining quality limits.
