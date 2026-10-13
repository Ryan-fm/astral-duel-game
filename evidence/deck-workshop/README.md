# Deck workshop verification · 2026-10-13

The preceding modal is recorded in before-modal.jpg. Final screenshots show the full-screen desktop workshop and compact landscape library / 3D preview. Both final views use the production build.

Verified in the in-app browser at 1280×720, 844×390 and 667×375: zero deck modal backdrops; no horizontal document overflow; 44 px quantity and save controls; visible compact first-row add buttons and fixed save action. Real WebGL preview loads, including SR lighting after a legitimate ten-card draw. Browser console reported no error or warning in this run.

Functional checks: card search; manual decrement makes Main 39 and disables saving; undo restores 40; Extra addition saves together with Main; newly collected Gemini Elf enters Main while Extra is preserved; saving leaves the page open and disables redundant saves; refresh restores both sections. Browser Back with a dirty draft keeps the page and displays a departure guard; undo and clean departure return to the lobby.

163 game tests and 5 existing release-policy tests passed. Game and Toy builds passed the protected-runtime check. Toy preflight found no resource-path problems. No new public assets or public publication were performed. The responsive checks are browser viewport tests, not physical handset performance measurements; live Toy account acceptance is outside this UI run.
