import { SignJWT, jwtVerify } from 'jose';
import type { UserRole } from '../types';

export const SESSION_COOKIE_NAME = 'strawsync_session';

export interface SessionPayload {
  userId: string;
  role: UserRole;
  email: string;
  name: string;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim() || 'strawsync-dev-secret-key-2026';
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
    name: payload.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const userId = typeof payload.userId === 'string' ? payload.userId : '';
    const role = payload.role as UserRole;
    if (!userId || !['farmer', 'buyer', 'logistics', 'admin'].includes(role)) {
      return null;
    }
    return {
      userId,
      role,
      email: typeof payload.email === 'string' ? payload.email : '',
      name: typeof payload.name === 'string' ? payload.name : '',
    };
  } catch {
    return null;
  }
}
