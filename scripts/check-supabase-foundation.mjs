import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationPath = path.join(root, 'supabase', 'migrations', '20261125000001_strawsync_foundation.sql');
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

const expectedTables = [
  'public.profiles',
  'public.farmer_listings',
  'public.buyer_requests',
  'public.orders',
  'public.logistics_partners',
  'public.deliveries',
  'public.transactions',
  'public.notifications',
  'public.admin_audit_logs',
];

for (const table of expectedTables) {
  assert.ok(
    migrationSql.includes(`create table if not exists ${table}`),
    `Missing table definition for ${table}`
  );
  assert.ok(
    migrationSql.includes(`alter table ${table} enable row level security;`),
    `Missing RLS enable statement for ${table}`
  );
}

// Ensure Supabase security checklist compliance in SQL
assert.ok(!migrationSql.includes('auth.role()'), 'Deprecated auth.role() must not be used in SQL');
assert.ok(
  migrationSql.includes("when requested_role in ('farmer', 'buyer', 'logistics') then requested_role"),
  'Signup trigger must whitelist non-admin roles'
);
assert.ok(
  migrationSql.includes('revoke all on function private.promote_first_admin(text) from public, anon, authenticated;'),
  'First admin bootstrap must be locked down from public/anon/authenticated'
);
assert.ok(
  migrationSql.includes('private.guard_profile_update()'),
  'Profile privileged column trigger guard missing'
);

// Ensure service role key is never exposed in app/, components/, or lib/
const clientDirs = ['app', 'components', 'lib'];
for (const dir of clientDirs) {
  const fullDir = path.join(root, dir);
  const stack = [fullDir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const content = fs.readFileSync(entryPath, 'utf8');
        assert.ok(
          !content.includes('SUPABASE_SERVICE_ROLE_KEY'),
          `SUPABASE_SERVICE_ROLE_KEY must not appear in ${entryPath}`
        );
        assert.ok(
          !/NEXT_PUBLIC_.*SERVICE_ROLE/i.test(content),
          `Public service role env var must not appear in ${entryPath}`
        );
      }
    }
  }
}

// Verify .gitignore excludes .env.local
const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
assert.ok(gitignore.includes('.env*.local'), '.gitignore must ignore .env*.local');

console.log('PASS: All Supabase schema, RLS, privilege-guard, and env hygiene checks passed.');
