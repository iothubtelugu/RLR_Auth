# Robotics Lab of RKV (RLR) — Smart Entry & Attendance Management System

A production-oriented full-stack web application and biometric kiosk designed for **Robotics Lab of RKV (RLR)** to manage lab entry and exit, fingerprint-based attendance, real-time occupancy monitoring, member records, paired session logs, and system hardware telemetry.

---

## 1. System Architecture & Features

```
+-----------------------------------------------------------------------------------+
|                           ROBOTICS LAB OF RKV (RLR)                               |
+-----------------------------------------+-----------------------------------------+
|        Administrative Web Portal        |         Entrance Touchscreen Kiosk      |
|  - Dashboard & Activity Histograms      |  - Large interactive fingerprint sensor |
|  - Real-time "Currently Inside" Monitor |  - Live occupancy counter               |
|  - Filterable Attendance Log & Sessions |  - Instant visual feedback on scan      |
|  - Member Directory & CSV Import/Export |  - Welcome / Goodbye chime feedback     |
|  - Fingerprint Enrollment Workflow      |  - Duplicate scan cooldown (15s)        |
|  - Hardware Device Telemetry & Console  |  - Inactive/unregistered denial         |
|  - Settings & Tamper-Evident Audit Logs |  - Built-in Simulation Quick Drawer     |
+-----------------------------------------+-----------------------------------------+
                                          |
                      Next.js 14 App Router (Full Stack)
                      - SQLite (WAL mode, foreign keys, transactional integrity)
                      - PostgreSQL production migration scripts included
                      - Modular Biometric Adapter (Demo Simulator & Hardware Bridge)
                                          |
                  +-----------------------+-----------------------+
                  |                                               |
        Virtual Biometric Adapter                   Local Hardware Agent Bridge
        (Development & Testing)                     (Port 8080 WebSocket & REST)
        - Opaque biometric tokens                   - Mantra MFS100 / MFS500
        - Realistic minutiae quality                - DigitalPersona 4500 / 5160
        - Tagged as FINGERPRINT_DEMO                - SecuGen Hamster Pro 20
                                                    - AS608 / R307 UART Serial
```

### Key Questions Answered Instantly
- **Who is currently inside the lab?** -> Viewable on the Dashboard, Top Navigation Pill, Kiosk, and dedicated `/currently-inside` page with dynamically updating durations.
- **Who entered or exited today?** -> Live activity feed on Dashboard and searchable `/attendance` log.
- **What time did each member enter and leave?** -> Recorded in `Asia/Kolkata` (IST) timestamp format.
- **How many members visited today?** -> Computed live from recorded events.
- **Is the fingerprint reader connected?** -> Live device telemetry indicator in the header and `/devices` console.
- **Can errors be corrected?** -> Authorized administrators can record manual entry/exit corrections with a mandatory reason and immutable audit log.

---

## 2. Visual Design System

Built strictly following the RLR design specifications:

| Element | Color Hex | Purpose |
| :--- | :--- | :--- |
| **Main Background** | `#F4FBFF` | Soft, clean, technology-focused light canvas |
| **Card Background** | `#FFFFFF` | High-contrast card surfaces with subtle borders |
| **Primary Navy** | `#073B8C` | Brand identity, primary buttons, headers |
| **Secondary Blue** | `#1677C8` | Navigation highlights, secondary actions, chart lines |
| **Accent Cyan** | `#00A9E8` | Tech accents, laser scanning beams, active indicators |
| **Highlight Yellow** | `#FFD21C` | Robotics badge highlights, occupancy badges |
| **Primary Text** | `#172B4D` | Deep slate high-contrast typography |
| **Secondary Text** | `#64748B` | Subtitles, labels, metadata |
| **Border** | `#E2EAF2` | Subtle card borders |
| **Success / Entry** | `#16A34A` | Verified check-in events, active devices |
| **Warning / Cooldown** | `#F59E0B` | Cooldown notifications, demo mode indicators |
| **Error / Denied** | `#DC2626` | Inactive member access denied, unverified scans |

---

## 3. Quick Start & Installation

### Prerequisites
- Node.js `v18+` or `v20+` (tested and verified on Node `v24.14.0`)
- npm `v9+` or `v11+`

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Initialize Database
```bash
npm run db:seed
```
This initializes the SQLite database at `data/rlr_attendance.db` with roles, administrator credentials, system settings, devices, realistic members, and active attendance sessions.

### Step 3: Run the Development Server
```bash
npm run dev
```
Open **[http://localhost:3001](http://localhost:3001)** in your browser.

*(To build for production, run `npm run build` and `npm run start`)*.

---

## 4. Default User Accounts (RBAC)

The application includes role-based access control with secure bcrypt password hashing and HTTP-only JWT session cookies:

| Role | Username | Password | Accessible Capabilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Full control: Members CRUD, settings, device management, attendance corrections, database reset, audit logs |
| **Lab Coordinator** | `coordinator` | `coord123` | Occupancy, member management, manual attendance corrections, reports |
| **Kiosk Operator** | `operator` | `operator123` | Entrance kiosk operations, check-in/check-out monitoring |

*(Quick-login buttons are provided on `/login` for evaluation convenience)*.

---

## 5. Main Application Routes

- **Dashboard** (`/`): Summary metrics, hourly histograms, weekly trend chart, live activity stream, peak visitor rankings.
- **Currently Inside** (`/currently-inside`): Real-time lab occupancy with dynamic elapsed time tickers, multi-attribute filtering, CSV export, and administrative manual exit modal.
- **Entrance Kiosk** (`/kiosk`): Dedicated full-screen kiosk with laser-animated biometric scanner, real-time scan feedback, occupancy counter, and quick testing drawer.
- **Attendance Log** (`/attendance`): Filterable events log and paired sessions view, formula-injection-safe CSV export, and printable A4 lab log.
- **Members Directory** (`/members`): Member CRUD, guided 3-touch fingerprint enrollment workflow, CSV bulk import with duplicate detection, CSV export, and individual profile history drawers.
- **Fingerprint Devices** (`/devices`): Device telemetry, mode toggle (Demo Simulator vs Physical Hardware Agent), connectivity probe, and live diagnostic console.
- **Settings** (`/settings`): Lab identity, duplicate cooldown rules, device settings, RBAC matrix, database snapshot export, and database reset.
- **Audit Trail** (`/audit`): Tamper-evident log of all manual overrides, setting changes, member edits, and credential enrollments.

---

## 6. Biometric Fingerprint Integration & Kiosk Rules

### State Machine Rules
1. **Entry / Exit Toggle**: If an authorized member is outside (`is_inside === 0`), scanning records `ENTRY`. If already inside (`is_inside === 1`), scanning records `EXIT`.
2. **Duplicate Cooldown**: Repeated scans within 15 seconds (configurable) are rejected with a clear message: `"Scan ignored: Repeated scan detected. Please wait X seconds before scanning again."`
3. **Transactional Safety**: State transitions run inside SQLite transactions (`db.transaction`) to prevent concurrency races.
4. **Inactive Denial**: Members with `INACTIVE` or `SUSPENDED` status are denied entry with an amber warning.
5. **No Raw Biometrics**: Fingerprint images are **never** stored unencrypted. Only opaque credential references (e.g. `FP-RLR-2024-001`) are saved.

### Hardware Agent Bridge
For physical USB scanners (Mantra MFS100, DigitalPersona 4500, SecuGen, or Arduino/ESP32 Optical R307 UART), a standalone daemon is located in `hardware-agent/`:
```bash
cd hardware-agent
npm install
npm start
```
See **[HARDWARE_INTEGRATION_GUIDE.md](./HARDWARE_INTEGRATION_GUIDE.md)** for detailed wiring, drivers, SDK configurations, and WebSocket event protocols.

---

## 7. Automated Testing Suite

Run the full automated test suite with Vitest:
```bash
npm test
```
**Tests cover:**
- Entry transition when outside
- Exit transition when inside
- Duplicate scan cooldown rejection
- Unknown fingerprint credential rejection
- Inactive member access denial
- Administrative manual exit correction and audit log creation
- CSV formula injection sanitization (`=`, `+`, `-`, `@`)
- RFC 4180 CSV export generation
- Dynamic elapsed duration formatting
- RBAC permission checks across roles

---

## 8. PostgreSQL Production Deployment

For production deployments using PostgreSQL rather than embedded SQLite, run the provided migration script:
```bash
psql -U postgres -d rlr_attendance -f migrations/001_initial_schema.sql
```
Update `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/rlr_attendance"
```
