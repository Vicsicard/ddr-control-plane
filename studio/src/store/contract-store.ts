import { create } from 'zustand';
import type {
  Stage,
  StageState,
  ContractSession,
  FramingData,
  InputsData,
  OutputsData,
  PoliciesData,
  RulesData,
  SimulationData,
  FinalizationData,
  InputEntry,
  OutputEntry,
  PolicyEntry,
  RuleEntry,
  SimulationCase,
  ValidationError,
  FinalizationResult,
} from '../types';
// All validators removed - Engine is the sole authority
// import { ... } from '../validators'; // DELETED - no fallback validators
import { 
  validateStageViaEngine, 
  finalizeViaEngine,
  isEngineAvailable,
} from '../engine-adapter';

const STAGE_ORDER: Stage[] = [
  'FRAMING',
  'INPUTS',
  'OUTPUTS',
  'POLICIES',
  'RULES',
  'SIMULATION_FINALIZATION',
  'FINALIZATION',
];

function createEmptySession(): ContractSession {
  return {
    id: crypto.randomUUID(),
    name: '',
    created_at: new Date().toISOString(),
    current_stage: 'FRAMING',
    stage_states: {
      FRAMING: 'EMPTY',
      INPUTS: 'LOCKED',
      OUTPUTS: 'LOCKED',
      POLICIES: 'LOCKED',
      RULES: 'LOCKED',
      SIMULATION_FINALIZATION: 'LOCKED',
      FINALIZATION: 'LOCKED',
    },
    framing: {
      decision_name: '',
      decision_purpose: '',
      authority_type: null,
      permitted_actions: [],
      prohibited_actions: [],
      escalation_requirement: null,
      contract_version: '1.0.0',
    },
    inputs: {
      inputs: [],
      completeness_confirmed: false,
    },
    outputs: {
      outputs: [],
      refusal_requirement: 'REQUIRED',
      completeness_confirmed: false,
    },
    policies: {
      policies: [],
      scope_confirmed: false,
    },
    rules: {
      rules: [],
      completeness_confirmed: false,
    },
    simulation: {
      cases: [],
      all_cases_passed: false,
      proof_confirmed: false,
    },
    finalization: {
      approval_confirmed: false,
      is_finalized: false,
      result: null,
    },
  };
}

interface ContractStore {
  session: ContractSession;
  validationErrors: Record<Stage, ValidationError[]>;
  
  // Session actions
  createNewSession: () => void;
  
  // Framing actions
  updateFraming: (data: Partial<FramingData>) => void;
  addPermittedAction: (action: string) => void;
  removePermittedAction: (index: number) => void;
  addProhibitedAction: (action: string) => void;
  removeProhibitedAction: (index: number) => void;
  
  // Inputs actions
  updateInputs: (data: Partial<InputsData>) => void;
  addInput: () => void;
  updateInput: (id: string, data: Partial<InputEntry>) => void;
  removeInput: (id: string) => void;
  
  // Outputs actions
  updateOutputs: (data: Partial<OutputsData>) => void;
  addOutput: () => void;
  updateOutput: (id: string, data: Partial<OutputEntry>) => void;
  removeOutput: (id: string) => void;
  
  // Policies actions
  updatePolicies: (data: Partial<PoliciesData>) => void;
  addPolicy: () => void;
  updatePolicy: (id: string, data: Partial<PolicyEntry>) => void;
  removePolicy: (id: string) => void;
  
  // Rules actions
  updateRules: (data: Partial<RulesData>) => void;
  addRule: () => void;
  updateRule: (id: string, data: Partial<RuleEntry>) => void;
  removeRule: (id: string) => void;
  
  // Simulation actions
  updateSimulation: (data: Partial<SimulationData>) => void;
  addSimulationCase: () => void;
  updateSimulationCase: (id: string, data: Partial<SimulationCase>) => void;
  removeSimulationCase: (id: string) => void;
  runSimulation: () => void;
  
  // Finalization actions
  updateFinalization: (data: Partial<FinalizationData>) => void;
  finalizeContract: () => Promise<FinalizationResult | null>;
  resetSession: () => void;
  
  // Stage navigation
  validateCurrentStage: () => Promise<ValidationError[]>;
  canProceedToNextStage: () => boolean;
  proceedToNextStage: () => void;
  goToStage: (stage: Stage) => void;
  
  // Helpers
  getStageIndex: (stage: Stage) => number;
  isStageAccessible: (stage: Stage) => boolean;
}

/**
 * Fallback validation using local Studio validators.
 * Used when engine server is unreachable.
 * 
 * NOTE: FRAMING has NO fallback. Engine is mandatory for Framing.
 * This is a governance decision: the authority declaration must come from the engine.
 */
function validateCurrentStageFallback(session: ContractSession): ValidationError[] {
  switch (session.current_stage) {
    case 'FRAMING':
      // NO FALLBACK FOR FRAMING - Engine is mandatory
      // Return a blocking error indicating engine is required
      return [{
        code: 'ENGINE_REQUIRED',
        field_path: null,
        message: 'DCG Engine is required for Framing validation. Engine server is unavailable.',
        severity: 'BLOCK',
      }];
    case 'INPUTS':
      // NO FALLBACK FOR INPUTS - Engine is mandatory
      return [{
        code: 'ENGINE_REQUIRED',
        field_path: null,
        message: 'DCG Engine is required for Inputs validation. Engine server is unavailable.',
        severity: 'BLOCK',
      }];
    case 'OUTPUTS':
      // NO FALLBACK FOR OUTPUTS - Engine is mandatory
      return [{
        code: 'ENGINE_REQUIRED',
        field_path: null,
        message: 'DCG Engine is required for Outputs validation. Engine server is unavailable.',
        severity: 'BLOCK',
      }];
    case 'POLICIES':
      // NO FALLBACK FOR POLICIES - Engine is mandatory
      return [{
        code: 'ENGINE_REQUIRED',
        field_path: null,
        message: 'DCG Engine is required for Policies validation. Engine server is unavailable.',
        severity: 'BLOCK',
      }];
    case 'RULES':
      // NO FALLBACK FOR RULES - Engine is mandatory
      return [{
        code: 'ENGINE_REQUIRED',
        field_path: null,
        message: 'DCG Engine is required for Rules validation. Engine server is unavailable.',
        severity: 'BLOCK',
      }];
    case 'SIMULATION_FINALIZATION':
      // NO FALLBACK FOR SIMULATION - Engine is mandatory
      return [{
        code: 'ENGINE_REQUIRED',
        field_path: null,
        message: 'DCG Engine is required for Simulation validation. Engine server is unavailable.',
        severity: 'BLOCK',
      }];
    default:
      return [];
  }
}

export const useContractStore = create<ContractStore>((set, get) => ({
  session: createEmptySession(),
  validationErrors: {
    FRAMING: [],
    INPUTS: [],
    OUTPUTS: [],
    POLICIES: [],
    RULES: [],
    SIMULATION_FINALIZATION: [],
    FINALIZATION: [],
  },

  createNewSession: () => {
    set({ session: createEmptySession() });
  },

  updateFraming: (data) => {
    set((state) => {
      const newFraming = { ...state.session.framing, ...data };
      const newSession = {
        ...state.session,
        framing: newFraming,
        stage_states: {
          ...state.session.stage_states,
          FRAMING: 'DRAFT' as StageState,
        },
      };
      return { session: newSession };
    });
  },

  addPermittedAction: (action) => {
    set((state) => ({
      session: {
        ...state.session,
        framing: {
          ...state.session.framing,
          permitted_actions: [...state.session.framing.permitted_actions, action],
        },
        stage_states: {
          ...state.session.stage_states,
          FRAMING: 'DRAFT' as StageState,
        },
      },
    }));
  },

  removePermittedAction: (index) => {
    set((state) => ({
      session: {
        ...state.session,
        framing: {
          ...state.session.framing,
          permitted_actions: state.session.framing.permitted_actions.filter((_, i) => i !== index),
        },
        stage_states: {
          ...state.session.stage_states,
          FRAMING: 'DRAFT' as StageState,
        },
      },
    }));
  },

  addProhibitedAction: (action) => {
    set((state) => ({
      session: {
        ...state.session,
        framing: {
          ...state.session.framing,
          prohibited_actions: [...state.session.framing.prohibited_actions, action],
        },
        stage_states: {
          ...state.session.stage_states,
          FRAMING: 'DRAFT' as StageState,
        },
      },
    }));
  },

  removeProhibitedAction: (index) => {
    set((state) => ({
      session: {
        ...state.session,
        framing: {
          ...state.session.framing,
          prohibited_actions: state.session.framing.prohibited_actions.filter((_, i) => i !== index),
        },
        stage_states: {
          ...state.session.stage_states,
          FRAMING: 'DRAFT' as StageState,
        },
      },
    }));
  },

  updateInputs: (data) => {
    set((state) => ({
      session: {
        ...state.session,
        inputs: { ...state.session.inputs, ...data },
        stage_states: {
          ...state.session.stage_states,
          INPUTS: 'DRAFT' as StageState,
        },
      },
    }));
  },

  addInput: () => {
    const newInput: InputEntry = {
      id: crypto.randomUUID(),
      name: '',
      type: null,
      required: true,
      missing_behavior: null,
      default_value: '',
      enum_values: [],
      description: '',
    };
    set((state) => ({
      session: {
        ...state.session,
        inputs: {
          ...state.session.inputs,
          inputs: [...state.session.inputs.inputs, newInput],
          completeness_confirmed: false,
        },
        stage_states: {
          ...state.session.stage_states,
          INPUTS: 'DRAFT' as StageState,
        },
      },
    }));
  },

  updateInput: (id, data) => {
    set((state) => ({
      session: {
        ...state.session,
        inputs: {
          ...state.session.inputs,
          inputs: state.session.inputs.inputs.map((input) =>
            input.id === id ? { ...input, ...data } : input
          ),
          completeness_confirmed: false,
        },
        stage_states: {
          ...state.session.stage_states,
          INPUTS: 'DRAFT' as StageState,
        },
      },
    }));
  },

  removeInput: (id) => {
    set((state) => ({
      session: {
        ...state.session,
        inputs: {
          ...state.session.inputs,
          inputs: state.session.inputs.inputs.filter((input) => input.id !== id),
          completeness_confirmed: false,
        },
        stage_states: {
          ...state.session.stage_states,
          INPUTS: 'DRAFT' as StageState,
        },
      },
    }));
  },

  updateOutputs: (data) => {
    set((state) => ({
      session: {
        ...state.session,
        outputs: { ...state.session.outputs, ...data },
        stage_states: {
          ...state.session.stage_states,
          OUTPUTS: 'DRAFT' as StageState,
        },
      },
    }));
  },

  addOutput: () => {
    const newOutput: OutputEntry = {
      id: crypto.randomUUID(),
      code: '',
      category: null,
      requires_reason_code: false,
      description: '',
    };
    set((state) => ({
      session: {
        ...state.session,
        outputs: {
          ...state.session.outputs,
          outputs: [...state.session.outputs.outputs, newOutput],
          completeness_confirmed: false,
        },
        stage_states: {
          ...state.session.stage_states,
          OUTPUTS: 'DRAFT' as StageState,
        },
      },
    }));
  },

  updateOutput: (id, data) => {
    set((state) => ({
      session: {
        ...state.session,
        outputs: {
          ...state.session.outputs,
          outputs: state.session.outputs.outputs.map((output) =>
            output.id === id ? { ...output, ...data } : output
          ),
          completeness_confirmed: false,
        },
        stage_states: {
          ...state.session.stage_states,
          OUTPUTS: 'DRAFT' as StageState,
        },
      },
    }));
  },

  removeOutput: (id) => {
    set((state) => ({
      session: {
        ...state.session,
        outputs: {
          ...state.session.outputs,
          outputs: state.session.outputs.outputs.filter((output) => output.id !== id),
          completeness_confirmed: false,
        },
        stage_states: {
          ...state.session.stage_states,
          OUTPUTS: 'DRAFT' as StageState,
        },
      },
    }));
  },

  updatePolicies: (data) => {
    set((state) => ({
      session: {
        ...state.session,
        policies: { ...state.session.policies, ...data },
        stage_states: {
          ...state.session.stage_states,
          POLICIES: 'DRAFT' as StageState,
        },
      },
    }));
  },

  addPolicy: () => {
    const newPolicy: PolicyEntry = {
      id: crypto.randomUUID(),
      policy_id: '',
      statement: '',
      constraint_type: null,
      condition: null,
      violation_outcome: null,
      reason_code: '',
    };
    set((state) => ({
      session: {
        ...state.session,
        policies: {
          ...state.session.policies,
          policies: [...state.session.policies.policies, newPolicy],
          scope_confirmed: false,
        },
        stage_states: {
          ...state.session.stage_states,
          POLICIES: 'DRAFT' as StageState,
        },
      },
    }));
  },

  updatePolicy: (id, data) => {
    set((state) => ({
      session: {
        ...state.session,
        policies: {
          ...state.session.policies,
          policies: state.session.policies.policies.map((policy) =>
            policy.id === id ? { ...policy, ...data } : policy
          ),
          scope_confirmed: false,
        },
        stage_states: {
          ...state.session.stage_states,
          POLICIES: 'DRAFT' as StageState,
        },
      },
    }));
  },

  removePolicy: (id) => {
    set((state) => ({
      session: {
        ...state.session,
        policies: {
          ...state.session.policies,
          policies: state.session.policies.policies.filter((policy) => policy.id !== id),
          scope_confirmed: false,
        },
        stage_states: {
          ...state.session.stage_states,
          POLICIES: 'DRAFT' as StageState,
        },
      },
    }));
  },

  updateRules: (data) => {
    set((state) => ({
      session: {
        ...state.session,
        rules: { ...state.session.rules, ...data },
        stage_states: {
          ...state.session.stage_states,
          RULES: 'DRAFT' as StageState,
        },
      },
    }));
  },

  addRule: () => {
    const newRule: RuleEntry = {
      id: crypto.randomUUID(),
      rule_id: '',
      condition: null,
      output: '',
      reason_code: '',
      description: '',
    };
    set((state) => ({
      session: {
        ...state.session,
        rules: {
          ...state.session.rules,
          rules: [...state.session.rules.rules, newRule],
          completeness_confirmed: false,
        },
        stage_states: {
          ...state.session.stage_states,
          RULES: 'DRAFT' as StageState,
        },
      },
    }));
  },

  updateRule: (id, data) => {
    set((state) => ({
      session: {
        ...state.session,
        rules: {
          ...state.session.rules,
          rules: state.session.rules.rules.map((rule) =>
            rule.id === id ? { ...rule, ...data } : rule
          ),
          completeness_confirmed: false,
        },
        stage_states: {
          ...state.session.stage_states,
          RULES: 'DRAFT' as StageState,
        },
      },
    }));
  },

  removeRule: (id) => {
    set((state) => ({
      session: {
        ...state.session,
        rules: {
          ...state.session.rules,
          rules: state.session.rules.rules.filter((rule) => rule.id !== id),
          completeness_confirmed: false,
        },
        stage_states: {
          ...state.session.stage_states,
          RULES: 'DRAFT' as StageState,
        },
      },
    }));
  },

  updateSimulation: (data) => {
    set((state) => ({
      session: {
        ...state.session,
        simulation: { ...state.session.simulation, ...data },
        stage_states: {
          ...state.session.stage_states,
          SIMULATION_FINALIZATION: 'DRAFT' as StageState,
        },
      },
    }));
  },

  addSimulationCase: () => {
    const newCase: SimulationCase = {
      id: crypto.randomUUID(),
      case_id: '',
      inputs: [],
      expected_output: '',
      expected_reason_code: '',
      actual_output: null,
      actual_reason_code: null,
      case_type: null,
      assertion_passed: null,
      trace: null,
    };
    set((state) => ({
      session: {
        ...state.session,
        simulation: {
          ...state.session.simulation,
          cases: [...state.session.simulation.cases, newCase],
          all_cases_passed: false,
          proof_confirmed: false,
        },
        stage_states: {
          ...state.session.stage_states,
          SIMULATION_FINALIZATION: 'DRAFT' as StageState,
        },
      },
    }));
  },

  updateSimulationCase: (id, data) => {
    set((state) => ({
      session: {
        ...state.session,
        simulation: {
          ...state.session.simulation,
          cases: state.session.simulation.cases.map((simCase) =>
            simCase.id === id ? { ...simCase, ...data } : simCase
          ),
          all_cases_passed: false,
          proof_confirmed: false,
        },
        stage_states: {
          ...state.session.stage_states,
          SIMULATION_FINALIZATION: 'DRAFT' as StageState,
        },
      },
    }));
  },

  removeSimulationCase: (id) => {
    set((state) => ({
      session: {
        ...state.session,
        simulation: {
          ...state.session.simulation,
          cases: state.session.simulation.cases.filter((simCase) => simCase.id !== id),
          all_cases_passed: false,
          proof_confirmed: false,
        },
        stage_states: {
          ...state.session.stage_states,
          SIMULATION_FINALIZATION: 'DRAFT' as StageState,
        },
      },
    }));
  },

  runSimulation: () => {
    const { session } = get();
    const { simulation, outputs, rules } = session;

    const refusalOutputCodes = new Set(
      outputs.outputs.filter((o) => o.category === 'REFUSAL').map((o) => o.code)
    );

    const updatedCases = simulation.cases.map((simCase) => {
      const inputMap: Record<string, string> = {};
      simCase.inputs.forEach((inp) => {
        inputMap[inp.input_name] = inp.value;
      });

      let matchedRule = null;
      for (const rule of rules.rules) {
        if (rule.condition) {
          const inputRef = rule.condition.left_operand.replace('input.', '');
          const inputValue = inputMap[inputRef];
          // If right_operand references an input, look it up; otherwise use literal value
          let compareValue = rule.condition.right_operand || '';
          if (compareValue.startsWith('input.')) {
            const compareRef = compareValue.replace('input.', '');
            compareValue = inputMap[compareRef] || compareValue;
          }
          let matches = false;

          switch (rule.condition.operator) {
            case 'EQUALS':
              matches = inputValue === compareValue;
              break;
            case 'NOT_EQUALS':
              matches = inputValue !== compareValue;
              break;
            case 'GREATER_THAN':
              matches = parseFloat(inputValue) > parseFloat(compareValue || '0');
              break;
            case 'LESS_THAN':
              matches = parseFloat(inputValue) < parseFloat(compareValue || '0');
              break;
            case 'GREATER_THAN_OR_EQUALS':
              matches = parseFloat(inputValue) >= parseFloat(compareValue || '0');
              break;
            case 'LESS_THAN_OR_EQUALS':
              matches = parseFloat(inputValue) <= parseFloat(compareValue || '0');
              break;
            case 'IS_PRESENT':
              matches = inputValue !== undefined && inputValue !== '';
              break;
            case 'IS_ABSENT':
              matches = inputValue === undefined || inputValue === '';
              break;
            default:
              matches = false;
          }

          if (matches) {
            matchedRule = rule;
            break;
          }
        }
      }

      const actualOutput = matchedRule ? matchedRule.output : 'NO_MATCH';
      const actualReasonCode = matchedRule ? matchedRule.reason_code : '';
      const caseType: 'VALID' | 'REFUSAL' = refusalOutputCodes.has(simCase.expected_output) ? 'REFUSAL' : 'VALID';
      const assertionPassed = 
        actualOutput === simCase.expected_output &&
        (simCase.expected_reason_code === '' || actualReasonCode === simCase.expected_reason_code);

      return {
        ...simCase,
        actual_output: actualOutput,
        actual_reason_code: actualReasonCode || null,
        case_type: caseType,
        assertion_passed: assertionPassed,
        trace: {
          policies_checked: session.policies.policies.map((p) => p.policy_id),
          rule_matched: matchedRule?.rule_id || null,
          refusal_flag: caseType === 'REFUSAL',
          engine_version: '1.0.0',
          contract_hash: session.id,
        },
      };
    });

    const allPassed = updatedCases.every((c) => c.assertion_passed);

    set((state) => ({
      session: {
        ...state.session,
        simulation: {
          ...state.session.simulation,
          cases: updatedCases,
          all_cases_passed: allPassed,
        },
        stage_states: {
          ...state.session.stage_states,
          SIMULATION_FINALIZATION: allPassed ? 'DRAFT' : 'INVALID' as StageState,
        },
      },
    }));
  },

  updateFinalization: (data) => {
    set((state) => ({
      session: {
        ...state.session,
        finalization: { ...state.session.finalization, ...data },
      },
    }));
  },

  finalizeContract: async () => {
    const { session } = get();
    
    if (!session.finalization.approval_confirmed) {
      return null;
    }

    if (session.stage_states.SIMULATION_FINALIZATION !== 'READY') {
      return null;
    }

    // Use engine server for finalization (engine computes hash, Studio only renders)
    if (isEngineAvailable()) {
      try {
        console.log('[CONTRACT-STORE] Calling engine for finalization...');
        const engineResult = await finalizeViaEngine(session, '1.0.0');
        
        if (!engineResult.success || !engineResult.contract) {
          console.error('[CONTRACT-STORE] Engine finalization failed:', engineResult);
          return null;
        }

        const now = engineResult.timestamp;
        const reasonCodes = new Set<string>();
        session.policies.policies.forEach((p) => {
          if (p.reason_code) reasonCodes.add(p.reason_code);
        });
        session.rules.rules.forEach((r) => {
          if (r.reason_code) reasonCodes.add(r.reason_code);
        });

        const result: FinalizationResult = {
          decision: 'ACCEPTED',
          contract_id: engineResult.contract.contract_id,
          hash: engineResult.contract.hash,
          hash_algorithm: 'SHA-256',
          canonical_byte_length: engineResult.canonical_json?.length ?? 0,
          hash_timestamp: now,
          exports: {
            canonical_json: true,
            pdf: true,
            markdown: true,
          },
          audit_metadata: {
            contract_id: engineResult.contract.contract_id,
            version: engineResult.contract.version,
            engine_version: '1.0.0',
            studio_version: '1.0.0',
            artifact_schema_version: '1.0.0',
            created_at: session.created_at,
            finalized_at: now,
            generated_at: now,
            stage_readiness: { ...session.stage_states },
            simulation_trace_refs: session.simulation.cases.map((c) => c.case_id),
            reason_code_inventory: Array.from(reasonCodes),
            author_identity: null,
          },
        };

        set((state) => ({
          session: {
            ...state.session,
            finalization: {
              ...state.session.finalization,
              is_finalized: true,
              result,
            },
            stage_states: {
              ...state.session.stage_states,
              SIMULATION_FINALIZATION: 'READY' as StageState,
            },
          },
        }));

        console.log('[CONTRACT-STORE] Finalization complete. Hash from engine:', engineResult.contract.hash);
        return result;
      } catch (err) {
        console.error('[CONTRACT-STORE] Engine finalization error, falling back to local:', err);
        // Fall through to local finalization
      }
    }

    // Fallback: local finalization (only if engine unavailable)
    console.warn('[CONTRACT-STORE] Using local finalization (engine unavailable)');
    const canonicalContract = {
      framing: session.framing,
      inputs: session.inputs,
      outputs: session.outputs,
      policies: session.policies,
      rules: session.rules,
    };

    const canonicalJson = JSON.stringify(canonicalContract, Object.keys(canonicalContract).sort(), 2);
    const canonicalBytes = new TextEncoder().encode(canonicalJson);
    
    const hashHex = Array.from(canonicalBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 64);

    const contractId = `${session.framing.decision_name.toLowerCase().replace(/\s+/g, '_')}@1.0.0`;
    const now = new Date().toISOString();

    const reasonCodes = new Set<string>();
    session.policies.policies.forEach((p) => {
      if (p.reason_code) reasonCodes.add(p.reason_code);
    });
    session.rules.rules.forEach((r) => {
      if (r.reason_code) reasonCodes.add(r.reason_code);
    });

    const result: FinalizationResult = {
      decision: 'ACCEPTED',
      contract_id: contractId,
      hash: `sha256:${hashHex}`,
      hash_algorithm: 'SHA-256',
      canonical_byte_length: canonicalBytes.length,
      hash_timestamp: now,
      exports: {
        canonical_json: true,
        pdf: true,
        markdown: true,
      },
      audit_metadata: {
        contract_id: contractId,
        version: '1.0.0',
        engine_version: '1.0.0',
        studio_version: '1.0.0',
        artifact_schema_version: '1.0.0',
        created_at: session.created_at,
        finalized_at: now,
        generated_at: now,
        stage_readiness: { ...session.stage_states },
        simulation_trace_refs: session.simulation.cases.map((c) => c.case_id),
        reason_code_inventory: Array.from(reasonCodes),
        author_identity: null,
      },
    };

    set((state) => ({
      session: {
        ...state.session,
        finalization: {
          ...state.session.finalization,
          is_finalized: true,
          result,
        },
        stage_states: {
          ...state.session.stage_states,
          SIMULATION_FINALIZATION: 'READY' as StageState,
        },
      },
    }));

    return result;
  },

  resetSession: () => {
    set({ session: createEmptySession() });
  },

  validateCurrentStage: async () => {
    const { session } = get();
    let errors: ValidationError[] = [];
    let newState: StageState;

    // Use engine validation via HTTP API (engine server is the authority)
    if (isEngineAvailable()) {
      try {
        const engineResult = await validateStageViaEngine(session, session.current_stage);
        errors = engineResult.errors;
        newState = engineResult.stageState === 'READY' ? 'READY' : 'INVALID';
      } catch (err) {
        console.error('[CONTRACT-STORE] Engine validation failed, using fallback:', err);
        // Fallback to local validators if engine is unreachable
        errors = validateCurrentStageFallback(session);
        newState = errors.some((e) => e.severity === 'BLOCK') ? 'INVALID' : 'READY';
      }
    } else {
      // Fallback to Studio validators if engine not available
      errors = validateCurrentStageFallback(session);
      newState = errors.some((e) => e.severity === 'BLOCK') ? 'INVALID' : 'READY';
    }

    set((state) => ({
      validationErrors: {
        ...state.validationErrors,
        [session.current_stage]: errors,
      },
      session: {
        ...state.session,
        stage_states: {
          ...state.session.stage_states,
          [session.current_stage]: newState,
        },
      },
    }));

    return errors;
  },

  canProceedToNextStage: () => {
    const { session } = get();
    return session.stage_states[session.current_stage] === 'READY';
  },

  proceedToNextStage: () => {
    const { session, canProceedToNextStage } = get();
    if (!canProceedToNextStage()) return;

    const currentIndex = STAGE_ORDER.indexOf(session.current_stage);
    if (currentIndex >= STAGE_ORDER.length - 1) return;

    const nextStage = STAGE_ORDER[currentIndex + 1];
    set((state) => ({
      session: {
        ...state.session,
        current_stage: nextStage,
        stage_states: {
          ...state.session.stage_states,
          [nextStage]: state.session.stage_states[nextStage] === 'LOCKED' 
            ? 'EMPTY' 
            : state.session.stage_states[nextStage],
        },
      },
    }));
  },

  goToStage: (stage) => {
    const { isStageAccessible } = get();
    if (!isStageAccessible(stage)) return;

    set((state) => ({
      session: {
        ...state.session,
        current_stage: stage,
      },
    }));
  },

  getStageIndex: (stage) => STAGE_ORDER.indexOf(stage),

  isStageAccessible: (stage) => {
    const { session } = get();
    return session.stage_states[stage] !== 'LOCKED';
  },
}));
