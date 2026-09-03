# TOWER DEFENSE PROJECT — MASTER HANDOFF v7
**Date:** 2026-08-25  
**Purpose:** Portable canonical context for a fresh chat/project.

## One-line concept
Competitive 1v1 tower-defense strategy game built around one evolving central fortress, persistent looping creeps, scarce energy, permanent upgrades/mutations, and later fog-of-war/information warfare.

---

# 1. Match structure

- 1v1.
- Bot/simulation first; real multiplayer later.
- One central fortress per player.
- Fixed synchronized wave every **60 seconds**.
- Target full match: **~30 waves / ~30 minutes**.
- Each wave contains **20 baseline creeps**.
- The 20 creeps spawn progressively over **6 seconds**.
- MVP uses one simple baseline creep archetype.
- Old creeps remain on the field while new waves arrive.
- Creeps loop continuously until killed.

## Track
Working map:
- elongated oval / running-track loop;
- entry portal upper-left;
- exit portal upper-right;
- counter-clockwise movement;
- after reaching exit portal, creep immediately reappears at entry portal.

## Firing sector
- Fortress does **not** cover the whole route.
- Fixed firing sector covers approximately **30% of the route**, centered around the lower section.
- Firing-sector expansion is not currently part of MVP.

## Targeting
- Tower targets the **nearest valid creep inside the firing sector**.
- Keeps firing at that target until it dies or becomes invalid.
- Then selects the nearest valid target.
- No alternate targeting mode in MVP.

---

# 2. Failure state

- No classic lives.
- Current overload cap: **100 active creeps**.
- Hitting/crossing the overload threshold causes defeat.
- Exact fail-on-100 vs fail-on-101 semantics remain implementation detail.
- UI should show current/max with green/yellow/red escalation.

---

# 3. Economy

## Starting energy
**300**

## First-tier upgrade prices
- L1 = **60**
- L2 = **120**
- L3 = **180**

Purchases may happen **at any time**.

## Creep reward
First-lap value:
**5 energy**

Reward by completed laps:
**5 → 4 → 3 → 2**

Base floor:
**2**

## Interest
Interest is independent of waves.

Tick interval:
**every 6 seconds**

Rates per tick:
- Base: **2.5%**
- L1: **3.75%**
- L2: **5.625%**
- L3: **8.4375%**

This compounding is intentionally aggressive and must be tested numerically before final balance.

---

# 4. Base fortress combat

- Base damage: **18–22**
- Working base attack rate: **1 shot/sec**
- Accuracy: **100%**
- Base crit: **0%**
- Physical projectiles.
- Basic shots do not randomly miss.

---

# 5. Baseline creep scaling

Wave 1:
**60 HP**

Each next wave:
**+10 HP**

Formula:
`Wave N HP = 60 + 10 × (N−1)`

Base armor:
**0**

---

# 6. First-tier upgrade tree

MVP contains exactly:

**3 branches × 3 nodes × 3 levels**

All tree purchases are permanent for the match unless the node unlocks a temporary active effect.

## A. Fortress Offense

### Damage
Base: 18–22
- L1: **26–30**
- L2: **34–38**
- L3: **42–46**

Each level adds +8 to min/max damage.

### Attack Speed
Canonical current values:
- Base: 0%
- L1: **+20%**
- L2: **+40% total**
- L3: **+60% total**

At 1 shot/sec base:
1.0 / 1.2 / 1.4 / 1.6 shots/sec.

A later 25/50/75% variant was discussed but was **not locked**.

### Critical Strike
Crit multiplier:
**200% damage**

Chance:
- L1: **10%**
- L2: **20%**
- L3: **30%**

### AOE
Not first tier.
PARKED for later specialization/active mechanics.

---

## B. Enemy Creep Mutations

All are permanent and apply to the opponent's automatically generated creeps.

### Armor
Primary UI:
**0 / 1 / 2 / 3**

Tooltip/detail:
- 0 = 0% damage reduction
- 1 = **5%**
- 2 = **10%**
- 3 = **15%**

Percentage reduction, not flat subtraction.

### Movement Speed
- Base: 0%
- L1: **+10%**
- L2: **+20%**
- L3: **+30%**

Movement speed matters because of the fixed 30% firing sector.

### Maximum HP
- Base: 0%
- L1: **+10%**
- L2: **+20%**
- L3: **+30%**

Applied to authored wave HP.

---

## C. Utility

### Interest Improvement
Base 2.5%, then:
3.75% / 5.625% / 8.4375% per 6-sec tick.

### Creep Reward Floor
- Base: 2
- L1: **3**
- L2: **4**
- L3: **5**

At L3, lap-value decay is effectively eliminated.

### Tower Overdrive
Permanent unlock/leveling of active ability.

Duration:
**4 seconds**

Cooldown:
**120 seconds**

- L1: **2× attack +50% attack speed**
- L2: **3× attack +100% attack speed**
- L3: **4× attack +150% attack speed**

Exact interpretation of 2×/3×/4× attack remains prototype-level implementation detail.

---

# 7. Permanent vs temporary

Permanent:
- Offense upgrades
- Creep Mutations
- Utility passives
- Unlocking/leveling active abilities

Temporary:
- active ability effect after activation

Do not make first-tier mutations temporary wave effects.

---

# 8. Future tree architecture — PARKED

Do not implement in MVP.

Long-term intended direction:
- Buying L1 of a first-tier node may unlock **3 depth-2 specialization nodes**.
- Depth-2 may have **2 levels** around **200 / 300 energy**.
- Deeper progression may expose **3 final capstone choices**.
- Current preference: player likely chooses **one of the three capstones**.
- Final capstone cost remains open; rough discussion **~300–500 energy**.

---

# 9. MVP wave composition

For MVP:
- one baseline creep archetype every wave;
- no mixed intrinsic creep classes;
- no innate special abilities;
- natural authored difficulty scaling = +10 HP/wave;
- permanent opponent mutations create further difficulty.

---

# 10. Current simulation state

A spreadsheet source-of-truth was created to drive simulation.

Important caveat:
The exact **full-lap duration is still not explicitly locked**.

A 60-second lap was inserted into the spreadsheet only as a simulation candidate.

If lap = 60 sec:
- 30% firing sector = **18 seconds of exposure per lap**.

But that is still a CANDIDATE, not canon.

Other simulation defaults currently proposed:
- spawn spacing: evenly across 6 sec, endpoints inclusive → ~0.3158 sec;
- projectile travel time: 0 sec for first sim;
- retarget delay: 0 sec for first sim;
- full precision for interest calculations.

These defaults must remain labeled as simulation assumptions until explicitly accepted.

---

# 11. Rough DPS reference

Expected raw DPS before sector/spawn/overkill effects:

- No offense: ~20 DPS
- Damage L1: ~28 DPS
- Attack Speed L1: ~24 DPS
- Crit L1: ~22 expected DPS
- Damage L2 (300 total): ~36 DPS
- Attack Speed L2 (300 total): ~28 DPS
- Crit L2 (300 total): ~24 DPS
- Damage L1 + AS L1 + Crit L1 (300 total): ~36.96 expected DPS

These are expected-value comparisons only, not real match outcomes.

---

# 12. Important interest observation

With a 6-second tick there are 10 ticks/minute.

Pure compounding over 60 sec, with no spending or income:
- 2.5% per tick → multiplier about **1.2801** → ~**28.0%** return/min
- 3.75% → ~**44.5%**
- 5.625% → ~**72.8%**
- 8.4375% → ~**124.8%**

This may be intentionally too strong for the first test, but it is a major balance risk.
Do NOT rebalance it silently; simulate first.

---

# 13. Next exact task

**Do not add new systems.**

Build the first real Monte Carlo / event simulation.

Before running it, explicitly settle or choose a temporary simulation default for:

1. **Full-lap duration / creep base speed**
2. Exact spawn convention over 6 sec
3. Projectile travel time assumption
4. Retarget delay assumption
5. Overload failure boundary (100 vs >100)

Then simulate representative openings across multiple random damage/crit outcomes:

- no upgrades;
- Damage L1;
- Attack Speed L1;
- Crit L1;
- Damage L2;
- AS L2;
- Crit L2;
- three Offense L1s;
- economy/interest-heavy openings;
- Mutation L1 counterbuilds.

Outputs should include:
- creeps killed per lap;
- number of active creeps over time;
- average reward earned;
- energy balance over time;
- wave at which overload occurs, if any;
- variance across runs;
- comparison of builds.

Do not claim simulation results before actually running the simulation code.
