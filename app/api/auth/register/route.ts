import { NextRequest, NextResponse } from 'next/server';
import { getSql, isDatabaseConfigured, mapUserRow, normalizeIdentifier } from '../../../../lib/db';
import { ensureDbInitialized } from '../../../../lib/dbInit';
import { hashPassword, setSessionCookie } from '../../../../lib/auth-server';
import { insertAuditLog, isClientDisconnectError, safeReadJson } from '../../../../lib/api-utils';
import type { UserRole } from '../../../../types';

const ALLOWED_SIGNUP_ROLES: UserRole[] = ['farmer', 'buyer', 'logistics'];

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { success: false, unconfigured: true, error: 'Neon database not configured.' },
      { status: 503 }
    );
  }

  try {
    const parsed = await safeReadJson(req);
    if (parsed.error) return parsed.error;
    const body = parsed.body;

    await ensureDbInitialized();

    const name = String(body.name || '').trim();
    const requestedRole = String(body.role || 'farmer') as UserRole;
    const normPhone = normalizeIdentifier(String(body.phone || ''));
    const rawEmail = String(body.email || '').trim().toLowerCase();
    const normEmail = rawEmail.includes('@') ? rawEmail : '';
    const cleanPassword = String(body.password || '').trim();
    const organization = String(body.organization || '').trim();
    const location = String(body.location || '').trim();
    const lat = Number(body.lat ?? body.coordinates?.lat ?? 30.3742);
    const lng = Number(body.lng ?? body.coordinates?.lng ?? 75.8712);

    if (requestedRole === 'admin') {
      return NextResponse.json(
        { success: false, error: 'Public Admin signup is forbidden.' },
        { status: 403 }
      );
    }

    const safeRole: UserRole = ALLOWED_SIGNUP_ROLES.includes(requestedRole)
      ? requestedRole
      : 'farmer';

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Please enter your full name.' },
        { status: 400 }
      );
    }
    if (!normPhone && !normEmail) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid mobile number or email address.' },
        { status: 400 }
      );
    }
    if (cleanPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const sql = getSql();

    const existing = await sql`
      SELECT id FROM users
      WHERE (${normPhone !== ''} AND (phone = ${normPhone} OR RIGHT(REGEXP_REPLACE(COALESCE(phone, ''), '\D', '', 'g'), 10) = ${normPhone}))
         OR (${normEmail !== ''} AND LOWER(COALESCE(email, '')) = ${normEmail})
      LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: 'An account with this phone number or email already exists.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(cleanPassword);
    const newId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const defaultOrg =
      organization ||
      (safeRole === 'farmer'
        ? 'Kisan Producer Group'
        : safeRole === 'buyer'
        ? 'Biomass Enterprise'
        : 'Freight Transport');

    const inserted = await sql`
      INSERT INTO users (
        id, name, phone, email, password_hash, role, organization, location, lat, lng, is_verified, account_status
      ) VALUES (
        ${newId},
        ${name},
        ${normPhone || null},
        ${normEmail || null},
        ${passwordHash},
        ${safeRole},
        ${defaultOrg},
        ${location},
        ${Number.isFinite(lat) ? lat : 30.3742},
        ${Number.isFinite(lng) ? lng : 75.8712},
        TRUE,
        'active'
      )
      RETURNING *
    `;

    const user = mapUserRow(inserted[0]);

    await insertAuditLog(sql, {
      adminId: user.id,
      adminName: user.name,
      action: 'USER_REGISTERED',
      entityType: 'user',
      targetId: user.id,
      details: `Role: ${safeRole}, Organization: ${defaultOrg}`,
      reason: 'Public onboarding flow',
    });

    const response = NextResponse.json({ success: true, user }, { status: 201 });
    await setSessionCookie(response, {
      userId: user.id,
      role: user.role,
      email: user.email || user.phone || '',
      name: user.name,
    });
    return response;
  } catch (err) {
    if (isClientDisconnectError(err)) {
      return NextResponse.json({ success: false, error: 'Request closed by client.' }, { status: 499 });
    }
    console.error('[api/auth/register]', err);
    return NextResponse.json(
      { success: false, error: 'Registration failed due to a server error.' },
      { status: 500 }
    );
  }
}
