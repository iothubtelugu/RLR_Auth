import bcrypt from 'bcryptjs';
import { getDb } from './index';
import { getCurrentTimestamp, getZonedDateString } from '../utils/timezone';

export async function seedDatabase(): Promise<{ success: boolean; message: string }> {
  const db = getDb();
  const now = getCurrentTimestamp();
  const today = getZonedDateString();

  console.log('🌱 Initializing Robotics Lab of RKV (RLR) database seed...');

  // Reset existing tables in reverse dependency order
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM attendance_sessions;
    DELETE FROM attendance_events;
    DELETE FROM biometric_credentials;
    DELETE FROM devices;
    DELETE FROM members;
    DELETE FROM system_settings;
    DELETE FROM roles;
    DELETE FROM users;
  `);

  // 1. Roles
  const roles = [
    {
      id: 'role-admin',
      name: 'ADMIN',
      description: 'System Administrator with full access',
      permissions: JSON.stringify(['ALL', 'MANAGE_MEMBERS', 'MANAGE_DEVICES', 'CORRECT_ATTENDANCE', 'MANAGE_SETTINGS', 'VIEW_AUDIT_LOGS', 'SCAN_KIOSK']),
    },
    {
      id: 'role-coord',
      name: 'COORDINATOR',
      description: 'Lab Coordinator with attendance and member management',
      permissions: JSON.stringify(['MANAGE_MEMBERS', 'CORRECT_ATTENDANCE', 'VIEW_AUDIT_LOGS', 'SCAN_KIOSK']),
    },
    {
      id: 'role-oper',
      name: 'OPERATOR',
      description: 'Entrance kiosk operator',
      permissions: JSON.stringify(['SCAN_KIOSK']),
    },
  ];

  const insertRole = db.prepare('INSERT INTO roles (id, name, description, permissions) VALUES (?, ?, ?, ?)');
  roles.forEach((r) => insertRole.run(r.id, r.name, r.description, r.permissions));

  // 2. Default Users
  const adminHash = await bcrypt.hash('admin123', 10);
  const coordHash = await bcrypt.hash('coord123', 10);
  const operHash = await bcrypt.hash('operator123', 10);

  const insertUser = db.prepare(
    'INSERT INTO users (id, username, password_hash, full_name, email, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)'
  );

  insertUser.run('usr-admin-01', 'admin', adminHash, 'Prof. S. R. Murthy', 'admin@rlr-rkv.edu.in', 'ADMIN', now, now);
  insertUser.run('usr-coord-01', 'coordinator', coordHash, 'Aarav Sharma (Head Coord)', 'aarav@rlr-rkv.edu.in', 'COORDINATOR', now, now);
  insertUser.run('usr-oper-01', 'operator', operHash, 'Kiosk Security Operator', 'kiosk@rlr-rkv.edu.in', 'OPERATOR', now, now);

  // 3. System Settings
  const insertSetting = db.prepare(
    'INSERT INTO system_settings (key, value, description, updated_at, updated_by_user_id) VALUES (?, ?, ?, ?, ?)'
  );

  const defaultSettings: Array<[string, any, string]> = [
    ['lab_name', 'Robotics Lab of RKV (RLR)', 'Name of the laboratory'],
    ['organization_name', 'RGUKT RK Valley', 'Parent educational institution'],
    ['campus_location', 'Academic Block II, Ground Floor Lab 104', 'Physical lab location'],
    ['timezone', 'Asia/Kolkata', 'System default timezone'],
    ['duplicate_cooldown_seconds', 15, 'Seconds to ignore repeated finger scans'],
    ['session_overnight_hours_limit', 12, 'Maximum session duration before flagging overnight exception'],
    ['fingerprint_mode', 'demo', 'Mode: demo or hardware'],
    ['operating_hours', { open: '08:00', close: '22:00' }, 'Daily lab access hours'],
  ];

  defaultSettings.forEach(([k, v, desc]) => {
    insertSetting.run(k, JSON.stringify(v), desc, now, 'usr-admin-01');
  });

  // 4. Devices
  const insertDevice = db.prepare(
    `INSERT INTO devices (id, device_name, manufacturer, model, connection_type, status, last_seen_at, last_successful_scan_at, ip_or_port, firmware_version, is_demo, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  insertDevice.run(
    'dev-rlr-demo-01',
    'RLR Virtual Fingerprint Simulator',
    'RLR Embedded Labs',
    'Biometric-Sim-v1.0',
    'DEMO_ADAPTER',
    'DEMO',
    now,
    now,
    'localhost:demo',
    'v1.0-demo',
    1,
    'Development and test simulation adapter with realistic matching and state verification.',
    now
  );

  insertDevice.run(
    'dev-rlr-kiosk-01',
    'Entrance Kiosk Reader (Hardware Agent Bridge)',
    'Mantra / DigitalPersona',
    'MFS100 / U.are.U 4500 USB',
    'WEBSOCKET_AGENT',
    'ONLINE',
    now,
    now,
    'ws://localhost:8080/fingerprint',
    'v2.4-mfs',
    0,
    'Physical optical fingerprint scanner connected via local hardware agent bridge.',
    now
  );

  insertDevice.run(
    'dev-rlr-esp32-01',
    'RLR Door Access Node (ESP32 + R307/AS608)',
    'Espressif / Synochip',
    'ESP32-WROOM-32 + R307 Optical Sensor',
    'SERIAL',
    'ONLINE',
    now,
    now,
    '192.168.1.105:3001',
    'v1.2.0-esp32',
    0,
    'Standalone Wi-Fi & Serial biometric terminal mounted at laboratory entrance door.',
    now
  );

  // 5. Members
  const insertMember = db.prepare(
    `INSERT INTO members (id, full_name, email, phone, department, academic_year, roll_number, category, status, photo_url, is_inside, current_session_id, last_entry_time, last_exit_time, registration_date, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const membersData = [
    {
      id: 'RLR-2024-001',
      name: 'Aarav Sharma',
      email: 'aarav.ece@rguktrkv.ac.in',
      phone: '+91 98765 43210',
      dept: 'ECE',
      year: 'Year 4',
      roll: 'R190101',
      cat: 'Robotics Lab Coordinator',
      status: 'ACTIVE',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      isInside: 1, // Currently Inside!
      notes: 'Lead autonomous rover team; Drone navigation project coordinator.',
    },
    {
      id: 'RLR-2024-002',
      name: 'Priya Varma',
      email: 'priya.cse@rguktrkv.ac.in',
      phone: '+91 98765 43211',
      dept: 'CSE',
      year: 'Year 3',
      roll: 'R200214',
      cat: 'Club Core Team',
      status: 'ACTIVE',
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      isInside: 1, // Currently Inside!
      notes: 'ROS2 and Computer Vision pipeline lead.',
    },
    {
      id: 'RLR-2024-003',
      name: 'Rohit Reddy',
      email: 'rohit.mech@rguktrkv.ac.in',
      phone: '+91 98765 43212',
      dept: 'Mechanical',
      year: 'Year 2',
      roll: 'R210345',
      cat: 'Student Member',
      status: 'ACTIVE',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      isInside: 1, // Currently Inside!
      notes: '3D printing and robotic arm kinematics fabrication.',
    },
    {
      id: 'RLR-2024-004',
      name: 'Dr. K. Ramanathan',
      email: 'ramanathan.faculty@rguktrkv.ac.in',
      phone: '+91 98765 43213',
      dept: 'ECE',
      year: 'Faculty',
      roll: 'FAC-ECE-08',
      cat: 'Faculty Supervisor',
      status: 'ACTIVE',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      isInside: 0,
      notes: 'Faculty mentor for humanoid robotics and grant advisor.',
    },
    {
      id: 'RLR-2024-005',
      name: 'Sneha Patel',
      email: 'sneha.cse@rguktrkv.ac.in',
      phone: '+91 98765 43214',
      dept: 'CSE',
      year: 'Year 2',
      roll: 'R210450',
      cat: 'Student Member',
      status: 'ACTIVE',
      photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      isInside: 0,
      notes: 'Embedded IoT sensor telemetry developer.',
    },
    {
      id: 'RLR-2024-006',
      name: 'Vikram Rao',
      email: 'vikram.ece@rguktrkv.ac.in',
      phone: '+91 98765 43215',
      dept: 'ECE',
      year: 'Year 3',
      roll: 'R200388',
      cat: 'Club Core Team',
      status: 'ACTIVE',
      photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      isInside: 0,
      notes: 'LiDAR mapping and SLAM algorithms team.',
    },
    {
      id: 'RLR-2024-007',
      name: 'Ananya Das',
      email: 'ananya.eee@rguktrkv.ac.in',
      phone: '+91 98765 43216',
      dept: 'EEE',
      year: 'Year 2',
      roll: 'R210512',
      cat: 'Student Member',
      status: 'ACTIVE',
      photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      isInside: 0,
      notes: 'Motor drivers and power distribution design.',
    },
    {
      id: 'RLR-2024-008',
      name: 'Karthik Nair',
      email: 'karthik.mech@rguktrkv.ac.in',
      phone: '+91 98765 43217',
      dept: 'Mechanical',
      year: 'Year 3',
      roll: 'R200670',
      cat: 'Student Member',
      status: 'ACTIVE',
      photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
      isInside: 0,
      notes: 'Chassis design and CNC machining expert.',
    },
    {
      id: 'RLR-2024-009',
      name: 'Meera Iyer',
      email: 'meera.cse@rguktrkv.ac.in',
      phone: '+91 98765 43218',
      dept: 'CSE',
      year: 'Year 4',
      roll: 'R190772',
      cat: 'Robotics Lab Coordinator',
      status: 'ACTIVE',
      photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      isInside: 0,
      notes: 'Lab inventory coordinator and embedded Linux specialist.',
    },
    {
      id: 'RLR-2024-010',
      name: 'Teja Prakash',
      email: 'teja.ece@rguktrkv.ac.in',
      phone: '+91 98765 43219',
      dept: 'ECE',
      year: 'Year 1',
      roll: 'R220199',
      cat: 'Student Member',
      status: 'INACTIVE', // Inactive member to test rejection!
      photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
      isInside: 0,
      notes: 'Membership suspended due to non-renewal of lab pass.',
    },
    {
      id: 'RLR-2024-011',
      name: 'Ritu Singh',
      email: 'ritu.cse@rguktrkv.ac.in',
      phone: '+91 98765 43220',
      dept: 'CSE',
      year: 'Year 2',
      roll: 'R210884',
      cat: 'Student Member',
      status: 'ACTIVE',
      photo: null,
      isInside: 0,
      notes: 'AI speech interaction and edge LLMs research.',
    },
    {
      id: 'RLR-2024-012',
      name: 'Sandeep Verma',
      email: 'sandeep.mech@rguktrkv.ac.in',
      phone: '+91 98765 43221',
      dept: 'Mechanical',
      year: 'Year 4',
      roll: 'R190991',
      cat: 'Club Core Team',
      status: 'ACTIVE',
      photo: null,
      isInside: 0,
      notes: 'All-Terrain mobile robot drive systems.',
    },
  ];

  // Helper date generators for today
  // Aarav entered at 09:15 AM today
  const aaravEntry = new Date();
  aaravEntry.setHours(9, 15, 0, 0);

  // Priya entered at 10:30 AM today
  const priyaEntry = new Date();
  priyaEntry.setHours(10, 30, 0, 0);

  // Rohit entered at 11:45 AM today
  const rohitEntry = new Date();
  rohitEntry.setHours(11, 45, 0, 0);

  // Earlier completed visits today: Vikram entered at 8:30 AM and exited at 10:15 AM
  const vikramEntry = new Date();
  vikramEntry.setHours(8, 30, 0, 0);
  const vikramExit = new Date();
  vikramExit.setHours(10, 15, 0, 0);

  // Sneha entered at 9:00 AM and exited at 11:00 AM
  const snehaEntry = new Date();
  snehaEntry.setHours(9, 0, 0, 0);
  const snehaExit = new Date();
  snehaExit.setHours(11, 0, 0, 0);

  membersData.forEach((m) => {
    let lastEntry = null;
    let lastExit = null;
    let currentSessionId = null;

    if (m.id === 'RLR-2024-001') {
      lastEntry = aaravEntry.toISOString();
      currentSessionId = 'SES-SEED-001';
    } else if (m.id === 'RLR-2024-002') {
      lastEntry = priyaEntry.toISOString();
      currentSessionId = 'SES-SEED-002';
    } else if (m.id === 'RLR-2024-003') {
      lastEntry = rohitEntry.toISOString();
      currentSessionId = 'SES-SEED-003';
    } else if (m.id === 'RLR-2024-006') {
      lastEntry = vikramEntry.toISOString();
      lastExit = vikramExit.toISOString();
    } else if (m.id === 'RLR-2024-005') {
      lastEntry = snehaEntry.toISOString();
      lastExit = snehaExit.toISOString();
    }

    insertMember.run(
      m.id,
      m.name,
      m.email,
      m.phone,
      m.dept,
      m.year,
      m.roll,
      m.cat,
      m.status,
      m.photo,
      m.isInside,
      currentSessionId,
      lastEntry,
      lastExit,
      '2024-01-15',
      m.notes,
      now,
      now
    );
  });

  // 6. Biometric Credentials
  const insertCred = db.prepare(
    `INSERT INTO biometric_credentials (id, member_id, device_id, credential_reference, finger_position, quality_score, is_revoked, enrolled_by_user_id, enrolled_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
  );

  membersData.forEach((m, idx) => {
    const credId = `BIO-${m.id}`;
    const credRef = `FP-${m.id}`;
    insertCred.run(credId, m.id, 'dev-rlr-kiosk-01', credRef, 'RIGHT_INDEX', 95 + (idx % 4), 'usr-admin-01', now);
  });

  // 7. Attendance Sessions & Events
  const insertEvent = db.prepare(
    `INSERT INTO attendance_events (id, member_id, event_type, timestamp, event_date, verification_source, device_id, credential_id, session_id, is_corrected, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
  );

  const insertSession = db.prepare(
    `INSERT INTO attendance_sessions (id, member_id, session_date, entry_event_id, entry_time, exit_event_id, exit_time, duration_minutes, status, is_overnight, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
  );

  // Active Session 1: Aarav
  insertEvent.run('EVT-SEED-001', 'RLR-2024-001', 'ENTRY', aaravEntry.toISOString(), today, 'FINGERPRINT_DEMO', 'dev-rlr-demo-01', 'BIO-RLR-2024-001', 'SES-SEED-001', 'Autonomous Rover testing', aaravEntry.toISOString());
  insertSession.run('SES-SEED-001', 'RLR-2024-001', today, 'EVT-SEED-001', aaravEntry.toISOString(), null, null, null, 'ACTIVE', 'Active session in progress', aaravEntry.toISOString(), aaravEntry.toISOString());

  // Active Session 2: Priya
  insertEvent.run('EVT-SEED-002', 'RLR-2024-002', 'ENTRY', priyaEntry.toISOString(), today, 'FINGERPRINT_DEMO', 'dev-rlr-demo-01', 'BIO-RLR-2024-002', 'SES-SEED-002', 'ROS2 Camera calibration', priyaEntry.toISOString());
  insertSession.run('SES-SEED-002', 'RLR-2024-002', today, 'EVT-SEED-002', priyaEntry.toISOString(), null, null, null, 'ACTIVE', 'Active session in progress', priyaEntry.toISOString(), priyaEntry.toISOString());

  // Active Session 3: Rohit
  insertEvent.run('EVT-SEED-003', 'RLR-2024-003', 'ENTRY', rohitEntry.toISOString(), today, 'FINGERPRINT_DEMO', 'dev-rlr-demo-01', 'BIO-RLR-2024-003', 'SES-SEED-003', 'Gripper assembly work', rohitEntry.toISOString());
  insertSession.run('SES-SEED-003', 'RLR-2024-003', today, 'EVT-SEED-003', rohitEntry.toISOString(), null, null, null, 'ACTIVE', 'Active session in progress', rohitEntry.toISOString(), rohitEntry.toISOString());

  // Completed Session 4: Vikram
  insertEvent.run('EVT-SEED-004', 'RLR-2024-006', 'ENTRY', vikramEntry.toISOString(), today, 'FINGERPRINT_DEMO', 'dev-rlr-demo-01', 'BIO-RLR-2024-006', 'SES-SEED-004', null, vikramEntry.toISOString());
  insertEvent.run('EVT-SEED-005', 'RLR-2024-006', 'EXIT', vikramExit.toISOString(), today, 'FINGERPRINT_DEMO', 'dev-rlr-demo-01', 'BIO-RLR-2024-006', 'SES-SEED-004', null, vikramExit.toISOString());
  insertSession.run('SES-SEED-004', 'RLR-2024-006', today, 'EVT-SEED-004', vikramEntry.toISOString(), 'EVT-SEED-005', vikramExit.toISOString(), 105, 'COMPLETED', 'Regular lab session', vikramEntry.toISOString(), vikramExit.toISOString());

  // Completed Session 5: Sneha
  insertEvent.run('EVT-SEED-006', 'RLR-2024-005', 'ENTRY', snehaEntry.toISOString(), today, 'FINGERPRINT_DEMO', 'dev-rlr-demo-01', 'BIO-RLR-2024-005', 'SES-SEED-005', null, snehaEntry.toISOString());
  insertEvent.run('EVT-SEED-007', 'RLR-2024-005', 'EXIT', snehaExit.toISOString(), today, 'FINGERPRINT_DEMO', 'dev-rlr-demo-01', 'BIO-RLR-2024-005', 'SES-SEED-005', null, snehaExit.toISOString());
  insertSession.run('SES-SEED-005', 'RLR-2024-005', today, 'EVT-SEED-006', snehaEntry.toISOString(), 'EVT-SEED-007', snehaExit.toISOString(), 120, 'COMPLETED', 'Sensor telemetry test', snehaEntry.toISOString(), snehaExit.toISOString());

  // 8. Audit Log
  const insertAudit = db.prepare(
    `INSERT INTO audit_logs (id, user_id, username, action, target_type, target_id, details, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  insertAudit.run(
    'AUD-SEED-001',
    'usr-admin-01',
    'admin',
    'DEMO_DATA_RESET',
    'SYSTEM',
    'all',
    JSON.stringify({ note: 'Initial system seeding with realistic RLR test records and active sessions' }),
    now
  );

  console.log('✅ RLR Attendance database seeded successfully!');
  return { success: true, message: 'Database initialized and seeded successfully.' };
}

// Allow CLI execution via `npm run db:seed`
if (require.main === module || process.argv[1]?.includes('seed.ts')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}
