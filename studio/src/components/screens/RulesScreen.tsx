import { Plus, Trash2, AlertTriangle, GitBranch } from 'lucide-react';
import { useContractStore } from '../../store/contract-store';
import { Button, Input, Select, Checkbox, Card } from '../ui';
import { ValidationPanel } from '../layout';

const CONDITION_OPERATOR_OPTIONS = [
  { value: 'EQUALS', label: '= (equals)' },
  { value: 'NOT_EQUALS', label: '≠ (not equals)' },
  { value: 'GREATER_THAN', label: '> (greater than)' },
  { value: 'LESS_THAN', label: '< (less than)' },
  { value: 'GREATER_THAN_OR_EQUALS', label: '≥ (greater than or equals)' },
  { value: 'LESS_THAN_OR_EQUALS', label: '≤ (less than or equals)' },
  { value: 'IS_PRESENT', label: 'IS_PRESENT' },
  { value: 'IS_ABSENT', label: 'IS_ABSENT' },
  { value: 'IN', label: 'IN (list)' },
  { value: 'NOT_IN', label: 'NOT_IN (list)' },
];

export function RulesScreen() {
  const {
    session,
    validationErrors,
    updateRules,
    addRule,
    updateRule,
    removeRule,
    validateCurrentStage,
    canProceedToNextStage,
    proceedToNextStage,
    goToStage,
  } = useContractStore();

  const { rules, inputs, outputs } = session;
  const errors = validationErrors.RULES;

  const declaredInputs = inputs.inputs.map((i) => ({
    value: `input.${i.name}`,
    label: `input.${i.name}`,
  }));

  const declaredOutputs = outputs.outputs.map((o) => ({
    value: o.code,
    label: `${o.code} (${o.category})`,
  }));

  const outputsRequiringReason = new Set(
    outputs.outputs.filter((o) => o.requires_reason_code).map((o) => o.code)
  );

  const handleValidate = async () => {
    await validateCurrentStage();
  };

  const handleProceed = async () => {
    const validationErrors = await validateCurrentStage();
    if (validationErrors.length === 0) {
      proceedToNextStage();
    }
  };

  const handleConditionChange = (
    ruleId: string,
    field: 'left_operand' | 'operator' | 'right_operand',
    value: string
  ) => {
    const rule = rules.rules.find((r) => r.id === ruleId);
    if (!rule) return;

    const currentCondition = rule.condition || {
      left_operand: '',
      operator: 'EQUALS' as const,
      right_operand: '',
    };

    updateRule(ruleId, {
      condition: {
        ...currentCondition,
        [field]: value,
      },
    });
  };

  const approvalCount = rules.rules.filter((r) => {
    const output = outputs.outputs.find((o) => o.code === r.output);
    return output && output.category !== 'REFUSAL';
  }).length;

  const refusalCount = rules.rules.filter((r) => {
    const output = outputs.outputs.find((o) => o.code === r.output);
    return output && output.category === 'REFUSAL';
  }).length;

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <GitBranch className="w-6 h-6 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Rules</h1>
            <p className="mt-1 text-slate-600">
              Define how the decision is computed — deterministically — within approved authority and constraints.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-purple-800">
              Rules are deterministic and pure.
            </p>
            <p className="text-sm text-purple-700 mt-1">
              Rules may compute approvals or refusals, but may never bypass policies.
              Policies constrain. Rules decide — only within those constraints.
            </p>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <ValidationPanel errors={errors} />
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
          <p className="text-2xl font-bold text-slate-700">{rules.rules.length}</p>
          <p className="text-sm text-slate-500">Total Rules</p>
        </div>
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-700">{approvalCount}</p>
          <p className="text-sm text-green-600">Approval Rules</p>
        </div>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-700">{refusalCount}</p>
          <p className="text-sm text-red-600">Refusal Rules</p>
        </div>
      </div>

      <Card title="Declared Rules" description="Each rule is a deterministic mapping from conditions to output. Rules are evaluated without order.">
        <div className="space-y-6">
          {rules.rules.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No rules declared yet.</p>
              <p className="text-sm mt-1">Add rules to define how the decision is computed.</p>
            </div>
          ) : (
            rules.rules.map((rule, index) => (
              <div key={rule.id} className="p-4 border border-slate-200 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-700">Rule #{index + 1}</h4>
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <Input
                  label="Rule Identifier"
                  value={rule.rule_id}
                  onChange={(e) => updateRule(rule.id, { rule_id: e.target.value.toUpperCase() })}
                  placeholder="e.g., ALLOW_IF_AGE_OVER_18"
                  helperText="2-64 characters, UPPER_SNAKE_CASE"
                />

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <h5 className="text-sm font-medium text-slate-700 mb-3">Rule Condition</h5>
                  <p className="text-xs text-slate-500 mb-3">
                    When this condition is true, produce the specified output.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <Select
                      label="Input"
                      value={rule.condition?.left_operand || ''}
                      onChange={(value) => handleConditionChange(rule.id, 'left_operand', value)}
                      options={declaredInputs}
                      placeholder="Select input"
                    />

                    <Select
                      label="Operator"
                      value={rule.condition?.operator || ''}
                      onChange={(value) => handleConditionChange(rule.id, 'operator', value)}
                      options={CONDITION_OPERATOR_OPTIONS}
                      placeholder="Select operator"
                    />

                    {rule.condition?.operator && 
                     !['IS_PRESENT', 'IS_ABSENT'].includes(rule.condition.operator) && (
                      <Input
                        label="Value"
                        value={rule.condition?.right_operand || ''}
                        onChange={(e) => handleConditionChange(rule.id, 'right_operand', e.target.value)}
                        placeholder="Comparison value"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Output"
                    value={rule.output}
                    onChange={(value) => updateRule(rule.id, { output: value })}
                    options={declaredOutputs}
                    placeholder="Select output"
                    helperText="Must be a declared output"
                  />

                  {outputsRequiringReason.has(rule.output) && (
                    <Input
                      label="Reason Code"
                      value={rule.reason_code}
                      onChange={(e) => updateRule(rule.id, { reason_code: e.target.value.toUpperCase() })}
                      placeholder="e.g., AGE_BELOW_THRESHOLD"
                      helperText="Required for this output"
                    />
                  )}
                </div>

                <Input
                  label="Description (optional)"
                  value={rule.description}
                  onChange={(e) => updateRule(rule.id, { description: e.target.value })}
                  placeholder="Human-readable description for governance review"
                  helperText="Max 200 characters"
                />
              </div>
            ))
          )}

          <Button onClick={addRule} variant="secondary" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
        </div>
      </Card>

      <Card title="Rules Completeness Declaration" description="This is a governance attestation.">
        <Checkbox
          label="I confirm that the rules above fully and deterministically define how this decision is computed"
          description="Rules operate within declared inputs, outputs, and policy constraints. No hidden logic or 'else' paths exist."
          checked={rules.completeness_confirmed}
          onChange={(checked) => updateRules({ completeness_confirmed: checked })}
        />
      </Card>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button variant="ghost" onClick={() => goToStage('POLICIES')}>
          ← Back to Policies
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleValidate}>
            Validate
          </Button>
          <Button
            onClick={handleProceed}
            disabled={!canProceedToNextStage() && session.stage_states.RULES !== 'DRAFT'}
          >
            Continue to Simulation →
          </Button>
        </div>
      </div>
    </div>
  );
}
