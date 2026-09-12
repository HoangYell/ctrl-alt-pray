# Strong Recovery Prompt Baseline (Condition 2)

Use this prompt when an agent is stuck in an unproductive debugging loop without `ctrl-alt-pray`:

---

### Loop Recovery & Assumption Audit Protocol

You have attempted multiple changes without resolving the defect or generating new information. Stop writing code immediately.

Follow these 4 mandatory steps before modifying any more files:

1. **Observed Facts vs. Assumptions**:
   - List 2-3 empirical facts that you have directly observed from terminal output, exit codes, or logs.
   - List what assumptions you have been treating as true without verification (e.g. "the token is expired", "this function is called").

2. **One Discriminating Experiment**:
   - Propose ONE small, bounded, low-risk test or inspection that will strictly separate competing hypotheses.
   - What exact observation will prove your hypothesis TRUE?
   - What exact observation will prove your hypothesis FALSE?

3. **Check the Measurement**:
   - Verify that your test or diagnostic output is actually executing against the modified code (not a cached build artifact, wrong port, or stale process).

4. **Human Decision Checkpoint**:
   - If this failure stems from an ambiguous product requirement, conflicting specification, or missing external credential, stop and ask the user a specific, multiple-choice question. Do not guess the business logic.

Execute the single discriminating probe now. Do not guess a second patch if the first fails.
