import { useState } from 'react';
import { Plus, Trash2, Play, CheckCircle, XCircle, AlertTriangle, FlaskConical } from 'lucide-react';
import { useContractStore } from '../../store/contract-store';
import { Button, Input, Select, Checkbox, Card } from '../ui';
import { ValidationPanel } from '../layout';
import type { SimulationCaseInput } from '../../types';

export function SimulationScreen() {
  const {
    session,
    validationErrors,
    updateSimulation,
    addSimulationCase,
    updateSimulationCase,
    removeSimulationCase,
    runSimulation,
    validateCurrentStage,
    canProceedToNextStage,
    proceedToNextStage,
    goToStage,
  } = useContractStore();

  const { simulation, inputs, outputs } = session;
  const errors = validationErrors.SIMULATION_FINALIZATION;

  const [newInputName, setNewInputName] = useState<Record<string, string>>({});
  const [newInputValue, setNewInputValue] = useState<Record<string, string>>({});

  const declaredInputs = inputs.inputs.map((i) => ({
    value: i.name,
    label: `${i.name} (${i.type})${i.required ? ' *' : ''}`,
  }));

  const declaredOutputs = outputs.outputs.map((o) => ({
    value: o.code,
    label: `${o.code} (${o.category})`,
  }));

  const refusalOutputCodes = new Set(
    outputs.outputs.filter((o) => o.category === 'REFUSAL').map((o) => o.code)
  );

  const outputsRequiringReason = new Set(
    outputs.outputs.filter((o) => o.requires_reason_code).map((o) => o.code)
  );

  const handleValidate = () => {
    validateCurrentStage();
  };

  const handleRunSimulation = () => {
    runSimulation();
    validateCurrentStage();
  };

  const handleAddInput = (caseId: string) => {
    const inputName = newInputName[caseId];
    const inputValue = newInputValue[caseId];
    if (!inputName) return;

    const simCase = simulation.cases.find((c) => c.id === caseId);
    if (!simCase) return;

    const newInput: SimulationCaseInput = {
      input_name: inputName,
      value: inputValue || '',
    };

    updateSimulationCase(caseId, {
      inputs: [...simCase.inputs, newInput],
    });

    setNewInputName((prev) => ({ ...prev, [caseId]: '' }));
    setNewInputValue((prev) => ({ ...prev, [caseId]: '' }));
  };

  const handleRemoveInput = (caseId: string, inputIndex: number) => {
    const simCase = simulation.cases.find((c) => c.id === caseId);
    if (!simCase) return;

    updateSimulationCase(caseId, {
      inputs: simCase.inputs.filter((_, idx) => idx !== inputIndex),
    });
  };

  const validCaseCount = simulation.cases.filter((c) => !refusalOutputCodes.has(c.expected_output)).length;
  const refusalCaseCount = simulation.cases.filter((c) => refusalOutputCodes.has(c.expected_output)).length;
  const passedCount = simulation.cases.filter((c) => c.assertion_passed === true).length;
  
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-6 h-6 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Simulation & Proof</h1>
            <p className="mt-1 text-slate-600">
              Prove that this decision contract is safe, complete, and deterministic before finalization.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-indigo-800">
              Simulation is governance proof, not testing.
            </p>
            <p className="text-sm text-indigo-700 mt-1">
              A contract that cannot be proven must not be finalized. You must have at least one valid (approval) case and one refusal case.
            </p>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <ValidationPanel errors={errors} />
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
          <p className="text-2xl font-bold text-slate-700">{simulation.cases.length}</p>
          <p className="text-sm text-slate-500">Total Cases</p>
        </div>
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-700">{validCaseCount}</p>
          <p className="text-sm text-green-600">Valid Cases</p>
        </div>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-700">{refusalCaseCount}</p>
          <p className="text-sm text-red-600">Refusal Cases</p>
        </div>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-700">{passedCount}/{simulation.cases.length}</p>
          <p className="text-sm text-blue-600">Passed</p>
        </div>
      </div>

      <Card title="Simulation Cases" description="Each case is a fully specified input scenario with expected output.">
        <div className="space-y-6">
          {simulation.cases.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No simulation cases defined yet.</p>
              <p className="text-sm mt-1">Add cases to prove the contract behavior.</p>
            </div>
          ) : (
            simulation.cases.map((simCase, index) => (
              <div 
                key={simCase.id} 
                className={`p-4 border rounded-lg space-y-4 ${
                  simCase.assertion_passed === true 
                    ? 'border-green-300 bg-green-50/50' 
                    : simCase.assertion_passed === false 
                    ? 'border-red-300 bg-red-50/50' 
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-700">Case #{index + 1}</h4>
                    {simCase.assertion_passed === true && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    {simCase.assertion_passed === false && (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    {simCase.case_type && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        simCase.case_type === 'VALID' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {simCase.case_type}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeSimulationCase(simCase.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <Input
                  label="Case Identifier"
                  value={simCase.case_id}
                  onChange={(e) => updateSimulationCase(simCase.id, { case_id: e.target.value.toUpperCase() })}
                  placeholder="e.g., VALID_ADULT_USER"
                  helperText="2-64 characters, UPPER_SNAKE_CASE"
                />

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <h5 className="text-sm font-medium text-slate-700 mb-3">Input Values</h5>
                  
                  {simCase.inputs.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {simCase.inputs.map((inp, inputIndex) => (
                        <div key={inputIndex} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded">
                          <span className="text-sm font-medium text-slate-600 w-1/3">{inp.input_name}</span>
                          <span className="text-sm text-slate-800 flex-1">{inp.value || '(empty)'}</span>
                          <button
                            onClick={() => handleRemoveInput(simCase.id, inputIndex)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Select
                      label=""
                      value={newInputName[simCase.id] || ''}
                      onChange={(value) => setNewInputName((prev) => ({ ...prev, [simCase.id]: value }))}
                      options={declaredInputs}
                      placeholder="Select input"
                    />
                    <Input
                      label=""
                      value={newInputValue[simCase.id] || ''}
                      onChange={(e) => setNewInputValue((prev) => ({ ...prev, [simCase.id]: e.target.value }))}
                      placeholder="Value"
                    />
                    <Button variant="secondary" onClick={() => handleAddInput(simCase.id)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Expected Output"
                    value={simCase.expected_output}
                    onChange={(value) => updateSimulationCase(simCase.id, { expected_output: value })}
                    options={declaredOutputs}
                    placeholder="Select expected output"
                  />

                  {outputsRequiringReason.has(simCase.expected_output) && (
                    <Input
                      label="Expected Reason Code"
                      value={simCase.expected_reason_code}
                      onChange={(e) => updateSimulationCase(simCase.id, { expected_reason_code: e.target.value.toUpperCase() })}
                      placeholder="e.g., AGE_BELOW_THRESHOLD"
                    />
                  )}
                </div>

                {simCase.actual_output && (
                  <div className={`p-3 rounded-lg ${
                    simCase.assertion_passed ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <h5 className="text-sm font-medium mb-2">Simulation Result</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-600">Actual Output:</span>{' '}
                        <span className="font-medium">{simCase.actual_output}</span>
                      </div>
                      {simCase.actual_reason_code && (
                        <div>
                          <span className="text-slate-600">Reason Code:</span>{' '}
                          <span className="font-medium">{simCase.actual_reason_code}</span>
                        </div>
                      )}
                      {simCase.trace && (
                        <div className="col-span-2 mt-2 text-xs text-slate-500">
                          Rule matched: {simCase.trace.rule_matched || 'None'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          <Button onClick={addSimulationCase} variant="secondary" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Simulation Case
          </Button>
        </div>
      </Card>

      <div className="flex justify-center">
        <Button onClick={handleRunSimulation} variant="primary" className="px-8">
          <Play className="w-4 h-4 mr-2" />
          Run Simulation
        </Button>
      </div>

      <Card title="Proof Confirmation" description="This is a governance attestation.">
        <Checkbox
          label="I confirm that the simulation cases above prove the complete and deterministic behavior of this decision contract"
          description="This includes all approval paths and refusal paths. The contract behavior is fully verified."
          checked={simulation.proof_confirmed}
          onChange={(checked) => updateSimulation({ proof_confirmed: checked })}
          disabled={!simulation.all_cases_passed}
        />
        {!simulation.all_cases_passed && simulation.cases.length > 0 && (
          <p className="text-sm text-amber-600 mt-2">
            All simulation cases must pass before you can confirm proof.
          </p>
        )}
      </Card>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button variant="ghost" onClick={() => goToStage('RULES')}>
          ← Back to Rules
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleValidate}>
            Validate
          </Button>
          <Button
            onClick={() => proceedToNextStage()}
            disabled={!canProceedToNextStage()}
          >
            Continue to Finalization →
          </Button>
        </div>
      </div>
    </div>
  );
}
