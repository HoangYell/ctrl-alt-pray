import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { getDefaultStorage } from './storage.js';
import type { RecoverySession } from './recovery.js';

export function generateDashboardHtml(sessions: RecoverySession[]): string {
  const totalSessions = sessions.length;
  let recoveredCount = 0;
  const strategiesCount: Record<string, number> = {};

  for (const s of sessions) {
    if (s.assessment === 'possible_loop' || s.assessment === 'insufficient_evidence') {
      recoveredCount++;
    }
    if (s.experiment?.strategy) {
      strategiesCount[s.experiment.strategy] = (strategiesCount[s.experiment.strategy] || 0) + 1;
    }
  }

  const estimatedTokens = totalSessions * 8500;
  const savedDollars = ((estimatedTokens / 1_000_000) * 15).toFixed(2);
  const recoveryRate = totalSessions > 0 ? Math.round((recoveredCount / totalSessions) * 100) : 0;

  const strategyEntries = Object.entries(strategiesCount).sort((a, b) => b[1] - a[1]);

  const rowsHtml = sessions.map((s) => {
    const strategy = s.experiment?.strategy || 'none';
    const dateStr = s.updated_at ? new Date(s.updated_at).toLocaleString() : 'N/A';
    const riteName = s.rite || 'Standard Rite';
    const badgeColor = s.assessment === 'possible_loop' ? 'badge-amber' : 'badge-emerald';

    return `
      <tr class="table-row">
        <td class="font-mono text-sm">${s.session_id}</td>
        <td class="text-sm font-medium text-slate-200">${s.project_key}</td>
        <td>
          <span class="badge ${badgeColor}">${s.assessment}</span>
        </td>
        <td>
          <div class="text-sm font-semibold text-slate-200">${strategy}</div>
          <div class="text-xs text-slate-400">${riteName}</div>
        </td>
        <td class="text-xs text-slate-400 font-mono">rev ${s.revision}</td>
        <td class="text-xs text-slate-400">${dateStr}</td>
        <td>
          <button class="btn-inspect" onclick="openSessionModal('${s.session_id}')">
            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Inspect
          </button>
        </td>
      </tr>
    `;
  }).join('');

  const chartBarsHtml = strategyEntries.map(([name, count]) => {
    const pct = Math.max(8, Math.round((count / Math.max(1, totalSessions)) * 100));
    return `
      <div class="bar-group">
        <div class="bar-label-wrap">
          <span class="bar-label font-mono">${name}</span>
          <span class="bar-val">${count} (${pct}%)</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  }).join('');

  const sessionsJson = JSON.stringify(sessions).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ctrl Alt Pray — Recovery Ledger & Telemetry</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #0f172a;
      --card-sub: #1e293b;
      --border: rgba(255, 255, 255, 0.08);
      --border-focus: rgba(255, 255, 255, 0.16);
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --emerald: #10b981;
      --amber: #f59e0b;
      --rose: #f43f5e;
      --indigo: #6366f1;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text-primary);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.5;
      padding: 32px 24px;
      -webkit-font-smoothing: antialiased;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 32px;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon {
      width: 40px; height: 40px; border-radius: 8px;
      background: linear-gradient(135deg, #1e293b, #0f172a);
      border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      color: var(--amber);
    }
    .brand-title { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em; }
    .brand-sub { font-size: 0.8rem; color: var(--text-secondary); }
    .status-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 9999px;
      background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2);
      color: var(--emerald); font-size: 0.75rem; font-weight: 600;
    }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--emerald); }
    
    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
    }
    .metric-label { font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-bottom: 8px; }
    .metric-value { font-size: 2rem; font-weight: 700; letter-spacing: -0.03em; color: var(--text-primary); }
    .metric-desc { font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; }

    /* Layout Split */
    .content-split { display: grid; grid-template-columns: 1fr 340px; gap: 24px; margin-bottom: 32px; }
    @media (max-width: 900px) { .content-split { grid-template-columns: 1fr; } }
    
    .panel {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
    }
    .panel-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: center;
    }
    .panel-title { font-size: 0.95rem; font-weight: 600; }
    
    /* Table */
    .table-container { width: 100%; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 12px 16px; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); background: rgba(0,0,0,0.1); }
    td { padding: 14px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    .table-row:hover { background: rgba(255, 255, 255, 0.02); }

    /* Badges */
    .badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
    .badge-amber { background: rgba(245, 158, 11, 0.12); color: var(--amber); border: 1px solid rgba(245, 158, 11, 0.25); }
    .badge-emerald { background: rgba(16, 185, 129, 0.12); color: var(--emerald); border: 1px solid rgba(16, 185, 129, 0.25); }

    /* Chart */
    .chart-box { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .bar-group { display: flex; flex-direction: column; gap: 6px; }
    .bar-label-wrap { display: flex; justify-content: space-between; font-size: 0.8rem; }
    .bar-label { color: var(--text-secondary); }
    .bar-val { color: var(--text-primary); font-weight: 600; }
    .bar-track { height: 8px; background: var(--card-sub); border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; background: linear-gradient(90deg, var(--indigo), #818cf8); border-radius: 4px; }

    /* Buttons */
    .btn-inspect {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--card-sub); border: 1px solid var(--border);
      color: var(--text-primary); padding: 6px 10px; border-radius: 6px;
      font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: 0.15s ease;
    }
    .btn-inspect:hover { border-color: var(--border-focus); background: rgba(255,255,255,0.08); }
    .icon-sm { width: 14px; height: 14px; }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75);
      display: none; align-items: center; justify-content: center;
      padding: 20px; z-index: 100;
    }
    .modal {
      background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 16px; width: 100%; max-width: 650px; max-height: 85vh;
      overflow-y: auto; padding: 24px;
    }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .btn-close { background: none; border: none; color: var(--text-muted); cursor: pointer; }
    .btn-close:hover { color: var(--text-primary); }
    .detail-section { margin-bottom: 16px; }
    .detail-heading { font-size: 0.75rem; text-transform: uppercase; color: var(--text-secondary); font-weight: 700; margin-bottom: 6px; }
    .detail-box { background: var(--card-sub); border: 1px solid var(--border); border-radius: 8px; padding: 12px; font-size: 0.85rem; font-family: monospace; white-space: pre-wrap; word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="brand">
        <div class="brand-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div>
          <h1 class="brand-title">Ctrl Alt Pray</h1>
          <p class="brand-sub">Epistemic Ledger & Loop Recovery Telemetry</p>
        </div>
      </div>
      <div class="status-badge">
        <div class="status-dot"></div>
        SQLite WAL Active
      </div>
    </header>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Recorded Sessions</div>
        <div class="metric-value">${totalSessions}</div>
        <div class="metric-desc">Autonomous debugging cycles</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Loops Intercepted</div>
        <div class="metric-value" style="color: var(--amber);">${recoveredCount}</div>
        <div class="metric-desc">Repetitive loops halted</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Est. Token Savings</div>
        <div class="metric-value" style="color: var(--emerald);">$${savedDollars}</div>
        <div class="metric-desc">~${estimatedTokens.toLocaleString()} tokens preserved</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Recovery Rate</div>
        <div class="metric-value" style="color: var(--indigo);">${recoveryRate}%</div>
        <div class="metric-desc">Falsification exit velocity</div>
      </div>
    </div>

    <div class="content-split">
      <div class="panel">
        <div class="panel-header">
          <h2 class="panel-title">Active Recovery Sessions</h2>
          <span class="text-xs text-slate-400 font-mono">${totalSessions} total</span>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Project</th>
                <th>Assessment</th>
                <th>Strategy & Rite</th>
                <th>Rev</th>
                <th>Updated</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="7" class="text-center py-8 text-slate-400">No sessions recorded yet. Run `npx ctrl-alt-pray init` in your project.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h2 class="panel-title">Pathology Breakdown</h2>
        </div>
        <div class="chart-box">
          ${chartBarsHtml || '<p class="text-xs text-slate-400">No strategy metrics recorded yet.</p>'}
        </div>
      </div>
    </div>
  </div>

  <!-- Detail Modal -->
  <div id="sessionModal" class="modal-overlay" onclick="closeSessionModal(event)">
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3 id="modalTitle" class="panel-title font-mono text-sm">Session Inspection</h3>
        <button class="btn-close" onclick="closeModal()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="detail-section">
        <div class="detail-heading">Active Strategy & Incantation</div>
        <div id="modalStrategy" class="detail-box"></div>
      </div>
      <div class="detail-section">
        <div class="detail-heading">Context Handoff</div>
        <div id="modalHandoff" class="detail-box"></div>
      </div>
      <div class="detail-section">
        <div class="detail-heading">Known Verified Facts</div>
        <div id="modalFacts" class="detail-box"></div>
      </div>
      <div class="detail-section">
        <div class="detail-heading">Rejected Approaches (Avoid Repeating)</div>
        <div id="modalRejected" class="detail-box"></div>
      </div>
    </div>
  </div>

  <script>
    const SESSIONS = ${sessionsJson};

    function openSessionModal(sessionId) {
      const s = SESSIONS.find(x => x.session_id === sessionId);
      if (!s) return;

      document.getElementById('modalTitle').textContent = 'Session: ' + s.session_id + ' (Rev ' + s.revision + ')';
      document.getElementById('modalStrategy').textContent = (s.rite || '') + '\\n' + (s.incantation || '') + '\\nStrategy: ' + (s.experiment?.strategy || 'none');
      document.getElementById('modalHandoff').textContent = s.handoff || 'None';
      document.getElementById('modalFacts').textContent = (s.known_facts || []).join('\\n') || 'None observed';
      document.getElementById('modalRejected').textContent = (s.rejected_approaches || []).join('\\n') || 'None recorded';

      document.getElementById('sessionModal').style.display = 'flex';
    }

    function closeModal() {
      document.getElementById('sessionModal').style.display = 'none';
    }

    function closeSessionModal(e) {
      if (e.target.id === 'sessionModal') {
        closeModal();
      }
    }
  </script>
</body>
</html>`;
}

export function exportDashboardFile(storage: any = getDefaultStorage(), targetPath?: string): string {
  const sessions = storage.listSessions();
  const html = generateDashboardHtml(sessions);

  const outPath = targetPath || path.join(os.homedir(), '.ctrl-alt-pray', 'dashboard.html');
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outPath, html, 'utf-8');
  return outPath;
}

export function runDashboard(port = 3900): void {
  const filePath = exportDashboardFile();
  const storage = getDefaultStorage();

  const server = http.createServer((_req, res) => {
    const sessions = storage.listSessions();
    const html = generateDashboardHtml(sessions);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`
  ┌──────────────────────────────────────────────────────────┐
  │              CTRL ALT PRAY VISUAL DASHBOARD              │
  │            "When Ctrl+Z isn't enough. Pray."             │
  └──────────────────────────────────────────────────────────┘

  ✔ Dashboard Live:  http://127.0.0.1:${port}
  ✔ Offline Export:  ${filePath}

  Press Ctrl+C to stop dashboard server.
`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`\n  Port ${port} in use. Offline report generated at: ${filePath}\n`);
    } else {
      console.error('Failed to start dashboard server:', err.message);
    }
  });
}
