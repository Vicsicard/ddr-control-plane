import { Lock } from 'lucide-react';
import type { Stage } from '../../types';

interface PlaceholderScreenProps {
  stage: Stage;
  title: string;
}

const STAGE_DESCRIPTIONS: Record<Stage, string> = {
  FRAMING: 'Define decision authority and boundaries.',
  INPUTS: 'Declare what the decision may know.',
  OUTPUTS: 'Define what the decision may return.',
  POLICIES: 'Define constraints that bound the solution space.',
  RULES: 'Implement deterministic logic within policy bounds.',
  SIMULATION_FINALIZATION: 'Prove correctness and generate artifact.',
};

export function PlaceholderScreen({ stage, title }: PlaceholderScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-16">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-slate-400" />
      </div>
      <h2 className="text-xl font-semibold text-slate-700 mb-2">{title}</h2>
      <p className="text-slate-500 max-w-md">
        {STAGE_DESCRIPTIONS[stage]}
      </p>
      <p className="text-sm text-slate-400 mt-4">
        This screen will be implemented in a future phase.
      </p>
    </div>
  );
}
