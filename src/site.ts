import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

/**
 * Serves the marketing homepage and interactive simulator locally (docs/index.html).
 */
export function runHomepage(port = 3901): void {
  // Resolve docs path relative to current package directory
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(currentDir, '..');
  const docsDir = path.join(projectRoot, 'docs');

  if (!fs.existsSync(docsDir)) {
    console.error(`\n  [ERROR]: docs/ directory not found at ${docsDir}\n`);
    return;
  }

  const server = http.createServer((req, res) => {
    let reqPath = req.url === '/' || !req.url ? '/index.html' : req.url;
    // Strip query parameters
    reqPath = reqPath.split('?')[0];

    const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(docsDir, safePath);

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.webp': 'image/webp',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
    };

    const mime = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`
  ┌──────────────────────────────────────────────────────────┐
  │               CTRL ALT PRAY MARKETING SITE               │
  │            "When Ctrl+Z isn't enough. Pray."             │
  └──────────────────────────────────────────────────────────┘

  ✔ Homepage Live:    http://127.0.0.1:${port}
  ✔ Local Directory:  ${docsDir}
  ✔ Interactive Sim:  http://127.0.0.1:${port}#simulator

  Press Ctrl+C to stop the homepage server.
`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`\n  Port ${port} in use. Attempting port ${port + 1}...`);
      runHomepage(port + 1);
    } else {
      console.error('Failed to start homepage server:', err.message);
    }
  });
}
