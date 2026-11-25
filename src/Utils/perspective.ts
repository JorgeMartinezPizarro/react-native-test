// 3D navigation view, like Google Maps: the map plane is turned so the route ahead points up, then tilted
// back with perspective. These helpers tell which part of the ground ends up on screen, so only those
// tiles and route dots are drawn.

export const PITCH_DEG = 45;
/** Distance from the viewer to the screen plane, in points (CSS / React Native `perspective`) */
export const PERSPECTIVE = 1000;
// Horizon fade over the top of the map: solid down to FADE_SOLID of the screen height, gone at FADE_END
export const FADE_SOLID = 0.12;
export const FADE_END = 0.3;

const PITCH = (PITCH_DEG * Math.PI) / 180;
const COS = Math.cos(PITCH);
const SIN = Math.sin(PITCH);
// When the horizon itself is on screen, draw this many screen heights ahead (the fade hides the rest)
const MAX_AHEAD_SCREENS = 2.5;

/** Vertical stretch that keeps an upright marker (pin) at its size once the plane is tilted */
export const BILLBOARD_STRETCH = 1 / COS;

/**
 * Map-plane offset (points from the user; negative = ahead) of the ground drawn `screenY` points
 * below the user on screen (negative = above).
 */
export function groundOffset(screenY: number, height: number) {
  const limit = -MAX_AHEAD_SCREENS * height;
  const denominator = PERSPECTIVE * COS + screenY * SIN;
  if (denominator <= 0) return limit; // above the horizon
  return Math.max(limit, (screenY * PERSPECTIVE) / denominator);
}

/** How big the map plane looks at a map-plane offset: 1 at the user, smaller far ahead */
export function depthScale(planeY: number) {
  return PERSPECTIVE / (PERSPECTIVE - planeY * SIN);
}

export interface GroundView {
  /** Points of map plane visible to each side (at the far edge, where it is widest) */
  halfWidth: number;
  ahead: number;
  behind: number;
}

/** Part of the map plane on screen when the user is drawn `userY` points from the top of a width × height view */
export function visibleGround(width: number, height: number, userY: number): GroundView {
  const far = groundOffset(FADE_SOLID * height - userY, height);
  const near = groundOffset(height - userY, height);
  return { halfWidth: width / 2 / depthScale(far), ahead: -far, behind: near };
}

/**
 * Is the map-plane point (dx, dy) from the user (unturned, north up) on screen once the plane is turned
 * to `bearing` and tilted, give or take `margin` points?
 */
export function inGroundView(dx: number, dy: number, bearing: number, view: GroundView, margin: number) {
  const b = (bearing * Math.PI) / 180;
  // The plane is turned by -bearing: coordinates in that turned frame (v negative = ahead)
  const u = dx * Math.cos(b) + dy * Math.sin(b);
  const v = -dx * Math.sin(b) + dy * Math.cos(b);
  return Math.abs(u) <= view.halfWidth + margin && v >= -view.ahead - margin && v <= view.behind + margin;
}
