import { describe, it, expect, beforeAll } from 'vitest';
import { seedDatabase } from '../src/lib/db/seed';
import { getDb } from '../src/lib/db';
import { sanitizeCsvValue, generateCsv, parseCsv } from '../src/lib/utils/csv';
import { formatDurationElapsed, calculateDurationMinutes } from '../src/lib/utils/timezone';

describe('Occupancy Calculations & CSV Formula Sanitization', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it('correctly calculates currently inside occupancy from database records', () => {
    const db = getDb();
    const countRow = db.prepare('SELECT COUNT(*) as count FROM members WHERE is_inside = 1').get() as { count: number };
    // In seed data: Aarav, Priya, and Rohit are currently inside (3 members)
    expect(countRow.count).toBe(3);

    const insideMembers = db.prepare('SELECT id, full_name FROM members WHERE is_inside = 1 ORDER BY id ASC').all() as any[];
    expect(insideMembers.length).toBe(3);
    expect(insideMembers[0].id).toBe('RLR-2024-001');
    expect(insideMembers[1].id).toBe('RLR-2024-002');
    expect(insideMembers[2].id).toBe('RLR-2024-003');
  });

  it('sanitizes malicious formula injection characters in CSV exports', () => {
    // OWASP CSV formula injection vectors: =, +, -, @, \t, \r
    expect(sanitizeCsvValue('=CMD|calc!A0')).toBe(`'=CMD|calc!A0`);
    expect(sanitizeCsvValue('+12345')).toBe(`'+12345`);
    expect(sanitizeCsvValue('-SUM(A1:B10)')).toBe(`'-SUM(A1:B10)`);
    expect(sanitizeCsvValue('@SUM(1+1)')).toBe(`'@SUM(1+1)`);
    expect(sanitizeCsvValue('Normal Text')).toBe('Normal Text');
  });

  it('generates valid RFC 4180 CSV with quotes when fields contain commas', () => {
    const headers = ['ID', 'Name', 'Notes'];
    const rows = [
      ['RLR-001', 'Aarav Sharma', 'Autonomous Rover, Project Lead'],
      ['RLR-002', 'Priya Varma', 'ROS2 & Computer Vision'],
    ];

    const csvOutput = generateCsv(headers, rows);
    expect(csvOutput).toContain('"Autonomous Rover, Project Lead"');

    const parsed = parseCsv(csvOutput);
    expect(parsed.length).toBe(3);
    expect(parsed[1][2]).toBe('Autonomous Rover, Project Lead');
  });

  it('computes elapsed duration correctly', () => {
    const now = new Date();
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    expect(formatDurationElapsed(thirtyMinsAgo)).toBe('30m');

    const twoHoursAgo = new Date(now.getTime() - 125 * 60 * 1000).toISOString();
    expect(formatDurationElapsed(twoHoursAgo)).toBe('2h 5m');
  });
});
