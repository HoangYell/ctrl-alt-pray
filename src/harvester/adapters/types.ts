export interface TranscriptAdapter {
  name: string;
  detect(workspaceDir: string): boolean;
  harvest(workspaceDir: string): Promise<string[]>;
}
