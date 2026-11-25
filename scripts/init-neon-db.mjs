import fs from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { runSchemaAndSeed } from '../lib/dbSeedData.mjs';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let val = line.slice(eqIndex + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

async function main() {
  const root = process.cwd();
  loadEnvFile(path.join(root, '.env.local'));
  loadEnvFile(path.join(root, '.env'));

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl || (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://'))) {
    console.error('Error: DATABASE_URL is not set or invalid in .env.local.');
    process.exit(1);
  }

  const schemaPath = path.join(root, 'db', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const sql = neon(databaseUrl);

  console.log('Initializing StrawSync Neon PostgreSQL schema and demo seeds...');
  await runSchemaAndSeed(sql, (pw) => bcrypt.hashSync(pw, 10), schemaSql);

  const tables = [
    'users',
    'farmer_listings',
    'buyer_requests',
    'orders',
    'notifications',
    'saved_calculations',
    'admin_audit_logs',
  ];
  console.log('Neon PostgreSQL table row counts:');
  for (const tbl of tables) {
    const res = await sql.query(`SELECT COUNT(*)::int AS count FROM ${tbl}`, []);
    console.log(`  - ${tbl}: ${res[0]?.count ?? 0}`);
  }
  console.log('SUCCESS: Neon PostgreSQL schema verified and initial demo accounts seeded.');
}

main().catch((err) => {
  console.error('Failed to initialize Neon database:', err);
  process.exit(1);
});
