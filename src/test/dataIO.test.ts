import { describe, it, expect } from 'vitest';
import { buildExportEnvelope, validateExportEnvelope } from '../utils/dataIO';
import type { DayRecord, AppSettings } from '../types';

const defaultSettings: AppSettings = {
  notifications: { enabled: false, minutesBefore: 5, permission: 'default' },
  customSlots: [],
  theme: 'dark',
};

const sampleRecord: DayRecord = {
  date: '2025-03-01',
  slots: { wake: { completed: true, notes: 'felt great' } },
  todayTasks: [{ id: 't1', text: 'Do laundry', done: false, createdAt: '2025-03-01T08:00:00Z' }],
  tomorrowTasks: [],
};

describe('buildExportEnvelope', () => {
  it('creates an envelope with version 2', () => {
    const env = buildExportEnvelope([sampleRecord], defaultSettings);
    expect(env.version).toBe(2);
  });

  it('includes all day records', () => {
    const env = buildExportEnvelope([sampleRecord], defaultSettings);
    expect(env.dayRecords).toHaveLength(1);
    expect(env.dayRecords[0].date).toBe('2025-03-01');
  });

  it('includes app settings', () => {
    const env = buildExportEnvelope([sampleRecord], defaultSettings);
    expect(env.appSettings).toEqual(defaultSettings);
  });

  it('sets exportedAt to a valid ISO timestamp', () => {
    const env = buildExportEnvelope([], defaultSettings);
    expect(() => new Date(env.exportedAt)).not.toThrow();
    expect(new Date(env.exportedAt).getFullYear()).toBeGreaterThanOrEqual(2025);
  });
});

describe('validateExportEnvelope', () => {
  it('accepts a valid envelope', () => {
    const env = buildExportEnvelope([sampleRecord], defaultSettings);
    expect(() => validateExportEnvelope(env)).not.toThrow();
  });

  it('throws on null input', () => {
    expect(() => validateExportEnvelope(null)).toThrow('not an object');
  });

  it('throws on wrong version', () => {
    const bad = { version: 1, exportedAt: '', appSettings: {}, dayRecords: [] };
    expect(() => validateExportEnvelope(bad)).toThrow('Unsupported export version');
  });

  it('throws when dayRecords is not an array', () => {
    const bad = { version: 2, exportedAt: '', appSettings: {}, dayRecords: 'nope' };
    expect(() => validateExportEnvelope(bad)).toThrow('dayRecords must be an array');
  });

  it('throws when appSettings is missing', () => {
    const bad = { version: 2, exportedAt: '', dayRecords: [] };
    expect(() => validateExportEnvelope(bad)).toThrow('appSettings must be an object');
  });

  it('throws when a dayRecord has no date', () => {
    const bad = {
      version: 2,
      exportedAt: '',
      appSettings: defaultSettings,
      dayRecords: [{ slots: {} }],
    };
    expect(() => validateExportEnvelope(bad)).toThrow('missing date string');
  });

  it('throws when a dayRecord has no slots object', () => {
    const bad = {
      version: 2,
      exportedAt: '',
      appSettings: defaultSettings,
      dayRecords: [{ date: '2025-01-01' }],
    };
    expect(() => validateExportEnvelope(bad)).toThrow('slots must be an object');
  });

  it('returns a typed envelope on success', () => {
    const env = buildExportEnvelope([sampleRecord], defaultSettings);
    const result = validateExportEnvelope(env);
    expect(result.version).toBe(2);
    expect(result.dayRecords[0].slots.wake.completed).toBe(true);
  });
});
