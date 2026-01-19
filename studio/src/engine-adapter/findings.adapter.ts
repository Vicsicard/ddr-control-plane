/**
 * Findings Adapter
 * 
 * Translates Engine Finding[] → Studio ValidationError[] (for display)
 * 
 * TRANSITIONAL: This file should shrink over time as Studio
 * adopts engine types directly.
 */

import type { ValidationError } from '../types';

/**
 * Engine Finding shape (from engine/src/types/findings.ts)
 */
export interface EngineFinding {
  code: string;
  severity: 'BLOCK' | 'REJECT' | 'WARN';
  invariant: string;
  field_path: string | null;
  message: string;
  next_action: string;
  action_target: string | null;
}

/**
 * Adapt Engine Finding to Studio ValidationError.
 * 
 * Field Mapping:
 * - code → code (same)
 * - severity → severity (map REJECT to BLOCK for display)
 * - field_path → field_path (same)
 * - message → message (same)
 * 
 * Engine has extra fields not in Studio:
 * - invariant
 * - next_action
 * - action_target
 */
export function adaptFindingToValidationError(finding: EngineFinding): ValidationError {
  return {
    code: finding.code,
    field_path: finding.field_path,
    message: finding.message,
    severity: finding.severity === 'WARN' ? 'WARN' : 'BLOCK',
  };
}

/**
 * Adapt Engine Finding[] to Studio ValidationError[].
 */
export function adaptFindingsToValidationErrors(findings: EngineFinding[]): ValidationError[] {
  return findings.map(adaptFindingToValidationError);
}

/**
 * Check if any findings are blocking (BLOCK or REJECT severity).
 */
export function hasBlockingFindings(findings: EngineFinding[]): boolean {
  return findings.some((f) => f.severity === 'BLOCK' || f.severity === 'REJECT');
}
