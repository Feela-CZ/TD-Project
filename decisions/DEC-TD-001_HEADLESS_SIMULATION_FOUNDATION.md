# DEC-TD-001 — Headless simulation foundation

**Status:** APPROVED  
**Approved by:** Owner  
**Date:** 2026-08-25

## Decision

The first executable Tower Defense MVP will use a deterministic TypeScript game core and a Node.js headless event/Monte Carlo simulator.

Selection and implementation of a visual client are explicitly deferred. This decision does not authorize a game-engine, UI, platform, packaging, or multiplayer lock-in.

## Approved temporary simulation assumptions

These assumptions apply only to the first simulation contract and remain subject to measured review:

- A baseline creep completes one full loop in **60 seconds**.
- Twenty creeps spawn evenly over the six-second spawn window, including both endpoints (interval `6 / 19` seconds).
- Fortress projectiles have a **0.25-second** travel time.
- Retargeting delay is **0 seconds**.
- A player loses when the active-creep count reaches **100** (`>= 100`).

## Rationale

The technical base is sufficient to obtain reproducible quantitative evidence before committing to a visual client. A short non-zero projectile flight preserves the intended projectile behavior without making it a dominant untested variable.

## Consequence

The next permitted scope is the first real event simulation and its independent verification. No new game systems or balance changes are authorized by this decision.
