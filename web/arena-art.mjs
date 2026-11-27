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

  function drawTrack(time, color, coverage) {
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

    for (const [index, {x, y}] of portals.entries()) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
      ctx.shadowBlur = 17; ctx.shadowColor = color; ctx.fillStyle = '#121913';
      ctx.fillRect(-15, -15, 30, 30);
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.strokeRect(-15, -15, 30, 30);
      ctx.shadowBlur = 0;
      ctx.rotate(time * (index ? .85 : -.85));
      ctx.strokeStyle = `${color}a0`; ctx.strokeRect(-8, -8, 16, 16);
      ctx.restore();
      ctx.fillStyle = '#dedac3'; ctx.font = '700 8px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(index ? 'RETURN' : 'ENTRY', x, y + 26);
    }
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
