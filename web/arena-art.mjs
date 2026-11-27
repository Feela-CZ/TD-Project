import { FIRING_CENTER, routeBearing, routePoint } from './arena-route.mjs';
import { BARREL_REACH, FORTRESS } from './turret-motion.mjs';

const fortressSprites = {
  foundation: [0, 0, 288, 288],
  turret: [294, 0, 150, 160],
  barrel: [450, 0, 68, 224]
};
const barrelHeight = 88;
// The upper six texels are transparent padding in the barrel tile.
const barrelTop = -BARREL_REACH - 6 * barrelHeight / fortressSprites.barrel[3];

const edge = '#080b0a';

function sample(seed) {
  const value = Math.imul(seed ^ 0x9e3779b9, 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 0x100000000;
}

function rock(ctx, x, y, size, key) {
  const face = new Path2D();
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const r = size * (.62 + sample(key + i * 11) * .43);
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * .67;
    if (i === 0) face.moveTo(px, py);
    else face.lineTo(px, py);
  }
  face.closePath();
  ctx.fillStyle = edge;
  ctx.save();
  ctx.translate(2, 4);
  ctx.fill(face);
  ctx.restore();
  ctx.fillStyle = ['#292d29', '#34352c', '#272e2e', '#30352d'][key % 4];
  ctx.fill(face);
  ctx.strokeStyle = '#51594b68';
  ctx.lineWidth = .65;
  ctx.stroke(face);
  ctx.beginPath();
  ctx.moveTo(x - size * .69, y);
  ctx.lineTo(x - size * .17, y - size * .24);
  ctx.lineTo(x + size * .29, y - size * .27);
  ctx.lineTo(x + size * .65, y);
  ctx.stroke();
}

function paintTerrain(width, height) {
  const tile = document.createElement('canvas');
  tile.width = width;
  tile.height = height;
  const ctx = tile.getContext('2d');
  const ground = ctx.createRadialGradient(206, 410, 30, 206, 410, 380);
  ground.addColorStop(0, '#252925');
  ground.addColorStop(.65, '#151c19');
  ground.addColorStop(1, '#0a1110');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, width, height);

  for (let n = 0; n < 2300; n++) {
    const x = width * sample(n * 3 + 1), y = height * sample(n * 3 + 2);
    ctx.fillStyle = n % 3 ? '#9aac7e19' : '#c8ab733c';
    ctx.fillRect(x, y, .3 + sample(n * 3 + 3) * 2, .6);
  }
  for (let row = 0; row < 20; row++) {
    for (let column = 0; column < 14; column++) {
      const index = row * 14 + column;
      const x = column * 32 + (row % 2 ? 15 : 0) + sample(index + 391) * 12;
      const y = row * 36 + sample(index + 781) * 17;
      const rim = x < 43 || x > 378 || y < 103 || y > 654;
      const spine = Math.abs(x - (211 + Math.sin(row * .55) * 27)) < 33 && y > 185 && y < 516;
      if (rim || spine || sample(index + 2563) > .82) rock(ctx, x, y, rim ? 23 : 13, index);
    }
  }

  ctx.lineWidth = 1.25;
  for (const [x, y] of [[22, 168], [403, 256], [18, 519], [393, 522], [254, 256], [157, 435], [225, 655]]) {
    const heat = ctx.createRadialGradient(x, y, 0, x, y, 38);
    heat.addColorStop(0, '#d3683c59'); heat.addColorStop(1, '#d3683c00');
    ctx.fillStyle = heat;
    ctx.fillRect(x - 38, y - 38, 76, 76);
    ctx.beginPath();
    ctx.moveTo(x - 27, y + 6);
    ctx.lineTo(x - 11, y - 3);
    ctx.lineTo(x - 3, y + 3);
    ctx.lineTo(x + 8, y - 7);
    ctx.lineTo(x + 22, y - 12);
    ctx.strokeStyle = '#e192597a';
    ctx.stroke();
  }

  ctx.strokeStyle = '#9caa7f40';
  ctx.setLineDash([19, 5, 2, 5]);
  ctx.strokeRect(12, 81, width - 24, height - 99);
  return tile;
}

export function createArenaArt(ctx, canvas, fortressAtlas) {
  const terrain = paintTerrain(canvas.width, canvas.height);
  const segments = new Map();

  function route(from, to) {
    const key = `${from}:${to}`;
    if (segments.has(key)) return segments.get(key);
    const path = new Path2D();
    const steps = Math.ceil((to - from) * 160);
    for (let i = 0; i <= steps; i++) {
      const point = routePoint(from + (to - from) * i / steps);
      if (i === 0) path.moveTo(point.x, point.y);
      else path.lineTo(point.x, point.y);
    }
    segments.set(key, path);
    return path;
  }

  const track = route(0, 1);
  track.closePath();
  const breach = routePoint(0);
  const firingZones = new Map();

  function firingZone(coverage) {
    if (firingZones.has(coverage)) return firingZones.get(coverage);
    const start = FIRING_CENTER - coverage / 2;
    const end = FIRING_CENTER + coverage / 2;
    const entry = routePoint(start);
    const exit = routePoint(end);
    const offset = point => Math.atan2(point.y - FORTRESS.y, point.x - FORTRESS.x);
    const radius = Math.hypot(entry.x - FORTRESS.x, entry.y - FORTRESS.y);
    const startAngle = offset(entry), endAngle = offset(exit);
    const outline = new Path2D();
    outline.arc(FORTRESS.x, FORTRESS.y, radius, startAngle, endAngle);
    const area = new Path2D(outline);
    area.lineTo(FORTRESS.x, FORTRESS.y);
    area.closePath();
    const path = route(start, end);
    const zone = { start, end, path, outline, area };
    firingZones.set(coverage, zone);
    return zone;
  }

  function entryGate(progress, color) {
    const point = routePoint(progress);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(routeBearing(progress));
    ctx.fillStyle = '#151b18';
    ctx.fillRect(-3, -22, 6, 44);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, 22);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(-4, -23, 8, 4);
    ctx.fillRect(-4, 19, 8, 4);
    ctx.restore();
  }

  function directionMark(progress, color) {
    const point = routePoint(progress);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(routeBearing(progress));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-4, -5);
    ctx.lineTo(3, 0);
    ctx.lineTo(-4, 5);
    ctx.stroke();
    ctx.restore();
  }

  function trackLabel(value, x, y, color) {
    ctx.textAlign = 'center';
    ctx.font = '750 12px system-ui';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#111713';
    ctx.strokeText(value, x, y);
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  }

  function drawTrack(time, color, coverage, extension) {
    const zone = firingZone(coverage);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.fillStyle = `${color}0c`;
    ctx.fill(zone.area);
    ctx.strokeStyle = `${color}80`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 7]);
    ctx.stroke(zone.outline);
    ctx.setLineDash([]);

    for (const [width, tint] of [[42, '#0b100e'], [36, '#596453'], [33, '#242e26'], [23, '#18201b']]) {
      ctx.lineWidth = width;
      ctx.strokeStyle = tint;
      ctx.stroke(track);
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#9aaea091';
    ctx.setLineDash([8, 14]);
    ctx.lineDashOffset = -time * 10;
    ctx.stroke(track);

    if (extension) {
      ctx.setLineDash([]);
      ctx.strokeStyle = '#c4a7fa80';
      ctx.lineWidth = 30;
      ctx.lineCap = 'butt';
      ctx.stroke(route(extension.start, extension.end));
    }

    ctx.lineCap = 'butt';
    ctx.setLineDash([]);
    ctx.strokeStyle = `${color}9b`;
    ctx.lineWidth = 33;
    ctx.stroke(zone.path);
    ctx.strokeStyle = '#3c3121';
    ctx.lineWidth = 25;
    ctx.stroke(zone.path);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([10, 12]);
    ctx.stroke(zone.path);
    ctx.setLineDash([]);
    ctx.lineCap = 'round';

    entryGate(zone.start, color);
    entryGate(zone.end, color);
    for (const progress of [.49, .68, .87]) directionMark(progress, '#bdd0c0');
    for (const progress of [.11, .19, .27]) directionMark(progress, '#ffe6b2');

    ctx.save();
    ctx.translate(breach.x, breach.y);
    ctx.rotate(Math.PI / 4);
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#7edded';
    ctx.fillStyle = '#142823';
    ctx.fillRect(-10, -10, 20, 20);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#8de1d4';
    ctx.strokeRect(-10, -10, 20, 20);
    ctx.shadowBlur = 0;
    ctx.strokeRect(-4, -4, 8, 8);
    ctx.restore();

    trackLabel('OUT OF CANNON RANGE', 210, 214, '#bfcdbe');
    trackLabel('FIRING RANGE', 210, 456, color);
    trackLabel('BREACH', breach.x + 54, breach.y + 5, '#a3eadf');
    ctx.restore();
  }

  function plate(points, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  function drawTower(color, label, pose) {
    const { x, y } = pose.pivot;
    const spritesReady = fortressAtlas.complete && fortressAtlas.naturalWidth > 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#070c0ab8';
    ctx.beginPath();
    ctx.ellipse(3, 6, 58, 56, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `${color}55`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.stroke();

    if (spritesReady) {
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(fortressAtlas, ...fortressSprites.foundation, -60, -57, 116, 116);
    } else {
      ctx.fillStyle = '#39443a';
      ctx.beginPath();
      ctx.arc(0, 0, 50, 0, Math.PI * 2);
      ctx.fill();
    }

    // The source sprites point up. Rotate both around the stationary bearing,
    // and retract only the barrel. The breech covers the barrel's rear collar.
    ctx.rotate(pose.angle + Math.PI / 2);
    if (spritesReady) {
      ctx.drawImage(fortressAtlas, ...fortressSprites.barrel, -13, barrelTop + pose.recoil, 26, barrelHeight);
      ctx.drawImage(fortressAtlas, ...fortressSprites.turret, -28, -29.5, 56, 59);
    } else {
      ctx.fillStyle = '#919881';
      ctx.fillRect(-7, -BARREL_REACH + pose.recoil, 14, BARREL_REACH);
      ctx.fillStyle = '#617260';
      ctx.fillRect(-17, -20, 34, 39);
    }
    ctx.restore();

    if (pose.effect) drawMuzzleEffect(pose.effect, color);

    ctx.save();
    ctx.fillStyle = '#f7e8c5';
    ctx.font = '700 9px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 66);
    ctx.restore();
  }

  function drawMuzzleEffect({ muzzle, flashPoint, angle, flash, sparkAge, hotShot }, color) {
    const glow = hotShot ? '#e9ff67' : color;
    if (flashPoint) {
      ctx.save();
      ctx.translate(flashPoint.x, flashPoint.y);
      ctx.rotate(angle);
      const radius = 12 + 8 * flash;
      const light = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      light.addColorStop(0, '#fff6c5');
      light.addColorStop(.24, glow);
      light.addColorStop(1, `${glow}00`);
      ctx.globalAlpha = flash * .65;
      ctx.fillStyle = light;
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      ctx.globalAlpha = flash;
      plate([[-3,0],[1,-6],[5,-2],[13+7*flash,0],[5,2],[1,6]], '#fff6c8');
      ctx.restore();
    }
    if (sparkAge !== null) {
      ctx.save();
      ctx.translate(muzzle.x, muzzle.y);
      ctx.rotate(angle);
      ctx.globalAlpha = .8 * (1 - sparkAge / .19);
      ctx.strokeStyle = glow;
      ctx.lineWidth = 1.2;
      for (const spread of [-.55, -.19, .27, .64]) {
        const distance = 8 + sparkAge * (100 + 40 * Math.abs(spread));
        const y = distance * spread;
        ctx.beginPath();
        ctx.moveTo(distance - 4, y * .82);
        ctx.lineTo(distance, y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  return { drawBackground: () => ctx.drawImage(terrain, 0, 0), drawTrack, drawTower };
}
