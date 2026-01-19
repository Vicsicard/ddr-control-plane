import { CheckCircle, Circle, Lock, AlertCircle, FileText } from 'lucide-react';
import type { Stage, StageState } from '../../types';

interface StageNavProps {
  currentStage: Stage;
  stageStates: Record<Stage, StageState>;
  onStageClick: (stage: Stage) => void;
  isStageAccessible: (stage: Stage) => boolean;
}

const STAGES: { id: Stage; label: string; number: number }[] = [
  { id: 'FRAMING', label: 'Framing', number: 1 },
  { id: 'INPUTS', label: 'Inputs', number: 2 },
  { id: 'OUTPUTS', label: 'Outputs', number: 3 },
  { id: 'POLICIES', label: 'Policies', number: 4 },
  { id: 'RULES', label: 'Rules', number: 5 },
  { id: 'SIMULATION_FINALIZATION', label: 'Simulation & Proof', number: 6 },
];

function getStateIcon(state: StageState, isCurrent: boolean) {
  switch (state) {
    case 'READY':
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case 'INVALID':
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    case 'DRAFT':
      return <FileText className="w-5 h-5 text-amber-500" />;
    case 'LOCKED':
      return <Lock className="w-5 h-5 text-slate-400" />;
    case 'EMPTY':
    default:
      return <Circle className={`w-5 h-5 ${isCurrent ? 'text-blue-600' : 'text-slate-400'}`} />;
  }
}

function getStateLabel(state: StageState): string {
  switch (state) {
    case 'READY':
      return 'Ready';
    case 'INVALID':
      return 'Blocked';
    case 'DRAFT':
      return 'Draft';
    case 'LOCKED':
      return 'Locked';
    case 'EMPTY':
      return 'Empty';
    default:
      return '';
  }
}

export function StageNav({
  currentStage,
  stageStates,
  onStageClick,
  isStageAccessible,
}: StageNavProps) {
  return (
    <nav className="w-64 bg-white border-r border-slate-200 p-4">
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Contract Stages
        </h2>
      </div>
      <ul className="space-y-1">
        {STAGES.map((stage) => {
          const state = stageStates[stage.id];
          const isCurrent = currentStage === stage.id;
          const isAccessible = isStageAccessible(stage.id);

          return (
            <li key={stage.id}>
              <button
                onClick={() => isAccessible && onStageClick(stage.id)}
                disabled={!isAccessible}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                  ${isCurrent 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : isAccessible 
                      ? 'hover:bg-slate-50 text-slate-700' 
                      : 'text-slate-400 cursor-not-allowed'
                  }
                `}
              >
                <span className="flex-shrink-0">
                  {getStateIcon(state, isCurrent)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400">
                      {stage.number}.
                    </span>
                    <span className="font-medium truncate">{stage.label}</span>
                  </div>
                  <span className={`text-xs ${
                    state === 'READY' ? 'text-green-600' :
                    state === 'INVALID' ? 'text-red-500' :
                    state === 'DRAFT' ? 'text-amber-600' :
                    'text-slate-400'
                  }`}>
                    {getStateLabel(state)}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
