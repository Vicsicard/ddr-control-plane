/**
 * Rate Limiting Middleware
 * 
 * Token bucket rate limiting keyed by API key ID.
 * Different rate classes have different limits.
 */

import { Request, Response, NextFunction } from 'express';
import type { RateClass } from './auth';

// =============================================================================
// Types
// =============================================================================

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  tokensPerMinute: number;
  burstSize: number;
}

// =============================================================================
// Configuration
// =============================================================================

const RATE_LIMITS: Record<RateClass, Record<string, RateLimitConfig>> = {
  studio: {
    'validate': { tokensPerMinute: 30, burstSize: 10 },
    'simulate': { tokensPerMinute: 30, burstSize: 10 },
    'finalize': { tokensPerMinute: 10, burstSize: 5 },
    'verify': { tokensPerMinute: 120, burstSize: 30 },
    'export': { tokensPerMinute: 10, burstSize: 5 },
    'contracts': { tokensPerMinute: 60, burstSize: 20 },
    'default': { tokensPerMinute: 60, burstSize: 20 },
  },
  ci: {
    'validate': { tokensPerMinute: 60, burstSize: 20 },
    'simulate': { tokensPerMinute: 60, burstSize: 20 },
    'finalize': { tokensPerMinute: 30, burstSize: 10 },
    'verify': { tokensPerMinute: 600, burstSize: 100 },
    'export': { tokensPerMinute: 60, burstSize: 20 },
    'contracts': { tokensPerMinute: 120, burstSize: 40 },
    'default': { tokensPerMinute: 120, burstSize: 40 },
  },
  admin: {
    'validate': { tokensPerMinute: 120, burstSize: 40 },
    'simulate': { tokensPerMinute: 120, burstSize: 40 },
    'finalize': { tokensPerMinute: 60, burstSize: 20 },
    'verify': { tokensPerMinute: 1200, burstSize: 200 },
    'export': { tokensPerMinute: 120, burstSize: 40 },
    'contracts': { tokensPerMinute: 240, burstSize: 80 },
    'default': { tokensPerMinute: 240, burstSize: 80 },
  },
};

// =============================================================================
// Token Bucket Store (In-memory)
// =============================================================================

class RateLimitStore {
  private buckets: Map<string, TokenBucket> = new Map();

  private getBucketKey(keyId: string, endpoint: string): string {
    return `${keyId}:${endpoint}`;
  }

  private getConfig(rateClass: RateClass, endpoint: string): RateLimitConfig {
    const classConfig = RATE_LIMITS[rateClass];
    return classConfig[endpoint] || classConfig['default'];
  }

  /**
   * Try to consume a token. Returns true if allowed, false if rate limited.
   */
  tryConsume(keyId: string, rateClass: RateClass, endpoint: string): {
    allowed: boolean;
    remaining: number;
    limit: number;
    resetSeconds: number;
  } {
    const bucketKey = this.getBucketKey(keyId, endpoint);
    const config = this.getConfig(rateClass, endpoint);
    const now = Date.now();

    let bucket = this.buckets.get(bucketKey);

    if (!bucket) {
      // Initialize new bucket with full tokens
      bucket = {
        tokens: config.burstSize,
        lastRefill: now,
      };
      this.buckets.set(bucketKey, bucket);
    }

    // Refill tokens based on time elapsed
    const elapsedMs = now - bucket.lastRefill;
    const tokensToAdd = (elapsedMs / 60000) * config.tokensPerMinute;
    bucket.tokens = Math.min(config.burstSize, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Calculate reset time (when bucket would be full again)
    const tokensNeeded = config.burstSize - bucket.tokens;
    const resetSeconds = Math.ceil((tokensNeeded / config.tokensPerMinute) * 60);

    if (bucket.tokens >= 1) {
      // Consume a token
      bucket.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        limit: config.tokensPerMinute,
        resetSeconds,
      };
    }

    // Rate limited
    const retryAfter = Math.ceil((1 / config.tokensPerMinute) * 60);
    return {
      allowed: false,
      remaining: 0,
      limit: config.tokensPerMinute,
      resetSeconds: retryAfter,
    };
  }

  /**
   * Clean up old buckets (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key);
      }
    }
  }
}

export const rateLimitStore = new RateLimitStore();

// Cleanup old buckets every 5 minutes
setInterval(() => rateLimitStore.cleanup(), 5 * 60 * 1000);

// =============================================================================
// Middleware
// =============================================================================

/**
 * Extract endpoint category from path
 */
function getEndpointCategory(path: string): string {
  if (path.includes('/validate')) return 'validate';
  if (path.includes('/simulate')) return 'simulate';
  if (path.includes('/finalize')) return 'finalize';
  if (path.includes('/verify')) return 'verify';
  if (path.includes('/export')) return 'export';
  if (path.includes('/contracts')) return 'contracts';
  return 'default';
}

/**
 * Rate limiting middleware
 */
export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): Response | void {
  // Skip rate limiting for health checks
  if (req.path.includes('/health')) {
    return next();
  }

  // Use anonymous rate limiting if no principal
  const keyId = req.principal?.keyId || `ip:${req.ip}`;
  const rateClass = req.principal?.rateClass || 'studio';
  const endpoint = getEndpointCategory(req.path);

  const result = rateLimitStore.tryConsume(keyId, rateClass, endpoint);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', result.limit);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + result.resetSeconds);

  if (!result.allowed) {
    res.setHeader('Retry-After', result.resetSeconds);
    return res.status(429).json({
      error: 'RATE_LIMITED',
      message: 'Too many requests',
      retry_after_seconds: result.resetSeconds,
      request_id: req.requestId,
    });
  }

  next();
}
