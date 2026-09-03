# DEC-TD-007 — Branching upgrade tree and early-access gating

**Status:** Approved by Owner

## Decision

The existing nine Tier-I upgrade nodes remain the roots of their own upgrade
families. Each family will receive a branching Tier-II and Tier-III layer.

### Tier II: specialisations

- A Tier-II specialisation requires both three Tier-I purchases globally and
  one purchased level in its matching Tier-I root.
- Tier-II purchases use the independent global Tier-II price ladder: 120 for
  the first purchase, then +15 energy for each later purchase, through 645 for
  the 36th currently available Tier-II purchase.
- A player may select at most two of the three Tier-II choices in a family.
- Purchasing Level 1 of a second Tier-II choice permanently locks the third
  Tier-II choice in that family. The two selected choices may still be
  upgraded to Level 2.

### Tier III: ultimates

- A family’s three Tier-III ultimate choices unlock as soon as the player has
  purchased Level 1 of any Tier-II choice in that family.
- Each ultimate has one level and costs 500 energy.
- A player may purchase exactly one ultimate per family; purchasing it locks
  the other two.

## Intent

Tier I uses its own global price ladder: the first purchase is free, then the
next purchases cost 50, 60, 70 and so on through 300 for the 27th currently
available Tier-I purchase. This makes every next choice in the same tier more
expensive, regardless of its branch or local level. The next fixed price is
shown at the tier, not decomposed into a formula.

This replaces immediate Tier-II access with a meaningful but still early
three-choice gate: its first three Tier-I purchases cost 0 + 50 + 60 = 110
energy. The 150-energy start leaves 40 energy after this rush, preserving room
to choose an early interest strategy while making a specialisation a deliberate
commitment.

## Tier-II numerical test baseline

The values in this decision are the Owner-approved first numerical baseline
for Tier-II nodes. They are test values for balance validation, not a final
balancing curve. Unless a rule below says otherwise, they do not authorise
implementation by themselves.

## Active ability policy

The Overdrive family is the only source of active abilities in the current
product scope. Base Overdrive remains its own active ability and only its own
levels improve its existing effect. Once unlocked, its three Tier-II choices
are new, separate active abilities; the player may choose two. Its three
Tier-III choices are likewise new, separate ultimate active abilities; the
player may choose one. These children need not mechanically resemble
Overdrive.

All other upgrade families are passive for now. This permits abilities such as
Meteor and Chain Lightning in the Overdrive family, but excludes them from
Damage, Attack Speed, Crit, mutation, and economic families.

## Tier-II Overdrive active baseline

The following are the final numerical baselines for the three separate
Tier-II Overdrive active abilities. Their cooldowns are measured from
activation. They do not replace or alter base Overdrive, which remains a
four-second ability with a 120-second cooldown.

### Adrenalinový nápor

- Level 1: +30% movement speed for 3 seconds; cooldown 42 seconds.
- Level 2: +60% movement speed for 4 seconds; cooldown 42 seconds.

On activation, Adrenalinový nápor snapshots every creep currently alive on the
opponent's track. Creeps entering that track afterwards are not included.

### Přetlaková salva

- Level 1: every creep currently in the owner's firing sector receives one
  hit for 125% of ordinary base damage; cooldown 48 seconds.
- Level 2: every creep currently in the owner's firing sector receives one
  hit for 150% of ordinary base damage; cooldown 48 seconds.

Salva uses the standard combat-hit pipeline, including random base damage,
crit, armor, and every eligible passive or secondary effect.

### Fázový štít

- Level 1: absorbs 35% of incoming damage for 4 seconds; cooldown 60 seconds.
- Level 2: absorbs 70% of incoming damage for 5 seconds; cooldown 60 seconds.

On activation, Fázový štít snapshots every creep currently alive on the
opponent's track. Creeps entering that track afterwards are not included. The
shield reduces every incoming damage packet for its captured creeps, and
absorbed damage does not charge Kinetický akumulátor.

## Confirmed ultimate behaviour: Time Anchor

Time Anchor is an Overdrive-family ultimate candidate. On activation it
captures every creep currently alive on the owner’s track and stops their
movement for its duration, regardless of their position relative to the firing
sector. Creeps entering the track after activation are not affected. The
ability does not use a ground-targeted area and does not apply its effect
retroactively.

The same scope rule applies to shield abilities: a shield activated against
the opponent affects every creep currently alive on the opponent’s track,
regardless of firing-sector position. Creeps entering that track after
activation are not affected.

## Combat-effect inheritance

Any active ability that deals damage must create ordinary combat hits rather
than directly subtracting HP. Its hits therefore resolve through the same
pipeline as tower and Overdrive projectiles, including random base damage,
crit chance and multiplier, armor, and every eligible passive or secondary
effect (such as burn, slow, or future effects). An ability may define its
target set and a fixed base-damage multiplier, but it may not bypass this
pipeline unless a later decision explicitly says so.

### Projectile persistence

A projectile legally fired at a living target continues to track and hit that
target even after the target leaves the firing sector. It does not miss solely
because of sector exit. If the target dies before impact, the projectile ends
without retargeting. This is baseline combat behaviour, not an upgrade.

## Offensive status-effect allocation

The first offensive tree expansion permits exactly one target-applied passive
effect in each Tier-I family, rather than clustering several effects below Flat
Damage. The current design allocation is:

- Ordnance: Bio-Tar Rounds;
- Cadence: Thermite Trace;
- Precision: Static Discharge.

The three effects may coexist on the same creep when the player has selected
the corresponding specialisation in all three families. Each must be tracked
and resolved independently. Reapplying the same effect refreshes its own
state; additional same-effect stacking is not implied and requires a later
explicit decision.

### Static Discharge and Critical Detonation

Static Discharge is an immediate crit effect, not a stored charge. Every primary
critical hit emits a secondary electrical hit from the struck creep to nearby
creeps. Repeated primary crits on the same creep each emit another discharge.

Critical Detonation is a Crit-family ultimate candidate: when a primary crit
kills its target, a separate area hit is emitted from the target’s last
position. A lethal primary crit can therefore produce both Static Discharge and
Critical Detonation. Both secondary hits use the ordinary combat pipeline.
To prevent runaway cascades, secondary hits may not themselves emit another
Static Discharge or Critical Detonation.

### Combat Rhythm

Combat Rhythm is the selected third Tier-II specialisation in the Attack Speed
family. Each projectile actually fired by the owner’s attacking systems raises
its attack rate by one stack, up to 20 stacks. This includes ordinary tower
shots, every Multishot projectile, every physical Overdrive projectile, and
projectiles from active damage abilities such as the sector-wide multishot.
The stack count resets to zero when two seconds pass without such a projectile
being fired. Pure secondary effects that do not fire a projectile, such as a
Static Discharge or Critical Detonation, do not add stacks. The Level 1
and Level 2 bonuses are +1.25% and +2% attack speed per stack respectively.
At the 20-stack cap, this is +25% at Level 1 and +40% at Level 2.

### Bio-Tar Rounds

Bio-Tar Rounds is an Ordnance Tier-II specialisation. A qualifying primary hit
coats the target in slowing bio-tar without stacking: Level 1 reduces movement
speed by 12% for 1.5 seconds; Level 2 reduces it by 24% for 2 seconds. A new
application refreshes the effect rather than adding another stack.

Bio-Tar has a direct Thermite Trace synergy. When both upgrades are selected,
each new Thermite application receives one additional 0.5-second tick at
Bio-Tar Level 1 (four ticks, two seconds total) or two additional ticks at
Level 2 (five ticks, 2.5 seconds total). The tick damage remains governed only
by Thermite Trace's own level.

### Shrapnel Requiem / Requiem střepin

Shrapnel Requiem / Requiem střepin is the final third Tier-II Damage
specialisation, completing the Damage numerical baseline at 3/3. It triggers
on a lethal physical hit with overkill. It has a two-second global cooldown per
owning tower, measured from the trigger.

At Level 1, it transfers exactly 50% of the resulting final overkill as a
packet to the nearest other living creep in the current firing sector. If no
such creep exists, the packet is lost.

At Level 2, it transfers exactly 100% of the final overkill to the nearest
other living creep in the current firing sector. If that packet kills its
secondary target, its newly created overkill is the packet minus that target's
remaining HP and continues to the next nearest living creep. Level 2 can hit
at most two secondary creeps (the second and, if applicable, third creep after
the original victim); any remaining damage is then lost.

Secondary targets are selected deterministically using normal priority among
eligible secondary targets. Transferred packets are exact final damage: they
do not roll base damage or crit again, do not apply armor or status effects,
and cannot trigger another Requiem. Their real killing overkills nevertheless
count toward the Overkill Recovery counter.

### Multishot

Multishot is an Attack Speed Tier-II specialisation. Level 1 has a 20% chance
to fire one extra physical projectile. Level 2 has a 25% chance to fire up to
two extra physical projectiles. Extra projectiles prefer other distinct,
currently valid targets under normal priority; when no distinct target remains,
they fall back to the current priority target.

### Thermite Trace

Thermite Trace is a Cadence Tier-II specialisation. A qualifying primary hit
creates exactly three non-stacking damage ticks at 0.5-second intervals, for a
total duration of 1.5 seconds. Each tick deals 8% at Level 1 or 16% at Level 2
of the final damage of the primary hit that caused it. A stronger or newer
primary hit refreshes Burn; it does not stack another Burn instance.

### Crit chance

Crit chance is a Crit Tier-II specialisation. Level 1 adds 12 percentage points
of critical-hit chance and Level 2 adds 24 percentage points.

### Crit multiplier

Crit multiplier is a Crit Tier-II specialisation. Level 1 sets the critical
damage multiplier to 2.5x and Level 2 sets it to 3x.

### Static Discharge

Static Discharge is a Precision Tier-II specialisation. Level 1 emits one secondary
standard hit at the nearest other target within 3.5% of track length for 45% of
ordinary base damage. Level 2 uses a 5% range and 70% of ordinary base damage.
The existing no-cascade rules remain in force. Its secondary Round follows the
ordinary hit pipeline: when it impacts after its normal 0.25-second flight, it
starts fresh Bio-Tar and Thermite timers on the secondary target, including the
Bio-Tar extension to Thermite. It cannot create another Static Discharge.

### Reaper’s Gaze

Reaper’s Gaze is the second Tier-II specialisation in the Flat Damage family.
Together with Bio-Tar Rounds and Shrapnel Requiem, it completes the three defined
Damage specialisations (3/3). For each full 10 percentage points of a target’s
missing maximum HP, it increases
the base damage of a qualifying hit before crit and armor resolution. Level 1
adds 3% per step; Level 2 adds 5% per step. The effect has at most nine steps,
so a target at 10% HP receives +27% base damage at Level 1 or +45% at Level 2.
It applies to ordinary tower hits, Multishot, physical Overdrive projectiles,
and active-ability projectiles that use the ordinary hit pipeline.

### Swarm Synthesis

Swarm Synthesis is the third Tier-II specialisation in the Armor mutation
family. Each 20-creep wave is pre-grouped into five cohorts of four new
creeps. Each cohort has a 6% chance at Level 1 or a 12% chance at Level 2 to
spawn as one Mega creep rather than its four constituents.

The Mega creep’s maximum HP is the sum of the four constituents’ maximum HP
plus a fixed 10% Mega bonus. Its movement speed and armor remain the same as
those of an ordinary constituent; they are not summed. Its reward is exactly
the summed reward of the four constituents, with no bonus: for example, 20 on
its first lap and 16 on its second when the constituent rewards are 5 and 4.
Reward decay and overload impact proceed exactly as though all four
constituents had completed each lap.

### Pancéřová síť

Pancéřová síť is an Armor mutation Tier-II specialisation. Level 1 shares 25%
of final damage and Level 2 shares 50% of final damage among the other living
creeps in the firing sector.

### Emergency Module

Emergency Module is a selected Tier-II specialisation in the Armor mutation
family. Once per creep per lap, the first primary projectile that would be
lethal may leave that creep at 1 HP instead. It has a 50% proc chance at Level
1 and a 100% proc chance at Level 2. The module is evaluated after armor, shields, and shared-damage
allocation. It does not stop Thermite Trace, Static Discharge, Critical Detonation, or a
subsequent projectile from killing the creep. A prevented lethal crit does not
cause Critical Detonation, while its Static Discharge still occurs. A Mega creep
has one module per lap.

### Inertial Armor

Inertial Armor is a selected Tier-II specialisation in the Speed mutation
family. It grants a dynamic armor bonus derived from a creep’s actual current
movement speed above its ordinary baseline. Temporary speed sources, including
Kinetic Accumulator, Adrenaline, and other Speed-family effects, may therefore
raise the bonus; Slow lowers it. Time Anchor sets movement speed to zero and
therefore removes the Inertial Armor bonus for its duration, but does not
remove the creep’s separately purchased base Armor. Its per-speed conversion,
Level 1 and Level 2 values, and cap are +0.15 and +0.25 percentage points of
damage reduction for each 1% of actual current speed above baseline,
respectively. The dynamic bonus is capped at +10% at Level 1 and +18% at Level
2.

The separately purchased base Armor is the floor: no speed-based interaction
may reduce total armor below that value. Slow only reduces the currently
available Inertial Armor bonus toward the base-Armor floor.

### Kinetic Accumulator

Kinetic Accumulator is a selected Tier-II specialisation in the Speed mutation
family. Damage prevented by the creep’s base Armor charges an accumulator;
when its threshold is reached, the creep receives a short temporary movement
speed burst. Shields do not charge the accumulator. At Level 1, each 50 damage
absorbed by base Armor grants +25% speed for 3 seconds; at Level 2, each 35
absorbed damage grants +45% speed for 4 seconds. The threshold is deducted and
any excess remains in the accumulator. The speed burst may raise Inertial Armor
under its normal current-speed rule.

### Phase Skip

Phase Skip is a selected Tier-II specialisation in the Speed mutation family.
Every living creep rolls independently once every three seconds for a short
forward movement along its own track: 1.5% chance at Level 1 and 3% at Level
2. On success, it advances by 3% / 6% of one lap respectively. The skip is a
position change, not current movement speed, so it does not add Inertial Armor.
If it crosses the lap checkpoint, normal reward and overload progression apply.
No Phase Skip rolls occur while Time Anchor stops the creep. A Mega creep
created by Swarm Synthesis makes one roll, not four.

## Working ultimate candidate: Slow stun

A working, unselected ultimate candidate associated with the Slow
specialisation is a chance for qualifying hits to stun a creep. A stun stops
that individual creep’s movement; it is distinct from the global Time Anchor.
Its proc chance, duration, eligibility of secondary hits, and repeated-stun
rules remain open for balance design.

## Collective Homeostasis

Collective Homeostasis is a selected Tier-II specialisation in the Max HP
mutation family. On a repeating interval, it sets every currently living creep
in the firing sector to the same current-HP percentage while conserving the
group’s total current HP. It therefore redistributes health but never creates
it. Its cadence is every six seconds at Level 1 and every three
seconds at Level 2.

## Reconstruction

Reconstruction is a Max HP mutation Tier-II specialisation. At a checkpoint,
it restores 10% of maximum HP at Level 1 and 18% at Level 2.

## Biomass Pool

Biomass Pool is a Max HP mutation Tier-II specialisation. When a creep dies,
Level 1 contributes 8% and Level 2 contributes 16% of that creep's maximum HP
to a pool, split among other living creeps in the firing sector. If there is no
eligible creep, or if healing would exceed maximum HP, that amount is lost.

## Expanded Firing Field

Expanded Firing Field is a selected Tier-II specialisation in the Pain
Tolerance / Odolnost vůči bolesti utility family. It increases firing-sector coverage from the current 30% of
the track to 35% at Level 1 and 40% at Level 2.

## Recon Beacon

Recon Beacon is a selected Tier-II specialisation in the Pain Tolerance / Odolnost
vůči bolesti utility family. At Level 1 it notifies the owner when the opponent purchases an
upgrade and displays the opponent’s current overload state; it does not remove
fog-of-war or expose creep HP. At Level 2 it removes fog-of-war from the
opponent’s map, shows creep HP, and makes the opponent’s complete upgrade tree
available for inspection, including purchased and locked paths. Its precise
client presentation is deferred until fog-of-war is implemented.

## Deferred Tier-II candidate: Guidance Network

Guidance Network is a provisional candidate in the Pain Tolerance / Odolnost
vůči bolesti utility family. Its current direction is a persistent target-priority setting rather
than an active damage ability: Level 1 would make Default, Highest HP, and
Lowest HP available; Level 2 would add Threat priority. Whether a later
ultimate permits direct target selection is explicitly unresolved, because it
could introduce unwanted continuous micro-management into an otherwise mostly
automated game. Existing specialised target rules, including distinct-target
Overdrive shots, are not changed by this working proposal.

Guidance Network is deferred and out of scope for the current browser-alpha
iteration. The active Pain Tolerance family therefore has exactly three
Tier-II choices: Pain Tolerance, Expanded Firing Field, and Recon Beacon.

### Nomenclature note

Pain Tolerance / Odolnost vůči bolesti is a rename of the existing Reward Floor utility
family only. Its existing economy effect is unchanged.

## Kapitálové echo / Capital Echo

Kapitálové echo / Capital Echo is the selected first Tier-II specialisation in
the Interest family. Once unlocked, every eligible paid upgrade purchase is
stored as a virtual principal in its buffer.

- Level 1: each stored purchase remains active for 30 seconds and exactly five
  future standard interest ticks.
- Level 2: each stored purchase remains active for 60 seconds and exactly ten
  future standard interest ticks.

At each six-second standard interest tick, Capital Echo pays 2.5% of the sum
of its active buffered purchases. The payment is added to ordinary energy and
may therefore earn ordinary interest. Echo payments never return to the echo
buffer, so the virtual principal does not compound.

Only upgrade purchases made from the moment Capital Echo is unlocked are
eligible; there is no retroactive buffering. The purchase that unlocks or
levels Capital Echo itself is eligible. A purchase joins the buffer only for
the next following interest tick: it creates no immediate tick or payment at
the moment of purchase.

## Pohotovostní baterie / Reserve Battery

Pohotovostní baterie / Reserve Battery is the selected second Tier-II
specialisation in the Interest family. At every standard interest tick, it
evaluates current energy without consuming any of it.

- Level 1: at 300 or more energy, it fires one bonus standard physical
  projectile.
- Level 2: at 300 or more energy, it fires two bonus standard physical
  projectiles; at 500 or more energy, it adds a third, for three in total.

Each bonus projectile uses the standard hit pipeline. Target selection prefers
other currently valid targets under the normal priority. If no different target
exists for a bonus projectile, it is sent to the current priority target rather
than being lost. Bonus projectiles never trigger another Reserve Battery salvo.

## Rekuperace přebytku / Overkill Recovery

Rekuperace přebytku / Overkill Recovery is the selected third Tier-II
specialisation in the Interest family. After every real killing damage packet,
it calculates final overkill above the target's remaining HP after armour,
shields, and all other reductions, and adds it to one shared player counter.

The threshold is 30 overkill damage at both levels. For every complete
30-damage block in the counter, Level 1 awards 2 energy and Level 2 awards 4
energy. The counter retains its remainder between kills. There is no cap per
creep, hit, counter, or payout.

Every real killing hit qualifies, including crits, Salva, Static Discharge, and
future ultimates. A damage packet directed at an already dead target creates no
overkill or recovery. This is a test baseline; future simulations must measure
the frequency of its payouts.

## Pain Tolerance / Odolnost vůči bolesti

Pain Tolerance / Odolnost vůči bolesti is the selected Tier-II specialisation
for the overload threshold in its utility family. Level 1 raises the overload
limit from 100 to 130. Level 2 adds a further 50, for an overload limit of
180 in total.

Its effect is only the higher overload threshold. It makes no direct change to
damage, income, wave timing, or defeat timing.

## Scope and follow-up

This approves tree topology, prices, choice locks, unlock timing, and the
Tier-II numerical test baseline recorded above. It does not approve
implementation or a final balancing curve. Both require a separate balance
review.
