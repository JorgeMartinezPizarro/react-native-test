// Compass smoothing for the heading beam.
// Android's compass (expo-location: raw accelerometer + magnetometer, no filtering) swings a lot, above all
// while walking. Average the latest readings as unit vectors and measure how spread they are; like Google Maps,
// hide the heading while it oscillates instead of drawing it erratically.

const WINDOW_MS = 1000;
const MAX_SAMPLES = 10;
// Readings only arrive when the heading changes by more than ~2°, so a still phone sends nothing for a while:
// then the last few readings, however old, still describe it.
const MIN_SAMPLES = 3;
// Circular standard deviation (degrees): hide above HIDE, show again only below SHOW so it doesn't flicker
const HIDE_SPREAD = 30;
const SHOW_SPREAD = 15;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Feed it compass readings; it returns the smoothed heading, or null while it isn't trustworthy */
export function createHeadingFilter() {
  let samples: { time: number; x: number; y: number }[] = [];
  let visible = false;

  return (degrees: number, time: number): number | null => {
    samples.push({ time, x: Math.cos(toRad(degrees)), y: Math.sin(toRad(degrees)) });
    samples = samples.slice(-MAX_SAMPLES);

    let window = samples.filter(s => time - s.time <= WINDOW_MS);
    if (window.length < MIN_SAMPLES) window = samples.slice(-MIN_SAMPLES);
    if (window.length < MIN_SAMPLES) return null;

    const x = window.reduce((sum, s) => sum + s.x, 0) / window.length;
    const y = window.reduce((sum, s) => sum + s.y, 0) / window.length;
    const r = Math.min(1, Math.hypot(x, y));
    const spread = r > 0 ? toDeg(Math.sqrt(-2 * Math.log(r))) : 180;

    if (visible && spread > HIDE_SPREAD) visible = false;
    else if (!visible && spread < SHOW_SPREAD) visible = true;

    return visible ? (toDeg(Math.atan2(y, x)) + 360) % 360 : null;
  };
}
