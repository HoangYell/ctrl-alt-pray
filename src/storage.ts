import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import type { RecoverySession } from './recovery.js';

export interface StorageOptions {
  dbPath?: string;
  inMemory?: boolean;
}

export class RecoveryStorage {
  private db: DatabaseSync;

  constructor(options: StorageOptions = {}) {
    if (options.inMemory) {
      this.db = new DatabaseSync(':memory:');
    } else {
      const defaultDir = path.join(os.homedir(), '.ctrl-alt-pray');
      if (!fs.existsSync(defaultDir)) {
        fs.mkdirSync(defaultDir, { recursive: true });
      }
      const dbPath = options.dbPath || process.env.CTRL_ALT_PRAY_DB_PATH || path.join(defaultDir, 'sessions.sqlite');
      this.db = new DatabaseSync(dbPath);
    }

    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        key TEXT PRIMARY KEY,
        project_key TEXT NOT NULL,
        session_id TEXT NOT NULL,
        revision INTEGER NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS idempotency (
        request_id TEXT PRIMARY KEY,
        response_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_key);
    `);
  }

  public getSession(projectKey: string, sessionId: string): RecoverySession | undefined {
    const key = `${projectKey}:${sessionId}`;
    const stmt = this.db.prepare('SELECT data FROM sessions WHERE key = ?');
    const row = stmt.get(key) as { data: string } | undefined;
    if (!row) return undefined;
    try {
      return JSON.parse(row.data) as RecoverySession;
    } catch {
      return undefined;
    }
  }

  public saveSession(session: RecoverySession): void {
    const key = `${session.project_key}:${session.session_id}`;
    const now = Date.now();
    const data = JSON.stringify(session);

    const stmt = this.db.prepare(`
      INSERT INTO sessions (key, project_key, session_id, revision, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        revision = excluded.revision,
        data = excluded.data,
        updated_at = excluded.updated_at
    `);

    stmt.run(key, session.project_key, session.session_id, session.revision, data, now, now);
  }

  public listSessions(projectKey?: string): RecoverySession[] {
    let stmt;
    if (projectKey) {
      stmt = this.db.prepare('SELECT data FROM sessions WHERE project_key = ? ORDER BY updated_at DESC');
      const rows = stmt.all(projectKey) as Array<{ data: string }>;
      return rows.map((r) => JSON.parse(r.data) as RecoverySession);
    } else {
      stmt = this.db.prepare('SELECT data FROM sessions ORDER BY updated_at DESC LIMIT 50');
      const rows = stmt.all() as Array<{ data: string }>;
      return rows.map((r) => JSON.parse(r.data) as RecoverySession);
    }
  }

  public getIdempotentResponse<T>(requestId: string): T | undefined {
    const stmt = this.db.prepare('SELECT response_json FROM idempotency WHERE request_id = ?');
    const row = stmt.get(requestId) as { response_json: string } | undefined;
    if (!row) return undefined;
    try {
      return JSON.parse(row.response_json) as T;
    } catch {
      return undefined;
    }
  }

  public saveIdempotentResponse<T>(requestId: string, response: T): void {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO idempotency (request_id, response_json, created_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(requestId, JSON.stringify(response), now);
  }

  public close(): void {
    this.db.close();
  }
}

// Global default storage instance
let defaultStorage: RecoveryStorage | null = null;

export function getDefaultStorage(): RecoveryStorage {
  if (!defaultStorage) {
    defaultStorage = new RecoveryStorage();
  }
  return defaultStorage;
}

export function setDefaultStorage(storage: RecoveryStorage | null): void {
  defaultStorage = storage;
}
