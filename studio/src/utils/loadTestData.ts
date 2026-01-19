import { useContractStore } from '../store/contract-store';

export function loadTestData() {
  const store = useContractStore.getState();

  // Set all the test data directly in the store
  useContractStore.setState({
    session: {
      ...store.session,
      name: 'Age Gate Eligibility Decision',
      current_stage: 'FINALIZATION',
      stage_states: {
        FRAMING: 'READY',
        INPUTS: 'READY',
        OUTPUTS: 'READY',
        POLICIES: 'READY',
        RULES: 'READY',
        SIMULATION_FINALIZATION: 'READY',
        FINALIZATION: 'READY',
      },
      framing: {
        decision_name: 'Age Gate Eligibility Decision',
        decision_purpose: 'Determine whether a user is eligible to access age-restricted content based on their verified age and jurisdiction requirements.',
        authority_type: 'DECIDE_BUT_NOT_EXECUTE',
        permitted_actions: [
          'Grant access to age-restricted content',
          'Deny access with reason code',
        ],
        prohibited_actions: [
          'Modify account settings',
          'Store verification data',
        ],
        escalation_requirement: 'NONE',
        contract_version: '1.0.0',
      },
      inputs: {
        inputs: [
          { id: crypto.randomUUID(), name: 'user_age', type: 'NUMBER', required: true, missing_behavior: 'REFUSE', default_value: '', enum_values: [], description: '' },
          { id: crypto.randomUUID(), name: 'content_min_age', type: 'NUMBER', required: true, missing_behavior: 'REFUSE', default_value: '', enum_values: [], description: '' },
          { id: crypto.randomUUID(), name: 'jurisdiction', type: 'STRING', required: true, missing_behavior: 'REFUSE', default_value: '', enum_values: [], description: '' },
          { id: crypto.randomUUID(), name: 'parental_consent', type: 'BOOLEAN', required: false, missing_behavior: 'DEFAULT', default_value: 'false', enum_values: [], description: '' },
        ],
        completeness_confirmed: true,
      },
      outputs: {
        outputs: [
          { id: crypto.randomUUID(), code: 'ACCESS_GRANTED', category: 'APPROVAL', requires_reason_code: false, description: '' },
          { id: crypto.randomUUID(), code: 'ACCESS_DENIED_UNDERAGE', category: 'REFUSAL', requires_reason_code: true, description: '' },
          { id: crypto.randomUUID(), code: 'ACCESS_DENIED_JURISDICTION', category: 'REFUSAL', requires_reason_code: true, description: '' },
        ],
        refusal_requirement: 'REQUIRED',
        completeness_confirmed: true,
      },
      policies: {
        policies: [
          {
            id: crypto.randomUUID(),
            policy_id: 'POL_AGE_MINIMUM',
            statement: 'User age must meet or exceed content minimum age requirement',
            constraint_type: 'FORBID',
            condition: {
              left_operand: 'input.user_age',
              operator: 'LESS_THAN',
              right_operand: 'input.content_min_age',
            },
            violation_outcome: 'FORCE_REFUSE',
            reason_code: 'UNDERAGE_USER',
          },
          {
            id: crypto.randomUUID(),
            policy_id: 'POL_JURISDICTION_ALLOWED',
            statement: 'Content must be legally accessible in user jurisdiction',
            constraint_type: 'FORBID',
            condition: {
              left_operand: 'input.jurisdiction',
              operator: 'NOT_EQUALS',
              right_operand: 'US',
            },
            violation_outcome: 'FORCE_REFUSE',
            reason_code: 'RESTRICTED_JURISDICTION',
          },
        ],
        scope_confirmed: true,
      },
      rules: {
        rules: [
          {
            id: crypto.randomUUID(),
            rule_id: 'RULE_DENY_JURISDICTION',
            condition: {
              left_operand: 'input.jurisdiction',
              operator: 'NOT_EQUALS',
              right_operand: 'US',
            },
            output: 'ACCESS_DENIED_JURISDICTION',
            reason_code: 'RESTRICTED_JURISDICTION',
            description: '',
          },
          {
            id: crypto.randomUUID(),
            rule_id: 'RULE_DENY_UNDERAGE',
            condition: {
              left_operand: 'input.user_age',
              operator: 'LESS_THAN',
              right_operand: 'input.content_min_age',
            },
            output: 'ACCESS_DENIED_UNDERAGE',
            reason_code: 'UNDERAGE_USER',
            description: '',
          },
          {
            id: crypto.randomUUID(),
            rule_id: 'RULE_GRANT_ACCESS',
            condition: {
              left_operand: 'input.user_age',
              operator: 'GREATER_THAN',
              right_operand: 'input.content_min_age',
            },
            output: 'ACCESS_GRANTED',
            reason_code: '',
            description: '',
          },
        ],
        completeness_confirmed: true,
      },
      simulation: {
        cases: [
          {
            id: crypto.randomUUID(),
            case_id: 'TC_ADULT_US',
            inputs: [
              { input_name: 'user_age', value: '25' },
              { input_name: 'content_min_age', value: '18' },
              { input_name: 'jurisdiction', value: 'US' },
              { input_name: 'parental_consent', value: 'true' },
            ],
            expected_output: 'ACCESS_GRANTED',
            expected_reason_code: '',
            actual_output: 'ACCESS_GRANTED',
            actual_reason_code: null,
            case_type: 'VALID',
            assertion_passed: true,
            trace: {
              policies_checked: ['POL_AGE_MINIMUM', 'POL_JURISDICTION_ALLOWED'],
              rule_matched: 'RULE_GRANT_ACCESS',
              refusal_flag: false,
              engine_version: '1.0.0',
              contract_hash: '',
            },
          },
          {
            id: crypto.randomUUID(),
            case_id: 'TC_MINOR_US',
            inputs: [
              { input_name: 'user_age', value: '15' },
              { input_name: 'content_min_age', value: '18' },
              { input_name: 'jurisdiction', value: 'US' },
              { input_name: 'parental_consent', value: 'true' },
            ],
            expected_output: 'ACCESS_DENIED_UNDERAGE',
            expected_reason_code: 'UNDERAGE_USER',
            actual_output: 'ACCESS_DENIED_UNDERAGE',
            actual_reason_code: 'UNDERAGE_USER',
            case_type: 'REFUSAL',
            assertion_passed: true,
            trace: {
              policies_checked: ['POL_AGE_MINIMUM', 'POL_JURISDICTION_ALLOWED'],
              rule_matched: 'RULE_DENY_UNDERAGE',
              refusal_flag: true,
              engine_version: '1.0.0',
              contract_hash: '',
            },
          },
          {
            id: crypto.randomUUID(),
            case_id: 'TC_ADULT_BLOCKED',
            inputs: [
              { input_name: 'user_age', value: '25' },
              { input_name: 'content_min_age', value: '18' },
              { input_name: 'jurisdiction', value: 'CN' },
              { input_name: 'parental_consent', value: 'true' },
            ],
            expected_output: 'ACCESS_DENIED_JURISDICTION',
            expected_reason_code: 'RESTRICTED_JURISDICTION',
            actual_output: 'ACCESS_DENIED_JURISDICTION',
            actual_reason_code: 'RESTRICTED_JURISDICTION',
            case_type: 'REFUSAL',
            assertion_passed: true,
            trace: {
              policies_checked: ['POL_AGE_MINIMUM', 'POL_JURISDICTION_ALLOWED'],
              rule_matched: 'RULE_DENY_JURISDICTION',
              refusal_flag: true,
              engine_version: '1.0.0',
              contract_hash: '',
            },
          },
        ],
        all_cases_passed: true,
        proof_confirmed: true,
      },
      finalization: {
        approval_confirmed: false,
        is_finalized: false,
        result: null,
      },
    },
  });

  console.log('Test data loaded! Navigate to Finalization to complete.');
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).loadTestData = loadTestData;
}
