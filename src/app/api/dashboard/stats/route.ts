import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getZonedDateString } from '@/lib/utils/timezone';

export async function GET(request: Request) {
  try {
    const db = getDb();
    const today = getZonedDateString();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'today'; // 'today', '7d', '30d'

    // 1. Core Summary Metrics
    const totalMembersRow = db.prepare("SELECT COUNT(*) as count, SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as activeCount FROM members").get() as { count: number; activeCount: number };
    const currentlyInsideRow = db.prepare('SELECT COUNT(*) as count FROM members WHERE is_inside = 1').get() as { count: number };
    const todayEntriesRow = db.prepare("SELECT COUNT(*) as count FROM attendance_events WHERE event_date = ? AND event_type = 'ENTRY'").get(today) as { count: number };
    const todayExitsRow = db.prepare("SELECT COUNT(*) as count FROM attendance_events WHERE event_date = ? AND event_type = 'EXIT'").get(today) as { count: number };
    const uniquePresentRow = db.prepare('SELECT COUNT(DISTINCT member_id) as count FROM attendance_events WHERE event_date = ?').get(today) as { count: number };

    // Device status
    const deviceRow = db.prepare('SELECT * FROM devices ORDER BY last_seen_at DESC LIMIT 1').get() as any;
    const deviceStatus = deviceRow
      ? {
          name: deviceRow.device_name,
          status: deviceRow.status,
          isDemo: deviceRow.is_demo === 1,
          lastSeen: deviceRow.last_seen_at,
          lastSuccessfulScan: deviceRow.last_successful_scan_at,
        }
      : {
          name: 'RLR Biometric Scanner',
          status: 'DEMO',
          isDemo: true,
          lastSeen: new Date().toISOString(),
          lastSuccessfulScan: null,
        };

    // 2. Hourly Entry Histogram (for Today)
    const allTodayEntries = db
      .prepare("SELECT timestamp FROM attendance_events WHERE event_date = ? AND event_type = 'ENTRY'")
      .all(today) as { timestamp: string }[];

    const hourlyMap: Record<number, number> = {};
    for (let h = 8; h <= 21; h++) {
      hourlyMap[h] = 0;
    }

    allTodayEntries.forEach((entry) => {
      try {
        const hour = new Date(entry.timestamp).getHours();
        if (hourlyMap[hour] !== undefined) {
          hourlyMap[hour]++;
        }
      } catch {}
    });

    const hourlyData = Object.entries(hourlyMap).map(([hourStr, count]) => {
      const hour = parseInt(hourStr, 10);
      const displayHour = hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`;
      return { hour: displayHour, entries: count, hourNumber: hour };
    });

    // 3. Daily Attendance Trend (Last 7 Days)
    const trendQuery = `
      SELECT 
        event_date as date,
        SUM(CASE WHEN event_type = 'ENTRY' THEN 1 ELSE 0 END) as entries,
        SUM(CASE WHEN event_type = 'EXIT' THEN 1 ELSE 0 END) as exits,
        COUNT(DISTINCT member_id) as uniqueMembers
      FROM attendance_events
      WHERE event_date >= date('now', '-7 days')
      GROUP BY event_date
      ORDER BY event_date ASC
    `;
    const weeklyTrend = db.prepare(trendQuery).all();

    // 4. Recent Activity Stream (Latest 10 Events)
    const recentActivity = db
      .prepare(
        `SELECT 
          e.id,
          e.member_id,
          m.full_name as member_name,
          m.department,
          m.category,
          m.photo_url,
          e.event_type,
          e.timestamp,
          e.event_date,
          e.verification_source,
          e.is_corrected,
          e.correction_reason
        FROM attendance_events e
        LEFT JOIN members m ON e.member_id = m.id
        ORDER BY e.timestamp DESC
        LIMIT 10`
      )
      .all();

    // 5. Currently Inside List (with entry time)
    const currentlyInsideMembers = db
      .prepare(
        `SELECT 
          id, full_name, department, academic_year, category, photo_url, last_entry_time, current_session_id
        FROM members
        WHERE is_inside = 1
        ORDER BY last_entry_time ASC`
      )
      .all();

    // 6. Frequently Visiting Members (Top 5)
    const frequentVisitors = db
      .prepare(
        `SELECT 
          m.id, m.full_name, m.department, m.category, m.photo_url,
          COUNT(e.id) as visit_count
        FROM members m
        JOIN attendance_events e ON m.id = e.member_id AND e.event_type = 'ENTRY'
        GROUP BY m.id
        ORDER BY visit_count DESC
        LIMIT 5`
      )
      .all();

    // 7. Attendance Exceptions (Sessions open > 10 hours)
    const exceptions = db
      .prepare(
        `SELECT 
          s.id as session_id,
          s.member_id,
          m.full_name,
          m.department,
          s.entry_time,
          s.status
        FROM attendance_sessions s
        JOIN members m ON s.member_id = m.id
        WHERE s.status = 'ACTIVE' 
          AND (strftime('%s', 'now') - strftime('%s', s.entry_time)) > 36000`
      )
      .all();

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalMembers: totalMembersRow.count,
          activeMembers: totalMembersRow.activeCount,
          currentlyInside: currentlyInsideRow.count,
          totalEntriesToday: todayEntriesRow.count,
          totalExitsToday: todayExitsRow.count,
          uniqueMembersToday: uniquePresentRow.count,
          labCapacity: 40, // standard lab capacity
          occupancyPercentage: Math.min(100, Math.round((currentlyInsideRow.count / 40) * 100)),
        },
        deviceStatus,
        hourlyData,
        weeklyTrend,
        recentActivity,
        currentlyInsideMembers,
        frequentVisitors,
        exceptions,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
