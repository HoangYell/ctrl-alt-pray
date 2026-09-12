import '../dist/suppress-warnings.js';
import { createOrResumeRecoverySession, reportOutcome } from '../dist/recovery.js';
import { generateSecondOpinion } from '../dist/critique.js';
import { generateResurrectionPacket } from '../dist/resurrection.js';

console.log('🕯️  [STEP 1]: Summoning the Altar for a stuck loop...');
const session = createOrResumeRecoverySession({
  project_key: 'quickstart-app',
  problem: 'API test failing with status 401 Unauthorized after 2 patch attempts',
  attempts: [
    'Updated Authorization header to Bearer test-token',
    'Hardcoded token in request middleware',
  ],
  observations: [
    'Request hits /api/v1/protected',
    'Response status is 401 Unauthorized',
    'Server logs: JWT_EXPIRED',
  ],
});

console.log(`\nActive Strategy: ${session.experiment?.strategy}`);
console.log(`Rite: ${session.rite} - "${session.incantation}"`);
console.log(`Question: ${session.experiment?.question}`);
console.log(`Probe: ${session.experiment?.probe}`);
console.log(`Falsification Score: ${session.falsification?.score}/100`);

console.log("\n⚖️  [STEP 2]: Generating Devil's Advocate Second Opinion...");
const secondOpinion = await generateSecondOpinion(session);
console.log(`Critique: ${secondOpinion.critique}`);
console.log(`Blind Spot: ${secondOpinion.blind_spot_warning}`);

console.log('\n🧪  [STEP 3]: Executing probe and reporting outcome...');
const updated = reportOutcome({
  project_key: 'quickstart-app',
  session_id: session.session_id,
  expected_revision: session.revision,
  experiment_id: session.experiment_id,
  outcome: 'supports',
  observations: ['Mock JWT token generator verified; valid signature passes test'],
  checks: [{ name: 'auth-jwt-test', result: 'pass' }],
});
console.log(`Updated Decision: ${updated.decision}`);
console.log(`Verification Status: ${updated.verification_status}`);

console.log('\n⚰️  [STEP 4]: Generating clean-context Resurrection Packet...');
const packet = generateResurrectionPacket(session.session_id);
console.log('Resurrection Packet Preview:');
console.log(packet.slice(0, 320) + '...\n');
console.log('✨ Demo completed successfully. Loop broken in 3 steps.');
