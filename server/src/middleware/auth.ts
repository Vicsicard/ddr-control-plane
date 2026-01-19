/**
 * Authentication & Authorization Middleware
 * 
 * API key-based authentication with scoped authorization.
 * Keys are stored hashed (SHA-256 with pepper).
 * 
 * Key Types:
 * - studio: Client-facing, limited scope
 * - ci: Automated workflows, broader scope
 * - admin: Full access including contract listing
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// =============================================================================
// Types
// =============================================================================

export type Scope = 
  | 'contract:write'
  | 'contract:finalize'
  | 'contract:read'
  | 'artifact:verify'
  | 'artifact:export'
  | 'public';

export type RateClass = 'studio' | 'ci' | 'admin';

export interface ApiKey {
  id: string;
  name: string;
  hashedKey: string;
  scopes: Scope[];
  rateClass: RateClass;
  createdAt: string;
  lastUsedAt: string | null;
  enabled: boolean;
}

export interface Principal {
  keyId: string;
  name: string;
  scopes: Scope[];
  rateClass: RateClass;
}

declare global {
  namespace Express {
    interface Request {
      principal?: Principal;
      requestId: string;
    }
  }
}

// =============================================================================
// Configuration
// =============================================================================

const AUTH_PEPPER = process.env.DCG_AUTH_PEPPER || 'dcg-dev-pepper-change-in-prod';
const AUTH_ENABLED = process.env.DCG_AUTH_ENABLED !== 'false';

// =============================================================================
// Key Store (In-memory for now, would be DB in production)
// =============================================================================

class ApiKeyStore {
  private keys: Map<string, ApiKey> = new Map();

  constructor() {
    // Initialize with default development keys
    this.initDevKeys();
  }

  private initDevKeys(): void {
    // Development keys - NEVER use in production
    const devKeys = [
      {
        id: 'key_studio_dev',
        name: 'Studio Development Key',
        plainKey: 'dcg_studio_dev_key_12345',
        scopes: ['contract:write', 'contract:finalize', 'artifact:verify', 'artifact:export'] as Scope[],
        rateClass: 'studio' as RateClass,
      },
      {
        id: 'key_ci_dev',
        name: 'CI Development Key',
        plainKey: 'dcg_ci_dev_key_67890',
        scopes: ['contract:read', 'artifact:verify', 'artifact:export'] as Scope[],
        rateClass: 'ci' as RateClass,
      },
      {
        id: 'key_admin_dev',
        name: 'Admin Development Key',
        plainKey: 'dcg_admin_dev_key_admin',
        scopes: ['contract:write', 'contract:finalize', 'contract:read', 'artifact:verify', 'artifact:export'] as Scope[],
        rateClass: 'admin' as RateClass,
      },
    ];

    for (const key of devKeys) {
      this.keys.set(key.id, {
        id: key.id,
        name: key.name,
        hashedKey: this.hashKey(key.plainKey),
        scopes: key.scopes,
        rateClass: key.rateClass,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        enabled: true,
      });
    }

    console.log(`[AUTH] Initialized ${this.keys.size} development API keys`);
  }

  private hashKey(plainKey: string): string {
    return crypto
      .createHash('sha256')
      .update(plainKey + AUTH_PEPPER)
      .digest('hex');
  }

  findByPlainKey(plainKey: string): ApiKey | undefined {
    const hashedKey = this.hashKey(plainKey);
    for (const key of this.keys.values()) {
      if (key.hashedKey === hashedKey && key.enabled) {
        return key;
      }
    }
    return undefined;
  }

  updateLastUsed(keyId: string): void {
    const key = this.keys.get(keyId);
    if (key) {
      key.lastUsedAt = new Date().toISOString();
    }
  }

  getAll(): ApiKey[] {
    return Array.from(this.keys.values());
  }
}

export const apiKeyStore = new ApiKeyStore();

// =============================================================================
// Middleware: Request ID
// =============================================================================

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.requestId = crypto.randomUUID();
  next();
}

// =============================================================================
// Middleware: Authentication
// =============================================================================

export function authMiddleware(req: Request, res: Response, next: NextFunction): Response | void {
  // Skip auth if disabled (development mode)
  if (!AUTH_ENABLED) {
    req.principal = {
      keyId: 'anonymous',
      name: 'Anonymous (auth disabled)',
      scopes: ['contract:write', 'contract:finalize', 'contract:read', 'artifact:verify', 'artifact:export'],
      rateClass: 'admin',
    };
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Missing Authorization header',
      request_id: req.requestId,
    });
  }

  // Parse Bearer token
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid Authorization header format. Expected: Bearer <token>',
      request_id: req.requestId,
    });
  }

  const token = match[1];
  const apiKey = apiKeyStore.findByPlainKey(token);

  if (!apiKey) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid API key',
      request_id: req.requestId,
    });
  }

  // Update last used timestamp
  apiKeyStore.updateLastUsed(apiKey.id);

  // Attach principal to request
  req.principal = {
    keyId: apiKey.id,
    name: apiKey.name,
    scopes: apiKey.scopes,
    rateClass: apiKey.rateClass,
  };

  next();
}

// =============================================================================
// Middleware: Scope Guard
// =============================================================================

export function requireScope(...requiredScopes: Scope[]) {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    // Public endpoints don't require auth
    if (requiredScopes.includes('public')) {
      return next();
    }

    if (!req.principal) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
        request_id: req.requestId,
      });
    }

    const hasScope = requiredScopes.some(scope => req.principal!.scopes.includes(scope));

    if (!hasScope) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Insufficient permissions',
        missing_scope: requiredScopes.filter(s => !req.principal!.scopes.includes(s)),
        request_id: req.requestId,
      });
    }

    next();
  };
}

// =============================================================================
// Middleware: Optional Auth (for public endpoints that benefit from auth)
// =============================================================================

export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // No auth provided, continue without principal
    return next();
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return next();
  }

  const token = match[1];
  const apiKey = apiKeyStore.findByPlainKey(token);

  if (apiKey) {
    apiKeyStore.updateLastUsed(apiKey.id);
    req.principal = {
      keyId: apiKey.id,
      name: apiKey.name,
      scopes: apiKey.scopes,
      rateClass: apiKey.rateClass,
    };
  }

  next();
}
