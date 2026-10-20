-- ============================================================================
-- Robotics Lab of RKV (RLR) — Smart Entry & Attendance Management System
-- PostgreSQL Production Database Migration Script
-- Version: 001_initial_schema.sql
-- ============================================================================

-- Create Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: users (Administrators, Coordinators, Operators)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(128) NOT NULL,
  email VARCHAR(128),
  role VARCHAR(32) NOT NULL CHECK(role IN ('ADMIN', 'COORDINATOR', 'OPERATOR', 'MEMBER')),
  is_active SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: roles
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(64) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Table: members
CREATE TABLE IF NOT EXISTS members (
  id VARCHAR(64) PRIMARY KEY, -- e.g. RLR-2024-001
  full_name VARCHAR(128) NOT NULL,
  email VARCHAR(128),
  phone VARCHAR(32),
  department VARCHAR(64) NOT NULL,
  academic_year VARCHAR(32) NOT NULL,
  roll_number VARCHAR(64),
  category VARCHAR(64) NOT NULL CHECK(category IN ('Student Member', 'Robotics Lab Coordinator', 'Club Core Team', 'Faculty Supervisor', 'Administrator')),
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  photo_url TEXT,
  is_inside SMALLINT NOT NULL DEFAULT 0,
  current_session_id VARCHAR(64),
  last_entry_time TIMESTAMPTZ,
  last_exit_time TIMESTAMPTZ,
  registration_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: devices
CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(64) PRIMARY KEY,
  device_name VARCHAR(128) NOT NULL,
  manufacturer VARCHAR(64) NOT NULL,
  model VARCHAR(64) NOT NULL,
  connection_type VARCHAR(32) NOT NULL CHECK(connection_type IN ('WEBSOCKET_AGENT', 'WEBUSB', 'SERIAL', 'DEMO_ADAPTER')),
  status VARCHAR(32) NOT NULL DEFAULT 'DEMO' CHECK(status IN ('ONLINE', 'OFFLINE', 'ERROR', 'DEMO')),
  last_seen_at TIMESTAMPTZ,
  last_successful_scan_at TIMESTAMPTZ,
  ip_or_port VARCHAR(64),
  firmware_version VARCHAR(64),
  is_demo SMALLINT NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: biometric_credentials
CREATE TABLE IF NOT EXISTS biometric_credentials (
  id VARCHAR(64) PRIMARY KEY,
  member_id VARCHAR(64) NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  device_id VARCHAR(64) REFERENCES devices(id),
  credential_reference VARCHAR(128) UNIQUE NOT NULL,
  finger_position VARCHAR(32) DEFAULT 'RIGHT_INDEX',
  quality_score INT DEFAULT 95,
  is_revoked SMALLINT NOT NULL DEFAULT 0,
  enrolled_by_user_id VARCHAR(64) REFERENCES users(id),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT
);

-- Table: attendance_events
CREATE TABLE IF NOT EXISTS attendance_events (
  id VARCHAR(64) PRIMARY KEY,
  member_id VARCHAR(64) NOT NULL REFERENCES members(id),
  event_type VARCHAR(16) NOT NULL CHECK(event_type IN ('ENTRY', 'EXIT')),
  timestamp TIMESTAMPTZ NOT NULL,
  event_date DATE NOT NULL,
  verification_source VARCHAR(32) NOT NULL CHECK(verification_source IN ('FINGERPRINT_HARDWARE', 'FINGERPRINT_DEMO', 'MANUAL_ADMIN')),
  device_id VARCHAR(64) REFERENCES devices(id),
  credential_id VARCHAR(64) REFERENCES biometric_credentials(id),
  session_id VARCHAR(64),
  is_corrected SMALLINT NOT NULL DEFAULT 0,
  corrected_by_user_id VARCHAR(64) REFERENCES users(id),
  correction_reason TEXT,
  notes TEXT,
  raw_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: attendance_sessions
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id VARCHAR(64) PRIMARY KEY,
  member_id VARCHAR(64) NOT NULL REFERENCES members(id),
  session_date DATE NOT NULL,
  entry_event_id VARCHAR(64) NOT NULL REFERENCES attendance_events(id),
  entry_time TIMESTAMPTZ NOT NULL,
  exit_event_id VARCHAR(64) REFERENCES attendance_events(id),
  exit_time TIMESTAMPTZ,
  duration_minutes INT,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'COMPLETED', 'MANUALLY_CLOSED', 'OVERNIGHT_EXPIRED')),
  is_overnight SMALLINT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(64) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by_user_id VARCHAR(64)
);

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id),
  username VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(64) NOT NULL,
  target_id VARCHAR(64),
  details JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_is_inside ON members(is_inside);
CREATE INDEX IF NOT EXISTS idx_members_dept ON members(department);
CREATE INDEX IF NOT EXISTS idx_attendance_events_member ON attendance_events(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_events_ts ON attendance_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_attendance_events_date ON attendance_events(event_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_member_date ON attendance_sessions(member_id, session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_status ON attendance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_biometrics_member ON biometric_credentials(member_id);
CREATE INDEX IF NOT EXISTS idx_biometrics_cred_ref ON biometric_credentials(credential_reference);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
