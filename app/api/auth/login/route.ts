import { NextRequest, NextResponse } from 'next/server';
import { getSql, isDatabaseConfigured, mapUserRow, normalizeIdentifier } from '../../../../lib/db';
import { ensureDbInitialized } from '../../../../lib/dbInit';
import { setSessionCookie, verifyPassword } from '../../../../lib/auth-server';
import { isClientDisconnectError, safeReadJson } from '../../../../lib/api-utils';
import type { UserRole } from '../../../../types';

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

    const normId = normalizeIdentifier(String(body.identifier || ''));
    const cleanPassword = String(body.password || '').trim();
    const role = String(body.role || '') as UserRole;

    if (!normId) {
      return NextResponse.json(
        { success: false, error: 'Please enter your registered mobile number or email.' },
        { status: 400 }
      );
    }
    if (!cleanPassword) {
      return NextResponse.json(
        { success: false, error: 'Please enter your password.' },
        { status: 400 }
      );
    }

    const sql = getSql();
    const rows = await sql`
      SELECT * FROM users
      WHERE role = ${role}
        AND (
          LOWER(COALESCE(email, '')) = ${normId}
          OR COALESCE(phone, '') = ${normId}
          OR RIGHT(REGEXP_REPLACE(COALESCE(phone, ''), '\D', '', 'g'), 10) = ${normId}
        )
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return NextResponse.json(
        {
          success: false,
          error: 'No account found with this phone/email for the selected role. Please register first.',
        },
        { status: 401 }
      );
    }

    if (row.account_status === 'suspended') {
      return NextResponse.json(
        {
          success: false,
          error: 'This account has been suspended. Contact an administrator.',
        },
        { status: 403 }
      );
    }

    const passwordMatches = await verifyPassword(cleanPassword, String(row.password_hash || ''));
    if (!passwordMatches) {
      return NextResponse.json(
        { success: false, error: 'Incorrect password. Please try again.' },
        { status: 401 }
      );
    }

    const user = mapUserRow(row);
    const response = NextResponse.json({ success: true, user }, { status: 200 });
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
    console.error('[api/auth/login]', err);
    return NextResponse.json(
      { success: false, error: 'Login failed due to a server error.' },
      { status: 500 }
    );
  }
}
