/**
 * Audit Logging Middleware
 * 
 * Logs all requests with:
 * - request_id
 * - timestamp
 * - api_key_id
 * - endpoint
 * - result (status code)
 * - contract_hash (if applicable)
 * - artifact_hash (if applicable)
 * - latency_ms
 */

import { Request, Response, NextFunction } from 'express';

// =============================================================================
// Types
// =============================================================================

export interface AuditLogEntry {
  request_id: string;
  timestamp: string;
  api_key_id: string | null;
  api_key_name: string | null;
  method: string;
  path: string;
  status_code: number;
  latency_ms: number;
  contract_hash: string | null;
  artifact_hash: string | null;
  error: string | null;
  ip: string | null;
}

// =============================================================================
// Audit Log Store (In-memory, append-only)
// =============================================================================

class AuditLogStore {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 10000; // Keep last 10k logs in memory

  append(entry: AuditLogEntry): void {
    this.logs.push(entry);
    
    // Trim if too many logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console in structured format
    const logLine = [
      `[AUDIT]`,
      entry.request_id.slice(0, 8),
      entry.method,
      entry.path,
      entry.status_code,
      `${entry.latency_ms}ms`,
      entry.api_key_id || 'anonymous',
      entry.contract_hash ? `contract:${entry.contract_hash.slice(0, 16)}...` : '',
      entry.error || '',
    ].filter(Boolean).join(' ');

    console.log(logLine);
  }

  getRecent(limit: number = 100): AuditLogEntry[] {
    return this.logs.slice(-limit).reverse();
  }

  getByRequestId(requestId: string): AuditLogEntry | undefined {
    return this.logs.find(log => log.request_id === requestId);
  }

  getByKeyId(keyId: string, limit: number = 100): AuditLogEntry[] {
    return this.logs
      .filter(log => log.api_key_id === keyId)
      .slice(-limit)
      .reverse();
  }

  getStats(): {
    total: number;
    byStatus: Record<number, number>;
    byEndpoint: Record<string, number>;
    avgLatencyMs: number;
  } {
    const byStatus: Record<number, number> = {};
    const byEndpoint: Record<string, number> = {};
    let totalLatency = 0;

    for (const log of this.logs) {
      byStatus[log.status_code] = (byStatus[log.status_code] || 0) + 1;
      byEndpoint[log.path] = (byEndpoint[log.path] || 0) + 1;
      totalLatency += log.latency_ms;
    }

    return {
      total: this.logs.length,
      byStatus,
      byEndpoint,
      avgLatencyMs: this.logs.length > 0 ? Math.round(totalLatency / this.logs.length) : 0,
    };
  }
}

export const auditLogStore = new AuditLogStore();

// =============================================================================
// Middleware
// =============================================================================

/**
 * Audit logging middleware
 * 
 * Must be applied early in the middleware chain to capture timing.
 * Logs after response is sent.
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Capture original end function
  const originalEnd = res.end;
  let responseBody: string | undefined;

  // Override end to capture response
  res.end = function(chunk?: any, ...args: any[]): Response {
    if (chunk && typeof chunk === 'string') {
      responseBody = chunk;
    } else if (chunk && Buffer.isBuffer(chunk)) {
      responseBody = chunk.toString('utf8');
    }
    return originalEnd.apply(res, [chunk, ...args] as any);
  };

  // Log after response is finished
  res.on('finish', () => {
    const latencyMs = Date.now() - startTime;

    // Extract hashes from response body if present
    let contractHash: string | null = null;
    let artifactHash: string | null = null;
    let error: string | null = null;

    if (responseBody) {
      try {
        const body = JSON.parse(responseBody);
        contractHash = body.hash || body.contract_hash || null;
        artifactHash = body.artifact_hash || null;
        error = body.error || null;
      } catch {
        // Not JSON, ignore
      }
    }

    const entry: AuditLogEntry = {
      request_id: req.requestId || 'unknown',
      timestamp: new Date().toISOString(),
      api_key_id: req.principal?.keyId || null,
      api_key_name: req.principal?.name || null,
      method: req.method,
      path: req.path,
      status_code: res.statusCode,
      latency_ms: latencyMs,
      contract_hash: contractHash,
      artifact_hash: artifactHash,
      error,
      ip: req.ip || null,
    };

    auditLogStore.append(entry);
  });

  next();
}
