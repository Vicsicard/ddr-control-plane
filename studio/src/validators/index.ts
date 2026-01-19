import type {
  FramingData,
  InputsData,
  OutputsData,
  PoliciesData,
  RulesData,
  SimulationData,
  ContractSession,
  ValidationError,
} from '../types';

const MUTATION_VERBS = [
  'create',
  'update',
  'delete',
  'send',
  'charge',
  'write',
  'modify',
  'insert',
  'remove',
  'execute',
  'trigger',
  'invoke',
];

const OPERATIONAL_KEYWORDS = [
  'decide',
  'determine',
  'allow',
  'deny',
  'select',
  'route',
  'approve',
  'reject',
  'return',
  'calculate',
  'evaluate',
  'assess',
  'refuse',
];

function containsMutationVerb(text: string): boolean {
  const lower = text.toLowerCase();
  return MUTATION_VERBS.some((verb) => lower.includes(verb));
}

function isOperational(text: string): boolean {
  const lower = text.toLowerCase();
  return OPERATIONAL_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export function validateFraming(
  framing: FramingData,
  _session: ContractSession
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!framing.decision_name || framing.decision_name.trim().length < 3) {
    errors.push({
      code: 'FRAMING_DECISION_NAME_REQUIRED',
      field_path: 'decision_name',
      message: 'Decision name is required (minimum 3 characters).',
      severity: 'BLOCK',
    });
  } else if (framing.decision_name.length > 80) {
    errors.push({
      code: 'FRAMING_DECISION_NAME_TOO_LONG',
      field_path: 'decision_name',
      message: 'Decision name must be 80 characters or less.',
      severity: 'BLOCK',
    });
  }

  if (!framing.decision_purpose || framing.decision_purpose.trim().length < 30) {
    errors.push({
      code: 'FRAMING_PURPOSE_REQUIRED',
      field_path: 'decision_purpose',
      message: 'Decision purpose is required (minimum 30 characters).',
      severity: 'BLOCK',
    });
  } else if (!isOperational(framing.decision_purpose)) {
    errors.push({
      code: 'FRAMING_PURPOSE_INSUFFICIENT_DETAIL',
      field_path: 'decision_purpose',
      message: 'Purpose must describe an actionable decision (use verbs like: determine, allow, deny, approve, reject).',
      severity: 'BLOCK',
    });
  }

  if (!framing.authority_type) {
    errors.push({
      code: 'FRAMING_AUTHORITY_TYPE_REQUIRED',
      field_path: 'authority_type',
      message: 'Authority type must be selected.',
      severity: 'BLOCK',
    });
  }

  if (framing.permitted_actions.length === 0) {
    errors.push({
      code: 'FRAMING_PERMITTED_REQUIRED',
      field_path: 'permitted_actions',
      message: 'At least one permitted action must be declared.',
      severity: 'BLOCK',
    });
  } else {
    framing.permitted_actions.forEach((action, index) => {
      if (containsMutationVerb(action)) {
        errors.push({
          code: 'FRAMING_PERMITTED_INVALID_ACTION',
          field_path: `permitted_actions[${index}]`,
          message: `Permitted action "${action}" contains mutation language. Use evaluative verbs only.`,
          severity: 'BLOCK',
        });
      }
    });
  }

  if (framing.prohibited_actions.length === 0) {
    errors.push({
      code: 'FRAMING_PROHIBITED_REQUIRED',
      field_path: 'prohibited_actions',
      message: 'At least one prohibited action must be declared.',
      severity: 'BLOCK',
    });
  }

  const overlap = framing.permitted_actions.filter((a) =>
    framing.prohibited_actions.some((p) => p.toLowerCase() === a.toLowerCase())
  );
  if (overlap.length > 0) {
    errors.push({
      code: 'FRAMING_PROHIBITED_CONFLICT',
      field_path: 'prohibited_actions',
      message: `Actions cannot be both permitted and prohibited: ${overlap.join(', ')}`,
      severity: 'BLOCK',
    });
  }

  if (!framing.escalation_requirement) {
    errors.push({
      code: 'FRAMING_ESCALATION_REQUIRED',
      field_path: 'escalation_requirement',
      message: 'Escalation requirement must be selected.',
      severity: 'BLOCK',
    });
  }

  return errors;
}

export function validateInputs(
  inputs: InputsData,
  session: ContractSession
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (inputs.inputs.length === 0) {
    errors.push({
      code: 'INPUTS_MINIMUM_REQUIRED',
      field_path: 'inputs',
      message: 'At least one input must be declared.',
      severity: 'BLOCK',
    });
  }

  const seenNames = new Set<string>();

  inputs.inputs.forEach((input, index) => {
    if (!input.name || input.name.trim() === '') {
      errors.push({
        code: 'INPUTS_NAME_REQUIRED',
        field_path: `inputs[${index}].name`,
        message: 'Input name is required.',
        severity: 'BLOCK',
      });
    } else {
      if (!/^[a-z][a-z0-9_]*$/.test(input.name)) {
        errors.push({
          code: 'INPUTS_NAME_INVALID_FORMAT',
          field_path: `inputs[${index}].name`,
          message: `Input name "${input.name}" must be snake_case (lowercase letters, numbers, underscores).`,
          severity: 'BLOCK',
        });
      }

      if (seenNames.has(input.name)) {
        errors.push({
          code: 'INPUTS_NAME_CONFLICT',
          field_path: `inputs[${index}].name`,
          message: `Duplicate input name: ${input.name}`,
          severity: 'BLOCK',
        });
      }
      seenNames.add(input.name);
    }

    if (!input.type) {
      errors.push({
        code: 'INPUTS_TYPE_REQUIRED',
        field_path: `inputs[${index}].type`,
        message: 'Input type must be selected.',
        severity: 'BLOCK',
      });
    }

    if (input.type === 'ENUM' && input.enum_values.length === 0) {
      errors.push({
        code: 'INPUTS_ENUM_VALUES_REQUIRED',
        field_path: `inputs[${index}].enum_values`,
        message: 'Enum type requires at least one allowed value.',
        severity: 'BLOCK',
      });
    }

    if (!input.required && !input.missing_behavior) {
      errors.push({
        code: 'INPUTS_MISSING_BEHAVIOR_REQUIRED',
        field_path: `inputs[${index}].missing_behavior`,
        message: 'Missing behavior must be specified for optional inputs.',
        severity: 'BLOCK',
      });
    }

    if (input.missing_behavior === 'DEFAULT' && !input.default_value) {
      errors.push({
        code: 'INPUTS_DEFAULT_VALUE_REQUIRED',
        field_path: `inputs[${index}].default_value`,
        message: 'Default value is required when missing behavior is DEFAULT.',
        severity: 'BLOCK',
      });
    }
  });

  if (!inputs.completeness_confirmed && inputs.inputs.length > 0) {
    errors.push({
      code: 'INPUTS_COMPLETENESS_UNCONFIRMED',
      field_path: 'completeness_confirmed',
      message: 'You must confirm that all inputs are declared.',
      severity: 'BLOCK',
    });
  }

  const hasRefusalBehavior = inputs.inputs.some(
    (i) => i.missing_behavior === 'REFUSE'
  );
  if (hasRefusalBehavior && session.framing.escalation_requirement === 'NONE') {
    errors.push({
      code: 'INPUTS_REFUSAL_PATH_INCONSISTENT',
      field_path: 'inputs',
      message: 'Inputs with REFUSE behavior require escalation (Framing escalation cannot be NONE).',
      severity: 'BLOCK',
    });
  }

  return errors;
}

export function validateOutputs(
  outputs: OutputsData,
  session: ContractSession
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (outputs.outputs.length < 2) {
    errors.push({
      code: 'OUTPUTS_MINIMUM_REQUIRED',
      field_path: 'outputs',
      message: 'At least two outputs must be declared (decision implies choice).',
      severity: 'BLOCK',
    });
  }

  const seenCodes = new Set<string>();

  outputs.outputs.forEach((output, index) => {
    if (!output.code || output.code.trim() === '') {
      errors.push({
        code: 'OUTPUTS_CODE_REQUIRED',
        field_path: `outputs[${index}].code`,
        message: 'Output code is required.',
        severity: 'BLOCK',
      });
    } else {
      if (!/^[A-Z][A-Z0-9_]*$/.test(output.code)) {
        errors.push({
          code: 'OUTPUTS_CODE_INVALID_FORMAT',
          field_path: `outputs[${index}].code`,
          message: `Output code "${output.code}" must be UPPER_SNAKE_CASE.`,
          severity: 'BLOCK',
        });
      }

      if (seenCodes.has(output.code)) {
        errors.push({
          code: 'OUTPUTS_CODE_CONFLICT',
          field_path: `outputs[${index}].code`,
          message: `Duplicate output code: ${output.code}`,
          severity: 'BLOCK',
        });
      }
      seenCodes.add(output.code);
    }

    if (!output.category) {
      errors.push({
        code: 'OUTPUTS_CATEGORY_REQUIRED',
        field_path: `outputs[${index}].category`,
        message: 'Output category must be selected. Categories are fixed in v1: APPROVAL, REFUSAL, DEFERRAL.',
        severity: 'BLOCK',
      });
    }

    if (output.category === 'REFUSAL' && !output.requires_reason_code) {
      errors.push({
        code: 'OUTPUTS_REFUSAL_REASON_REQUIRED',
        field_path: `outputs[${index}].requires_reason_code`,
        message: 'REFUSAL outputs must require a reason code. The reason code must be declared in the Reason Code taxonomy for this contract.',
        severity: 'BLOCK',
      });
    }
  });

  const hasRefusalOutput = outputs.outputs.some((o) => o.category === 'REFUSAL');
  const hasInputRefusalBehavior = session.inputs.inputs.some(
    (i) => i.missing_behavior === 'REFUSE'
  );

  if (outputs.refusal_requirement === 'REQUIRED' && !hasRefusalOutput) {
    errors.push({
      code: 'OUTPUTS_REFUSAL_OUTPUT_MISSING',
      field_path: 'outputs',
      message: 'Refusal is required but no REFUSAL output is declared.',
      severity: 'BLOCK',
    });
  }

  if (hasInputRefusalBehavior && !hasRefusalOutput) {
    errors.push({
      code: 'OUTPUTS_REFUSAL_REQUIREMENT_INCONSISTENT',
      field_path: 'outputs',
      message: 'Inputs have REFUSE behavior but no REFUSAL output is declared.',
      severity: 'BLOCK',
    });
  }

  if (!outputs.completeness_confirmed && outputs.outputs.length > 0) {
    errors.push({
      code: 'OUTPUTS_COMPLETENESS_UNCONFIRMED',
      field_path: 'completeness_confirmed',
      message: 'You must confirm that all outputs are declared.',
      severity: 'BLOCK',
    });
  }

  return errors;
}

export function validatePolicies(
  policies: PoliciesData,
  session: ContractSession
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (policies.policies.length === 0) {
    errors.push({
      code: 'POLICIES_MINIMUM_REQUIRED',
      field_path: 'policies',
      message: 'At least one policy must be declared. A decision without constraints is not governable.',
      severity: 'BLOCK',
    });
  }

  const seenIds = new Set<string>();
  const declaredInputNames = new Set(session.inputs.inputs.map((i) => i.name));
  const hasRefusalOutput = session.outputs.outputs.some((o) => o.category === 'REFUSAL');
  const hasEscalationDefined = session.framing.escalation_requirement !== 'NONE';

  policies.policies.forEach((policy, index) => {
    if (!policy.policy_id || policy.policy_id.trim() === '') {
      errors.push({
        code: 'POLICIES_ID_REQUIRED',
        field_path: `policies[${index}].policy_id`,
        message: 'Policy identifier is required.',
        severity: 'BLOCK',
      });
    } else {
      if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(policy.policy_id)) {
        errors.push({
          code: 'POLICIES_ID_INVALID_FORMAT',
          field_path: `policies[${index}].policy_id`,
          message: `Policy identifier "${policy.policy_id}" must be 2-64 characters, UPPER_SNAKE_CASE.`,
          severity: 'BLOCK',
        });
      }

      if (seenIds.has(policy.policy_id)) {
        errors.push({
          code: 'POLICIES_ID_CONFLICT',
          field_path: `policies[${index}].policy_id`,
          message: `Duplicate policy identifier: ${policy.policy_id}`,
          severity: 'BLOCK',
        });
      }
      seenIds.add(policy.policy_id);
    }

    if (!policy.statement || policy.statement.trim() === '') {
      errors.push({
        code: 'POLICIES_STATEMENT_REQUIRED',
        field_path: `policies[${index}].statement`,
        message: 'Policy statement is required for governance review clarity.',
        severity: 'BLOCK',
      });
    } else if (policy.statement.length > 300) {
      errors.push({
        code: 'POLICIES_STATEMENT_TOO_LONG',
        field_path: `policies[${index}].statement`,
        message: 'Policy statement must be 300 characters or less.',
        severity: 'BLOCK',
      });
    }

    if (!policy.constraint_type) {
      errors.push({
        code: 'POLICIES_CONSTRAINT_TYPE_REQUIRED',
        field_path: `policies[${index}].constraint_type`,
        message: 'Constraint type must be selected (REQUIRE or FORBID).',
        severity: 'BLOCK',
      });
    }

    if (!policy.condition) {
      errors.push({
        code: 'POLICIES_CONDITION_REQUIRED',
        field_path: `policies[${index}].condition`,
        message: 'Policy condition is required.',
        severity: 'BLOCK',
      });
    } else {
      const leftOperand = policy.condition.left_operand;
      if (leftOperand.startsWith('input.')) {
        const inputName = leftOperand.replace('input.', '');
        if (!declaredInputNames.has(inputName)) {
          errors.push({
            code: 'POLICIES_UNDECLARED_INPUT_REFERENCE',
            field_path: `policies[${index}].condition`,
            message: `Policy references undeclared input: ${inputName}`,
            severity: 'BLOCK',
          });
        }
      }
      if (leftOperand.includes('rule.') || leftOperand.includes('RULE_')) {
        errors.push({
          code: 'POLICIES_ILLEGAL_RULE_REFERENCE',
          field_path: `policies[${index}].condition`,
          message: 'Policies cannot reference rules. Policies are constraints, not logic.',
          severity: 'BLOCK',
        });
      }
    }

    if (!policy.violation_outcome) {
      errors.push({
        code: 'POLICIES_VIOLATION_OUTCOME_REQUIRED',
        field_path: `policies[${index}].violation_outcome`,
        message: 'Violation outcome must be selected.',
        severity: 'BLOCK',
      });
    } else {
      if (policy.violation_outcome === 'FORCE_REFUSE' && !hasRefusalOutput) {
        errors.push({
          code: 'POLICIES_REFUSAL_OUTPUT_MISSING',
          field_path: `policies[${index}].violation_outcome`,
          message: 'FORCE_REFUSE requires a REFUSAL output to be declared in Outputs.',
          severity: 'BLOCK',
        });
      }

      if (policy.violation_outcome === 'ESCALATE' && !hasEscalationDefined) {
        errors.push({
          code: 'POLICIES_ESCALATION_UNDEFINED',
          field_path: `policies[${index}].violation_outcome`,
          message: 'ESCALATE requires escalation to be defined in Framing (escalation_requirement cannot be NONE).',
          severity: 'BLOCK',
        });
      }

      const authority = session.framing.authority_type;
      if (authority === 'RECOMMEND_ONLY' && policy.violation_outcome === 'BLOCK') {
        errors.push({
          code: 'POLICIES_AUTHORITY_MISMATCH',
          field_path: `policies[${index}].violation_outcome`,
          message: 'RECOMMEND_ONLY authority cannot use BLOCK outcome. Use FORCE_REFUSE or ESCALATE.',
          severity: 'BLOCK',
        });
      }
    }

    if (!policy.reason_code || policy.reason_code.trim() === '') {
      errors.push({
        code: 'POLICIES_REASON_CODE_REQUIRED',
        field_path: `policies[${index}].reason_code`,
        message: 'Reason code is required for policy violations.',
        severity: 'BLOCK',
      });
    }
  });

  const hasForceRefuse = policies.policies.some((p) => p.violation_outcome === 'FORCE_REFUSE');
  if (hasForceRefuse && !hasRefusalOutput) {
    errors.push({
      code: 'POLICIES_REFUSAL_INCONSISTENT_WITH_OUTPUTS',
      field_path: 'policies',
      message: 'One or more policies use FORCE_REFUSE but no REFUSAL output is declared.',
      severity: 'BLOCK',
    });
  }

  if (!policies.scope_confirmed && policies.policies.length > 0) {
    errors.push({
      code: 'POLICIES_SCOPE_UNCONFIRMED',
      field_path: 'scope_confirmed',
      message: 'You must confirm that all non-negotiable constraints are declared.',
      severity: 'BLOCK',
    });
  }

  return errors;
}

export function validateRules(
  rules: RulesData,
  session: ContractSession
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (rules.rules.length === 0) {
    errors.push({
      code: 'RULES_MINIMUM_REQUIRED',
      field_path: 'rules',
      message: 'At least one rule must be declared.',
      severity: 'BLOCK',
    });
  }

  const seenIds = new Set<string>();
  const declaredInputNames = new Set(session.inputs.inputs.map((i) => i.name));
  const declaredOutputCodes = new Set(session.outputs.outputs.map((o) => o.code));
  const refusalOutputCodes = new Set(
    session.outputs.outputs.filter((o) => o.category === 'REFUSAL').map((o) => o.code)
  );
  const outputsRequiringReason = new Set(
    session.outputs.outputs.filter((o) => o.requires_reason_code).map((o) => o.code)
  );

  let hasApprovalRule = false;
  let hasRefusalRule = false;

  rules.rules.forEach((rule, index) => {
    if (!rule.rule_id || rule.rule_id.trim() === '') {
      errors.push({
        code: 'RULES_ID_REQUIRED',
        field_path: `rules[${index}].rule_id`,
        message: 'Rule identifier is required.',
        severity: 'BLOCK',
      });
    } else {
      if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(rule.rule_id)) {
        errors.push({
          code: 'RULES_ID_INVALID_FORMAT',
          field_path: `rules[${index}].rule_id`,
          message: `Rule identifier "${rule.rule_id}" must be 2-64 characters, UPPER_SNAKE_CASE.`,
          severity: 'BLOCK',
        });
      }

      if (seenIds.has(rule.rule_id)) {
        errors.push({
          code: 'RULES_ID_CONFLICT',
          field_path: `rules[${index}].rule_id`,
          message: `Duplicate rule identifier: ${rule.rule_id}`,
          severity: 'BLOCK',
        });
      }
      seenIds.add(rule.rule_id);
    }

    if (!rule.condition) {
      errors.push({
        code: 'RULES_CONDITION_REQUIRED',
        field_path: `rules[${index}].condition`,
        message: 'Rule condition is required.',
        severity: 'BLOCK',
      });
    } else {
      const leftOperand = rule.condition.left_operand;
      if (leftOperand.startsWith('input.')) {
        const inputName = leftOperand.replace('input.', '');
        if (!declaredInputNames.has(inputName)) {
          errors.push({
            code: 'RULES_UNDECLARED_INPUT_REFERENCE',
            field_path: `rules[${index}].condition`,
            message: `Rule references undeclared input: ${inputName}`,
            severity: 'BLOCK',
          });
        }
      }
      if (leftOperand.includes('policy.') || leftOperand.includes('POLICY_')) {
        errors.push({
          code: 'RULES_ILLEGAL_POLICY_REFERENCE',
          field_path: `rules[${index}].condition`,
          message: 'Rules cannot reference policies. Policies constrain, rules decide.',
          severity: 'BLOCK',
        });
      }
      if (leftOperand.includes('rule.') || leftOperand.includes('RULE_')) {
        errors.push({
          code: 'RULES_ILLEGAL_RULE_REFERENCE',
          field_path: `rules[${index}].condition`,
          message: 'Rules cannot reference other rules.',
          severity: 'BLOCK',
        });
      }
    }

    if (!rule.output || rule.output.trim() === '') {
      errors.push({
        code: 'RULES_OUTPUT_REQUIRED',
        field_path: `rules[${index}].output`,
        message: 'Rule output is required.',
        severity: 'BLOCK',
      });
    } else {
      if (!declaredOutputCodes.has(rule.output)) {
        errors.push({
          code: 'RULES_OUTPUT_UNDECLARED',
          field_path: `rules[${index}].output`,
          message: `Rule output "${rule.output}" is not a declared output.`,
          severity: 'BLOCK',
        });
      }

      if (refusalOutputCodes.has(rule.output)) {
        hasRefusalRule = true;
      } else {
        hasApprovalRule = true;
      }

      if (outputsRequiringReason.has(rule.output) && (!rule.reason_code || rule.reason_code.trim() === '')) {
        errors.push({
          code: 'RULES_REASON_CODE_REQUIRED',
          field_path: `rules[${index}].reason_code`,
          message: `Output "${rule.output}" requires a reason code.`,
          severity: 'BLOCK',
        });
      }
    }

    if (rule.description && rule.description.length > 200) {
      errors.push({
        code: 'RULES_DESCRIPTION_TOO_LONG',
        field_path: `rules[${index}].description`,
        message: 'Rule description must be 200 characters or less.',
        severity: 'WARN',
      });
    }
  });

  if (rules.rules.length > 0 && !hasApprovalRule) {
    errors.push({
      code: 'RULES_APPROVAL_MISSING',
      field_path: 'rules',
      message: 'At least one rule must produce an approval output.',
      severity: 'BLOCK',
    });
  }

  const refusalRequired = session.outputs.refusal_requirement === 'REQUIRED';
  if (refusalRequired && rules.rules.length > 0 && !hasRefusalRule) {
    errors.push({
      code: 'RULES_REFUSAL_MISSING',
      field_path: 'rules',
      message: 'Refusal is required but no rule produces a REFUSAL output.',
      severity: 'BLOCK',
    });
  }

  if (!rules.completeness_confirmed && rules.rules.length > 0) {
    errors.push({
      code: 'RULES_COMPLETENESS_UNCONFIRMED',
      field_path: 'completeness_confirmed',
      message: 'You must confirm that the rules fully and deterministically define how this decision is computed.',
      severity: 'BLOCK',
    });
  }

  return errors;
}

export function validateSimulation(
  simulation: SimulationData,
  session: ContractSession
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (simulation.cases.length === 0) {
    errors.push({
      code: 'SIM_MINIMUM_REQUIRED',
      field_path: 'cases',
      message: 'At least one simulation case must be defined.',
      severity: 'BLOCK',
    });
  }

  const seenIds = new Set<string>();
  const declaredInputNames = new Set(session.inputs.inputs.map((i) => i.name));
  const declaredOutputCodes = new Set(session.outputs.outputs.map((o) => o.code));
  const refusalOutputCodes = new Set(
    session.outputs.outputs.filter((o) => o.category === 'REFUSAL').map((o) => o.code)
  );
  const outputsRequiringReason = new Set(
    session.outputs.outputs.filter((o) => o.requires_reason_code).map((o) => o.code)
  );

  let hasValidCase = false;
  let hasRefusalCase = false;
  const coveredOutputs = new Set<string>();

  simulation.cases.forEach((simCase, index) => {
    if (!simCase.case_id || simCase.case_id.trim() === '') {
      errors.push({
        code: 'SIM_CASE_ID_REQUIRED',
        field_path: `cases[${index}].case_id`,
        message: 'Case identifier is required.',
        severity: 'BLOCK',
      });
    } else {
      if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(simCase.case_id)) {
        errors.push({
          code: 'SIM_CASE_ID_INVALID_FORMAT',
          field_path: `cases[${index}].case_id`,
          message: `Case identifier "${simCase.case_id}" must be 2-64 characters, UPPER_SNAKE_CASE.`,
          severity: 'BLOCK',
        });
      }

      if (seenIds.has(simCase.case_id)) {
        errors.push({
          code: 'SIM_CASE_ID_CONFLICT',
          field_path: `cases[${index}].case_id`,
          message: `Duplicate case identifier: ${simCase.case_id}`,
          severity: 'BLOCK',
        });
      }
      seenIds.add(simCase.case_id);
    }

    const requiredInputs = session.inputs.inputs.filter((i) => i.required);
    const providedInputNames = new Set(simCase.inputs.map((inp) => inp.input_name));

    requiredInputs.forEach((reqInput) => {
      if (!providedInputNames.has(reqInput.name)) {
        errors.push({
          code: 'SIM_REQUIRED_INPUT_MISSING',
          field_path: `cases[${index}].inputs`,
          message: `Required input "${reqInput.name}" is missing from case.`,
          severity: 'BLOCK',
        });
      }
    });

    simCase.inputs.forEach((inp, inputIndex) => {
      if (!declaredInputNames.has(inp.input_name)) {
        errors.push({
          code: 'SIM_UNDECLARED_INPUT_USED',
          field_path: `cases[${index}].inputs[${inputIndex}]`,
          message: `Input "${inp.input_name}" is not a declared input.`,
          severity: 'BLOCK',
        });
      }
    });

    if (!simCase.expected_output || simCase.expected_output.trim() === '') {
      errors.push({
        code: 'SIM_EXPECTED_OUTPUT_REQUIRED',
        field_path: `cases[${index}].expected_output`,
        message: 'Expected output is required.',
        severity: 'BLOCK',
      });
    } else {
      if (!declaredOutputCodes.has(simCase.expected_output)) {
        errors.push({
          code: 'SIM_EXPECTED_OUTPUT_INVALID',
          field_path: `cases[${index}].expected_output`,
          message: `Expected output "${simCase.expected_output}" is not a declared output.`,
          severity: 'BLOCK',
        });
      } else {
        coveredOutputs.add(simCase.expected_output);

        if (refusalOutputCodes.has(simCase.expected_output)) {
          hasRefusalCase = true;
        } else {
          hasValidCase = true;
        }
      }

      if (outputsRequiringReason.has(simCase.expected_output) && 
          (!simCase.expected_reason_code || simCase.expected_reason_code.trim() === '')) {
        errors.push({
          code: 'SIM_REASON_CODE_REQUIRED',
          field_path: `cases[${index}].expected_reason_code`,
          message: `Expected output "${simCase.expected_output}" requires a reason code.`,
          severity: 'BLOCK',
        });
      }
    }

    if (simCase.assertion_passed === false) {
      errors.push({
        code: 'SIM_OUTPUT_MISMATCH',
        field_path: `cases[${index}]`,
        message: `Case "${simCase.case_id}" failed: expected "${simCase.expected_output}" but got "${simCase.actual_output}".`,
        severity: 'BLOCK',
      });
    }
  });

  if (simulation.cases.length > 0 && !hasValidCase) {
    errors.push({
      code: 'SIM_VALID_CASE_MISSING',
      field_path: 'cases',
      message: 'At least one case must produce a valid (approval) output.',
      severity: 'BLOCK',
    });
  }

  if (simulation.cases.length > 0 && !hasRefusalCase) {
    errors.push({
      code: 'SIM_REFUSAL_CASE_MISSING',
      field_path: 'cases',
      message: 'At least one case must produce a refusal output.',
      severity: 'BLOCK',
    });
  }

  declaredOutputCodes.forEach((outputCode) => {
    if (!coveredOutputs.has(outputCode)) {
      errors.push({
        code: 'SIM_OUTPUT_UNCOVERED',
        field_path: 'cases',
        message: `Output "${outputCode}" is not covered by any simulation case.`,
        severity: 'WARN',
      });
    }
  });

  if (!simulation.all_cases_passed && simulation.cases.some((c) => c.assertion_passed !== null)) {
    errors.push({
      code: 'SIM_CASES_NOT_PASSED',
      field_path: 'cases',
      message: 'Not all simulation cases have passed. Fix failing cases before proceeding.',
      severity: 'BLOCK',
    });
  }

  if (!simulation.proof_confirmed && simulation.cases.length > 0) {
    errors.push({
      code: 'SIM_PROOF_UNCONFIRMED',
      field_path: 'proof_confirmed',
      message: 'You must confirm that the simulation cases prove the complete and deterministic behavior of this contract.',
      severity: 'BLOCK',
    });
  }

  return errors;
}
