# DEC-TD-011 — Solo progression economy baseline

**Status:** Implemented for the next alpha iteration  
**Date:** 2026-08-28

## Decision

- Keep Flux from Kethra kills at **1.5×** the original reward.
- Reduce the six-second Reserves interest rates to one tenth of their previous
  values: **0.25% / 0.375% / 0.5625% / 0.84375%** for base through L3.

## Evidence

In deterministic solo progression simulations, fully committed combat paths
reached roughly Waves 49–55 with the reduced interest model. The prior
interest rates produced runaway late-game Flux (millions to billions in a
Reserves route), obscuring combat and purchase pacing.

## Intended role

Kill Flux funds the normal upgrade cadence. Reserves remains a support route:
it rewards holding Flux and can accelerate a well-timed build, but cannot
replace combat investment through exponential compounding.
