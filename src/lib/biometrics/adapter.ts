export type VerificationSource = 'FINGERPRINT_HARDWARE' | 'FINGERPRINT_DEMO' | 'MANUAL_ADMIN';

export interface DeviceStatusInfo {
  connected: boolean;
  isDemo: boolean;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'DEMO';
  deviceName: string;
  manufacturer: string;
  model: string;
  connectionType: 'WEBSOCKET_AGENT' | 'WEBUSB' | 'SERIAL' | 'DEMO_ADAPTER';
  firmwareVersion: string | null;
  lastHeartbeat: string | null;
  lastSuccessfulScan: string | null;
  errorMessage?: string | null;
}

export interface FingerprintScanResult {
  success: boolean;
  credentialReference?: string;
  memberId?: string;
  qualityScore?: number;
  verificationSource: VerificationSource;
  isDemo: boolean;
  errorMessage?: string;
  errorCode?: 'NOT_DETECTED' | 'POOR_QUALITY' | 'NO_MATCH' | 'DEVICE_DISCONNECTED' | 'TIMEOUT';
  metadata?: Record<string, any>;
}

export interface EnrollmentCaptureResult {
  success: boolean;
  credentialReference?: string;
  fingerPosition: string;
  qualityScore: number;
  sampleCount: number;
  verificationSource: VerificationSource;
  errorMessage?: string;
}

export interface FingerprintAdapter {
  id: string;
  name: string;
  mode: 'demo' | 'hardware';
  getStatus(): Promise<DeviceStatusInfo>;
  scan(timeoutMs?: number): Promise<FingerprintScanResult>;
  enroll(fingerPosition: string): Promise<EnrollmentCaptureResult>;
  testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }>;
}
