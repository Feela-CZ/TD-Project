export const FORTRESS = Object.freeze({ x:210, y:575 });
export const BARREL_REACH = 76;
const REST_ANGLE = -Math.PI / 2;
const FLASH_SECONDS = .105;
const RECOIL_SECONDS = .19;
const SPARK_SECONDS = .19;
const TURN_RATE = 6.5;
const RECOIL_DISTANCE = 7;

function angleTo(pivot, point) {
  return Math.atan2(point.y - pivot.y, point.x - pivot.x);
}

function atMuzzle(pivot, angle, recoil) {
  const length = BARREL_REACH - recoil;
  return { x:pivot.x + Math.cos(angle) * length, y:pivot.y + Math.sin(angle) * length };
}

// A single barrel supplies one frozen origin per burst. Split rounds and
// multi-target abilities can fan out without moving a round after launch.
export function createTurretMotion(tower = FORTRESS) {
  const pivot = { x:tower.x, y:tower.y };
  const origins = new Map();
  let angle = REST_ANGLE;
  let lastTime = null;
  let lastShotTime = -Infinity;
  let lastShot = null;

  function reset() {
    angle = REST_ANGLE;
    lastTime = null;
    lastShotTime = -Infinity;
    lastShot = null;
    origins.clear();
  }

  function update(time, activeId, rounds, pointFor, reduced = false) {
    const activePoint = pointFor(activeId);
    if (lastTime !== null && time < lastTime) reset();
    const elapsed = lastTime === null ? 0 : Math.min(.08, time - lastTime);
    lastTime = time;
    const pending = new Map();
    for (const round of rounds) {
      if (round.firedAt > time || round.impactAt < time) continue;
      if (!pending.has(round.firedAt)) pending.set(round.firedAt, []);
      pending.get(round.firedAt).push(round);
    }
    for (const firedAt of origins.keys()) {
      if (!pending.has(firedAt)) origins.delete(firedAt);
    }

    for (const [firedAt, burst] of pending) {
      if (origins.has(firedAt)) continue;
      const primary = burst.find(round => !round.splitExtra && round.targetId === activeId)
        ?? burst.find(round => !round.splitExtra) ?? burst[0];
      const target = pointFor(primary.targetId);
      const firedAngle = target ? angleTo(pivot, target) : angle;
      const muzzle = atMuzzle(pivot, firedAngle, reduced ? 0 : RECOIL_DISTANCE);
      origins.set(firedAt, muzzle);
      if (firedAt > lastShotTime) {
        lastShotTime = firedAt;
        lastShot = { muzzle, angle:firedAngle, hotShot:burst.some(round => round.overdrive) };
        // The firing frame must line up with the actual target, even when
        // gameplay selects a new enemy between two rendered frames.
        angle = firedAngle;
      }
    }

    const age = time - lastShotTime;
    const atLaunch = age < FLASH_SECONDS;
    if (!atLaunch && (activePoint || age > .5)) {
      const desired = activePoint ? angleTo(pivot, activePoint) : REST_ANGLE;
      const remaining = Math.atan2(Math.sin(desired - angle), Math.cos(desired - angle));
      const maxTurn = TURN_RATE * elapsed;
      angle += Math.max(-maxTurn, Math.min(maxTurn, remaining));
    }

    const recoil = reduced ? 0 : RECOIL_DISTANCE * Math.max(0, 1 - age / RECOIL_SECONDS) ** 2;
    const flash = Math.max(0, 1 - age / FLASH_SECONDS) * (reduced ? .35 : 1);
    const sparkAge = !reduced && age < SPARK_SECONDS ? age : null;
    const flashPoint = flash ? atMuzzle(pivot, angle, recoil) : null;
    return {
      pivot, angle, recoil,
      effect: flash || sparkAge !== null ? { ...lastShot, flashPoint, flash, sparkAge } : null
    };
  }

  return { reset, update, originFor: firedAt => origins.get(firedAt) };
}
