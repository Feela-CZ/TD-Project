# DEC-TD-002 — Local browser playable alpha

**Status:** APPROVED  
**Approved by:** Owner  
**Date:** 2026-08-25

## Decision

Build a local playable Tower Defense alpha in a web browser. The client will use TypeScript and the browser Canvas API, reusing the deterministic game core approved by DEC-TD-001.

The first playable target is a local browser match: one human player versus a deterministic bot. No external game engine, online service, paid service, multiplayer, Windows packaging, or visual-client platform commitment is authorized.

## Alpha scope

- Start and restart a local match.
- Render the loop, firing sector, fortress, creeps, projectiles, waves, energy, and overload state.
- Let the player make the approved MVP purchases and activate Overdrive.
- Run an opponent bot using only approved MVP rules.
- Present victory/defeat state and enough feedback to validate match flow.

## Exclusions

- Rebalance, new game systems, fog of war, multiplayer, accounts, network play, packaging/distribution, and parked progression.

## Success definition

A player can launch a local browser match, make meaningful purchases and use Overdrive, observe projectile combat and opponent pressure, reach a clear match result, and restart.
