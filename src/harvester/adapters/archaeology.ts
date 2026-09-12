import fs from 'node:fs';
import path from 'node:path';
import type { TranscriptAdapter } from './types.js';

export class TestArchaeologyAdapter implements TranscriptAdapter {
  public readonly name = 'test-archaeology';

  private readonly testDirs = [
    '.vitest',
    '.pytest_cache',
    'test-results',
    'coverage',
    '.nyc_output',
  ];

  public detect(workspaceDir: string): boolean {
    return this.testDirs.some((d) => fs.existsSync(path.join(workspaceDir, d)));
  }

  public async harvest(workspaceDir: string): Promise<string[]> {
    const observations: string[] = [];

    for (const d of this.testDirs) {
      const fullPath = path.join(workspaceDir, d);
      if (fs.existsSync(fullPath)) {
        try {
          const stats = fs.statSync(fullPath);
          const ageSeconds = Math.round((Date.now() - stats.mtimeMs) / 1000);
          observations.push(
            `Test artifact directory '${d}' detected (last modified ${ageSeconds}s ago).`
          );

          // If test-results has zero-length files or empty outputs
          if (d === 'test-results') {
            const files = fs.readdirSync(fullPath);
            if (files.length === 0) {
              observations.push(
                `Test archaeology warning: 'test-results' exists but is empty (potential check-the-check).`
              );
            }
          }
        } catch {
          // Graceful degradation
        }
      }
    }

    return observations;
  }
}
