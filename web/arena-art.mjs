import { BARREL_REACH } from './turret-motion.mjs';

const fortressSprites = {
  foundation: [0, 0, 288, 288],
  turret: [294, 0, 150, 160],
  barrel: [450, 0, 68, 224]
};
const barrelHeight = 88;
// The upper six texels are transparent padding in the barrel tile.
const barrelTop = -BARREL_REACH - 6 * barrelHeight / fortressSprites.barrel[3];

export function createArenaArt(ctx, routePoint, fortressAtlas) {
  function route(from, to) {
    const path = new Path2D();
    for (let i = 0; i <= 100; i++) {
      const point = routePoint(from + (to - from) * i / 100, 'human');
      if (i === 0) path.moveTo(point.x, point.y);
      else path.lineTo(point.x, point.y);
    }
    return path;
  }

  const track = route(0, 1);
  const sectors = new Map();
  const portals = [routePoint(0, 'human'), routePoint(1, 'human')];

  function portalLabel(label, x, y, color) {
    ctx.font = '750 12px system-ui';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#101920';
    ctx.strokeText(label, x, y + 34);
    ctx.fillStyle = color;
    ctx.fillText(label, x, y + 34);
  }

  function drawBreach({ x, y }, phase) {
    const pulse = .5 + .5 * Math.sin(phase * 3.2);
    ctx.save();
    ctx.translate(x, y);
    const bloom = ctx.createRadialGradient(0, 0, 3, 0, 0, 36);
    bloom.addColorStop(0, '#72ffea9e');
    bloom.addColorStop(.44, '#27d4d87b');
    bloom.addColorStop(1, '#17a7c000');
    ctx.fillStyle = bloom;
    ctx.fillRect(-36, -36, 72, 72);

    ctx.beginPath();
    ctx.ellipse(0, 0, 21, 24, -.24, 0, Math.PI * 2);
    ctx.fillStyle = '#071b2c';
    ctx.fill();
    ctx.strokeStyle = '#359bb2';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.lineWidth = 2.3;
    ctx.shadowColor = '#36f0dc';
    ctx.shadowBlur = 7 + 6 * pulse;
    for (let index = 0; index < 3; index++) {
      const start = phase * .8 + index * Math.PI * 2 / 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 21 + 1.5 * pulse, 24, -.24, start, start + 1.27);
      ctx.strokeStyle = index === 1 ? '#93bdfc' : '#75ffea';
      ctx.stroke();
    }
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-14, 8);
    ctx.lineTo(-6, -3 + Math.sin(phase * 5) * 3);
    ctx.lineTo(-2, 5);
    ctx.lineTo(5, -6 + Math.cos(phase * 4) * 3);
    ctx.lineTo(14, -11);
    ctx.strokeStyle = '#d6ffff';
    ctx.stroke();
    ctx.shadowBlur = 0;

    for (let index = 0; index < 7; index++) {
      const drift = (phase * .62 + index / 7) % 1;
      const angle = index * 2.4;
      const distance = 11 + drift * 24;
      ctx.globalAlpha = 1 - drift;
      ctx.fillStyle = index % 2 ? '#84f9dd' : '#b4c7ff';
      ctx.fillRect(Math.cos(angle) * distance, Math.sin(angle) * distance, 2, 2);
    }
    ctx.restore();
    portalLabel('BREACH', x, y, '#b4fff2');
  }

  function drawLoopGate({ x, y }, phase) {
    ctx.save();
    ctx.translate(x, y);
    const glow = ctx.createRadialGradient(0, 3, 2, 0, 3, 31);
    glow.addColorStop(0, '#ffc37770');
    glow.addColorStop(1, '#e49c4800');
    ctx.fillStyle = glow;
    ctx.fillRect(-31, -28, 62, 62);

    plate([[-22,-16],[22,-16],[26,-10],[26,13],[18,22],[-18,22],[-26,13],[-26,-10]], '#17252b', '#af906a');
    plate([[-15,-14],[15,-14],[18,12],[12,17],[-12,17],[-18,12]], '#0a171c', '#705a43');
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffc98c';
    ctx.shadowColor = '#ffb66e';
    ctx.shadowBlur = 6;
    for (let index = 0; index < 3; index++) {
      const travel = (phase * .78 + index / 3) % 1;
      const row = -12 + travel * 23;
      ctx.globalAlpha = .3 + .58 * Math.sin(travel * Math.PI);
      ctx.beginPath();
      ctx.moveTo(-9, row);
      ctx.lineTo(0, row + 5);
      ctx.lineTo(9, row);
      ctx.stroke();
    }
    ctx.restore();
    portalLabel('LOOP GATE', x, y, '#ffdfb4');
  }

  function drawTrack(time, color, coverage, portalPhase) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [width, tint] of [[40, '#080c0a'], [34, '#65705a'], [31, '#262e27'], [21, '#151b17']]) {
      ctx.lineWidth = width; ctx.strokeStyle = tint; ctx.stroke(track);
    }
    ctx.lineWidth = 25; ctx.strokeStyle = `${color}39`;
    if (!sectors.has(coverage)) sectors.set(coverage, route((1 - coverage) / 2, (1 + coverage) / 2));
    ctx.stroke(sectors.get(coverage));
    ctx.lineWidth = 2; ctx.strokeStyle = `${color}a0`; ctx.setLineDash([10, 14]);
    ctx.lineDashOffset = -time * 18; ctx.stroke(track); ctx.setLineDash([]);

    drawBreach(portals[0], portalPhase);
    drawLoopGate(portals[1], portalPhase);
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

  function drawTower(color, pose) {
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

  return { drawTrack, drawTower };
}
