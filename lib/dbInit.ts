import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { getSql, isDatabaseConfigured } from './db';
import { runSchemaAndSeed } from './dbSeedData.mjs';

let initPromise: Promise<void> | null = null;

export async function ensureDbInitialized(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const sql = getSql();
        const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await runSchemaAndSeed(sql, (pw: string) => bcrypt.hashSync(pw, 10), schemaSql);
      } catch (err) {
        initPromise = null;
        throw err;
      }
    })();
  }
  return initPromise;
}
