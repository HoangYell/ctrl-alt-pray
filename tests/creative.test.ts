import { describe, it, expect, beforeEach } from 'vitest';
import {
  createOrResumeRecoverySession,
  reportOutcome,
  detectFileFlapping,
  generateHeresyChallenge,
  generateTheOffering,
} from '../src/recovery.js';
import { generateResurrectionPacket, runResurrect } from '../src/resurrection.js';
import { CANONICAL_RECIPES, runPrayerBook } from '../src/recipes.js';
import { RecoveryStorage } from '../src/storage.js';
import fs from 'node:fs';
import path from 'node:path';

describe('Creative Extensions & Behavioral Sentinels (PLAN.md Section 13 & 18)', () => {
  let storage: RecoveryStorage;
  const testDb = path.join(process.cwd(), '.ctrl-alt-pray', 'test-creative.sqlite');

  beforeEach(() => {
    if (fs.existsSync(testDb)) {
      try {
        fs.unlinkSync(testDb);
      } catch {}
    }
    storage = new RecoveryStorage(testDb);
  });

  describe('1. Heresy Mode (PLAN.md Section 13 & 18.A)', () => {
    it('activates Heresy Challenge explicitly when heresy_mode is true', () => {
      const session = createOrResumeRecoverySession(
        {
          project_key: 'creative-test',
          problem: 'Endpoint returns stale data despite edits',
          attempts: ['edited controller once', 'rebuilt dist once'],
          observations: ['same output observed in curl'],
          candidate_hypotheses: ['stale build artifact'],
          heresy_mode: true,
        },
        storage,
      );

      expect(session.heresy_challenge).toBeDefined();
      expect(session.heresy_challenge?.dogma).toBeDefined();
      expect(session.heresy_challenge?.counter_premise).toBeDefined();
      expect(session.heresy_challenge?.probe).toContain('pnpm clean');
      expect(session.heresy_challenge?.rite).toContain('WRONG ALTAR');
    });

    it('automatically triggers Heresy Challenge after 3 failed attempts', () => {
      const session = createOrResumeRecoverySession(
        {
          project_key: 'creative-test',
          problem: 'TypeError: db.connectPool is not a function',
          attempts: ['tried db.connectPool()', 'tried db.getPool()', 'tried db.createPool()'],
          observations: ['TypeError: db.connectPool is not a function'],
          candidate_hypotheses: ['method name misspelled'],
        },
        storage,
      );

      expect(session.pathology).toBe('phantom');
      expect(session.heresy_challenge).toBeDefined();
      expect(session.heresy_challenge?.dogma).toContain('imported function');
      expect(session.heresy_challenge?.counter_premise).toContain('exported a default export');
      expect(session.heresy_challenge?.probe).toContain('import(');
    });

    it('produces zombie heresy challenge for hanging commands', () => {
      const heresy = generateHeresyChallenge('ghost', 'Process is computing deep recursion');
      expect(heresy.dogma).toContain('actively working');
      expect(heresy.counter_premise).toContain('deadlocked');
      expect(heresy.probe).toContain('Inspect process CPU%');
      expect(heresy.rite).toContain('ZOMBIE EXORCISM');
    });

    it('produces poison chalice heresy challenge for false green tests', () => {
      const heresy = generateHeresyChallenge('false-green', 'All tests pass so code must work');
      expect(heresy.dogma).toContain('green test suite');
      expect(heresy.counter_premise).toContain('swallowed');
      expect(heresy.probe).toContain('assert.strictEqual(1, 2)');
      expect(heresy.rite).toContain('POISON CHALICE');
    });
  });

  describe('2. File Flapping Sentinel (PLAN.md Section 18.E)', () => {
    it('detects file oscillation when the same file is reverted and modified repeatedly', () => {
      const flapping = detectFileFlapping({
        attempts: [
          'modified src/auth.ts to add bearer token',
          'revert src/auth.ts back to basic auth',
          're-edit src/auth.ts with custom header',
        ],
        observations: ['auth still fails with 401'],
      });

      expect(flapping).toBeDefined();
      expect(flapping?.file).toBe('auth.ts');
      expect(flapping?.revertCount).toBeGreaterThanOrEqual(2);
      expect(flapping?.locked).toBe(true);
    });

    it('locks permissions and injects altar warning when file flapping is detected', () => {
      const session = createOrResumeRecoverySession(
        {
          project_key: 'creative-test',
          problem: 'Oscillation in payment processor',
          attempts: [
            'modified payment.ts logic',
            'revert payment.ts due to test failure',
            'oscillation observed in payment.ts',
          ],
          observations: ['status remains flaky'],
        },
        storage,
      );

      expect(session.file_flapping).toBeDefined();
      expect(session.file_flapping?.file).toBe('payment.ts');
      expect(session.file_flapping?.locked).toBe(true);
      expect(session.altar_warning).toContain('FLAPPING SENTINEL');
      expect(session.altar_warning).toContain('Permissions locked');
    });

    it('returns undefined if no oscillation or revert keywords exist', () => {
      const normal = detectFileFlapping({
        attempts: ['read src/config.ts', 'read src/server.ts'],
        observations: ['ports are open'],
      });
      expect(normal).toBeUndefined();
    });
  });

  describe('3. The Offering: Ask for the Missing Evidence (PLAN.md Section 13)', () => {
    it('generates a minimal input offering for minimal-counterexample strategy', () => {
      const offering = generateTheOffering({
        pathology: 'unspecified',
        strategy: 'minimal-counterexample',
        problem: '10MB JSON request causes payload parser timeout',
      });

      expect(offering.type).toBe('minimal_input');
      expect(offering.description).toContain('minimal self-contained input');
      expect(offering.template).toContain('Strip down to the smallest JSON/CLI input');
    });

    it('generates a product decision offering for human-checkpoint strategy', () => {
      const offering = generateTheOffering({
        pathology: 'unspecified',
        strategy: 'human-checkpoint',
        problem: 'Conflicting spec: should duplicate records be merged or rejected?',
      });

      expect(offering.type).toBe('product_decision');
      expect(offering.description).toContain('authoritative human product decision');
      expect(offering.template).toContain('Decision Offering Needed');
      expect(offering.template).toContain('Options:');
    });

    it('generates a known-good comparison offering for controlled-substitution strategy', () => {
      const offering = generateTheOffering({
        pathology: 'unspecified',
        strategy: 'controlled-substitution',
        problem: 'Staging environment succeeds while production fails',
      });

      expect(offering.type).toBe('known_good_comparison');
      expect(offering.description).toContain('working baseline');
      expect(offering.template).toContain('Known-Good Comparison Offering');
    });

    it('automatically embeds offering in session when evidence is insufficient or human input is required', () => {
      const session = createOrResumeRecoverySession(
        {
          project_key: 'creative-test',
          problem: 'Which behavior is required when duplicate emails sign up?',
          attempts: [],
          observations: [],
        },
        storage,
      );

      expect(session.next_action).toBe('ask_user');
      expect(session.offering).toBeDefined();
      expect(session.offering?.type).toBe('product_decision');
    });
  });

  describe('4. Resurrection Packets (PLAN.md Section 13)', () => {
    it('generates a clean markdown resurrection packet without failed speculative narrative', () => {
      const session = createOrResumeRecoverySession(
        {
          project_key: 'resurrection-test',
          problem: 'Intermittent socket hang up in connection pool',
          constraints: ['Cannot modify database schema', 'Must use Node 22'],
          observations: [
            'Port 5432 is responding to pg_isready',
            'Connection pool max set to 20',
          ],
          attempts: [
            'Tried increasing timeout to 60s (did not resolve)',
            'Tried restarting postgres container (same hang)',
          ],
          candidate_hypotheses: ['Pool leak caused by unreleased client in error handler'],
          heresy_mode: true,
        },
        storage,
      );

      const packet = generateResurrectionPacket(session);

      expect(packet).toContain('# 🕯️ CTRL ALT PRAY - RESURRECTION PACKET');
      expect(packet).toContain(`Session ID:** \`${session.session_id}\``);
      expect(packet).toContain('Cannot modify database schema');
      expect(packet).toContain('✓ Port 5432 is responding to pg_isready');
      expect(packet).toContain('✗ Tried increasing timeout to 60s');
      expect(packet).toContain('Active Falsification Probe');
      expect(packet).toContain('Heresy Challenge');
      expect(packet).toContain('Do NOT re-read full prior transcripts');
      expect(packet).toContain('Execute the single bounded probe');
    });

    it('runs runResurrect without error on an existing session', () => {
      const session = createOrResumeRecoverySession(
        {
          project_key: 'resurrect-cli-test',
          problem: 'Testing CLI print',
        },
        storage,
      );

      expect(() => runResurrect(session.session_id)).not.toThrow();
    });
  });

  describe('5. The Prayer Book: 12 Canonical Recipes (PLAN.md Section 13)', () => {
    it('contains all 12 canonical recovery recipes', () => {
      expect(CANONICAL_RECIPES.length).toBe(12);

      const strategies = CANONICAL_RECIPES.map((r) => r.strategy);
      expect(strategies).toContain('wrong-altar');
      expect(strategies).toContain('check-the-check');
      expect(strategies).toContain('ghost-terminal-breaker');
      expect(strategies).toContain('api-ground-truth');
      expect(strategies).toContain('clean-slate-rollback');
      expect(strategies).toContain('environment-triage');
      expect(strategies).toContain('assumption-audit');
      expect(strategies).toContain('minimal-counterexample');
      expect(strategies).toContain('divide-and-conquer');
      expect(strategies).toContain('controlled-substitution');
      expect(strategies).toContain('boundary-check');
      expect(strategies).toContain('human-checkpoint');
    });

    it('each canonical recipe adheres to the strict contract specification', () => {
      for (const recipe of CANONICAL_RECIPES) {
        expect(recipe.title).toBeTruthy();
        expect(recipe.trigger).toBeTruthy();
        expect(recipe.probePattern).toBeTruthy();
        expect(recipe.outcomeBranches).toBeTruthy();
        expect(recipe.safety).toBeTruthy();
      }
    });

    it('executes runPrayerBook CLI without error', () => {
      expect(() => runPrayerBook()).not.toThrow();
    });
  });
});
