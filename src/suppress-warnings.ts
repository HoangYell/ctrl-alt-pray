// Suppress Node.js 22+ ExperimentalWarning for node:sqlite to keep CLI and MCP stdio clean
const originalEmitWarning = process.emitWarning;
process.emitWarning = (warning: string | Error, ...args: any[]) => {
  if (typeof warning === 'string' && warning.includes('SQLite is an experimental feature')) {
    return;
  }
  if (warning instanceof Error && warning.message.includes('SQLite is an experimental feature')) {
    return;
  }
  return Reflect.apply(originalEmitWarning, process, [warning, ...args]);
};
