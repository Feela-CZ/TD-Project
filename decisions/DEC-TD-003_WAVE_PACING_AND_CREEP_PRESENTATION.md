# DEC-TD-003 — Wave pacing and creep presentation

**Status:** APPROVED  
**Approved by:** Owner  
**Date:** 2026-08-25

## Decision

- New waves begin every **45 seconds**.
- Base creep full-lap duration remains **60 seconds**.
- Creeps use a unified neutral body color; side color is not used as a gameplay signal.
- The HP bar remains visible.

## Intent

The 45-second wave cadence breaks the exact 60-second phase alignment that made unmutated creeps visually overlap. The neutral presentation is sufficient because player and bot tracks are separate and labeled.

## Important consequence

Wave arrival pressure increases by one third. This decision requires a fresh measured balance pass; it does not itself authorize changes to damage, economy, creep statistics, or upgrade prices.

## Open follow-up

Investigate a deterministic visual formation/laning mechanism for residual within-track overlap. A physical waiting queue is intentionally not approved yet because it changes movement, lap rewards, and balance.
