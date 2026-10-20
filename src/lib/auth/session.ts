import { cookies } from 'next/headers';
import { verifyToken, TokenPayload } from './jwt';

export const AUTH_COOKIE_NAME = 'rlr_session_token';

export async function getSessionUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function getUserFromRequest(request: Request): TokenPayload | null {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|; )${AUTH_COOKIE_NAME}=([^;]*)`));
    const token = match ? decodeURIComponent(match[1]) : null;
    if (!token) {
      // Also check Bearer Authorization header if provided
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        return verifyToken(authHeader.substring(7));
      }
      return null;
    }
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function hasPermission(
  userRole: 'ADMIN' | 'COORDINATOR' | 'OPERATOR' | 'MEMBER',
  action: 'MANAGE_MEMBERS' | 'MANAGE_DEVICES' | 'CORRECT_ATTENDANCE' | 'MANAGE_SETTINGS' | 'VIEW_AUDIT_LOGS' | 'SCAN_KIOSK'
): boolean {
  if (userRole === 'ADMIN') return true;
  if (userRole === 'COORDINATOR') {
    return ['MANAGE_MEMBERS', 'CORRECT_ATTENDANCE', 'SCAN_KIOSK'].includes(action);
  }
  if (userRole === 'OPERATOR') {
    return ['SCAN_KIOSK'].includes(action);
  }
  return false;
}
