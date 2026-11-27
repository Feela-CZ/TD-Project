export const FIRING_CENTER = .20;

const trackCenter = { x: 210, y: 326 };
const trackRadius = { x: 146, y: 166 };

// A lap starts at the breach and follows one continuous line through 0 and 1.
export function routePoint(progress) {
  const angle = (progress - FIRING_CENTER) * 2 * Math.PI;
  return {
    x: trackCenter.x + trackRadius.x * Math.sin(angle),
    y: trackCenter.y + trackRadius.y * Math.cos(angle)
  };
}

export function routeBearing(progress) {
  const angle = (progress - FIRING_CENTER) * 2 * Math.PI;
  return Math.atan2(-trackRadius.y * Math.sin(angle), trackRadius.x * Math.cos(angle));
}
