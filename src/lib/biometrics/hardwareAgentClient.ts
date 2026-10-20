import { FingerprintAdapter, DeviceStatusInfo, FingerprintScanResult, EnrollmentCaptureResult } from './adapter';

export class HardwareAgentClient implements FingerprintAdapter {
  id = 'dev-rlr-hardware-01';
  name = 'RLR Local Hardware Scanner Bridge';
  mode: 'hardware' = 'hardware';
  private agentHttpUrl: string;

  constructor(agentHttpUrl = process.env.HARDWARE_AGENT_HTTP_URL || 'http://localhost:8080') {
    this.agentHttpUrl = agentHttpUrl;
  }

  async getStatus(): Promise<DeviceStatusInfo> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${this.agentHttpUrl}/api/status`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Agent returned HTTP ${res.status}`);
      }

      const data = await res.json();
      return {
        connected: data.connected ?? false,
        isDemo: false,
        status: data.connected ? 'ONLINE' : 'OFFLINE',
        deviceName: data.deviceName || 'Physical Fingerprint Reader',
        manufacturer: data.manufacturer || 'External Vendor',
        model: data.model || 'Optical USB Sensor',
        connectionType: 'WEBSOCKET_AGENT',
        firmwareVersion: data.firmwareVersion || 'v2.1',
        lastHeartbeat: new Date().toISOString(),
        lastSuccessfulScan: data.lastSuccessfulScan || null,
        errorMessage: data.errorMessage || null,
      };
    } catch (err: any) {
      return {
        connected: false,
        isDemo: false,
        status: 'OFFLINE',
        deviceName: 'Physical Fingerprint Reader (Disconnected)',
        manufacturer: 'External Vendor',
        model: 'Hardware Agent Bridge',
        connectionType: 'WEBSOCKET_AGENT',
        firmwareVersion: null,
        lastHeartbeat: null,
        lastSuccessfulScan: null,
        errorMessage: `Cannot reach local hardware agent at ${this.agentHttpUrl}. Please start the hardware agent service.`,
      };
    }
  }

  async scan(timeoutMs = 10000): Promise<FingerprintScanResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(`${this.agentHttpUrl}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          verificationSource: 'FINGERPRINT_HARDWARE',
          isDemo: false,
          errorMessage: errorData.message || `Hardware scan failed with status ${res.status}`,
          errorCode: errorData.code || 'NO_MATCH',
        };
      }

      const data = await res.json();
      return {
        success: data.success,
        credentialReference: data.credentialReference,
        qualityScore: data.qualityScore,
        verificationSource: 'FINGERPRINT_HARDWARE',
        isDemo: false,
        errorMessage: data.errorMessage,
        errorCode: data.errorCode,
        metadata: data.metadata,
      };
    } catch (err: any) {
      return {
        success: false,
        verificationSource: 'FINGERPRINT_HARDWARE',
        isDemo: false,
        errorMessage: `Hardware communication error: ${err.message}`,
        errorCode: 'DEVICE_DISCONNECTED',
      };
    }
  }

  async enroll(fingerPosition: string): Promise<EnrollmentCaptureResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${this.agentHttpUrl}/api/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerPosition }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          fingerPosition,
          qualityScore: 0,
          sampleCount: 0,
          verificationSource: 'FINGERPRINT_HARDWARE',
          errorMessage: errorData.message || 'Hardware enrollment failed',
        };
      }

      const data = await res.json();
      return {
        success: data.success,
        credentialReference: data.credentialReference,
        fingerPosition,
        qualityScore: data.qualityScore || 90,
        sampleCount: data.sampleCount || 3,
        verificationSource: 'FINGERPRINT_HARDWARE',
      };
    } catch (err: any) {
      return {
        success: false,
        fingerPosition,
        qualityScore: 0,
        sampleCount: 0,
        verificationSource: 'FINGERPRINT_HARDWARE',
        errorMessage: `Hardware enrollment connection error: ${err.message}`,
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.agentHttpUrl}/api/ping`);
      const latency = Date.now() - start;
      if (res.ok) {
        return { success: true, latencyMs: latency, message: `Hardware agent reachable (${latency}ms)` };
      }
      return { success: false, latencyMs: latency, message: `Hardware agent error (${res.status})` };
    } catch (err: any) {
      return { success: false, latencyMs: Date.now() - start, message: `Agent unreachable: ${err.message}` };
    }
  }
}

export const hardwareAgentClient = new HardwareAgentClient();
