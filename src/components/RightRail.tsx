import { Activity, Database, ListChecks, Route, Send } from 'lucide-react';
import type { AccessCase, Role } from '../shared/types';

const ownerLabel: Record<Role, string> = {
  provider: 'Doctor office',
  pharmacy: 'Pharmacy',
  insurance: 'Insurance',
  patient: 'Patient'
};

const railTheme = {
  provider: {
    next: 'from-blue-800 to-cyan-600',
    soft: 'border-blue-100 bg-blue-50/70',
    progress: 'bg-blue-600'
  },
  pharmacy: {
    next: 'from-emerald-800 to-teal-600',
    soft: 'border-emerald-100 bg-emerald-50/70',
    progress: 'bg-emerald-600'
  },
  insurance: {
    next: 'from-violet-800 to-indigo-600',
    soft: 'border-violet-100 bg-violet-50/70',
    progress: 'bg-violet-600'
  },
  patient: {
    next: 'from-teal-800 to-sky-600',
    soft: 'border-teal-100 bg-teal-50/70',
    progress: 'bg-teal-600'
  }
} satisfies Record<Role, { next: string; soft: string; progress: string }>;

const roleFixCopy = {
  provider: {
    title: 'What Instinct fixes for doctors',
    items: [
      {
        title: 'Stops prescribing blind spots',
        detail: 'Shows whether this patient plan covers the drug, needs PA, or prefers an alternative before the patient reaches the pharmacy.'
      },
      {
        title: 'Pulls clinical proof',
        detail: 'Finds diagnosis, labs, prior therapy, and notes that satisfy the payer rule.'
      },
      {
        title: 'Prepares the packet',
        detail: 'Turns the blocker into a reviewable PA or appeal draft so the office signs instead of chasing calls.'
      }
    ]
  },
  pharmacy: {
    title: 'What Instinct fixes for pharmacies',
    items: [
      {
        title: 'Decodes the rejection',
        detail: 'Turns the claim response into plain next steps: PA, step therapy, inactive coverage, cost, or missing information.'
      },
      {
        title: 'Routes the exact ask',
        detail: 'Sends the right blocker to the clinic, payer, or patient instead of restarting the phone loop.'
      },
      {
        title: 'Tracks when to retry',
        detail: 'Keeps the pharmacy informed when approval, plan update, transfer, or alternative therapy is ready.'
      }
    ]
  },
  insurance: {
    title: 'What Instinct fixes for insurers',
    items: [
      {
        title: 'Cleaner PA intake',
        detail: 'Collects the required documents and metadata before review, reducing incomplete submissions.'
      },
      {
        title: 'Preserves plan rules',
        detail: 'Uses the payer coverage criteria to explain requirements without removing utilization management.'
      },
      {
        title: 'Syncs decisions clearly',
        detail: 'Returns approval, denial, missing info, or appeal status to every party with an auditable trail.'
      }
    ]
  },
  patient: {
    title: 'What Instinct is doing',
    items: [
      {
        title: 'Found the blocker',
        detail: 'Instinct explains why the medication is delayed without exposing backend insurance paperwork.'
      },
      {
        title: 'Routing the next step',
        detail: 'The right team owns the current action, and the patient can see who it is.'
      },
      {
        title: 'Watching for pickup',
        detail: 'Instinct keeps tracking until the medication is ready, changed, transferred, or appealed.'
      }
    ]
  }
} satisfies Record<Role, { title: string; items: Array<{ title: string; detail: string }> }>;

export function RightRail({ accessCase, activeRole }: { accessCase: AccessCase; activeRole: Role }) {
  const patientMode = activeRole === 'patient';
  const theme = railTheme[activeRole];
  const nextActionTitle = patientMode
    ? `${ownerLabel[accessCase.nextAction.owner]} has the next step`
    : accessCase.nextAction.title;
  const nextActionDetail = patientMode
    ? 'Instinct is routing this step and will update this medication timeline when something changes.'
    : accessCase.nextAction.detail;

  return (
    <div className="space-y-4">
      <div className="panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <Send className="h-4 w-4 text-slate-500" />
          <h3 className="section-title">Next action</h3>
        </div>
        <div className={`rounded-xl bg-gradient-to-br ${theme.next} p-4 text-white shadow-[0_16px_40px_rgba(15,23,42,0.14)]`}>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-100">
            {patientMode ? 'Current handoff' : `Owner · ${ownerLabel[accessCase.nextAction.owner]}`}
          </div>
          <div className="mt-2 text-base font-semibold">{nextActionTitle}</div>
          <p className="mt-2 text-sm leading-6 text-sky-50">{nextActionDetail}</p>
        </div>
      </div>

      <div className="panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-slate-500" />
          <h3 className="section-title">{roleFixCopy[activeRole].title}</h3>
        </div>
        <div className="space-y-3">
          {roleFixCopy[activeRole].items.map((item) => (
            <PatientFixItem key={item.title} title={item.title} detail={item.detail} className={theme.soft} />
          ))}
        </div>
      </div>

      {patientMode && (
        <div className="panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <Route className="h-4 w-4 text-slate-500" />
            <h3 className="section-title">Medication route</h3>
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            <RouteRow label="Doctor" value="Prescription sent" />
            <RouteRow label="Pharmacy" value={accessCase.pharmacyEvent.message} />
            <RouteRow label="Insurance" value={accessCase.payerDecision.reason} />
            <RouteRow label="Instinct" value="Tracking every handoff until pickup or next therapy." />
          </div>
        </div>
      )}

      <div className="panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-500" />
          <h3 className="section-title">Progress</h3>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${theme.progress}`}
            style={{ width: `${((accessCase.currentStep + 1) / accessCase.timeline.length) * 100}%` }}
          />
        </div>
        <div className="mt-2 text-xs font-medium text-slate-500">
          Step {accessCase.currentStep + 1} of {accessCase.timeline.length}
          {accessCase.hiddenTimelineCount > 0 ? ` · ${accessCase.hiddenTimelineCount} upcoming` : ' · complete'}
        </div>
      </div>

      {!patientMode && <div className="panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-4 w-4 text-slate-500" />
          <h3 className="section-title">Connectors</h3>
        </div>
        <div className="space-y-2">
          {accessCase.connectorStatus.map((connector) => (
            <div key={connector.name} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-950">{connector.name}</div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                  {connector.status}
                </span>
              </div>
              <div className="mt-1 text-xs font-medium text-slate-500">{connector.mode}</div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{connector.detail}</p>
            </div>
          ))}
        </div>
      </div>}
    </div>
  );
}

function PatientFixItem({ title, detail, className = 'border-teal-100 bg-teal-50/60' }: { title: string; detail: string; className?: string }) {
  return (
    <div className={`rounded-lg border p-3 ${className}`}>
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <div className="mt-1 text-sm leading-6 text-slate-700">{detail}</div>
    </div>
  );
}

function RouteRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-1 leading-5">{value}</div>
    </div>
  );
}
