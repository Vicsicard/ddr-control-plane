import { Plus, Trash2 } from 'lucide-react';
import { useContractStore } from '../../store/contract-store';
import { Button, Input, Select, Checkbox, Card } from '../ui';
import { ValidationPanel } from '../layout';
import type { InputType, MissingBehavior } from '../../types';

const INPUT_TYPE_OPTIONS = [
  { value: 'STRING', label: 'String' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'BOOLEAN', label: 'Boolean' },
  { value: 'DATE', label: 'Date' },
  { value: 'ENUM', label: 'Enum (list of allowed values)' },
];

const MISSING_BEHAVIOR_OPTIONS = [
  { value: 'REFUSE', label: 'Refuse — Decision must return REFUSE if missing' },
  { value: 'DEFAULT', label: 'Default — Use a declared default value' },
  { value: 'PROCEED_WITHOUT', label: 'Proceed Without — Evaluate without this input' },
];

export function InputsScreen() {
  const {
    session,
    validationErrors,
    updateInputs,
    addInput,
    updateInput,
    removeInput,
    validateCurrentStage,
    canProceedToNextStage,
    proceedToNextStage,
    goToStage,
  } = useContractStore();

  const { inputs } = session;
  const errors = validationErrors.INPUTS;

  const handleValidate = () => {
    validateCurrentStage();
  };

  const handleProceed = () => {
    const validationErrors = validateCurrentStage();
    if (validationErrors.length === 0) {
      proceedToNextStage();
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Inputs</h1>
        <p className="mt-1 text-slate-600">
          Declare everything this decision is allowed to know. Undeclared inputs cannot exist at runtime.
        </p>
      </div>

      {errors.length > 0 && (
        <ValidationPanel errors={errors} />
      )}

      <Card title="Declared Inputs" description="Each input must be explicitly declared, typed, and assigned a behavior when missing.">
        <div className="space-y-6">
          {inputs.inputs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No inputs declared yet.</p>
              <p className="text-sm mt-1">Add at least one input to continue.</p>
            </div>
          ) : (
            inputs.inputs.map((input, index) => (
              <div key={input.id} className="p-4 border border-slate-200 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-700">Input #{index + 1}</h4>
                  <button
                    onClick={() => removeInput(input.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Input Name"
                    value={input.name}
                    onChange={(e) => updateInput(input.id, { name: e.target.value })}
                    placeholder="e.g., user_age"
                    helperText="snake_case format required"
                  />

                  <Select
                    label="Input Type"
                    value={input.type || ''}
                    onChange={(value) => updateInput(input.id, { type: value as InputType })}
                    options={INPUT_TYPE_OPTIONS}
                    placeholder="Select type"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <Checkbox
                    label="Required"
                    description="Input must be present at evaluation time"
                    checked={input.required}
                    onChange={(checked) => updateInput(input.id, { 
                      required: checked,
                      missing_behavior: checked ? null : input.missing_behavior 
                    })}
                  />
                </div>

                {!input.required && (
                  <Select
                    label="Missing Behavior"
                    value={input.missing_behavior || ''}
                    onChange={(value) => updateInput(input.id, { missing_behavior: value as MissingBehavior })}
                    options={MISSING_BEHAVIOR_OPTIONS}
                    placeholder="What happens if this input is missing?"
                    helperText="Required for optional inputs"
                  />
                )}

                {input.missing_behavior === 'DEFAULT' && (
                  <Input
                    label="Default Value"
                    value={input.default_value}
                    onChange={(e) => updateInput(input.id, { default_value: e.target.value })}
                    placeholder="Enter default value"
                  />
                )}

                {input.type === 'ENUM' && (
                  <Input
                    label="Allowed Values (comma-separated)"
                    value={input.enum_values.join(', ')}
                    onChange={(e) => updateInput(input.id, { 
                      enum_values: e.target.value.split(',').map((v: string) => v.trim()).filter(Boolean) 
                    })}
                    placeholder="e.g., active, inactive, pending"
                    helperText="Enter allowed values separated by commas"
                  />
                )}

                <Input
                  label="Description (optional)"
                  value={input.description}
                  onChange={(e) => updateInput(input.id, { description: e.target.value })}
                  placeholder="Human-readable context for governance review"
                />
              </div>
            ))
          )}

          <Button onClick={addInput} variant="secondary" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Input
          </Button>
        </div>
      </Card>

      <Card title="Completeness Declaration" description="This is a governance attestation, not UX theater.">
        <Checkbox
          label="I confirm that all inputs this decision may access are declared above"
          description="No undeclared inputs will be available at evaluation time. This prevents 'we didn't know the system could see X' incidents."
          checked={inputs.completeness_confirmed}
          onChange={(checked) => updateInputs({ completeness_confirmed: checked })}
        />
      </Card>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button variant="ghost" onClick={() => goToStage('FRAMING')}>
          ← Back to Framing
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleValidate}>
            Validate
          </Button>
          <Button
            onClick={handleProceed}
            disabled={!canProceedToNextStage() && session.stage_states.INPUTS !== 'DRAFT'}
          >
            Continue to Outputs →
          </Button>
        </div>
      </div>
    </div>
  );
}
