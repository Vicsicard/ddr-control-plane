import { Plus, Trash2, AlertTriangle, Shield } from 'lucide-react';
import { useContractStore } from '../../store/contract-store';
import { Button, Input, TextArea, Select, Checkbox, Card } from '../ui';
import { ValidationPanel } from '../layout';
import type { PolicyConstraintType, PolicyViolationOutcome } from '../../types';

const CONSTRAINT_TYPE_OPTIONS = [
  { value: 'REQUIRE', label: 'REQUIRE — A condition must be true' },
  { value: 'FORBID', label: 'FORBID — A condition must never be true' },
];

const VIOLATION_OUTCOME_OPTIONS = [
  { value: 'FORCE_REFUSE', label: 'Force Refuse — Immediately return REFUSE' },
  { value: 'ESCALATE', label: 'Escalate — Trigger escalation path' },
  { value: 'BLOCK', label: 'Block — Prevent decision entirely' },
];

const CONDITION_OPERATOR_OPTIONS = [
  { value: 'IS_PRESENT', label: 'IS_PRESENT' },
  { value: 'IS_ABSENT', label: 'IS_ABSENT' },
  { value: 'EQUALS', label: 'EQUALS' },
  { value: 'NOT_EQUALS', label: 'NOT_EQUALS' },
  { value: 'GREATER_THAN', label: 'GREATER_THAN' },
  { value: 'LESS_THAN', label: 'LESS_THAN' },
];

export function PoliciesScreen() {
  const {
    session,
    validationErrors,
    updatePolicies,
    addPolicy,
    updatePolicy,
    removePolicy,
    validateCurrentStage,
    canProceedToNextStage,
    proceedToNextStage,
    goToStage,
  } = useContractStore();

  const { policies, inputs, outputs, framing } = session;
  const errors = validationErrors.POLICIES;

  const declaredInputs = inputs.inputs.map((i) => ({
    value: `input.${i.name}`,
    label: `input.${i.name}`,
  }));

  const hasRefusalOutput = outputs.outputs.some((o) => o.category === 'REFUSAL');
  const hasEscalationDefined = framing.escalation_requirement !== 'NONE';

  const handleValidate = () => {
    validateCurrentStage();
  };

  const handleProceed = () => {
    const validationErrors = validateCurrentStage();
    if (validationErrors.length === 0) {
      proceedToNextStage();
    }
  };

  const handleConditionChange = (
    policyId: string,
    field: 'left_operand' | 'operator' | 'right_operand',
    value: string
  ) => {
    const policy = policies.policies.find((p) => p.id === policyId);
    if (!policy) return;

    const currentCondition = policy.condition || {
      left_operand: '',
      operator: 'IS_PRESENT' as const,
      right_operand: '',
    };

    updatePolicy(policyId, {
      condition: {
        ...currentCondition,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Policies</h1>
            <p className="mt-1 text-slate-600">
              Define constraints that must always hold, regardless of logic or circumstance.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Policies are constraints, not logic.
            </p>
            <p className="text-sm text-amber-700 mt-1">
              A policy can block or force refusal, but it can never produce an approval.
              If a policy is violated, the decision must not proceed, regardless of what the rules say.
            </p>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <ValidationPanel errors={errors} />
      )}

      <Card title="Declared Policies" description="Each policy is a non-overridable constraint. Policies are always evaluated and are order-independent.">
        <div className="space-y-6">
          {policies.policies.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No policies declared yet.</p>
              <p className="text-sm mt-1">A decision without constraints is not governable.</p>
            </div>
          ) : (
            policies.policies.map((policy, index) => (
              <div key={policy.id} className="p-4 border border-slate-200 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-700">Policy #{index + 1}</h4>
                  <button
                    onClick={() => removePolicy(policy.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Policy Identifier"
                    value={policy.policy_id}
                    onChange={(e) => updatePolicy(policy.id, { policy_id: e.target.value.toUpperCase() })}
                    placeholder="e.g., AGE_VERIFICATION_REQUIRED"
                    helperText="2-64 characters, UPPER_SNAKE_CASE"
                  />

                  <Select
                    label="Constraint Type"
                    value={policy.constraint_type || ''}
                    onChange={(value) => updatePolicy(policy.id, { constraint_type: value as PolicyConstraintType })}
                    options={CONSTRAINT_TYPE_OPTIONS}
                    placeholder="Select constraint type"
                  />
                </div>

                <TextArea
                  label="Policy Statement"
                  value={policy.statement}
                  onChange={(e) => updatePolicy(policy.id, { statement: e.target.value })}
                  placeholder="e.g., Access must be refused if user age cannot be verified."
                  rows={2}
                  helperText="Human-readable statement for governance review (max 300 characters)"
                />

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <h5 className="text-sm font-medium text-slate-700 mb-3">Policy Condition</h5>
                  <div className="grid grid-cols-3 gap-3">
                    <Select
                      label="Input Reference"
                      value={policy.condition?.left_operand || ''}
                      onChange={(value) => handleConditionChange(policy.id, 'left_operand', value)}
                      options={declaredInputs}
                      placeholder="Select input"
                    />

                    <Select
                      label="Operator"
                      value={policy.condition?.operator || ''}
                      onChange={(value) => handleConditionChange(policy.id, 'operator', value)}
                      options={CONDITION_OPERATOR_OPTIONS}
                      placeholder="Select operator"
                    />

                    {policy.condition?.operator && 
                     !['IS_PRESENT', 'IS_ABSENT'].includes(policy.condition.operator) && (
                      <Input
                        label="Value"
                        value={policy.condition?.right_operand || ''}
                        onChange={(e) => handleConditionChange(policy.id, 'right_operand', e.target.value)}
                        placeholder="Comparison value"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Select
                      label="Violation Outcome"
                      value={policy.violation_outcome || ''}
                      onChange={(value) => updatePolicy(policy.id, { violation_outcome: value as PolicyViolationOutcome })}
                      options={VIOLATION_OUTCOME_OPTIONS}
                      placeholder="What happens if violated?"
                    />
                    {policy.violation_outcome === 'FORCE_REFUSE' && !hasRefusalOutput && (
                      <p className="text-xs text-red-600 mt-1">
                        Requires REFUSAL output (not declared in Outputs)
                      </p>
                    )}
                    {policy.violation_outcome === 'ESCALATE' && !hasEscalationDefined && (
                      <p className="text-xs text-red-600 mt-1">
                        Requires escalation defined in Framing
                      </p>
                    )}
                  </div>

                  <Input
                    label="Reason Code"
                    value={policy.reason_code}
                    onChange={(e) => updatePolicy(policy.id, { reason_code: e.target.value.toUpperCase() })}
                    placeholder="e.g., AGE_UNVERIFIED"
                    helperText="Required for policy violations"
                  />
                </div>
              </div>
            ))
          )}

          <Button onClick={addPolicy} variant="secondary" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Policy
          </Button>
        </div>
      </Card>

      <Card title="Policy Scope Declaration" description="This is a governance attestation, not UX theater.">
        <Checkbox
          label="I confirm that all non-negotiable constraints governing this decision are declared above"
          description="These policies apply to every evaluation and cannot be bypassed by rules."
          checked={policies.scope_confirmed}
          onChange={(checked) => updatePolicies({ scope_confirmed: checked })}
        />
      </Card>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button variant="ghost" onClick={() => goToStage('OUTPUTS')}>
          ← Back to Outputs
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleValidate}>
            Validate
          </Button>
          <Button
            onClick={handleProceed}
            disabled={!canProceedToNextStage() && session.stage_states.POLICIES !== 'DRAFT'}
          >
            Continue to Rules →
          </Button>
        </div>
      </div>
    </div>
  );
}
