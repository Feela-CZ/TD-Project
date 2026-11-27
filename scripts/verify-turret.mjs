import assert from 'node:assert/strict';
import { LiveMatch } from '../dist/live.mjs';
import { BARREL_REACH, createTurretMotion, FORTRESS } from '../web/turret-motion.mjs';

const turret = createTurretMotion();
const points = new Map([[1, { x:70, y:230 }], [2, { x:340, y:210 }]]);
const pointFor = id => points.get(id);
const bearing = point => Math.atan2(point.y - FORTRESS.y, point.x - FORTRESS.x);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
const update = (time, rounds = [], hasTargetInRange = true, activeId = null) =>
  turret.update(time, { rounds, hasTargetInRange, activeId, pointFor });

const idle = update(0, [], false);
near(idle.angle, -Math.PI / 2);
assert.equal(idle.effect, null);
const rounds = [
  { targetId:2, firedAt:.08, impactAt:.33, splitExtra:true, overdrive:true },
  { targetId:1, firedAt:.08, impactAt:.33, overdrive:true }
];
const firing = update(.08, rounds, true, 1);
near(firing.angle, bearing(points.get(1)));
assert.equal(firing.recoil, 7);
assert.equal(firing.effect.flash, 1);
assert.ok(firing.effect.hotShot);
const origin = turret.originFor(.08);
near(Math.hypot(origin.x - FORTRESS.x, origin.y - FORTRESS.y), BARREL_REACH - firing.recoil);
near(bearing(origin), firing.angle);
assert.deepEqual(firing.effect.muzzle, origin);
assert.deepEqual(firing.effect.flashPoint, origin);

points.set(1, { x:73, y:190 });
const flashing = update(.14, rounds);
near(flashing.angle, firing.angle);
near(Math.hypot(flashing.effect.flashPoint.x - FORTRESS.x, flashing.effect.flashPoint.y - FORTRESS.y), BARREL_REACH - flashing.recoil);
assert.deepEqual(flashing.effect.muzzle, origin);
const recovering = update(.19, rounds);
near(recovering.angle, firing.angle);
assert.ok(recovering.recoil > 0 && recovering.recoil < firing.recoil);
assert.equal(recovering.effect.flash, 0);
assert.deepEqual(turret.originFor(.08), origin);
near(update(.34).angle, firing.angle);
assert.equal(turret.originFor(.08), undefined);
near(update(.95).angle, firing.angle);
near(update(1.05).angle, firing.angle);

const next = update(1.08, [{ targetId:2, firedAt:1.08, impactAt:1.33 }]);
near(next.angle, bearing(points.get(2)));
assert.notEqual(next.angle, firing.angle);
near(update(1.18, [], false).angle, next.angle);
const returning = update(1.19, [], false);
assert.ok(returning.angle < next.angle && returning.angle > idle.angle, 'return starts only after the range is empty');
near(update(1.28, [], false).angle, idle.angle);
near(update(0, [], false).angle, idle.angle);

const reduced = createTurretMotion();
const still = reduced.update(.08, { activeId:1, hasTargetInRange:true, rounds, pointFor, reduced:true });
assert.equal(still.recoil, 0);
assert.equal(still.effect.sparkAge, null);
assert.ok(still.effect.flash < firing.effect.flash);
near(Math.hypot(still.effect.muzzle.x - FORTRESS.x, still.effect.muzzle.y - FORTRESS.y), BARREL_REACH);

const match = new LiveMatch(703, { botEnabled:false });
match.step(.05);
const player = match.players.human;
assert.ok(player.creeps.length > 0);
assert.equal(match.snapshot().players.human.hasTargetInRange, false);
const creep = player.creeps[0];
creep.progress = .5;
assert.equal(match.snapshot().players.human.hasTargetInRange, true);
creep.chrysalisUntil = match.time + 1;
assert.equal(match.snapshot().players.human.hasTargetInRange, false);
creep.chrysalisUntil = -Infinity;
creep.progress = .25;
assert.equal(match.snapshot().players.human.hasTargetInRange, false);
player.tier3.overdrive.conjunctionSpheres = 1;
match.activateUltimate('conjunctionSpheres', .5, 'left');
assert.equal(match.snapshot().players.human.hasTargetInRange, true);

console.log('PASS: firing bearing holds through cooldown, follows the next shot and returns only when the actual range is empty.');
