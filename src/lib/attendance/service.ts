import { getDb } from '@/lib/db';
import { Member, AttendanceEvent, AttendanceSession, BiometricCredential } from '@/lib/db/schema';
import { getCurrentTimestamp, getZonedDateString, calculateDurationMinutes } from '@/lib/utils/timezone';
import { VerificationSource } from '@/lib/biometrics/adapter';

export interface ScanProcessingResult {
  success: boolean;
  action?: 'ENTRY' | 'EXIT';
  member?: {
    id: string;
    fullName: string;
    department: string;
    academicYear: string;
    category: string;
    photoUrl: string | null;
    isInside: boolean;
  };
  event?: AttendanceEvent;
  session?: AttendanceSession | null;
  message: string;
  cooldownActive?: boolean;
  remainingCooldownSeconds?: number;
  errorCode?: 'NOT_FOUND' | 'INACTIVE' | 'COOLDOWN' | 'INTERNAL_ERROR';
}

export class AttendanceService {
  /**
   * Retrieves duplicate cooldown duration in seconds from settings or defaults to 15s
   */
  static getCooldownSeconds(): number {
    const db = getDb();
    const row = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('duplicate_cooldown_seconds') as { value: string } | undefined;
    if (row) {
      try {
        const val = JSON.parse(row.value);
        return Number(val) || 15;
      } catch {
        return 15;
      }
    }
    return Number(process.env.DUPLICATE_COOLDOWN_SECONDS) || 15;
  }

  /**
   * Core transactional attendance scan processor
   */
  static processScan(params: {
    credentialReference?: string;
    memberId?: string;
    verificationSource: VerificationSource;
    deviceId?: string;
    rawMetadata?: Record<string, any>;
  }): ScanProcessingResult {
    const db = getDb();
    const nowIso = getCurrentTimestamp();
    const todayDate = getZonedDateString();
    const cooldownSeconds = this.getCooldownSeconds();

    // 1. Resolve Member
    let member: Member | undefined;
    let credential: BiometricCredential | undefined;

    if (params.credentialReference) {
      credential = db
        .prepare('SELECT * FROM biometric_credentials WHERE credential_reference = ? AND is_revoked = 0')
        .get(params.credentialReference) as BiometricCredential | undefined;

      if (!credential) {
        return {
          success: false,
          errorCode: 'NOT_FOUND',
          message: 'Fingerprint credential not recognized. Member enrollment required.',
        };
      }

      member = db.prepare('SELECT * FROM members WHERE id = ?').get(credential.member_id) as Member | undefined;
    } else if (params.memberId) {
      member = db.prepare('SELECT * FROM members WHERE id = ?').get(params.memberId) as Member | undefined;
      if (member) {
        credential = db
          .prepare('SELECT * FROM biometric_credentials WHERE member_id = ? AND is_revoked = 0 ORDER BY enrolled_at DESC LIMIT 1')
          .get(member.id) as BiometricCredential | undefined;
      }
    }

    if (!member) {
      return {
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Member not found in database.',
      };
    }

    // 2. Validate Membership Status
    if (member.status !== 'ACTIVE') {
      return {
        success: false,
        errorCode: 'INACTIVE',
        member: {
          id: member.id,
          fullName: member.full_name,
          department: member.department,
          academicYear: member.academic_year,
          category: member.category,
          photoUrl: member.photo_url,
          isInside: member.is_inside === 1,
        },
        message: `Access Denied: Member status is currently ${member.status}. Please contact lab coordinator.`,
      };
    }

    // 3. Duplicate Scan Cooldown Protection
    const lastEvent = db
      .prepare('SELECT * FROM attendance_events WHERE member_id = ? ORDER BY timestamp DESC LIMIT 1')
      .get(member.id) as AttendanceEvent | undefined;

    if (lastEvent) {
      const lastEventTime = new Date(lastEvent.timestamp).getTime();
      const currentTime = new Date(nowIso).getTime();
      const elapsedSeconds = (currentTime - lastEventTime) / 1000;

      if (elapsedSeconds < cooldownSeconds) {
        const remaining = Math.ceil(cooldownSeconds - elapsedSeconds);
        return {
          success: false,
          errorCode: 'COOLDOWN',
          cooldownActive: true,
          remainingCooldownSeconds: remaining,
          member: {
            id: member.id,
            fullName: member.full_name,
            department: member.department,
            academicYear: member.academic_year,
            category: member.category,
            photoUrl: member.photo_url,
            isInside: member.is_inside === 1,
          },
          message: `Scan ignored: Repeated scan detected. Please wait ${remaining}s before scanning again.`,
        };
      }
    }

    // 4. Transactional Attendance State Transition
    const transaction = db.transaction(() => {
      const isCurrentlyInside = member!.is_inside === 1;
      const targetAction: 'ENTRY' | 'EXIT' = isCurrentlyInside ? 'EXIT' : 'ENTRY';
      const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      let currentSessionId = member!.current_session_id;
      let sessionRecord: AttendanceSession | null = null;

      if (targetAction === 'ENTRY') {
        const sessionId = `SES-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        currentSessionId = sessionId;

        // 1. Record Entry Event First (satisfying foreign key for session)
        db.prepare(
          `INSERT INTO attendance_events (
            id, member_id, event_type, timestamp, event_date, verification_source,
            device_id, credential_id, session_id, is_corrected, raw_metadata, created_at
          ) VALUES (?, ?, 'ENTRY', ?, ?, ?, ?, ?, ?, 0, ?, ?)`
        ).run(
          eventId,
          member!.id,
          nowIso,
          todayDate,
          params.verificationSource,
          params.deviceId || null,
          credential?.id || null,
          sessionId,
          params.rawMetadata ? JSON.stringify(params.rawMetadata) : null,
          nowIso
        );

        // 2. Create new session referencing eventId
        db.prepare(
          `INSERT INTO attendance_sessions (
            id, member_id, session_date, entry_event_id, entry_time, status, is_overnight, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', 0, ?, ?)`
        ).run(sessionId, member!.id, todayDate, eventId, nowIso, nowIso, nowIso);

        // 3. Update Member Presence
        db.prepare(
          `UPDATE members 
           SET is_inside = 1, current_session_id = ?, last_entry_time = ?, updated_at = ?
           WHERE id = ?`
        ).run(sessionId, nowIso, nowIso, member!.id);

        sessionRecord = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(sessionId) as AttendanceSession;
      } else {
        // Process Exit
        const entryTime = member!.last_entry_time || nowIso;
        const durationMins = calculateDurationMinutes(entryTime, nowIso);

        // Record Exit Event
        db.prepare(
          `INSERT INTO attendance_events (
            id, member_id, event_type, timestamp, event_date, verification_source,
            device_id, credential_id, session_id, is_corrected, raw_metadata, created_at
          ) VALUES (?, ?, 'EXIT', ?, ?, ?, ?, ?, ?, 0, ?, ?)`
        ).run(
          eventId,
          member!.id,
          nowIso,
          todayDate,
          params.verificationSource,
          params.deviceId || null,
          credential?.id || null,
          currentSessionId,
          params.rawMetadata ? JSON.stringify(params.rawMetadata) : null,
          nowIso
        );

        // Close Active Session if exists
        if (currentSessionId) {
          db.prepare(
            `UPDATE attendance_sessions 
             SET exit_event_id = ?, exit_time = ?, duration_minutes = ?, status = 'COMPLETED', updated_at = ?
             WHERE id = ?`
          ).run(eventId, nowIso, durationMins, nowIso, currentSessionId);

          sessionRecord = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(currentSessionId) as AttendanceSession;
        }

        // Update Member Presence to Outside
        db.prepare(
          `UPDATE members 
           SET is_inside = 0, current_session_id = NULL, last_exit_time = ?, updated_at = ?
           WHERE id = ?`
        ).run(nowIso, nowIso, member!.id);
      }

      // Update Device Last Successful Scan
      if (params.deviceId) {
        db.prepare('UPDATE devices SET last_successful_scan_at = ?, last_seen_at = ? WHERE id = ?').run(
          nowIso,
          nowIso,
          params.deviceId
        );
      }

      const createdEvent = db.prepare('SELECT * FROM attendance_events WHERE id = ?').get(eventId) as AttendanceEvent;
      const updatedMember = db.prepare('SELECT * FROM members WHERE id = ?').get(member!.id) as Member;

      return {
        action: targetAction,
        event: createdEvent,
        session: sessionRecord,
        member: updatedMember,
      };
    });

    const result = transaction();

    return {
      success: true,
      action: result.action,
      member: {
        id: result.member.id,
        fullName: result.member.full_name,
        department: result.member.department,
        academicYear: result.member.academic_year,
        category: result.member.category,
        photoUrl: result.member.photo_url,
        isInside: result.member.is_inside === 1,
      },
      event: result.event,
      session: result.session,
      message:
        result.action === 'ENTRY'
          ? `Welcome to RLR, ${result.member.full_name}! Entry successfully recorded.`
          : `Goodbye, ${result.member.full_name}! Exit successfully recorded.`,
    };
  }

  /**
   * Manual Attendance Correction by an Authorized Admin or Coordinator
   */
  static manualCorrection(params: {
    memberId: string;
    action: 'FORCE_ENTRY' | 'FORCE_EXIT';
    reason: string;
    adminUserId: string;
    adminUsername: string;
  }): ScanProcessingResult {
    const db = getDb();
    const nowIso = getCurrentTimestamp();
    const todayDate = getZonedDateString();

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(params.memberId) as Member | undefined;
    if (!member) {
      return { success: false, errorCode: 'NOT_FOUND', message: 'Member not found.' };
    }

    const transaction = db.transaction(() => {
      const eventId = `EVT-MAN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      if (params.action === 'FORCE_ENTRY') {
        const sessionId = `SES-MAN-${Date.now()}`;

        db.prepare(
          `INSERT INTO attendance_events (
            id, member_id, event_type, timestamp, event_date, verification_source,
            session_id, is_corrected, corrected_by_user_id, correction_reason, notes, created_at
          ) VALUES (?, ?, 'ENTRY', ?, ?, 'MANUAL_ADMIN', ?, 1, ?, ?, ?, ?)`
        ).run(
          eventId,
          member.id,
          nowIso,
          todayDate,
          sessionId,
          params.adminUserId,
          params.reason,
          `Admin Override: ${params.reason}`,
          nowIso
        );

        db.prepare(
          `INSERT INTO attendance_sessions (
            id, member_id, session_date, entry_event_id, entry_time, status, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`
        ).run(sessionId, member.id, todayDate, eventId, nowIso, `Manual Entry: ${params.reason}`, nowIso, nowIso);

        db.prepare(
          `UPDATE members SET is_inside = 1, current_session_id = ?, last_entry_time = ?, updated_at = ? WHERE id = ?`
        ).run(sessionId, nowIso, nowIso, member.id);
      } else {
        // FORCE_EXIT
        const currentSessionId = member.current_session_id;
        const entryTime = member.last_entry_time || nowIso;
        const durationMins = calculateDurationMinutes(entryTime, nowIso);

        db.prepare(
          `INSERT INTO attendance_events (
            id, member_id, event_type, timestamp, event_date, verification_source,
            session_id, is_corrected, corrected_by_user_id, correction_reason, notes, created_at
          ) VALUES (?, ?, 'EXIT', ?, ?, 'MANUAL_ADMIN', ?, 1, ?, ?, ?, ?)`
        ).run(
          eventId,
          member.id,
          nowIso,
          todayDate,
          currentSessionId,
          params.adminUserId,
          params.reason,
          `Admin Manual Exit: ${params.reason}`,
          nowIso
        );

        if (currentSessionId) {
          db.prepare(
            `UPDATE attendance_sessions 
             SET exit_event_id = ?, exit_time = ?, duration_minutes = ?, status = 'MANUALLY_CLOSED', notes = ?, updated_at = ?
             WHERE id = ?`
          ).run(eventId, nowIso, durationMins, `Closed by admin: ${params.reason}`, nowIso, currentSessionId);
        }

        db.prepare(
          `UPDATE members SET is_inside = 0, current_session_id = NULL, last_exit_time = ?, updated_at = ? WHERE id = ?`
        ).run(nowIso, nowIso, member.id);
      }

      // Record in Audit Log
      const auditId = `AUD-${Date.now()}`;
      db.prepare(
        `INSERT INTO audit_logs (id, user_id, username, action, target_type, target_id, details, timestamp)
         VALUES (?, ?, ?, 'ATTENDANCE_CORRECTED', 'ATTENDANCE', ?, ?, ?)`
      ).run(
        auditId,
        params.adminUserId,
        params.adminUsername,
        member.id,
        JSON.stringify({
          action: params.action,
          reason: params.reason,
          previousIsInside: member.is_inside,
          newIsInside: params.action === 'FORCE_ENTRY' ? 1 : 0,
        }),
        nowIso
      );

      const updatedMember = db.prepare('SELECT * FROM members WHERE id = ?').get(member.id) as Member;
      const createdEvent = db.prepare('SELECT * FROM attendance_events WHERE id = ?').get(eventId) as AttendanceEvent;

      return {
        member: updatedMember,
        event: createdEvent,
      };
    });

    const res = transaction();

    return {
      success: true,
      action: params.action === 'FORCE_ENTRY' ? 'ENTRY' : 'EXIT',
      member: {
        id: res.member.id,
        fullName: res.member.full_name,
        department: res.member.department,
        academicYear: res.member.academic_year,
        category: res.member.category,
        photoUrl: res.member.photo_url,
        isInside: res.member.is_inside === 1,
      },
      event: res.event,
      message: `Manual ${params.action === 'FORCE_ENTRY' ? 'Entry' : 'Exit'} recorded successfully with audit trace.`,
    };
  }
}
