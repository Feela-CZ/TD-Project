import assert from 'node:assert/strict';
import { LiveMatch } from '../dist/live.mjs';
import { FIRING_CENTER, routeBearing, routePoint } from '../web/arena-route.mjs';
import { FORTRESS } from '../web/turret-motion.mjs';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
const arenaOptions = { botEnabled: false, firingCenter: FIRING_CENTER, closedTrack: true };

function firstShot(options) {
  const match = new LiveMatch(701, options);
  for (let step = 0; step < 600 && !match.players.human.shots; step++) match.step(.05);
  assert.ok(match.players.human.shots > 0);
  return match.time;
}

const entry = routePoint(0);
const wrap = routePoint(1);
near(entry.x, wrap.x);
near(entry.y, wrap.y);
near(routeBearing(0), routeBearing(1));
const distance = progress => {
  const point = routePoint(progress);
  return Math.hypot(point.x - FORTRESS.x, point.y - FORTRESS.y);
};
const threshold = distance(FIRING_CENTER - .15);
near(threshold, distance(FIRING_CENTER + .15));
for (let step = 0; step < 100; step++) {
  const p = step / 100;
  const inZone = p >= .05 && p <= .35;
  assert.equal(distance(p) <= threshold + 1e-7, inZone, 'the gold segment follows the cannon range');
}
assert.ok(firstShot(arenaOptions) >= 3 && firstShot(arenaOptions) <= 3.15);
assert.ok(firstShot({ botEnabled: false }) >= 21 && firstShot({ botEnabled: false }) <= 21.15);

const extended = new LiveMatch(702, arenaOptions);
extended.players.human.tier2.rewardFloor.expandedField = 5;
extended.step(.05);
assert.equal(extended.players.human.shots, 1, 'a full Aperture upgrade reaches the breach');

const wrapped = new LiveMatch(703, arenaOptions);
wrapped.step(.05);
const human = wrapped.players.human;
const creep = human.creeps[0];
creep.progress = .98;
human.tier3.overdrive.nullifyingPurge = 1;
wrapped.activateUltimate('nullifyingPurge', .01);
assert.ok(creep.slowUntil > wrapped.time, 'area effects follow the lane through the lap marker');
human.tier3.overdrive.conjunctionSpheres = 1;
wrapped.activateUltimate('conjunctionSpheres', FIRING_CENTER, 'left');
assert.ok(human.conjunctionZone.start < 0 && human.conjunctionZone.end > 0);
wrapped.step(.05);
assert.equal(human.projectiles[0].targetId, creep.id, 'the extra firing zone covers the other side of the lap marker');

console.log('PASS: continuous phone map, aligned range, three-second opening, expanded range and wraparound abilities.');
