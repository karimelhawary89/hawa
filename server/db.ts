import fs from 'fs';
import path from 'path';
import { createInitialDatabase } from './seedData.ts';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_PATH = path.join(DATA_DIR, 'baraa_erp.json');

type DbStore = ReturnType<typeof createInitialDatabase> & Record<string, any>;

let dbCache: DbStore | null = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getDb(): DbStore {
  if (dbCache) return dbCache;
  ensureDir();
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      const initial = createInitialDatabase();
      // Merge missing top-level collections safely
      for (const key of Object.keys(initial)) {
        if (parsed[key] === undefined) {
          parsed[key] = (initial as Record<string, unknown>)[key];
        }
      }
      dbCache = parsed;
      return dbCache!;
    } catch {
      // Fallback to fresh seed if file corrupted
    }
  }
  dbCache = createInitialDatabase();
  saveDb();
  return dbCache;
}

export function saveDb() {
  if (!dbCache) return;
  ensureDir();
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(dbCache, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_PATH);
}

export function nextSerial(prefix: string, items: Array<Record<string, any>>, field: string): string {
  let maxNum = 0;
  for (const item of items) {
    const val = String(item[field] || '');
    const m = val.match(/(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
}

export function appendAudit(userName: string, action: string, entityType: string, entityId: string, details?: string) {
  const db = getDb();
  if (!Array.isArray(db.audit_log)) db.audit_log = [];
  db.audit_log.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_name: userName || 'النظام',
    action,
    entity_type: entityType,
    entity_id: entityId,
    timestamp: new Date().toISOString(),
    details: details || '',
  });
  if (db.audit_log.length > 250) {
    db.audit_log = db.audit_log.slice(0, 250);
  }
}
