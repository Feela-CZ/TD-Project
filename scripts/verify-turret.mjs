import assert from 'node:assert/strict';
import { BARREL_REACH, createTurretMotion, FORTRESS } from '../web/turret-motion.mjs';

const turret = createTurretMotion();
const points = new Map([[1,{x:70,y:230}],[2,{x:340,y:210}],[3,{x:210,y:105}]]);
const pointFor = id => points.get(id);
const pivot = FORTRESS;
const bearing = point => Math.atan2(point.y-pivot.y, point.x-pivot.x);
const near = (actual, expected) => assert.ok(Math.abs(actual-expected)<1e-6, `${actual} != ${expected}`);

const idle = turret.update(0, null, [], pointFor);
near(idle.angle, -Math.PI/2);
assert.equal(idle.effect, null);
const turning = turret.update(.02, 1, [], pointFor);
assert.ok(turning.angle < idle.angle && turning.angle > bearing(points.get(1)), 'a live target rotates the mount across frames');
assert.equal(turning.recoil, 0);

const rounds = [
  { targetId:2, firedAt:.08, impactAt:.33, splitExtra:true, overdrive:true },
  { targetId:1, firedAt:.08, impactAt:.33, overdrive:true }
];
const firing = turret.update(.08, 1, rounds, pointFor);
near(firing.angle, bearing(points.get(1)));
assert.equal(firing.recoil, 7);
assert.equal(firing.effect.flash, 1);
assert.ok(firing.effect.hotShot);
const origin = turret.originFor(.08);
near(Math.hypot(origin.x-pivot.x, origin.y-pivot.y), BARREL_REACH - firing.recoil);
near(bearing(origin), firing.angle);
assert.deepEqual(firing.effect.muzzle, origin);
assert.deepEqual(firing.effect.flashPoint, origin);

points.set(1, { x:73, y:190 });
const flashing = turret.update(.14, 2, rounds, pointFor);
near(flashing.angle, firing.angle);
near(Math.hypot(flashing.effect.flashPoint.x - pivot.x, flashing.effect.flashPoint.y - pivot.y), BARREL_REACH - flashing.recoil);
assert.deepEqual(flashing.effect.muzzle, origin, 'the flash follows the recoil but the launch point stays fixed');
const recovering = turret.update(.19, 2, rounds, pointFor);
assert.ok(recovering.angle > firing.angle, 'a new lock starts pulling the barrel toward the other side');
assert.ok(recovering.recoil > 0 && recovering.recoil < firing.recoil);
assert.equal(recovering.effect.flash, 0);
assert.deepEqual(recovering.effect.muzzle, origin);
assert.deepEqual(turret.originFor(.08), origin, 'a burst keeps its launch origin while the turret and targets move');
const settled = turret.update(.34, 2, [], pointFor);
assert.equal(settled.effect, null);
assert.equal(settled.recoil, 0);
assert.equal(turret.originFor(.08), undefined);
assert.equal(turret.update(0, null, [], pointFor).angle, idle.angle, 'restarting resets the angle and removes old rounds');

const reduced = createTurretMotion();
const still = reduced.update(.08, 1, rounds, pointFor, true);
assert.equal(still.recoil, 0);
assert.equal(still.effect.sparkAge, null);
assert.ok(still.effect.flash < firing.effect.flash);
near(Math.hypot(still.effect.muzzle.x-pivot.x, still.effect.muzzle.y-pivot.y), BARREL_REACH);
console.log('PASS: turret tracks targets, flashes and recoils on fire, preserves burst origins, resets, and respects reduced motion.');
