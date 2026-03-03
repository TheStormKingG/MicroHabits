import type { ExportEnvelope, DayRecord, AppSettings } from '../types';

export function buildExportEnvelope(
  dayRecords: DayRecord[],
  appSettings: AppSettings
): ExportEnvelope {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    appSettings,
    dayRecords,
  };
}

export function validateExportEnvelope(raw: unknown): ExportEnvelope {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid export file: not an object');
  }

  const obj = raw as Record<string, unknown>;

  if (obj['version'] !== 2) {
    throw new Error(`Unsupported export version: ${obj['version']}. Expected 2.`);
  }

  if (!Array.isArray(obj['dayRecords'])) {
    throw new Error('Invalid export file: dayRecords must be an array');
  }

  if (typeof obj['appSettings'] !== 'object' || obj['appSettings'] === null) {
    throw new Error('Invalid export file: appSettings must be an object');
  }

  // Validate each dayRecord has a date string
  for (const record of obj['dayRecords'] as unknown[]) {
    if (typeof record !== 'object' || record === null) {
      throw new Error('Invalid dayRecord: not an object');
    }
    const r = record as Record<string, unknown>;
    if (typeof r['date'] !== 'string') {
      throw new Error('Invalid dayRecord: missing date string');
    }
    if (typeof r['slots'] !== 'object' || r['slots'] === null) {
      throw new Error(`Invalid dayRecord for ${r['date']}: slots must be an object`);
    }
  }

  return raw as ExportEnvelope;
}

export function downloadJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function readJSONFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error('Could not read file');
        resolve(JSON.parse(text));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsText(file);
  });
}

export function generateICSContent(
  slotId: string,
  label: string,
  timeStr: string,
  minutesBefore: number,
  dateISO: string
): string {
  const [h, m] = timeStr.split(':').map(Number);
  const notifyDate = new Date(dateISO);
  notifyDate.setHours(h, m - minutesBefore, 0, 0);

  const eventDate = new Date(dateISO);
  eventDate.setHours(h, m, 0, 0);

  const fmt = (d: Date): string =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MicroHabits//EN',
    'BEGIN:VEVENT',
    `UID:${slotId}-${dateISO}@microhabits`,
    `DTSTART:${fmt(eventDate)}`,
    `DTEND:${fmt(new Date(eventDate.getTime() + 5 * 60 * 1000))}`,
    `SUMMARY:MicroHabits – ${label}`,
    `DESCRIPTION:Time to complete your habit: ${label}`,
    `BEGIN:VALARM`,
    `TRIGGER:-PT${minutesBefore}M`,
    `ACTION:DISPLAY`,
    `DESCRIPTION:Reminder: ${label}`,
    `END:VALARM`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
