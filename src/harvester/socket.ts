import net from 'node:net';
import type { SocketHarvestResult } from './types.js';

export const STANDARD_DEV_PORTS = [3000, 4321, 5173, 8080, 9222];

/**
 * Probes a specific TCP port cross-platform using Node.js net.createServer.
 * If listening fails with EADDRINUSE, the port is occupied by a running server.
 */
export function isPortOccupied(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close(() => resolve(false));
    });

    try {
      server.listen(port, '127.0.0.1');
    } catch {
      resolve(true);
    }
  });
}

export async function harvestSocketState(ports: number[] = STANDARD_DEV_PORTS): Promise<SocketHarvestResult> {
  const occupiedPorts: number[] = [];

  for (const port of ports) {
    const occupied = await isPortOccupied(port);
    if (occupied) {
      occupiedPorts.push(port);
    }
  }

  return {
    occupiedPorts,
    checkedPorts: ports,
  };
}
