/**
 * Meta DDR Finding Structure
 * Frozen for MVP - v0.1
 */

import { Severity } from './decisions';

export interface Finding {
  code: string;
  severity: Severity;
  invariant: string;
  field_path: string | null;
  message: string;
  next_action: string;
  action_target: string | null;
}
