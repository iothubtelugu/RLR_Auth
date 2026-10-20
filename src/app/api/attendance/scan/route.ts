import { NextResponse } from 'next/server';
import { AttendanceService } from '@/lib/attendance/service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { credentialReference, memberId, verificationSource, deviceId, rawMetadata } = body;

    if (!credentialReference && !memberId) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'INVALID_REQUEST',
          message: 'Either credentialReference or memberId must be supplied for biometric verification.',
        },
        { status: 400 }
      );
    }

    const result = AttendanceService.processScan({
      credentialReference,
      memberId,
      verificationSource: verificationSource || 'FINGERPRINT_DEMO',
      deviceId: deviceId || 'dev-rlr-kiosk-01',
      rawMetadata,
    });

    if (!result.success) {
      const statusCode = result.errorCode === 'COOLDOWN' ? 429 : result.errorCode === 'NOT_FOUND' ? 404 : 403;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: err.message || 'An error occurred while processing the attendance scan.',
      },
      { status: 500 }
    );
  }
}
