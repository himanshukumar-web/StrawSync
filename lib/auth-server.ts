import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import { getSql, isDatabaseConfigured, mapUserRow } from './db';
import { ensureDbInitialized } from './dbInit';
import {
  SESSION_COOKIE_NAME,
  SessionPayload,
  signSessionToken,
  verifySessionToken,
} from './session-jwt';
import type { UserProfile } from '../types';

export { SESSION_COOKIE_NAME, signSessionToken, verifySessionToken };
export type { SessionPayload };

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export async function setSessionCookie(response: NextResponse, payload: SessionPayload) {
  const token = await signSessionToken(payload);
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  });
}

export async function getServerSession(req?: NextRequest): Promise<SessionPayload | null> {
  const token = req
    ? req.cookies.get(SESSION_COOKIE_NAME)?.value
    : cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getServerUser(req?: NextRequest): Promise<UserProfile | null> {
  const session = await getServerSession(req);
  if (!session) return null;

  if (!isDatabaseConfigured()) {
    return null;
  }

  await ensureDbInitialized();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM users WHERE id = ${session.userId} LIMIT 1
  `;
  const row = rows[0];
  if (!row || row.account_status === 'suspended') {
    return null;
  }
  return mapUserRow(row);
}
