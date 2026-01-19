import { Shield } from 'lucide-react';

export function Header() {
  return (
    <header className="h-14 bg-slate-900 text-white flex items-center px-6 border-b border-slate-800">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-blue-400" />
        <div>
          <h1 className="text-lg font-semibold">Decision Contract Studio</h1>
        </div>
      </div>
      <div className="ml-auto text-xs text-slate-400">
        DCG Engine v0.1
      </div>
    </header>
  );
}
