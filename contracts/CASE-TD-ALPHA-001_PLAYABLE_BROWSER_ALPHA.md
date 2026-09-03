# CASE-TD-ALPHA-001 — Playable browser alpha

**Status:** READY FOR EXECUTION  
**Authority:** DEC-TD-002  
**Depends on:** CASE-TD-MVP-001

## Objective

Deliver a local browser-playable Tower Defense alpha where a human plays against a deterministic bot through the approved MVP rules.

## Scope and constraints

- Reuse the verified deterministic core; client presentation and input must not silently redefine game rules.
- Render the running-track loop, firing sector, creeps, projectiles, fortress status, energy, upgrades, waves, and overload state.
- Provide player purchase controls for the approved upgrade tree and an Overdrive control.
- Supply a deterministic, canon-compatible opponent-bot policy.
- Keep all work local and dependency-light; do not introduce an external game engine, online component, paid service, packaging target, or balance adjustment.

## Approved alpha prices

- Tier-I root levels cost 60 / 120 / 180 energy at L1 / L2 / L3.
- Tier-II levels cost 120 / 240 energy at L1 / L2.

## Acceptance criteria

1. A documented local command launches the playable browser client.
2. A user can start and restart a human-versus-bot match.
3. Player inputs make valid purchases and activate Overdrive; invalid purchases are safely rejected and visibly explained.
4. The client visibly represents simulation events, including projectile delay and firing-sector eligibility.
5. The match shows waves, energy, active-creep overload pressure, victory/defeat state, and an opponent bot acting through the same approved rules.
6. Existing headless verification continues to pass; independent functional testing confirms the playable loop.

## Required gates

- Gate 1: Contract and decision consistency.
- Gate 2: Runnable local client and preserved headless core.
- Gate 3: Independent review and functional playthrough verification.
- Gate 4: Reproducible launch and integration check.
- Gate 5: Audit certification before case closure.

## Known risk

The current balance model commonly reaches overload in waves 7–10. The alpha must expose this truth; it may not mask or alter it.

## Implementation decision: Wave 60 terminal precedence

The local alpha supports at most 60 waves. At one identical deterministic
timestamp it resolves damage and deaths first, then movement, checkpoints, and
overload. A complete clear of a side's Wave 60 creeps immediately awards that
side victory. If both sides complete this clear at the same timestamp, the
result is a draw. If one side clears Wave 60 while the other overloads at that
same timestamp, the Wave 60 clear wins. An overload before a Wave 60 clear
remains that side's defeat; simultaneous overload on both sides without a
Wave 60 clear remains a draw.

## Implementation scope clarification: Guidance Network

Guidance Network remains a deferred working candidate and is out of scope for
this alpha iteration. The active Pain Tolerance Tier-II family contains exactly
Pain Tolerance, Expanded Firing Field, and Recon Beacon, subject to the normal
maximum-two-of-three selection rule.

## Implementation scope clarification: Tier III

Tier-III runtime and UI are deferred and out of scope for this alpha. Their
ability contents are not Owner-defined, so this case implements no placeholders
for them; this does not reduce the approved Tier-II alpha scope.
