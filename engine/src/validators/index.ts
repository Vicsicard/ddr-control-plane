/**
 * Meta DDR Validators Module
 * Frozen for MVP - v0.1
 */

import { Stage } from '../types/stage';
import { StageArtifacts } from '../types/artifacts';
import { IntakeSessionState } from '../types/session';
import { Finding } from '../types/findings';

import { validateFraming } from './framing';
import { validateInputs } from './inputs';
import { validateOutputs } from './outputs';
import { validatePolicies } from './policies';
import { validateRules } from './rules';

/**
 * Validate artifacts for a given stage.
 * Returns all findings (exhaustive, not early-exit).
 */
export function validateStage(
  stage: Stage,
  artifacts: StageArtifacts,
  session: IntakeSessionState
): Finding[] {
  switch (stage) {
    case 'FRAMING':
      return validateFraming(artifacts, session);
    case 'INPUTS':
      return validateInputs(artifacts, session);
    case 'OUTPUTS':
      return validateOutputs(artifacts, session);
    case 'POLICIES':
      return validatePolicies(artifacts, session);
    case 'RULES':
      return validateRules(artifacts, session);
    case 'SIMULATION_FINALIZATION':
      // SIMULATION_FINALIZATION is handled by runSimulation(), not direct submission
      return [];
    default:
      return [];
  }
}

export { validateFraming } from './framing';
export { validateInputs } from './inputs';
export { validateOutputs } from './outputs';
export { validatePolicies } from './policies';
export { validateRules } from './rules';
