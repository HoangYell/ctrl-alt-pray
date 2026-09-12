import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { runGuardian, killProcessTree } from '../src/guardian.js';

describe('Active Terminal Guardian (pray-run)', () => {
  it('passes through successful commands with exit code 0', async () => {
    const code = await runGuardian(['node', '-e', 'console.log("hello world")'], { timeoutMs: 5000 });
    expect(code).toBe(0);
  });

  it('captures failing commands with their non-zero exit code', async () => {
    const code = await runGuardian(['node', '-e', 'process.exit(42)'], { timeoutMs: 5000 });
    expect(code).toBe(42);
  });

  it('triggers freeze watchdog and terminates when command produces no output', async () => {
    const startTime = Date.now();
    // A command that sleeps silently for 5 seconds, but timeout is set to 800ms
    const code = await runGuardian(['node', '-e', 'setTimeout(() => {}, 5000)'], { timeoutMs: 800 });
    const duration = Date.now() - startTime;

    expect(code).toBe(124); // 124 timeout exit code
    expect(duration).toBeGreaterThanOrEqual(750);
    expect(duration).toBeLessThan(3500);
  });

  it('kills process tree without throwing', async () => {
    const dummy = spawn('node', ['-e', 'setTimeout(() => {}, 10000)']);
    expect(dummy.pid).toBeDefined();
    expect(() => {
      killProcessTree(dummy.pid!);
    }).not.toThrow();
  });
});
