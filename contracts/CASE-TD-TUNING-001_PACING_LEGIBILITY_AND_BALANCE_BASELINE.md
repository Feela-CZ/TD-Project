# CASE-TD-TUNING-001 — Pacing, legibility, and balance baseline

**Status:** READY FOR EXECUTION  
**Authority:** DEC-TD-003

## Objective

Apply the approved wave-pacing and neutral-creep presentation changes, then produce measured evidence for the next balance and Overdrive decisions.

## Approved implementation scope

- Change wave cadence from 60 to 45 seconds while preserving 60-second base lap duration.
- Replace side-specific creep body colors with a neutral visual treatment; retain HP bars and labeled tracks.
- Preserve all gameplay statistics and current headless behavior except the approved wave cadence.

## Investigation scope

- Propose and, if useful, create a reversible visual-only prototype of deterministic within-track formation lanes to reduce overlap.
- Do not add a physical queue without a separate Owner decision.
- Run actual post-change simulations to quantify pressure, overload timing, energy, interest viability, and representative builds.
- Establish the precise current and canonical intended meaning of Overdrive L1 `2× attack +50% attack speed`; propose a Decision Record if an interpretation change is needed.

## Required outputs

1. Independent verification of the approved pacing/presentation changes.
2. A concise overlap-mechanism recommendation with gameplay impact stated.
3. A post-change simulation report and balance recommendation based on actual runs.
4. A separate, explicit Overdrive decision proposal if required.

## Constraints

Do not silently rebalance damage, economy, creep scaling, rewards, prices, or Overdrive values. No engine, multiplayer, online service, or new game system.

## Approved extension — DEC-TD-004

Implement the explicitly approved base-damage progression, physical multi-projectile Overdrive targeting, lap/reward creep colors, critical-hit combat float, and economy/interest overview panels. Verify them through deterministic simulation and the playable alpha client.

## Approved extension — DEC-TD-005

Implement the approved expected-DPS-neutral damage ranges and +8 HP-per-wave authored creep scaling. Extend simulation coverage with full-spend purchase trajectories and cooldown-aware multi-target Overdrive policies through wave 30. Do not make another balance change within this case without a Decision Record.

## Approved extension — DEC-TD-006

Use +11 HP-per-wave authored creep scaling as the playable-alpha and default-simulator baseline. Treat it as a hard playtest baseline. Investigate, but do not implement, an integer-only nonlinear HP curve until a separate Decision Record approves an exact formula.
