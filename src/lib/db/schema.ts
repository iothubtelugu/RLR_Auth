export interface User {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  email: string | null;
  role: 'ADMIN' | 'COORDINATOR' | 'OPERATOR' | 'MEMBER';
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string; // JSON array of string permissions
}

export interface Member {
  id: string; // e.g. RLR-2024-001
  full_name: string;
  email: string | null;
  phone: string | null;
  department: string;
  academic_year: string;
  roll_number: string | null;
  category: 'Student Member' | 'Robotics Lab Coordinator' | 'Club Core Team' | 'Faculty Supervisor' | 'Administrator';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  photo_url: string | null;
  is_inside: number; // 0 or 1
  current_session_id: string | null;
  last_entry_time: string | null;
  last_exit_time: string | null;
  registration_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BiometricCredential {
  id: string;
  member_id: string;
  device_id: string | null;
  credential_reference: string; // Opaque hardware token, e.g. "FP-REF-RLR-001"
  finger_position: string;
  quality_score: number;
  is_revoked: number;
  enrolled_by_user_id: string | null;
  enrolled_at: string;
  revoked_at: string | null;
  revoked_reason: string | null;
}

export interface Device {
  id: string;
  device_name: string;
  manufacturer: string;
  model: string;
  connection_type: 'WEBSOCKET_AGENT' | 'WEBUSB' | 'SERIAL' | 'DEMO_ADAPTER';
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'DEMO';
  last_seen_at: string | null;
  last_successful_scan_at: string | null;
  ip_or_port: string | null;
  firmware_version: string | null;
  is_demo: number;
  notes: string | null;
  created_at: string;
}

export interface AttendanceEvent {
  id: string;
  member_id: string;
  event_type: 'ENTRY' | 'EXIT';
  timestamp: string; // ISO 8601 string
  event_date: string; // YYYY-MM-DD in Asia/Kolkata
  verification_source: 'FINGERPRINT_HARDWARE' | 'FINGERPRINT_DEMO' | 'MANUAL_ADMIN';
  device_id: string | null;
  credential_id: string | null;
  session_id: string | null;
  is_corrected: number;
  corrected_by_user_id: string | null;
  correction_reason: string | null;
  notes: string | null;
  raw_metadata: string | null; // JSON
  created_at: string;
}

export interface AttendanceSession {
  id: string;
  member_id: string;
  session_date: string; // YYYY-MM-DD
  entry_event_id: string;
  entry_time: string;
  exit_event_id: string | null;
  exit_time: string | null;
  duration_minutes: number | null;
  status: 'ACTIVE' | 'COMPLETED' | 'MANUALLY_CLOSED' | 'OVERNIGHT_EXPIRED';
  is_overnight: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemSetting {
  key: string;
  value: string; // JSON string
  description: string | null;
  updated_at: string;
  updated_by_user_id: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  username: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: string; // JSON string with previous/new state, reasons, IP
  timestamp: string;
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK(role IN ('ADMIN', 'COORDINATOR', 'OPERATOR', 'MEMBER')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  roll_number TEXT,
  category TEXT NOT NULL CHECK(category IN ('Student Member', 'Robotics Lab Coordinator', 'Club Core Team', 'Faculty Supervisor', 'Administrator')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  photo_url TEXT,
  is_inside INTEGER NOT NULL DEFAULT 0,
  current_session_id TEXT,
  last_entry_time TEXT,
  last_exit_time TEXT,
  registration_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  device_name TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  connection_type TEXT NOT NULL CHECK(connection_type IN ('WEBSOCKET_AGENT', 'WEBUSB', 'SERIAL', 'DEMO_ADAPTER')),
  status TEXT NOT NULL DEFAULT 'DEMO' CHECK(status IN ('ONLINE', 'OFFLINE', 'ERROR', 'DEMO')),
  last_seen_at TEXT,
  last_successful_scan_at TEXT,
  ip_or_port TEXT,
  firmware_version TEXT,
  is_demo INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS biometric_credentials (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  device_id TEXT REFERENCES devices(id),
  credential_reference TEXT UNIQUE NOT NULL,
  finger_position TEXT DEFAULT 'RIGHT_INDEX',
  quality_score INTEGER DEFAULT 95,
  is_revoked INTEGER NOT NULL DEFAULT 0,
  enrolled_by_user_id TEXT REFERENCES users(id),
  enrolled_at TEXT NOT NULL,
  revoked_at TEXT,
  revoked_reason TEXT
);

CREATE TABLE IF NOT EXISTS attendance_events (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id),
  event_type TEXT NOT NULL CHECK(event_type IN ('ENTRY', 'EXIT')),
  timestamp TEXT NOT NULL,
  event_date TEXT NOT NULL,
  verification_source TEXT NOT NULL CHECK(verification_source IN ('FINGERPRINT_HARDWARE', 'FINGERPRINT_DEMO', 'MANUAL_ADMIN')),
  device_id TEXT REFERENCES devices(id),
  credential_id TEXT REFERENCES biometric_credentials(id),
  session_id TEXT,
  is_corrected INTEGER NOT NULL DEFAULT 0,
  corrected_by_user_id TEXT REFERENCES users(id),
  correction_reason TEXT,
  notes TEXT,
  raw_metadata TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id),
  session_date TEXT NOT NULL,
  entry_event_id TEXT NOT NULL REFERENCES attendance_events(id),
  entry_time TEXT NOT NULL,
  exit_event_id TEXT REFERENCES attendance_events(id),
  exit_time TEXT,
  duration_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'COMPLETED', 'MANUALLY_CLOSED', 'OVERNIGHT_EXPIRED')),
  is_overnight INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT NOT NULL,
  updated_by_user_id TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  username TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

-- Essential Performance & Integrity Indexes
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_is_inside ON members(is_inside);
CREATE INDEX IF NOT EXISTS idx_members_dept ON members(department);
CREATE INDEX IF NOT EXISTS idx_attendance_events_member_id ON attendance_events(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_events_timestamp ON attendance_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_attendance_events_date ON attendance_events(event_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_member_date ON attendance_sessions(member_id, session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_status ON attendance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_biometrics_member_id ON biometric_credentials(member_id);
CREATE INDEX IF NOT EXISTS idx_biometrics_cred_ref ON biometric_credentials(credential_reference);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
`;
