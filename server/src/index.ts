/**
 * DCG Engine HTTP Server
 * 
 * REST API for Meta DDR Engine operations.
 * Runs engine server-side to avoid browser crypto limitations.
 * 
 * STABILITY CONTRACT (v1.0.0):
 * - Canonical JSON: Keys sorted alphabetically, no whitespace
 * - Hash Algorithm: SHA-256
 * - Artifact Schema Version: 1.0.0
 * - API Version: v1
 */

import express from 'express';
import cors from 'cors';
import { validateRouter } from './routes/validate';
import { simulateRouter } from './routes/simulate';
import { finalizeRouter } from './routes/finalize';
import { healthRouter } from './routes/health';
import { verifyRouter } from './routes/verify';
import { exportRouter } from './routes/export';
import { contractsRouter } from './routes/contracts';
import {
  requestIdMiddleware,
  authMiddleware,
  optionalAuthMiddleware,
  rateLimitMiddleware,
  auditMiddleware,
  requireScope,
} from './middleware';

// =============================================================================
// Version Constants (FROZEN - do not change without major version bump)
// =============================================================================
export const ENGINE_VERSION = '1.0.0';
export const ARTIFACT_SCHEMA_VERSION = '1.0.0';
export const API_VERSION = 'v1';
export const HASH_ALGORITHM = 'SHA-256';

const app = express();
const PORT = process.env.PORT || 3001;

// =============================================================================
// Core Middleware
// =============================================================================
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Request ID (must be first)
app.use(requestIdMiddleware);

// Audit logging (captures timing, must be early)
app.use(auditMiddleware);

// =============================================================================
// API v1 Routes (versioned, stable, with auth + rate limits)
// =============================================================================

// Health check - public, no auth required
app.use('/api/v1/health', optionalAuthMiddleware, healthRouter);

// Protected endpoints - require auth + rate limits
app.use('/api/v1/validate', authMiddleware, rateLimitMiddleware, requireScope('contract:write'), validateRouter);
app.use('/api/v1/simulate', authMiddleware, rateLimitMiddleware, requireScope('contract:write'), simulateRouter);
app.use('/api/v1/finalize', authMiddleware, rateLimitMiddleware, requireScope('contract:finalize'), finalizeRouter);
app.use('/api/v1/verify', authMiddleware, rateLimitMiddleware, requireScope('artifact:verify'), verifyRouter);
app.use('/api/v1/export', authMiddleware, rateLimitMiddleware, requireScope('artifact:export'), exportRouter);
app.use('/api/v1/contracts', authMiddleware, rateLimitMiddleware, requireScope('contract:read'), contractsRouter);

// Legacy routes (deprecated, will be removed in v2) - no auth for backward compat
app.use('/api/health', healthRouter);
app.use('/api/validate', validateRouter);
app.use('/api/simulate', simulateRouter);
app.use('/api/finalize', finalizeRouter);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           DCG Engine Server v${ENGINE_VERSION}                        ║
║                                                           ║
║   API Version:    ${API_VERSION}                                       ║
║   Schema Version: ${ARTIFACT_SCHEMA_VERSION}                                    ║
║   Hash Algorithm: ${HASH_ALGORITHM}                                  ║
║                                                           ║
║   Base URL:  http://localhost:${PORT}/api/v1                   ║
║                                                           ║
║   Endpoints:                                              ║
║     GET  /api/v1/health           - Health check          ║
║     POST /api/v1/validate/stage   - Validate a stage      ║
║     POST /api/v1/simulate         - Run simulation        ║
║     POST /api/v1/finalize         - Finalize contract     ║
║     POST /api/v1/verify           - Verify artifact hash  ║
║     POST /api/v1/export/policy    - Export OPA bundle     ║
║     GET  /api/v1/contracts/:hash  - Contract lineage      ║
║                                                           ║
║   STABILITY CONTRACT: Frozen. Do not change without       ║
║   major version bump.                                     ║
║                                                           ║
║   Auth: ${process.env.DCG_AUTH_ENABLED !== 'false' ? 'ENABLED' : 'DISABLED (dev mode)'}                                      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export { app };
