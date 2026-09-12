export const APOLOGY_PATTERNS = [
  /apologiz(e|ing|ed)/i,
  /my apologies/i,
  /sorry/i,
  /so sorry/i,
  /forgive me/i,
  /my mistake/i,
  /my bad/i,
  /i was wrong/i,
  /pardon/i,
  /pardon me/i,
];

export function detectApologySlop(text: string): boolean {
  return APOLOGY_PATTERNS.some((pattern) => pattern.test(text));
}

export function rollDivineFavor(context: { attemptsCount: number; hasApology: boolean }): { score: number; verdict: string } {
  let score = Math.floor(Math.random() * 31) + 65; // 65-95 base
  if (context.hasApology) score -= 25;
  if (context.attemptsCount > 3) score -= 15;
  score = Math.max(1, Math.min(100, score));

  let verdict = 'Transcendent Grace (Divine Favor)';
  if (score < 40) verdict = 'Dire Wrath (Altar Scorn - Apologies Detected)';
  else if (score < 60) verdict = 'Trial of Patience (Temperate Grace)';
  else if (score < 80) verdict = 'Auspicious Omen (Fortunate Insight)';
  return { score, verdict };
}

export function redactSecrets(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let sanitized = text;
  sanitized = sanitized.replace(/ghp_[a-zA-Z0-9]{36,}/g, 'ghp_REDACTED');
  sanitized = sanitized.replace(/github_pat_[a-zA-Z0-9_]{50,}/g, 'github_pat_REDACTED');
  sanitized = sanitized.replace(/sk-[a-zA-Z0-9_\-]{20,}/g, 'sk-REDACTED');
  sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi, 'Bearer REDACTED');
  sanitized = sanitized.replace(/AKIA[0-9A-Z]{16}/g, 'AKIA_REDACTED');
  return sanitized;
}
