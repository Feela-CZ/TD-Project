# DEC-TD-004 — Combat clarity and Overdrive targeting

**Status:** APPROVED  
**Approved by:** Owner  
**Date:** 2026-08-25

## Combat baseline

- Base damage changes from **18–22** to **24–30**.
- Damage-upgrade spacing remains +8 min/max per level:
  - L1: **32–38**
  - L2: **40–46**
  - L3: **48–54**
- Base attack rate remains 1.0 shot/s. Attack Speed remains 1.2 / 1.4 / 1.6 shots/s at L1 / L2 / L3.

## Overdrive interpretation

Overdrive's multiplier means physical projectiles, not a damage multiplier.

- L1: during 4 seconds, each firing event launches up to **2** normal-damage projectiles at the nearest and second-nearest valid creeps; attack speed is +50%.
- L2: up to **3** projectiles at the three nearest valid creeps; attack speed is +100%.
- L3: up to **4** projectiles at the four nearest valid creeps; attack speed is +150%.
- Every projectile keeps the approved 0.25-second travel time.
- If fewer valid creeps exist than projectiles, only the available distinct valid targets receive a projectile.

## Visual clarity

- Creep body color indicates reward/lap state: first lap is green; it moves through the spectrum to red at the minimum reward value.
- A critical hit displays a short-lived rising/fading `Crit!` combat-float at the impact.

## Economy visibility

Add two overview panels:

1. cumulative earned energy (excluding starting energy), separately for player and bot;
2. cumulative energy gained from interest, separately for player and bot, including a countdown to the next 6-second interest tick.

## Constraints

This decision changes only the listed combat, presentation, and economy-observability behavior. It does not authorize a new system, a change to wave cadence/lap duration, or any other rebalance.
