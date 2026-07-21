import type { Role } from '@prisma/client';

/**
 * Helper impersonasi peran untuk e2e test.
 * Menghasilkan header dev yang dibaca StubAuthProvider (x-dev-*), sehingga test
 * dapat mensimulasikan peran tanpa autentikasi nyata. Saat SSO aktif, e2e cukup
 * mengganti mekanisme ini tanpa mengubah skenario test.
 */
export interface DevUser {
  role: Role;
  userId?: number;
  opdId?: number | null;
  ssoSubject?: string;
}

export function devHeaders(user: DevUser): Record<string, string> {
  const headers: Record<string, string> = { 'x-dev-role': user.role };
  if (user.userId !== undefined) {
    headers['x-dev-user-id'] = String(user.userId);
  }
  if (user.opdId !== undefined && user.opdId !== null) {
    headers['x-dev-opd-id'] = String(user.opdId);
  }
  if (user.ssoSubject) {
    headers['x-dev-sso-subject'] = user.ssoSubject;
  }
  return headers;
}
