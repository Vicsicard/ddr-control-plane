import { AlertTriangle, XCircle, Info } from 'lucide-react';
import type { ValidationError } from '../../types';

interface ValidationPanelProps {
  errors: ValidationError[];
  title?: string;
}

export function ValidationPanel({ errors, title = 'Validation Issues' }: ValidationPanelProps) {
  if (errors.length === 0) {
    return null;
  }

  const blockingErrors = errors.filter((e) => e.severity === 'BLOCK');
  const warnings = errors.filter((e) => e.severity === 'WARN');

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-red-600" />
        <h3 className="font-semibold text-red-800">{title}</h3>
        <span className="text-sm text-red-600">
          ({blockingErrors.length} blocking, {warnings.length} warnings)
        </span>
      </div>
      <ul className="space-y-2">
        {errors.map((error, index) => (
          <li key={index} className="flex items-start gap-2">
            {error.severity === 'BLOCK' ? (
              <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className="text-sm text-slate-700">{error.message}</p>
              <p className="text-xs text-slate-500 font-mono">{error.code}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
