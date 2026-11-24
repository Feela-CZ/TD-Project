# Kethra Incursion · Work / Codex

**Status · 2026-11-24** — First playable rescue candidate. Start from [`td-rescue/playtest`](https://github.com/Feela-CZ/TD-Project/tree/td-rescue/playtest) at [`e941fc2`](https://github.com/Feela-CZ/TD-Project/commit/e941fc2feb1dec7c43d193f7f0994c36d66b6760). The public game was last verified at the earlier `main` baseline `d06e8a0`.

- **Delivered:** Fixed the local browser launch, unified the desktop and touch purchase path, rebuilt the arena and HUD in a provisional art direction, and added a standalone offline HTML playtest. The release-gate change lives on the candidate branch.
- **Verified locally:** Node core and live tests, the 27 Tier II paths, 27 Ultimates, and real Chromium desktop, emulated touch, and offline HTML scenarios. The purchase check uses normal starting Flux and covers lock, price, debit, activation, cooldown, cancellation, and restart.
- **Balance:** Repaired stale simulation purchase plans and an ignored reward-adjustment flag. In the corrected 48-match default screen, Sustained Offense reached wave 53 at best. A further 48 matches at 1.8× kill Flux also topped out at 53 and left substantially more unused Flux. Game defaults stay at the existing balance for this candidate.
- **Next action:** Gather creative feedback on the playable direction and test late-wave pressure with more seeds and independently chosen plans. Confirm hosted CI and physical mobile coverage before a public release. [Detailed audit and test evidence](https://github.com/Feela-CZ/TD-Project/blob/td-rescue/playtest/reviews/TD_RESCUE_PLAYTEST.md)
