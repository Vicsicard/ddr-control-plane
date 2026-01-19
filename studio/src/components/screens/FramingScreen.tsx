import { useState } from 'react';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { useContractStore } from '../../store/contract-store';
import { Button, Input, TextArea, Select, Card } from '../ui';
import { ValidationPanel } from '../layout';
import type { AuthorityType, EscalationRequirement } from '../../types';

const AUTHORITY_TYPE_OPTIONS = [
  { value: 'RECOMMEND_ONLY', label: 'Recommend Only — System suggests, human decides' },
  { value: 'DECIDE_BUT_NOT_EXECUTE', label: 'Decide But Not Execute — System decides, external system acts' },
  { value: 'DECIDE_AND_TRIGGER_EXTERNAL_ACTION', label: 'Decide And Trigger — System decides and triggers action (requires acknowledgment)' },
];

const ESCALATION_OPTIONS = [
  { value: 'NONE', label: 'None — No escalation required' },
  { value: 'REQUIRED_ON_REFUSAL', label: 'Required on Refusal — Escalate when decision is refused' },
  { value: 'REQUIRED_ON_UNCERTAINTY', label: 'Required on Uncertainty — Escalate when confidence is low' },
  { value: 'ALWAYS_REQUIRED', label: 'Always Required — Every decision requires escalation' },
];

export function FramingScreen() {
  const {
    session,
    validationErrors,
    updateFraming,
    addPermittedAction,
    removePermittedAction,
    addProhibitedAction,
    removeProhibitedAction,
    validateCurrentStage,
    canProceedToNextStage,
    proceedToNextStage,
  } = useContractStore();

  const { framing } = session;
  const errors = validationErrors.FRAMING;

  const [newPermitted, setNewPermitted] = useState('');
  const [newProhibited, setNewProhibited] = useState('');
  const [showAuthorityWarning, setShowAuthorityWarning] = useState(false);

  const handleAddPermitted = () => {
    if (newPermitted.trim()) {
      addPermittedAction(newPermitted.trim());
      setNewPermitted('');
    }
  };

  const handleAddProhibited = () => {
    if (newProhibited.trim()) {
      addProhibitedAction(newProhibited.trim());
      setNewProhibited('');
    }
  };

  const handleAuthorityTypeChange = (value: string) => {
    if (value === 'DECIDE_AND_TRIGGER_EXTERNAL_ACTION') {
      setShowAuthorityWarning(true);
    }
    updateFraming({ authority_type: value as AuthorityType });
  };

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
        <h1 className="text-2xl font-bold text-slate-900">Framing</h1>
        <p className="mt-1 text-slate-600">
          Define what decision authority is being created and its hard boundaries.
        </p>
      </div>

      {errors.length > 0 && (
        <ValidationPanel errors={errors} />
      )}

      <Card title="Decision Overview" description="Define what this decision is and who owns it.">
        <div className="space-y-4">
          <Input
            label="Decision Name"
            value={framing.decision_name}
            onChange={(e) => updateFraming({ decision_name: e.target.value })}
            placeholder="e.g., Age Gate Eligibility Decision"
            helperText="3-80 characters. Must be unique within workspace."
          />

          <TextArea
            label="Decision Purpose"
            value={framing.decision_purpose}
            onChange={(e) => updateFraming({ decision_purpose: e.target.value })}
            placeholder="Describe what this decision determines (minimum 30 characters). Use action verbs like: determine, allow, deny, approve, reject."
            rows={3}
            helperText="Must describe an actionable decision outcome, not how it works."
          />

          <Select
            label="Authority Type"
            value={framing.authority_type || ''}
            onChange={handleAuthorityTypeChange}
            options={AUTHORITY_TYPE_OPTIONS}
            placeholder="Select authority type"
            helperText="Defines what the system is allowed to do with its decision."
          />

          {showAuthorityWarning && framing.authority_type === 'DECIDE_AND_TRIGGER_EXTERNAL_ACTION' && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  This authority type allows the system to trigger external actions.
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Ensure appropriate escalation requirements are configured.
                </p>
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-sm text-slate-600 italic">
              "This contract defines decision authority only. It does not execute side effects."
            </p>
          </div>
        </div>
      </Card>

      <Card title="Authority Envelope" description="Define hard bounds. Anything not permitted here is structurally impossible later.">
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">Permitted Actions</h4>
            <p className="text-sm text-slate-500 mb-3">
              What this decision is allowed to do. Use evaluative verbs only (evaluate, determine, return, assess).
            </p>
            
            <div className="space-y-2 mb-3">
              {framing.permitted_actions.map((action, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <span className="flex-1 text-sm text-green-800">{action}</span>
                  <button
                    onClick={() => removePermittedAction(index)}
                    className="p-1 text-green-600 hover:text-green-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newPermitted}
                onChange={(e) => setNewPermitted(e.target.value)}
                placeholder="e.g., Evaluate declared inputs to determine eligibility"
                onKeyDown={(e) => e.key === 'Enter' && handleAddPermitted()}
              />
              <Button onClick={handleAddPermitted} variant="secondary">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">Prohibited Actions</h4>
            <p className="text-sm text-slate-500 mb-3">
              What this decision is explicitly NOT allowed to do. This is denial of authority.
            </p>
            
            <div className="space-y-2 mb-3">
              {framing.prohibited_actions.map((action, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <span className="flex-1 text-sm text-red-800">{action}</span>
                  <button
                    onClick={() => removeProhibitedAction(index)}
                    className="p-1 text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newProhibited}
                onChange={(e) => setNewProhibited(e.target.value)}
                placeholder="e.g., Creating or modifying user records"
                onKeyDown={(e) => e.key === 'Enter' && handleAddProhibited()}
              />
              <Button onClick={handleAddProhibited} variant="secondary">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Select
            label="Escalation Requirement"
            value={framing.escalation_requirement || ''}
            onChange={(value) => updateFraming({ escalation_requirement: value as EscalationRequirement })}
            options={ESCALATION_OPTIONS}
            placeholder="Select escalation requirement"
            helperText="When should this decision be escalated to a human?"
          />
        </div>
      </Card>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button variant="secondary" onClick={handleValidate}>
          Validate
        </Button>
        <Button
          onClick={handleProceed}
          disabled={!canProceedToNextStage() && session.stage_states.FRAMING !== 'DRAFT'}
        >
          Continue to Inputs →
        </Button>
      </div>
    </div>
  );
}
