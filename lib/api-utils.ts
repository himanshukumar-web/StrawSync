import { NextRequest, NextResponse } from 'next/server';
import type { NeonQueryFunction } from '@neondatabase/serverless';
import { getSql, isDatabaseConfigured } from './db';
import { getServerUser } from './auth-server';
import type { OrderStatus, PlatformNotification, UserProfile, UserRole } from '../types';

export async function requireDbAndUser(
  req: NextRequest,
  allowedRoles?: UserRole[]
): Promise<
  | { user: UserProfile; sql: NeonQueryFunction<false, false>; error?: undefined }
  | { error: NextResponse; user?: undefined; sql?: undefined }
> {
  if (!isDatabaseConfigured()) {
    return {
      error: NextResponse.json(
        { error: 'Neon PostgreSQL database is not configured.', unconfigured: true },
        { status: 503 }
      ),
    };
  }

  const user = await getServerUser(req);
  if (!user) {
    return {
      error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden: insufficient permissions for this action' },
        { status: 403 }
      ),
    };
  }

  return { user, sql: getSql() };
}

export async function insertNotification(
  sql: NeonQueryFunction<false, false>,
  params: {
    userId: string;
    title: string;
    message: string;
    type?: PlatformNotification['type'];
    orderId?: string;
  }
) {
  const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await sql`
    INSERT INTO notifications (id, user_id, title, message, type, order_id, is_read)
    VALUES (
      ${id},
      ${params.userId},
      ${params.title},
      ${params.message},
      ${params.type || 'order'},
      ${params.orderId || null},
      FALSE
    )
  `;
}

export async function insertAuditLog(
  sql: NeonQueryFunction<false, false>,
  params: {
    adminId: string;
    adminName: string;
    action: string;
    entityType: string;
    targetId: string;
    previousValue?: string;
    details?: string;
    reason?: string;
  }
) {
  const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await sql`
    INSERT INTO admin_audit_logs (
      id, admin_id, admin_name, action, entity_type, target_id, previous_value, details, reason
    ) VALUES (
      ${id},
      ${params.adminId},
      ${params.adminName},
      ${params.action},
      ${params.entityType},
      ${params.targetId},
      ${params.previousValue || null},
      ${params.details || null},
      ${params.reason || null}
    )
  `;
}

export function buildTimelineEvent(status: OrderStatus, label: string, description: string) {
  return {
    status,
    label,
    description,
    timestamp: new Date().toISOString(),
  };
}

export function isClientDisconnectError(err: unknown): boolean {
  const e = err as { code?: string; name?: string; message?: string; cause?: { code?: string } } | null;
  if (!e) return false;
  return (
    e.code === 'ECONNRESET' ||
    e.cause?.code === 'ECONNRESET' ||
    e.name === 'AbortError' ||
    /aborted|econnreset/i.test(String(e.message || ''))
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function safeReadJson<T = Record<string, any>>(
  req: NextRequest
): Promise<{ body: T; error?: undefined } | { error: NextResponse; body?: undefined }> {
  try {
    const body = (await req.json()) as T;
    return { body };
  } catch (err) {
    if (isClientDisconnectError(err)) {
      return {
        error: NextResponse.json({ success: false, error: 'Request closed by client.' }, { status: 499 }),
      };
    }
    return {
      error: NextResponse.json({ success: false, error: 'Invalid request payload.' }, { status: 400 }),
    };
  }
}
