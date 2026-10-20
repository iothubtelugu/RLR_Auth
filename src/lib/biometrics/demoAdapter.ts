import { FingerprintAdapter, DeviceStatusInfo, FingerprintScanResult, EnrollmentCaptureResult } from './adapter';

export class DemoFingerprintAdapter implements FingerprintAdapter {
  id = 'dev-rlr-demo-01';
  name = 'RLR Biometric Simulator (DEMO MODE)';
  mode: 'demo' = 'demo';
  private lastHeartbeatTime: string = new Date().toISOString();
  private lastScanTime: string | null = null;

  async getStatus(): Promise<DeviceStatusInfo> {
    this.lastHeartbeatTime = new Date().toISOString();
    return {
      connected: true,
      isDemo: true,
      status: 'DEMO',
      deviceName: 'RLR Biometric Simulator (Virtual Adapter)',
      manufacturer: 'RLR Embedded Labs',
      model: 'Simulated Biometric Reader v1.0',
      connectionType: 'DEMO_ADAPTER',
      firmwareVersion: 'v1.0-simulated-demo',
      lastHeartbeat: this.lastHeartbeatTime,
      lastSuccessfulScan: this.lastScanTime,
      errorMessage: null,
    };
  }

  async scan(timeoutMs = 5000): Promise<FingerprintScanResult> {
    // Artificial small hardware processing delay
    await new Promise((resolve) => setTimeout(resolve, 350));

    this.lastScanTime = new Date().toISOString();

    return {
      success: true,
      qualityScore: Math.floor(Math.random() * 8) + 92, // 92 - 99%
      verificationSource: 'FINGERPRINT_DEMO',
      isDemo: true,
      metadata: {
        sensorType: 'Optical Simulator',
        engineVersion: 'RLR-DemoMatcher-1.0',
        dpi: 500,
        synthetic: true,
      },
    };
  }

  async enroll(fingerPosition = 'RIGHT_INDEX'): Promise<EnrollmentCaptureResult> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate an opaque credential reference
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const credRef = `FP-RLR-DEMO-${randomHex}`;

    return {
      success: true,
      credentialReference: credRef,
      fingerPosition,
      qualityScore: 96,
      sampleCount: 3,
      verificationSource: 'FINGERPRINT_DEMO',
    };
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const start = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 80));
    return {
      success: true,
      latencyMs: Date.now() - start,
      message: 'Demo adapter responding normally (Simulated loopback)',
    };
  }
}

export const demoAdapter = new DemoFingerprintAdapter();
