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
  driver?: 'sqlite' | 'json';
}

export interface StorageDriver {
  readonly name: 'sqlite' | 'json';
  getSession(projectKey: string, sessionId: string): RecoverySession | undefined;
  saveSession(session: RecoverySession): void;
  listSessions(projectKey?: string): RecoverySession[];
  getIdempotentResponse<T>(requestId?: string, payloadHash?: string): T | undefined;
  saveIdempotentResponse<T>(requestId?: string, response?: T, payloadHash?: string): void;
  purge(projectKey: string, sessionId?: string): { deletedSessions: number; deletedIdempotency: number };
  pruneOldSessions(retentionDays: number): { prunedSessions: number; prunedIdempotency: number };
  close(): void;
}

// ---------------------------------------------------------------------------
// 1. SQLite Storage Driver (Primary Driver)
// ---------------------------------------------------------------------------

export class SqliteStorageDriver implements StorageDriver {
  public readonly name = 'sqlite' as const;
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

  public getIdempotentResponse<T>(requestId?: string, payloadHash?: string): T | undefined {
    if (!requestId || typeof requestId !== 'string' || requestId.trim().length === 0) return undefined;
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

  public saveIdempotentResponse<T>(requestId?: string, response?: T, payloadHash?: string): void {
    if (!requestId || typeof requestId !== 'string' || requestId.trim().length === 0 || response === undefined) return;
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

// ---------------------------------------------------------------------------
// 2. Atomic JSON File Storage Driver (Fallback Driver - PLAN.md Section 14.E)
// ---------------------------------------------------------------------------

interface JsonDbSchema {
  sessions: Record<string, { key: string; project_key: string; session_id: string; revision: number; data: string; created_at: number; updated_at: number }>;
  idempotency: Record<string, { request_id: string; payload_hash: string | null; response_json: string; created_at: number }>;
}

export class JsonFileStorageDriver implements StorageDriver {
  public readonly name = 'json' as const;
  private filePath?: string;
  private inMemory: boolean;
  private memoryData: JsonDbSchema;

  constructor(options: StorageOptions = {}) {
    this.inMemory = !!options.inMemory;
    this.memoryData = { sessions: {}, idempotency: {} };

    if (!this.inMemory) {
      const defaultDir = path.join(os.homedir(), '.ctrl-alt-pray');
      if (!fs.existsSync(defaultDir)) {
        fs.mkdirSync(defaultDir, { recursive: true });
      }
      this.filePath = options.dbPath || path.join(defaultDir, 'sessions.json');
      this.loadFromFile();
    }
  }

  private loadFromFile(): void {
    if (!this.filePath || !fs.existsSync(this.filePath)) {
      return;
    }
    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      this.memoryData = JSON.parse(content);
    } catch {
      this.memoryData = { sessions: {}, idempotency: {} };
    }
  }

  private flush(): void {
    if (this.inMemory || !this.filePath) return;
    const dir = path.dirname(this.filePath);
    const tmpPath = path.join(dir, `sessions.json.tmp.${process.pid}.${Date.now()}`);
    fs.writeFileSync(tmpPath, JSON.stringify(this.memoryData, null, 2), 'utf-8');
    fs.renameSync(tmpPath, this.filePath);
  }

  public getSession(projectKey: string, sessionId: string): RecoverySession | undefined {
    const key = `${projectKey}:${sessionId}`;
    const row = this.memoryData.sessions[key];
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
    const existing = this.memoryData.sessions[key];
    this.memoryData.sessions[key] = {
      key,
      project_key: session.project_key,
      session_id: session.session_id,
      revision: session.revision,
      data: JSON.stringify(session),
      created_at: existing ? existing.created_at : now,
      updated_at: now,
    };
    this.flush();
  }

  public listSessions(projectKey?: string): RecoverySession[] {
    const all = Object.values(this.memoryData.sessions)
      .filter((s) => !projectKey || s.project_key === projectKey)
      .sort((a, b) => b.updated_at - a.updated_at)
      .slice(0, 50);

    return all.map((r) => JSON.parse(r.data) as RecoverySession);
  }

  public getIdempotentResponse<T>(requestId?: string, payloadHash?: string): T | undefined {
    if (!requestId || typeof requestId !== 'string' || requestId.trim().length === 0) return undefined;
    const row = this.memoryData.idempotency[requestId];
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

  public saveIdempotentResponse<T>(requestId?: string, response?: T, payloadHash?: string): void {
    if (!requestId || typeof requestId !== 'string' || requestId.trim().length === 0 || response === undefined) return;
    const now = Date.now();
    this.memoryData.idempotency[requestId] = {
      request_id: requestId,
      payload_hash: payloadHash || null,
      response_json: JSON.stringify(response),
      created_at: now,
    };
    this.flush();
  }

  public purge(projectKey: string, sessionId?: string): { deletedSessions: number; deletedIdempotency: number } {
    let deletedSessions = 0;
    if (sessionId) {
      const key = `${projectKey}:${sessionId}`;
      if (this.memoryData.sessions[key]) {
        delete this.memoryData.sessions[key];
        deletedSessions = 1;
      }
    } else {
      for (const [key, s] of Object.entries(this.memoryData.sessions)) {
        if (s.project_key === projectKey) {
          delete this.memoryData.sessions[key];
          deletedSessions++;
        }
      }
    }
    this.flush();
    return { deletedSessions, deletedIdempotency: 0 };
  }

  public pruneOldSessions(retentionDays: number = 7): { prunedSessions: number; prunedIdempotency: number } {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let prunedSessions = 0;
    let prunedIdempotency = 0;

    for (const [key, s] of Object.entries(this.memoryData.sessions)) {
      if (s.updated_at < cutoff) {
        delete this.memoryData.sessions[key];
        prunedSessions++;
      }
    }

    for (const [key, i] of Object.entries(this.memoryData.idempotency)) {
      if (i.created_at < cutoff) {
        delete this.memoryData.idempotency[key];
        prunedIdempotency++;
      }
    }

    this.flush();
    return { prunedSessions, prunedIdempotency };
  }

  public close(): void {
    this.flush();
  }
}

// ---------------------------------------------------------------------------
// 3. Resilient Facade Storage with Automatic Driver Fallback
// ---------------------------------------------------------------------------

export class RecoveryStorage implements StorageDriver {
  private driver: StorageDriver;

  constructor(options: StorageOptions = {}) {
    if (options.driver === 'json') {
      this.driver = new JsonFileStorageDriver(options);
      return;
    }

    try {
      this.driver = new SqliteStorageDriver(options);
    } catch {
      // Fall back to atomic JSON storage if SQLite fails
      this.driver = new JsonFileStorageDriver(options);
    }
  }

  public get name(): 'sqlite' | 'json' {
    return this.driver.name;
  }

  public get activeDriver(): 'sqlite' | 'json' {
    return this.driver.name;
  }

  public getSession(projectKey: string, sessionId: string): RecoverySession | undefined {
    return this.driver.getSession(projectKey, sessionId);
  }

  public saveSession(session: RecoverySession): void {
    this.driver.saveSession(session);
  }

  public listSessions(projectKey?: string): RecoverySession[] {
    return this.driver.listSessions(projectKey);
  }

  public getIdempotentResponse<T>(requestId?: string, payloadHash?: string): T | undefined {
    if (!requestId) return undefined;
    return this.driver.getIdempotentResponse<T>(requestId, payloadHash);
  }

  public saveIdempotentResponse<T>(requestId?: string, response?: T, payloadHash?: string): void {
    if (!requestId || response === undefined) return;
    this.driver.saveIdempotentResponse<T>(requestId, response, payloadHash);
  }

  public purge(projectKey: string, sessionId?: string): { deletedSessions: number; deletedIdempotency: number } {
    return this.driver.purge(projectKey, sessionId);
  }

  public pruneOldSessions(retentionDays: number = 7): { prunedSessions: number; prunedIdempotency: number } {
    return this.driver.pruneOldSessions(retentionDays);
  }

  public close(): void {
    this.driver.close();
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
