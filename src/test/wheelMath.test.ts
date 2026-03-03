import { describe, it, expect } from 'vitest';
import { computeSegmentPath, computeDayLabelPosition, degToRad } from '../utils/wheelMath';
import type { WheelConfig } from '../types';
import wheelConfigRaw from '../data/wheel_config.json';

const config = wheelConfigRaw as WheelConfig;
// Use a large enough CX/CY so all segments' centroids stay within bounds
const CX = 300;
const CY = 300;

describe('degToRad', () => {
  it('converts 0 degrees to 0 radians', () => {
    expect(degToRad(0)).toBe(0);
  });
  it('converts 180 degrees to π', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI);
  });
  it('converts 360 degrees to 2π', () => {
    expect(degToRad(360)).toBeCloseTo(2 * Math.PI);
  });
});

describe('computeSegmentPath', () => {
  it('returns a non-empty SVG path string', () => {
    const { path } = computeSegmentPath(config, 0, 0, CX, CY);
    expect(path).toBeTruthy();
    expect(path).toContain('M');
    expect(path).toContain('A');
    expect(path).toContain('Z');
  });

  it('returns different paths for different days', () => {
    const p1 = computeSegmentPath(config, 0, 0, CX, CY).path;
    const p2 = computeSegmentPath(config, 1, 0, CX, CY).path;
    expect(p1).not.toBe(p2);
  });

  it('returns different paths for different habits', () => {
    const p1 = computeSegmentPath(config, 0, 0, CX, CY).path;
    const p2 = computeSegmentPath(config, 0, 1, CX, CY).path;
    expect(p1).not.toBe(p2);
  });

  it('produces valid centroid coordinates', () => {
    const { cx, cy } = computeSegmentPath(config, 0, 0, CX, CY);
    // Centroid should be a finite number within a generous range around CX/CY
    expect(Number.isFinite(cx)).toBe(true);
    expect(Number.isFinite(cy)).toBe(true);
    expect(Math.abs(cx - CX)).toBeLessThan(500);
    expect(Math.abs(cy - CY)).toBeLessThan(500);
  });

  it('last day index produces a valid path', () => {
    const lastDay = config.daysInView - 1;
    const { path } = computeSegmentPath(config, lastDay, 0, CX, CY);
    expect(path).toContain('Z');
  });

  it('last habit index produces a valid path', () => {
    const lastHabit = config.habits.length - 1;
    const { path } = computeSegmentPath(config, 0, lastHabit, CX, CY);
    expect(path).toContain('Z');
  });
});

describe('computeDayLabelPosition', () => {
  it('returns coordinates within a reasonable range', () => {
    const pos = computeDayLabelPosition(config, 0, CX, CY);
    expect(Number.isFinite(pos.x)).toBe(true);
    expect(Number.isFinite(pos.y)).toBe(true);
    expect(Math.abs(pos.x - CX)).toBeLessThan(500);
    expect(Math.abs(pos.y - CY)).toBeLessThan(500);
  });

  it('returns different positions for different days', () => {
    const p1 = computeDayLabelPosition(config, 0, CX, CY);
    const p2 = computeDayLabelPosition(config, 15, CX, CY);
    expect(p1.x).not.toBeCloseTo(p2.x, 0);
  });

  it('sets textAnchor to "middle"', () => {
    const pos = computeDayLabelPosition(config, 0, CX, CY);
    expect(pos.textAnchor).toBe('middle');
  });
});

describe('wheel config integrity', () => {
  it('has 15 habits matching the default schedule', () => {
    expect(config.habits).toHaveLength(15);
  });

  it('all habits have unique ids', () => {
    const ids = config.habits.map((h) => h.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all habits have a valid color', () => {
    for (const habit of config.habits) {
      expect(habit.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
