#!/usr/bin/env -S node --no-warnings=ExperimentalWarning
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const RUNS_FILE = path.join(os.homedir(), '.ctrl-alt-pray', 'runs.json');

export interface RunRecord {
  command: string;
  consecutiveFailures: number;
  lastExitCode: number;
  lastRunAt: number;
}

/**
 * Cross-platform process-tree cascade executioner.
 * Recursively terminates all descendant processes before terminating the parent.
 */
export function killProcessTree(pid: number): void {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
      return;
    }

    // On Unix (Linux / macOS): find all child PIDs recursively
    try {
      const pgrepOutput = execSync(`pgrep -P ${pid}`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
      const childPids = pgrepOutput.trim().split('\n').filter(Boolean).map(Number);
      for (const childPid of childPids) {
        killProcessTree(childPid);
      }
    } catch {
      // No children or pgrep exited with 1
    }

    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Process already exited
    }
  } catch {
    // Graceful fallback
  }
}

function getRunsState(): Record<string, RunRecord> {
  try {
    if (fs.existsSync(RUNS_FILE)) {
      return JSON.parse(fs.readFileSync(RUNS_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveRunsState(state: Record<string, RunRecord>): void {
  try {
    const dir = path.dirname(RUNS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(RUNS_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch {}
}

export function printFreezeBanner(durationSec: number): void {
  console.error(`
╔═════════════════════════════════════════════════════════════════════════════════╗
║          [CTRL-ALT-PRAY GUARDIAN] TERMINAL HANG DETECTED (>${durationSec}s silent)           ║
╠═════════════════════════════════════════════════════════════════════════════════╣
║ Process and all descendant child processes terminated via Cascade Killer.       ║
║ Probable cause: Subprocess pipe deadlock, forgotten watcher, or prompt (y/n)?   ║
║                                                                                 ║
║ ACTION REQUIRED: Invoke MCP tool 'pray' with strategy='ghost-terminal-breaker'   ║
║ to examine logs and break this execution stall immediately.                     ║
╚═════════════════════════════════════════════════════════════════════════════════╝
`);
}

export function printConsecutiveFailureBanner(failures: number, command: string): void {
  console.error(`
╔═════════════════════════════════════════════════════════════════════════════════╗
║        [CIRCUIT BREAKER TRIGGERED] ${failures} CONSECUTIVE TEST/BUILD FAILURES DETECTED       ║
╠═════════════════════════════════════════════════════════════════════════════════╣
║ Command: "${command}" has failed repeatedly without progress.                   ║
║ STOP editing code blindly. Further retries will only pollute context & tokens.  ║
║                                                                                 ║
║ ACTION REQUIRED: Invoke MCP tool 'pray' to obtain a bounded falsification probe ║
╚═════════════════════════════════════════════════════════════════════════════════╝
`);
}

export interface GuardianOptions {
  timeoutMs?: number;
  maxConsecutiveFailures?: number;
  dryRun?: boolean;
}

/**
 * Runs a shell command under active watchdog supervision.
 * Catches stalls > 15s and repeated failures.
 */
export function runGuardian(
  args: string[],
  options: GuardianOptions = {},
): Promise<number> {
  return new Promise((resolve) => {
    if (args.length === 0) {
      console.error('Usage: pray-run [--dry-run] <command> [args...]');
      console.error('Example: pray-run pnpm test');
      resolve(1);
      return;
    }

    const commandStr = args.join(' ');
    const timeoutMs = options.timeoutMs ?? (Number(process.env.PRAY_TIMEOUT_MS) || 15000);
    const maxFailures = options.maxConsecutiveFailures ?? 3;

    if (options.dryRun) {
      const existing = getRunsState()[commandStr];
      console.error(`[CTRL-ALT-PRAY GUARDIAN] --dry-run: would supervise "${commandStr}"`);
      console.error(`  freeze watchdog:      terminate & cascade-kill after ${timeoutMs}ms of silence`);
      console.error(`  circuit breaker:      warn after ${maxFailures} consecutive non-zero exits`);
      console.error(`  consecutive failures so far: ${existing?.consecutiveFailures ?? 0}`);
      resolve(0);
      return;
    }

    const [cmd, ...cmdArgs] = args;
    const child = spawn(cmd, cmdArgs, {
      shell: process.platform === 'win32',
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let lastOutputAt = Date.now();
    let isTerminated = false;

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        lastOutputAt = Date.now();
        process.stdout.write(chunk);
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        lastOutputAt = Date.now();
        process.stderr.write(chunk);
      });
    }

    // Freeze Watchdog Timer
    const watchdogInterval = setInterval(() => {
      const silentDuration = Date.now() - lastOutputAt;
      if (silentDuration >= timeoutMs && !isTerminated && child.pid) {
        isTerminated = true;
        clearInterval(watchdogInterval);
        killProcessTree(child.pid);
        printFreezeBanner(Math.round(timeoutMs / 1000));
        resolve(124); // 124 = standard timeout exit code
      }
    }, 500);

    child.on('error', (err) => {
      clearInterval(watchdogInterval);
      console.error(`[CTRL-ALT-PRAY GUARDIAN] Failed to spawn: ${err.message}`);
      resolve(1);
    });

    child.on('close', (exitCode) => {
      clearInterval(watchdogInterval);
      if (isTerminated) return;

      const code = exitCode ?? 1;
      const state = getRunsState();
      const existing = state[commandStr] || {
        command: commandStr,
        consecutiveFailures: 0,
        lastExitCode: 0,
        lastRunAt: Date.now(),
      };

      if (code !== 0) {
        existing.consecutiveFailures += 1;
        existing.lastExitCode = code;
        existing.lastRunAt = Date.now();
        state[commandStr] = existing;
        saveRunsState(state);

        if (existing.consecutiveFailures >= maxFailures) {
          printConsecutiveFailureBanner(existing.consecutiveFailures, commandStr);
        }
      } else {
        // Reset failures on clean success
        if (existing.consecutiveFailures > 0) {
          existing.consecutiveFailures = 0;
          existing.lastExitCode = 0;
          state[commandStr] = existing;
          saveRunsState(state);
        }
      }

      resolve(code);
    });
  });
}

// CLI entrypoint if executed directly
try {
  const currentFilePath = fileURLToPath(import.meta.url);
  const executedPath = process.argv[1] ? fs.realpathSync(process.argv[1]) : '';
  if (currentFilePath === executedPath) {
    const rawArgs = process.argv.slice(2);
    const dryRun = rawArgs.includes('--dry-run');
    const args = rawArgs.filter((a) => a !== '--dry-run');
    runGuardian(args, { dryRun }).then((code) => {
      process.exit(code);
    });
  }
} catch {}

