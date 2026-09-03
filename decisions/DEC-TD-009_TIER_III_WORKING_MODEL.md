# DEC-TD-009 — Tier III ultimate working model

**Status:** Implementation authorized for the next local browser alpha;
first-pass balance remains subject to deterministic simulation and playtest.

## Architecture

- Each of the 27 Tier-II specialisations has one unique Tier-III Ultimate
  candidate. Its Ultimate becomes eligible only after that exact Tier-II
  specialisation reaches Level 2.
- In each top-level branch (Offense, Mutation, Utility), the player selects
  exactly two of the three Tier-I families. The unselected Tier-I family and
  all of its Tier-II children are permanently locked for that match.
- In each selected Tier-I family, the player selects two of its three Tier-II
  specialisations; its third Tier-II choice is permanently locked.
- A Tier-II specialisation becomes available only after its own Tier-I family
  has reached at least Level 1. There is no separate global Tier-I purchase
  count for this gate.
- An Ultimate becomes available only after its exact Tier-II prerequisite has
  reached Level 2.
- A player may buy exactly one Tier-III Ultimate in each top-level branch,
  not in each Tier-I family. Buying it permanently locks every other Ultimate
  candidate in that entire branch, including candidates whose Tier-II
  prerequisite may be completed later. A complete build can therefore hold at
  most three Ultimates: one Offense, one Mutation, and one Utility.
- Each Ultimate has one level. Its provisional cost is 500 Flux.
- Surge Core is the normal home for active abilities. Signal Corruption is the
  explicit Control Nexus exception: it is a Tier-III active ability. Bioforge
  Program's paid procurement controls are purchases, not cooldown abilities.
  Every other Ultimate is passive or conditionally triggered.

Tier III remains out of the current browser alpha until the complete set is
designed and separately authorised for implementation.

## Locked Ordnance Ultimate — Bio-Tar Halo

Bio-Tar Halo is the Bio-Tar Rounds Ultimate and therefore requires Bio-Tar
Rounds Level 2. Each physical Round that applies Bio-Tar creates a local Halo
at impact. The direct target receives a 36% slow for two seconds. Other Kethra
within 3% of one track length on either side receive the ordinary Level-2
Bio-Tar slow of 24% for two seconds.

The Halo is a status-only application, never an additional hit. It cannot
damage, crit, create Thermite, trigger Requiem, create a Static Discharge, or
build other on-hit counters. It may be created by an ordinary Round, Split
Volley, Overdrive, Saturation Burst, or Static Discharge's actual secondary
physical Round. It is not created by final damage, Shrapnel Requiem transfer,
Thermite, Thermal Residue, or Distributed Shell.

Overlapping Halos do not stack slow values. They only refresh duration; the
strongest currently applicable slow wins. A Kethra directly hit by a
qualifying Round therefore keeps the 36% primary slow even when also inside
one or more ordinary Halos.

## Locked Ordnance Ultimate — Culling Edict

Culling Edict is the Reaper's Gaze Ultimate. Every physical Round that hits a
living Kethra rolls an independent execute chance using the target's missing
HP immediately before impact: 0.1% baseline, plus 0.1 percentage points for
each completed 10% of missing maximum HP. The chance is therefore 0.1% above
90% HP, 0.2% at 10% missing HP, and reaches 1.0% at 90% or more missing HP.

The eligible sources are ordinary Rounds, Split Volley, Overdrive, and an
actual Static Discharge secondary physical Round. Thermite, Thermal Residue,
Shrapnel Requiem transfer, and Distributed Shell are not eligible. A success
is a lethal physical Round but creates no artificial overkill: it may trigger
ordinary physical-kill effects such as Thermal Rupture, while it cannot itself
seed Shrapnel Requiem. Ordinary lethal-save effects, including Failsafe Cocoon
and Chrysalis Rebirth, may still prevent the death.

## Locked Ordnance Ultimate — Funeral Circuit

Funeral Circuit is the Shrapnel Requiem Ultimate and requires Shrapnel Requiem
Level 2. It depends on the second Tier-I family selected alongside Ordnance.

- With **Ordnance + Cadence**, the tower receives virtual Tier-I Precision at
  its full Level-3 value globally. This grants the same basic critical-hit
  capability to every ordinary tower Round as an actual fully purchased
  Tier-I Precision family, but does not unlock Precision Tier II choices or a
  Precision Ultimate.
- With **Ordnance + Precision**, Shrapnel Requiem may transfer its overkill to
  three additional Kethra rather than its ordinary two. In addition, a critical
  hit that creates overkill multiplies its final critical damage by 1.5 after
  all ordinary critical-multiplier rules. Thus a qualifying 2x crit becomes 3x
  and a qualifying 3x crit becomes 4.5x. It increases critical damage, never
  critical chance.

Qualification is deliberately two-stage: calculate the ordinary critical hit
first. Only if that ordinary result already kills and has positive overkill
does Funeral Circuit apply its 1.5x damage bonus and recalculate the resulting
overkill for transfer. A crit cannot qualify itself solely through this bonus.
Requiem transfer damage remains final damage: it inherits the larger overkill
created by a qualifying source hit, but does not independently crit or receive
a second Funeral Circuit multiplier.

## Locked Killzone Aperture Ultimate — Command Override

Target selection remains autonomous before this Ultimate. Tier-III designs in
other families must therefore not assume that a player can manually focus,
ignore, or otherwise choose individual Kethra targets.

Command Override is the Killzone Aperture Ultimate and requires
Killzone Aperture Level 2. It unlocks persistent tower-priority controls:

- **Default** retains the existing autonomous selector. Internally this is the
  valid Kethra nearest the Killzone centre; it is intentionally presented only
  as Default.
- **Veteran** selects the valid Kethra with the most completed laps, then the
  one further through its current lap.
- **Lowest HP** and **Highest HP** select their respective valid Kethra by
  current HP. Stable deterministic fallbacks preserve reproducibility.
- **Manual Targeting** places the board in a sticky standby mode. Clicking a
  visible Kethra marks it as the tower's priority. The tower fires only at the
  marked Kethra while it remains alive; if it leaves every active owned
  Killzone, the tower waits rather than silently changing target. When the
  marked Kethra dies, targeting immediately returns to Default.

Manual standby remains armed after assigning or losing a marked target, so the
player may select another Kethra at any time. It ends only when the player
clicks another interactive control, including an upgrade, active ability,
system action, or different priority control. In-flight Rounds never retarget;
they retain the existing behaviour of failing harmlessly if their target dies
before impact.

If Conjunction of Spheres has produced a second base, both bases share the
same marked target and priority mode, while each may fire only when that target
is in its own active Killzone. The Ultimate's final name, presentation, and
whether its strategic power is sufficient remain deliberate live-balance
questions.

## Locked Spectral Relay Ultimate — Signal Corruption

Signal Corruption is the Spectral Relay Ultimate and requires Spectral Relay
Level 2. It is an active control ability with a locked six-second duration and
a 70-second cooldown. It corrupts the targeting network of the
opposing base and protects the caster's currently deployed Kethra through two
simultaneous effects.

**Target Poisoning.** Every newly selected physical Round target must differ
from the immediately preceding selected target whenever another legal Kethra
is available in that base's active Killzone. This overrides the defender's
ordinary priority mode and any manual target mark for the duration. Split
Volley and other physical secondary target selections obey the same rule; a
Round may return to the prior target only when no different legal target
exists. If Conjunction of Spheres provides two defender bases, their selections
share the same poisoned target sequence.

**Signal Substitution.** At activation, every living caster-owned Kethra
anywhere on the opposing map receives one individual Safe token. A Kethra that
spawns after activation receives none. When a token holder would be killed by
a physical direct tower packet during the six-second window, the token is
consumed. The packet, including its critical value and linked effects, is
routed to the other living allied Kethra on that map with the highest current
HP percentage. The recipient need not be in a Killzone. A routed packet cannot
itself route again, preventing a chain. If no other living allied Kethra
exists, the relay dissipates the packet instead; the protected Kethra survives
and the packet is not treated as an ordinary miss.

The Safe token does not prevent non-physical final damage such as a completed
Thermite tick, and it never alters Rounds that were already in flight before
activation. Its purpose is a temporary, deliberately visible control-layer
interference, not a permanent redefinition of projectile accuracy.

## Locked Kinesis Tier II rework — Impact Dynamo

The armor-dependent Impact Dynamo is replaced because Kinesis + Vital Mass may
legitimately lock Carapace. Each Kethra instead owns an individual survivor
meter. It gains charge only from physical Rounds that it survives and that
actually reduce its HP after mitigation. Thermite, residue, Requiem transfer,
and other final damage do not charge it. Charging pauses while its burst is
active.

At L1, reaching 25% of maximum HP, with a minimum of 30 actual damage, grants
+25% speed for two seconds. That Kethra then has six seconds of protection
before it may begin to charge another burst. At L2, the threshold is 16% of
maximum HP with a minimum of 20 damage; the burst grants +45% speed for three
seconds and has a five-second protection cooldown.

## Locked Precision Ultimate — Entropy Vector

Entropy Vector is the Terminal Vector Ultimate. A critical hit replaces the
fixed Level-2 3x multiplier with a weighted random multiplier. The initial
test distribution is deliberately decreasing and uses no duplicated chances:

| Multiplier | Chance within a critical hit |
| ---: | ---: |
| 3x | 50.2% |
| 4x | 24.6% |
| 5x | 12.4% |
| 6x | 6.2% |
| 7x | 3.1% |
| 8x | 1.6% |
| 9x | 1.1% |
| 10x | 0.8% |

The distribution averages approximately 4x. It applies to every critical
ordinary hit, including secondary Rounds that independently crit. Its exact
curve is a balance-test value.

## Locked Precision Ultimate framework — Focus Cascade

Focus Cascade is the Deadeye Protocol Ultimate. Every critical hit grants one
Focus. At twenty Focus, it spends the counter and releases five additional
guaranteed-critical physical Rounds at the currently legal Kethra in the
Killzone. Each real Cascade Round uses the player's current ordinary critical
multiplier, rather than a fixed value.

If fewer than five Kethra are available, only one real Round is fired at each
available target. The remaining slots become virtual damage-only Rounds. Let
`m` be the current critical multiplier, `A` the ordinary pre-critical damage
roll for the first real Cascade Round, and `V` the sum of the ordinary
pre-critical rolls for all missing virtual Rounds. The first real Round is the
Cascade anchor and deals `(A + m × V) × m` before ordinary mitigation. Every
other real Cascade Round deals its own ordinary damage roll multiplied by `m`.
Thus missing Rounds concentrate their already-critical value into the anchor,
which is then critically multiplied once more. With five eligible targets,
there are no virtual Rounds and all five shots are ordinary guaranteed crits.

Virtual Rounds are numeric damage rolls only: they do not physically exist and
therefore cannot create projectiles, consume targets, grant Focus, apply
status effects, trigger Static Discharge, Split Volley, Requiem, or any other
on-hit behaviour. Real Cascade Rounds retain their ordinary physical-hit
behaviour, except that they do not grant Focus themselves. If the twentieth
ordinary crit leaves no legal target, Focus Cascade remains fully charged and
fires when a legal target next exists. Where multiple targets are legal, the
Cascade anchor is the target selected first by the player's currently active
priority mode, including a valid manual target mark.

## Locked Precision Ultimate — Arc Stagger

Arc Stagger is the Static Discharge Ultimate. When Static Discharge procs, its
primary target and every target actually struck by its discharge receive an
electrical stagger. The target stops for 0.15 seconds, then its speed rises
linearly from zero to its ordinary current speed over the next 1.35 seconds.
Bio-Tar continues to apply normally after that recovery, so the effects
multiply rather than replace one another.

Each Kethra has a two-second individual Arc Stagger protection cooldown.
Repeated discharge hits inside that window do not reset the stagger, preventing
a permanent stun lock at high critical-hit rates.

## Locked Carapace Ultimate — Chrysalis Rebirth

Chrysalis Rebirth is the Failsafe Cocoon Ultimate. When an Ultimate-ready
Failsafe save triggers, the Kethra remains at 1 HP but enters a Chrysalis for
four seconds. It stops in place, becomes invulnerable, cannot be selected as a
tower target, and ignores Rounds already in flight. During those four seconds,
it heals linearly to 40% of its maximum HP, then resumes ordinary movement.

Chrysalis Rebirth has a 20-second global cooldown for the owning side. While
that cooldown is active, Failsafe Cocoon retains its ordinary save-at-1-HP
behaviour but does not create a Chrysalis.

## Locked Carapace Ultimate — Brood Fracture

Brood Fracture is the Swarm Synthesis Ultimate. On a Kethra Chimera's death,
the defender first awards its full ordinary Flux reward. It then creates four
standard Kethra from the same Incursion at the Chimera's last position. The
fragments inherit ordinary same-wave mutation statistics and each has overload
weight one, but every fragment permanently has zero Flux reward. They cannot
merge again.

The fragments preserve the Chimera's completed-lap state and continue to
contribute ordinary movement and Core Strain pressure.

## Locked Carapace Ultimate — Burden Matrix

Burden Matrix is the Distributed Shell Ultimate. A Kethra below 25% of its
maximum HP cannot receive damage redistributed through Distributed Shell. Its
otherwise assigned share is redistributed only among other eligible Kethra in
the Killzone. If none exist, that share returns to the original directly hit
target; it is never erased.

While protected this way, the low-health Kethra is a Sheltered Node. It gains
3 percentage points of damage reduction for each healthy Kethra currently
accepting the shared burden, capped at +15 percentage points. The bonus is
live rather than stacked: it disappears as soon as the node is no longer below
the threshold, or no healthy burden carrier remains. Direct hits still affect
the Sheltered Node normally.

## Locked Mutation morphology draft

Every Incursion is resolved as twenty virtual ordinary Kethra source slots
before any physical spawning begins. Each source slot receives exactly one
independent pre-generated genetic result for every eligible morphology effect:
Abomination, Chimera, and Fission. A source slot is never re-rolled after an
earlier formation has consumed it.

The resolver advances through the unclaimed source slots in spawn order:

1. It inspects the next ten slots. If any carries a successful Abomination
   result, those ten slots become one Kethra Abomination.
2. Otherwise, it inspects the next four slots. If any carries a successful
   Chimera result, those four slots become one Kethra Chimera.
3. Otherwise, the current ordinary source slot spawns normally or uses its
   already determined Fission result.

The cursor then advances by ten, four, or one source slot respectively. This
allows two Abominations, five Chimeras, entirely split waves, and every
meaningful mixed outcome in the same 20-source Incursion. Consumed signals are
spent and cannot create another formation later.

Player-facing chances are expressed as formation chances. Internally, the
per-source genetic chance is derived so that a window of n eligible sources
has the intended chance of at least one success: `p = 1 - (1 - P)^(1/n)`.
This preserves a fair single roll per source rather than creating rerolls from
overlapping formation windows.

Each formation appears at the scheduled time of its first consumed source
slot. Fission children emerge over a short visual release window of at most
0.3 seconds, without extending the Incursion's ordinary spawn cadence.

## Locked Vital Mass Ultimate — Aberrant Genesis

Aberrant Genesis is the Hive Equilibrium Ultimate. A successful
Abomination formation replaces ten virtual ordinary Kethra source slots. It
inherits their ordinary same-Incursion mutation profile and the sum of their
maximum HP, Flux reward, and Core Strain weight, without an additional HP
bonus. It additionally gains 15 percentage points of innate armor, moves 15%
slower, and regenerates 0.75% of its maximum HP per second only while in the
Killzone.

It cannot merge into a Chimera, Fission, or receive another morphology change.
Its initial formation chance is 4% per eligible ten-source formation. Its Flux reward and Core Strain
weight remain exactly ten in total, so the transformation changes encounter
shape rather than creating or destroying economic value.

## Locked Kinesis Ultimate — Fractal Brood

Fractal Brood is the Phase Curl Ultimate. Only an ordinary source slot that
was not consumed by an Abomination or Chimera may use Fission. On a successful
Fission result, the source is replaced at spawn by one of two forms:

- 70% of successful Fissions create two Kethra Shards. Each has 50% of the
  source's maximum HP, Flux reward, and Core Strain weight, and +40% movement
  speed.
- 30% of successful Fissions create three Kethra Fragments. Each has one
  third of the source's maximum HP, Flux reward, and Core Strain weight, and
  +65% movement speed.

Children inherit the ordinary same-Incursion mutation profile but cannot
merge, Fission, or receive another morphology change. Fractions of Flux reward
and Core Strain are retained exactly internally; presentation may round only
for display. The initial Fission chance is 12% per eligible ordinary source.

## Locked Kinesis Ultimate — Inertia Buffer

Inertia Buffer is the Momentum Plating Ultimate. Each Kethra retains the
highest actual dynamic armor bonus produced by Momentum Plating during the
previous four seconds. When current speed later falls because a temporary
speed source ends or a slow applies, the stored peak bonus remains available
for four seconds and then decays smoothly to the ordinary current-speed value
over one additional second.

The Ultimate adds no new speed, avoidance roll, or status-immunity rule. It
turns short speed windows such as Impact Dynamo and Adrenaline Surge into
longer defensive windows. Separately purchased base Armor remains the floor
under all normal Momentum rules.

## Locked Kinesis Ultimate — Pressure Drive

Pressure Drive is the Impact Dynamo Ultimate. A living Kethra gains one Drive
stack when it survives an eligible physical Round. Each stack adds 2.5
percentage points of flat movement speed. All stacks refresh to two seconds
after the latest qualifying hit; a Kethra may hold at most ten stacks (+25%)
and may gain at most one stack every 0.35 seconds.

Ordinary Rounds, Split Volley, Overdrive, and actual Static Discharge
secondary physical Rounds are eligible. Thermite, Thermal Residue, Shrapnel
Requiem transfer, Distributed Shell, and other final damage are not. Pressure
Drive does not replace Impact Dynamo's survivor meter or its normal burst.
Bio-Tar reduces the resulting current speed in the ordinary way, but does not
delete Drive stacks.

## Locked Cadence Ultimate — Vector Reversal

Vector Reversal is the Split Volley Ultimate. When an extra Split Volley Round
hits a different target, it pushes that Kethra 5% of one track length backward
along its track. Each Kethra has a four-second individual protection cooldown
against this displacement, so repeated large volleys cannot create a permanent
reverse-motion lock. Existing slows and other status effects remain unchanged.

## Locked Cadence Ultimate — Overclock Protocol

Overclock Protocol is the Combat Rhythm Ultimate. It is a permanent passive
intended to trade direct-hit efficiency for substantially more hit and proc
opportunities.

- Standard tower firing cadence is multiplied by three after ordinary Attack
  Speed, Combat Rhythm, and Overdrive cadence modifiers.
- Rounds created by those ordinary firing events deal 30% of their usual
  direct damage before crit and mitigation. Every damage effect directly born
  from such a Round uses that reduced source value: Thermite, Requiem transfer,
  and Static Discharge damage therefore begin from the same 30% damage lineage.
  Status application, slow strength, displacement, and proc chances remain at
  their ordinary full values.
- Combat Rhythm is normalised through an internal fractional credit counter:
  an Overclock Round grants one third of the usual Rhythm credit. Three such
  Rounds therefore create one visible Rhythm stack. Overclock cannot shortcut
  the path to the 20-stack cap, but benefits from that cap once reached.
- Any future Crescendo-style counter tied to Combat Rhythm uses the same
  normalised credit, not raw Overclock Round count.
- Thermite Trace is refreshed without delaying its already scheduled next
  tick. A new qualifying hit refreshes strength and remaining duration, but
  cannot postpone a near tick indefinitely.

The intended result is three times as many crit, Split Volley, Bio-Tar,
Thermite, Static Discharge, and other qualifying-hit opportunities without
turning Combat Rhythm into a three-times-faster self-scaling engine.

## Locked Cadence Ultimate — Thermal Rupture

Thermal Rupture is the Thermite Trace Ultimate. It does not use a Heat meter.
Instead, when any physical Round kills a Kethra that currently carries a
Thermite Trace, the corpse ruptures with certainty in the first balance pass.
This includes primary and secondary Rounds such as Static Discharge, but not a
Thermite tick itself or a final-damage transfer such as Shrapnel Requiem.

The rupture has two parts:

- It creates one immediate small-area hit around the destroyed Kethra. The
  initial balance baseline is 75% of an ordinary Round's damage, through the
  normal combat pipeline but unable to trigger another Thermal Rupture.
- It leaves a small Thermite Residue field at that position for three seconds.
  The field ticks every 0.1 seconds. Its initial balance baseline is 20% of an
  ordinary Round's damage per second, or 2% per 0.1-second tick. Residue is
  final thermal damage: it does not crit, apply status effects, generate Heat,
  or create another rupture.

The initial local radius is 3% of one track length. Overlapping Residue fields
may exist at different positions, but a Kethra can take at most one Residue
tick per 0.1-second interval; the strongest applicable field wins.

## Locked Vital Mass Ultimate — Apex Ascension

Apex Ascension is the Regrowth Node Ultimate. Each time a Kethra completes a
lap, it gains a permanent growth stage, to a maximum of five stages. A stage
increases its maximum HP by 10% of its maximum HP immediately before that
checkpoint and immediately restores the same absolute amount of current HP.
The ordinary Regrowth Node checkpoint heal applies afterwards.

The second selected Mutation Tier I family determines the accompanying
adaptation:

- With Carapace, every stage also gives 3 percentage points of innate Armor,
  up to +15 percentage points.
- With Kinesis, every stage instead gives 7.5% base movement speed, up to
  +37.5%.

The two adaptations cannot coexist because a Vital Mass build can select only
one of Carapace and Kinesis under the locked two-of-three Tier I rule.

## Locked Vital Mass Ultimate — Scavenger Instinct

Scavenger Instinct is the Biomass Pool Ultimate. The normal L2 Biomass Pool
effect resolves first: 16% of the killed Kethra's maximum HP is divided among
injured allied Kethra then in the Killzone. Any part that could not be healed
because recipients are already at maximum HP becomes a Biomass Cache at the
death position rather than disappearing.

A Cache retains 100% of that unused healing value, has a radius of 3% of one
track length, and persists for four seconds. An injured allied Kethra inside
it may draw no more than 4% of its own maximum HP per second, resolved in
0.1-second ticks, until the Cache's reserve is spent. A Kethra draws from at
most one Cache at a time; where Caches overlap, the Cache with the larger
remaining reserve takes precedence. This Ultimate preserves otherwise wasted
Biomass Pool healing but creates no healing value beyond that original pool.

## Locked Echo Reserve Ultimate — Avarice Engine

Avarice Engine is the Echo Reserve Ultimate. It is deliberately the only free
Tier III purchase. It still requires Echo Reserve L2 and consumes the player's
one available Utility
Ultimate, but its Flux purchase cost is zero. Its economic risk is the early
investment needed to reach it and the Flux held back from combat while it
develops its return.

It uses the existing match-long `Interest earned` total: only ordinary interest
generated from the player's Flux pool is included. Echo Reserve payouts are
not added directly to that total, but they enlarge the Flux pool before the
ordinary interest calculation and therefore contribute indirectly. There is no
new buffer, delay, or decay window.

On every interest tick, ordinary interest resolves first and updates `Interest
earned`. The Ultimate then immediately pays:

`extra Flux = min(current Incursion number, floor(Interest earned / 50))`.

This payout does not itself increase `Interest earned`, preserving that
statistic as a clear record of ordinary interest. It does enter the player's
Flux pool, so it can naturally generate ordinary interest in later ticks. The
existing cumulative total is used at purchase time, allowing a late purchase
to start at its already earned threshold rather than forcing a second zeroed
economy counter.

## Locked Flux Battery Ultimate framework — Bioforge Program

Bioforge Program is the Flux Battery Ultimate framework. It opens a procurement
panel of paid, one-use contracts for the player's next own Incursion that has
not started spawning. These are Flux purchases, not cooldown-based active
abilities: the player may combine distinct contract types for one future wave,
but may buy each type at most once for that wave. A purchase made after a wave
has begun spawning is assigned to the following Incursion so no live wave
changes shape partway through deployment.

The initial contract families are an additional Kethra Chimera, an additional
Kethra Abomination, and whole-Incursion HP, Armor, and Speed boosts. The two
formations are extra to the ordinary twenty Kethra of that Incursion and may
be purchased together. Each purchased form carries its ordinary formation
statistics, while all purchased whole-Incursion boosts apply to every member
of that contracted wave, including those forms.

Contract formations award the defender no Flux when killed. They begin with
zero Core Strain, so their arrival cannot instantly end a game through
overload. Instead they gain two Siege Strain after each completed lap:

| Contract formation | Siege Strain after completed laps | Maximum |
| --- | --- | ---: |
| Chimera | 0, 2, 4 | 4 |
| Abomination | 0, 2, 4, 6, 8, 10 | 10 |

Thus the first full lap is a clear defense window. A formation that survives
becomes progressively more dangerous, but no more dangerous than its normal
full Core Strain value. Whole-Incursion HP, Armor, and Speed contracts add no
additional Core Strain themselves. The first-iteration contract table is:

| Contract | Flux cost | Effect on the next own Incursion |
| --- | ---: | --- |
| Chimera | 90 | Adds one no-reward Chimera. |
| Abomination | 180 | Adds one no-reward Abomination. |
| Reinforced Biomass | 55 | +20% maximum HP to the whole wave. |
| Reactive Carapace | 55 | +2 Armor to the whole wave. |
| Accelerated Kinesis | 55 | +15% movement speed to the whole wave. |

The global boosts apply to every Kethra in that Incursion, including contracted
formations. Naming and visual/deployment cadence remain presentation work.

## Locked Excess Reclamation Ultimate — Capital Punishment

Capital Punishment is the Excess Reclamation Ultimate and requires Excess
Reclamation Level 2. It turns permanent investment into long-term offensive
output. Its Investment Ledger is the player's cumulative Flux spent on Tier I,
Tier II, and Tier III upgrades, including the Flux paid for Capital Punishment
itself. It excludes all consumable or one-Incursion purchases, including any
future Bioforge Program contract.

The tower's direct damage multiplier is recalculated immediately after every
qualifying purchase:

`1 + min(0.45, floor(Investment Ledger / 100) × 0.01)`.

Every complete 100 Flux of permanent investment therefore grants +1% damage,
to a maximum of +45% at 4,500 Flux. At 1,000 / 2,000 / 3,000 Flux the bonus is
respectively +10% / +20% / +30%. The multiplier applies once when the tower
creates a direct damage packet, including ordinary Rounds, Overdrive, Split
Volley, Flux Battery, and their critical hits. Effects derived from that
already increased hit, such as Thermite or a transferred Requiem overkill,
inherit its value but never receive a second Capital Punishment multiplier.

## Locked Pain Tolerance Ultimate framework — Redline Protocol

Redline Protocol is the Pain Tolerance Ultimate and requires Pain Tolerance
Level 2. It makes Core Strain above 80 a deliberately dangerous source of
offensive power. The tower receives +1% direct damage for every current point
of Core Strain strictly above 80:

`damage multiplier = 1 + max(0, current Core Strain - 80) × 0.01`.

There is no separate Redline cap. The ordinary Pain Tolerance loss limit is
the hard bound: at the current 180 cap, the player can operate at up to +99%
damage immediately before terminal failure. The bonus rises and falls at once
with current Strain; it cannot be banked, carried into a later Incursion, or
remain after Kethra are cleared. It applies once to direct tower damage under
the same source-and-no-double-dipping rule as Capital Punishment.

## Locked Surge Core Ultimate framework — Nullifying Purge

Nullifying Purge is the Adrenaline Surge Ultimate. It is actively targeted on
the caster's own map: the player places a circular area within that map, never
on the opponent's map. Every Kethra caught in the area is slowed by 95% for
1.25 seconds and has every positive buff removed permanently.

"Positive buff" includes temporary and persistent gains to HP, Armor,
movement speed, regeneration, and other beneficial Kethra effects acquired
above that unit's base form. It removes the benefit, not the underlying
identity: a Chimera, Abomination, split unit, or other Kethra variant remains
that variant after the Purge, but loses its removable positive boosts. Hostile
debuffs such as Bio-Tar, Thermite, and Static Discharge are not removed.
Nullifying Purge deals no direct damage and does not count as a hit. Its area
reaches 5% of one track length to either side of the placed target (a 10%
total track span) and it has an 80-second cooldown. It is deliberately an
answer to a concentrated, highly buffed group rather than a map-wide reset.

## Locked Surge Core Ultimate framework — Conjunction of Spheres

Conjunction of Spheres is the Phase Shift Ultimate. On activation, it shows
two clear, phase-blurred candidate Killzones: one immediately to the left and
one immediately to the right of the caster's current Killzone. The player
chooses one; no free aiming or enemy-map visibility is required. The chosen
zone temporarily receives a second copy of the caster's entire base. The
original base and Killzone remain active: for its short duration the defender
genuinely has two simultaneous defensive maps on the same track.

Each candidate is always exactly 30% of the track and directly touches the
near edge of the current Killzone. The fixed centered layout and current
maximum original Killzone of 40% ensure that it remains within the track
without wrapping or clipping. Killzone Aperture increases only the original
base's Killzone; it never makes the Conjunction copy larger. The visual
candidates make this bounded two-zone defense apparent before selection.

The copied base has the caster's complete current tower profile: the same
damage range, firing cadence, projectile behaviour, target-priority mode,
and every purchased passive effect. It independently acquires legal Kethra in
its own Killzone and fires its own physical Rounds. Consequently Bio-Tar,
Thermite, Static Discharge, Split Volley, critical hits, Requiem transfers,
and compatible Ultimate passives can all occur from the copy exactly as from
the original base. It is a full second firing instance, not an area-damage
zone or a one-time duplicated projectile.

The two bases share player resources and global state rather than duplicating
them: Flux, Core Strain, Kethra, existing field effects, and already active
ability cooldowns remain singular. The Conjunction itself never creates a
second active-ability charge or a second use of another active skill. Each
base does, however, maintain its own ordinary targeting and firing timeline,
so one may fire while the other is between Rounds.

Conjunction lasts five seconds and has a 90-second cooldown, which begins
when the player confirms the left or right candidate zone. The copied base
starts clean: it never duplicates Rounds that were already in flight at the
time of activation, but starts its independent firing timeline immediately.
If a manual target lies outside the copy's own Killzone, the copy waits for a
legal target rather than silently choosing another one. The intended fantasy
is a brief overlap of two realities, with the whole tower system—not merely
its damage number—being present twice.

## Locked Surge Core Ultimate — Orbital Breach

Orbital Breach is the Saturation Burst Ultimate. It targets any point on the
caster's own track. After a visible 0.65-second warning, a meteor hits every
Kethra within 4% of one track length to either side of that point. Its base
damage is 110 flat damage and its active cooldown is 75 seconds.

The impact is deliberately not an ordinary hit: by default it cannot crit,
apply a status, create an on-hit proc, or begin a damage recursion. Every
completed owned Tier-II specialisation adds +8 flat damage to each impact.

The two selected Offense Tier-I families modify the impact as follows:

| Family | Tier-I L1 | Tier-I L2 | Tier-I L3 |
| --- | --- | --- | --- |
| Ordnance | +20 damage | +45 damage | +75 damage |
| Cadence | Second meteor after 0.35 s at 35% damage | Second meteor after 0.35 s at 50% damage | Second meteor at 50% after 0.35 s and third at 35% after 0.70 s |
| Precision | Every meteor is a guaranteed 1.5x critical | Guaranteed 1.75x critical | Guaranteed 2x critical |

Cadence follow-up meteors strike the same selected area and use the complete
current Orbital Breach damage value before their stated percentage. Precision
does not import other Precision Tier-II behaviours: it only supplies this
guaranteed multiplier.

At impact, Orbital Breach leaves a five-second Breach Scar at the chosen point
on the caster's map and at the same normalized point on the opposing map. The
caster-side Scar is visual only. A caster-owned Kethra that touches the remote
Scar gains a five-second Breach Imprint for each selected Mutation Tier-I
family: an additional copy of its current Carapace Armor, Kinesis movement
speed, or Vital Mass maximum-HP bonus. The Imprint is additive above the
ordinary bonus, does not stack with itself, and refreshes to five seconds on
re-entry. A Vital Mass imprint preserves the Kethra's current HP percentage.
An Imprint survives the Scar's disappearance for its own remaining duration.

If Reserves is the selected companion Utility family, Orbital Breach uses the
locked Resonance module. If Control Nexus is the selected companion Utility
family, it uses the locked Disturbance selector. Surge Core is the prerequisite
family and does not add a separate third module.

## Locked Orbital Breach Module — Reserves Resonance

Orbital Breach has a mirrored Breach Scar. Its Reserves module turns a
well-timed use across both maps into Flux extraction. It uses Resonances:
one Resonance requires both one unique hostile Kethra actually hit by the
meteor on the caster's own map and one unique caster-owned Kethra that gains
the mirrored Breach Imprint on the opponent's map. The number available from
one use is the lower of those two counts. A Kethra may count only once per
Orbital Breach, including when Cadence later provides multiple meteor impacts.

Breach Calibration governs gradual output. It begins at one extractable
Resonance per Orbital Breach. Each use that creates at least one Resonance
raises its extractable-Resonance limit by one for later uses, until reaching
the cap supplied by the current Reserves level. The successful triggering use
uses its current, pre-increase limit.

| Reserves level | Calibration cap | Flux per extracted Resonance |
| --- | ---: | ---: |
| L1 | 3 | 12 |
| L2 | 4 | 18 |
| L3 | 5 | 25 |

Thus an L3 player can earn at most 25 Flux from the first successful Breach,
then 50, 75, 100, and only from the fifth successful Breach onward the full
125 Flux. Reaching a high cap never creates Flux automatically: every later
use must again provide matched Kethra counts on both maps.

## Locked Orbital Breach Module — Disturbance Selection Scope

Orbital Breach may create exactly one opponent-facing Disturbance effect per
use, never one effect per branch. It selects the opponent Tier I family with
the greatest number of purchased levels. A tie is resolved by lower cumulative
Flux spent in that family, treating the earlier and cheaper commitment as the
opponent's priority. A remaining exact tie resolves by earliest first purchase
time, never randomly.

Mutation families are excluded from this selector. Their role is the positive
Mirrored Breach Imprint applied to the caster's Kethra on the opponent map;
they are not turned into a second, contradictory opponent debuff system.

The candidate pool is therefore Ordnance, Cadence, Precision, Reserves,
Control Nexus, and Surge Core. Control Nexus participates in ordinary
selection. When it wins that selection, it absorbs the Disturbance: no
opponent-facing Disturbance effect occurs. It is not a universal resistance
layer; its protection is earned only by making Control Nexus the opponent's
greatest Tier I commitment under the normal selection rules.

The selected effect is exactly one of the following:

| Selected opponent family | Disturbance |
| --- | --- |
| Ordnance | For six seconds, minimum damage is zero and maximum damage is halved. |
| Cadence | For six seconds, current attack speed is halved. |
| Precision | For six seconds, physical Rounds have a 50% miss chance. |
| Reserves | The next five interest payouts are zero, including base interest, Echo Reserve, and Avarice Engine payouts. Purchases and non-interest Flux rewards remain normal. |
| Surge Core | The active ability with the lowest positive remaining cooldown is reset to its full cooldown. If none is cooling down, no effect occurs. |
| Control Nexus | The Disturbance is absorbed and no opponent-facing effect occurs. |
