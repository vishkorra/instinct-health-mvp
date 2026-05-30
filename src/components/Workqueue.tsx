import type { ScenarioId, ScenarioListItem } from '../shared/types';

interface WorkqueueProps {
  scenarios: ScenarioListItem[];
  selectedScenarioId: ScenarioId;
  onSelect: (scenarioId: ScenarioId) => void;
}

const severityClass = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-rose-100 text-rose-700'
};

export function Workqueue({ scenarios, selectedScenarioId, onSelect }: WorkqueueProps) {
  return (
    <div className="space-y-2">
      {scenarios.map((scenario) => {
        const selected = scenario.id === selectedScenarioId;
        return (
          <button
            key={scenario.id}
            onClick={() => onSelect(scenario.id)}
            className={`w-full rounded-lg border p-3 text-left transition ${
              selected
                ? 'border-sky-500 bg-gradient-to-br from-sky-600 to-teal-500 text-white shadow-soft'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{scenario.shortTitle}</div>
                <div className={`mt-1 text-xs ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {scenario.medication} · {scenario.payer}
                </div>
              </div>
              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${selected ? 'bg-white/15 text-white' : severityClass[scenario.severity]}`}>
                {scenario.severity}
              </span>
            </div>
            <p className={`mt-2 line-clamp-2 text-xs leading-5 ${selected ? 'text-slate-300' : 'text-slate-600'}`}>
              {scenario.summary}
            </p>
          </button>
        );
      })}
    </div>
  );
}
