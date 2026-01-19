import React from 'react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  description?: string;
  error?: string;
  onChange?: (checked: boolean) => void;
}

export function Checkbox({
  label,
  description,
  error,
  checked,
  onChange,
  className = '',
  id,
  ...props
}: CheckboxProps) {
  const checkboxId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`flex items-start ${className}`}>
      <div className="flex items-center h-5">
        <input
          id={checkboxId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          className={`
            h-4 w-4 rounded border-slate-300 text-blue-600
            focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:opacity-50
            ${error ? 'border-red-500' : ''}
          `}
          {...props}
        />
      </div>
      <div className="ml-3">
        <label
          htmlFor={checkboxId}
          className="text-sm font-medium text-slate-700 cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <p className="text-sm text-slate-500">{description}</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
