import type { WheelConfig } from '../types';

export interface SegmentPath {
  path: string;
  cx: number;
  cy: number;
}

/** Convert degrees to radians */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Compute a single SVG arc path for a wheel segment.
 *  dayIndex: 0-based day index (0 = day 1)
 *  habitIndex: 0-based ring index from outside inward
 */
export function computeSegmentPath(
  config: WheelConfig,
  dayIndex: number,
  habitIndex: number,
  cx: number,
  cy: number
): SegmentPath {
  const { daysInView, startAngleDeg, gapDeg, innerRadius, ringThickness, ringGap } = config;

  const sliceDeg = 360 / daysInView;
  const halfGap = gapDeg / 2;

  // angle range for this day's slice
  const startDeg = startAngleDeg + dayIndex * sliceDeg + halfGap;
  const endDeg = startAngleDeg + (dayIndex + 1) * sliceDeg - halfGap;

  const startRad = degToRad(startDeg);
  const endRad = degToRad(endDeg);

  // ring radii — habit 0 is outermost ring
  const totalHabits = config.habits.length;
  const outerR = innerRadius + (totalHabits - habitIndex) * (ringThickness + ringGap) - ringGap;
  const innerR = outerR - ringThickness;

  const x1 = cx + outerR * Math.cos(startRad);
  const y1 = cy + outerR * Math.sin(startRad);
  const x2 = cx + outerR * Math.cos(endRad);
  const y2 = cy + outerR * Math.sin(endRad);
  const x3 = cx + innerR * Math.cos(endRad);
  const y3 = cy + innerR * Math.sin(endRad);
  const x4 = cx + innerR * Math.cos(startRad);
  const y4 = cy + innerR * Math.sin(startRad);

  const largeArcFlag = endDeg - startDeg > 180 ? 1 : 0;

  const path = [
    `M ${x1} ${y1}`,
    `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');

  // centroid for tooltip positioning
  const midDeg = (startDeg + endDeg) / 2;
  const midR = (innerR + outerR) / 2;
  const midRad = degToRad(midDeg);
  const segCx = cx + midR * Math.cos(midRad);
  const segCy = cy + midR * Math.sin(midRad);

  return { path, cx: segCx, cy: segCy };
}

/** Compute day-label position on the outer edge */
export function computeDayLabelPosition(
  config: WheelConfig,
  dayIndex: number,
  cx: number,
  cy: number
): { x: number; y: number; textAnchor: string } {
  const { daysInView, startAngleDeg, dayLabelRadius } = config;
  const sliceDeg = 360 / daysInView;
  const midDeg = startAngleDeg + (dayIndex + 0.5) * sliceDeg;
  const midRad = degToRad(midDeg);
  const x = cx + dayLabelRadius * Math.cos(midRad);
  const y = cy + dayLabelRadius * Math.sin(midRad);

  // Determine text-anchor based on position
  let textAnchor = 'middle';
  const normalised = ((midDeg % 360) + 360) % 360;
  if (normalised > 10 && normalised < 170) textAnchor = 'middle';
  else if (normalised > 190 && normalised < 350) textAnchor = 'middle';

  return { x, y, textAnchor };
}
