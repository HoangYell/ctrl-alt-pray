import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

import type { RecoverySession } from './recovery.js';

export const MAX_REQUEST_BYTES = 64 * 1024; // 64 KiB
export const MAX_OBSERVATION_BYTES = 8 * 1024; // 8 KiB
export const MAX_ATTEMPTS_PER_SESSION = 50;

export function validateRequestLimits(payload: {
  observations?: string[];
  attempts?: string[];
  [key: string]: any;
}): void {
  const json = JSON.stringify(payload);
  if (Buffer.byteLength(json, 'utf8') > MAX_REQUEST_BYTES) {
    throw new Error(`INPUT_TOO_LARGE: Request payload exceeds ${MAX_REQUEST_BYTES} bytes (64 KiB limit)`);
  }

  if (payload.observations && Array.isArray(payload.observations)) {
    for (const obs of payload.observations) {
      if (typeof obs === 'string' && Buffer.byteLength(obs, 'utf8') > MAX_OBSERVATION_BYTES) {
        throw new Error(`OBSERVATION_TOO_LARGE: Observation exceeds ${MAX_OBSERVATION_BYTES} bytes (8 KiB limit)`);
      }
    }
  }

  if (payload.attempts && Array.isArray(payload.attempts)) {
    if (payload.attempts.length > MAX_ATTEMPTS_PER_SESSION) {
      throw new Error(`ATTEMPTS_EXCEEDED: Maximum of ${MAX_ATTEMPTS_PER_SESSION} attempts per session exceeded`);
    }
  }
}

export function computePayloadHash(payload: any): string {
  const normalized = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

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
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;

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
        payload_hash TEXT,
        response_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_key);
    `);

    try {
      this.db.exec('ALTER TABLE idempotency ADD COLUMN payload_hash TEXT;');
    } catch {
      // Column already exists
    }
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

  public getIdempotentResponse<T>(requestId: string, payloadHash?: string): T | undefined {
    const stmt = this.db.prepare('SELECT payload_hash, response_json FROM idempotency WHERE request_id = ?');
    const row = stmt.get(requestId) as { payload_hash: string | null; response_json: string } | undefined;
    if (!row) return undefined;

    if (payloadHash && row.payload_hash && row.payload_hash !== payloadHash) {
      throw new Error(`CONFLICTING_REQUEST_ID: request_id "${requestId}" reused with conflicting payload`);
    }

    try {
      return JSON.parse(row.response_json) as T;
    } catch {
      return undefined;
    }
  }

  public saveIdempotentResponse<T>(requestId: string, response: T, payloadHash?: string): void {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO idempotency (request_id, payload_hash, response_json, created_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(requestId, payloadHash || null, JSON.stringify(response), now);
  }

  public purge(projectKey: string, sessionId?: string): { deletedSessions: number; deletedIdempotency: number } {
    let deletedSessions = 0;
    let deletedIdempotency = 0;

    if (sessionId) {
      const key = `${projectKey}:${sessionId}`;
      const res = this.db.prepare('DELETE FROM sessions WHERE key = ?').run(key);
      deletedSessions = Number(res.changes || 0);
    } else {
      const res = this.db.prepare('DELETE FROM sessions WHERE project_key = ?').run(projectKey);
      deletedSessions = Number(res.changes || 0);
    }

    return { deletedSessions, deletedIdempotency };
  }

  public pruneOldSessions(retentionDays: number = 7): { prunedSessions: number; prunedIdempotency: number } {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const resSessions = this.db.prepare('DELETE FROM sessions WHERE updated_at < ?').run(cutoff);
    const resIdempotency = this.db.prepare('DELETE FROM idempotency WHERE created_at < ?').run(cutoff);
    return {
      prunedSessions: Number(resSessions.changes || 0),
      prunedIdempotency: Number(resIdempotency.changes || 0),
    };
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
