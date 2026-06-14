import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'cohortai.db');

// Global db instance (synchronous-style wrapper around sql.js)
let db: SqlJsDatabase;
let SQL: Awaited<ReturnType<typeof initSqlJs>>;

// sql.js is async to init; we expose a synchronous-feeling API after init
export async function getDb(): Promise<SqlJsDatabase> {
  if (db) return db;
  SQL = await initSqlJs();
  
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    // FIX 1: Explicitly convert Node Buffer to Uint8Array for the WASM engine
    db = new SQL.Database(new Uint8Array(fileBuffer));
  } else {
    db = new SQL.Database();
  }

  return db;
}

// Persist to disk after writes
export function persist(): void {
  if (!db) return;
  const data = db.export(); // Returns Uint8Array
  const buffer = Buffer.from(data);
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}

// Convenience: run a statement (no results needed), then persist
export function run(sql: string, params: Record<string, any> = {}): void {
  if (!db) throw new Error('DB not initialized');
  // Note: Ensure your `params` keys match your SQL perfectly (e.g., { ':id': 1 })
  db.run(sql, params);
  persist();
}

// Query multiple rows
export function all<T = Record<string, any>>(sql: string, params: Record<string, any> = {}): T[] {
  if (!db) throw new Error('DB not initialized');
  const stmt = db.prepare(sql);
  const rows: T[] = [];
  
  // FIX 2: try...finally ensures WASM memory is freed even if the query fails
  try {
    stmt.bind(params);
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
  } finally {
    stmt.free();
  }
  
  return rows;
}

// Query single row
export function get<T = Record<string, any>>(sql: string, params: Record<string, any> = {}): T | null {
  const rows = all<T>(sql, params);
  return rows[0] ?? null;
}

// Transaction helper
export function transaction(fn: () => void | Promise<any>): void {
  if (!db) throw new Error('DB not initialized');
  
  db.run('BEGIN');
  try {
    const result = fn();
    
    // FIX 3: Prevent async functions from causing premature commits
    if (result instanceof Promise) {
      throw new Error('Async functions are not supported in this synchronous transaction wrapper. Await your data before opening the transaction.');
    }
    
    db.run('COMMIT');
    persist();
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}

export function initializeDatabase(): void {
  if (!db) throw new Error('DB not initialized — call getDb() first');

  // Wrapping schema creation in a transaction is best practice
  transaction(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        city TEXT NOT NULL,
        tier TEXT NOT NULL,
        total_spent REAL NOT NULL DEFAULT 0,
        order_count INTEGER NOT NULL DEFAULT 0,
        last_purchase_date TEXT,
        first_purchase_date TEXT,
        preferred_category TEXT,
        age_group TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        amount REAL NOT NULL,
        items TEXT NOT NULL,
        category TEXT NOT NULL,
        channel TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        order_date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS segments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        filter_query TEXT NOT NULL,
        natural_language_query TEXT,
        customer_count INTEGER NOT NULL DEFAULT 0,
        ai_reasoning TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        segment_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        message_template TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        total_recipients INTEGER NOT NULL DEFAULT 0,
        sent_count INTEGER NOT NULL DEFAULT 0,
        delivered_count INTEGER NOT NULL DEFAULT 0,
        opened_count INTEGER NOT NULL DEFAULT 0,
        clicked_count INTEGER NOT NULL DEFAULT 0,
        failed_count INTEGER NOT NULL DEFAULT 0,
        converted_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        sent_at TEXT,
        completed_at TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS communications (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        personalized_message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        sent_at TEXT,
        delivered_at TEXT,
        opened_at TEXT,
        clicked_at TEXT,
        converted_at TEXT,
        failed_reason TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  });

  console.log('✅ Database schema initialized');
}

export default { run, all, get, transaction, initializeDatabase, persist }; 