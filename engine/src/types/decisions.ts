/**
 * Meta DDR Decision Types
 * Frozen for MVP - v0.1
 */

export type EvaluationDecision = 'ALLOW' | 'BLOCK' | 'REJECT';

export type FinalizeDecision = 'ACCEPTED' | 'BLOCK' | 'REJECT';

export type IntakeStatus = 'IN_PROGRESS' | 'BLOCKED' | 'ACCEPTED' | 'REJECTED';

export type Severity = 'BLOCK' | 'REJECT' | 'WARN';
