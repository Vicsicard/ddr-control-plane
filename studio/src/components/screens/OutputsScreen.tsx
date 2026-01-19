import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { useContractStore } from '../../store/contract-store';
import { Button, Input, Select, Checkbox, Card } from '../ui';
import { ValidationPanel } from '../layout';
import type { OutputCategory, RefusalRequirement } from '../../types';

const OUTPUT_CATEGORY_OPTIONS = [
  { value: 'APPROVAL', label: 'Approval — Affirmative decision (ALLOW, GRANT, PROCEED)' },
  { value: 'REFUSAL', label: 'Refusal — Negative decision (REFUSE, DENY, REJECT)' },
  { value: 'DEFERRAL', label: 'Deferral — Cannot reach decision, must hand off authority externally (not retry, delay, or partial approval)' },
];

const REFUSAL_REQUIREMENT_OPTIONS = [
  { value: 'REQUIRED', label: 'Required — At least one REFUSAL output must exist' },
  { value: 'OPTIONAL', label: 'Not Required — REFUSAL outputs are a governance decision, not mandated' },
];

export function OutputsScreen() {
  const {
    session,
    validationErrors,
    updateOutputs,
    addOutput,
    updateOutput,
    removeOutput,
    validateCurrentStage,
    canProceedToNextStage,
    proceedToNextStage,
    goToStage,
  } = useContractStore();

  const { outputs, inputs } = session;
  const errors = validationErrors.OUTPUTS;

  const hasInputRefusalBehavior = inputs.inputs.some(
    (i) => i.missing_behavior === 'REFUSE'
  );

  const refusalLocked = hasInputRefusalBehavior;

  const handleValidate = () => {
    validateCurrentStage();
  };

  const handleProceed = () => {
    const validationErrors = validateCurrentStage();
    if (validationErrors.length === 0) {
      proceedToNextStage();
    }
  };

  const handleCategoryChange = (id: string, category: OutputCategory) => {
    const updates: { category: OutputCategory; requires_reason_code?: boolean } = { category };
    if (category === 'REFUSAL') {
      updates.requires_reason_code = true;
    }
    updateOutput(id, updates);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Outputs</h1>
        <p className="mt-1 text-slate-600">
          Define what this decision may return — and nothing else. Outputs are enumerated, finite, and auditable.
        </p>
      </div>

      {errors.length > 0 && (
        <ValidationPanel errors={errors} />
      )}

      <Card title="Refusal Requirement" description="Refusal is a first-class outcome, not an edge case.">
        <div className="space-y-4">
          <Select
            label="Refusal Requirement"
            value={outputs.refusal_requirement}
            onChange={(value) => updateOutputs({ refusal_requirement: value as RefusalRequirement })}
            options={REFUSAL_REQUIREMENT_OPTIONS}
            disabled={refusalLocked}
          />

          {refusalLocked && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Refusal is required
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  One or more inputs have Missing Behavior = REFUSE, which requires a REFUSAL output.
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card title="Declared Outputs" description="A decision cannot produce an output that was not declared here.">
        <div className="space-y-6">
          {outputs.outputs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No outputs declared yet.</p>
              <p className="text-sm mt-1">Add at least two outputs to continue (decision implies choice).</p>
            </div>
          ) : (
            outputs.outputs.map((output, index) => (
              <div key={output.id} className="p-4 border border-slate-200 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-700">Output #{index + 1}</h4>
                  <button
                    onClick={() => removeOutput(output.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Output Code"
                    value={output.code}
                    onChange={(e) => updateOutput(output.id, { code: e.target.value.toUpperCase() })}
                    placeholder="e.g., ALLOW"
                    helperText="UPPER_SNAKE_CASE format. Machine-facing symbol, not a display label."
                  />

                  <Select
                    label="Output Category"
                    value={output.category || ''}
                    onChange={(value) => handleCategoryChange(output.id, value as OutputCategory)}
                    options={OUTPUT_CATEGORY_OPTIONS}
                    placeholder="Select category"
                  />
                </div>

                <Checkbox
                  label="Requires Reason Code"
                  description="Any rule producing this output must include a reason code"
                  checked={output.requires_reason_code}
                  onChange={(checked) => updateOutput(output.id, { requires_reason_code: checked })}
                  disabled={output.category === 'REFUSAL'}
                />

                {output.category === 'REFUSAL' && !output.requires_reason_code && (
                  <p className="text-sm text-amber-600">
                    REFUSAL outputs must require a reason code.
                  </p>
                )}

                <Input
                  label="Description (optional)"
                  value={output.description}
                  onChange={(e) => updateOutput(output.id, { description: e.target.value })}
                  placeholder="Human-readable context for governance review"
                />
              </div>
            ))
          )}

          <Button onClick={addOutput} variant="secondary" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Output
          </Button>
        </div>
      </Card>

      <Card title="Completeness Declaration" description="Outputs are enumerable, finite, and auditable.">
        <Checkbox
          label="I confirm that all possible decision outcomes are declared above"
          description="No other outputs may be produced at evaluation time. Decisions cannot invent outcomes at runtime."
          checked={outputs.completeness_confirmed}
          onChange={(checked) => updateOutputs({ completeness_confirmed: checked })}
        />
      </Card>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button variant="ghost" onClick={() => goToStage('INPUTS')}>
          ← Back to Inputs
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleValidate}>
            Validate
          </Button>
          <Button
            onClick={handleProceed}
            disabled={!canProceedToNextStage() && session.stage_states.OUTPUTS !== 'DRAFT'}
          >
            Continue to Policies →
          </Button>
        </div>
      </div>
    </div>
  );
}
