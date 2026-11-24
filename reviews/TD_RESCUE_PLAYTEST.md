# TD Rescue · First playable candidate

## Harness decision

Keep the existing governance, design records, and project-specific handoff. Bob's office can display the design baseline and persist a case or decision. Both existing office tests passed with isolated state. The office has no role runner or automated gate, and its PRE-IMPLEMENTATION state predates this game's deployed alpha. Use the repository handoff to resume work and the verification workflow to decide whether the playtest builds and runs. Keep formal audit receipts separate from developer test results.

LongHorizon-Harness documents a Codex integration and WSL2 for Windows. This audit did not find a verified usable WSL2 setup. The pain point for this game is verification of browser behavior, so the project-level browser gate is the first change.

## Browser evidence

Baseline `d06e8a0` in headless Microsoft Edge on Windows. The local server returned HTTP 200 at its advertised URL, but its CSS and main script returned 404. Opening `/web/` directly produced an unhandled directory read error. At `/web/index.html`, the desktop flow purchased Split Volley for 60 Flux. The original mobile automation could not tap the continuously moving Tier II navigation button under normal-motion settings, so that run did not establish the cause of every reported failure.

The candidate uses one upgrade panel for desktop and touch, explicit prerequisites and prices, a mobile confirmation step, and a redesigned arena and HUD. The browser scenarios exercised locks, real starting Flux, purchase and debit, failed affordability, confirmation and cancellation on touch, activation and cooldown, restart, and opponent view. They passed on 1440×1000 desktop Chromium, 390×844 touch emulation, and the standalone offline HTML in desktop Chromium. No physical-phone or creative acceptance run has been recorded. The core, live integration, 27 Tier II paths, and 27 Ultimate checks also passed on Node 20.14.

Next release builds must pass [the verification workflow](../.github/workflows/verify.yml), which builds a portable playtest and saves browser screenshots. See [README](../README.md) for a local run.

## Balance screening

The inherited simulation plans requested Tier III after Tier II rank 2 while LiveMatch requires rank 5. They could get stuck on a permanently illegal purchase. The kill-reward command-line override was also ignored. Current screening preflights the legality of each plan in a separate funded match, then runs timed solo matches with regular starting Flux. Production default reward remains 1×.

Commands:

```sh
node scripts/alpha-balance.mjs --solo --runs=4 --output=results/solo-legal-100
node scripts/alpha-balance.mjs --solo --runs=4 --kill-flux=1.8 --output=results/solo-legal-180
```

| Plan | Default mean / max wave | 1.8× kill Flux mean / max wave |
| --- | ---: | ---: |
| Sustained Offense | 52.00 / 53 | 51.50 / 53 |
| Wide Sector | 39.25 / 40 | 39.50 / 40 |
| Full Ordnance + Cadence | 22.75 / 24 | 24.25 / 25 |

Twelve legal plans, four shared seeds, 48 matches per variant. Neither variant cleared Wave 60. The extra income left Sustained Offense with about 13,073 Flux on average versus 3,387 at default, without increasing its highest wave. Next, test late-wave pressure and where strong and weak builds run out of meaningful upgrades. Use additional seeds and hold the existing economy for this playtest.
