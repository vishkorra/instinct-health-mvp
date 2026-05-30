import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  Pill,
  ShieldAlert,
  Stethoscope,
  WalletCards
} from 'lucide-react';
import type { AccessCase, EvidenceItem, PipelineItem, Role } from '../shared/types';

interface CaseWorkspaceProps {
  accessCase: AccessCase;
  activeRole: Role;
  onRoleAction: (message: string, advance?: boolean) => void;
}

const verdictLabels: Record<string, string> = {
  covered: 'Covered',
  'not-covered': 'Not covered',
  'pa-required': 'PA required',
  'covered-high-cost': 'Covered, high cost',
  'coverage-unknown': 'Coverage unknown'
};

const statusClass: Record<PipelineItem['status'], string> = {
  done: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  active: 'border-blue-200 bg-blue-50 text-blue-800',
  waiting: 'border-slate-200 bg-slate-50 text-slate-700',
  blocked: 'border-rose-200 bg-rose-50 text-rose-800'
};

const rolePortal = {
  provider: {
    label: 'Doctor office',
    title: 'Doctor office resolution pipeline',
    subtitle: 'The clinic sees clinical proof, coverage rules, packet readiness, and exactly what must be signed.',
    accent: 'from-blue-800 via-blue-700 to-cyan-500',
    soft: 'from-blue-50 via-white to-cyan-50',
    ring: 'border-blue-100',
    dot: 'bg-blue-100 text-blue-800',
    halo: 'shadow-[0_22px_70px_rgba(37,99,235,0.13)]'
  },
  pharmacy: {
    label: 'Pharmacy',
    title: 'Pharmacy fill recovery pipeline',
    subtitle: 'The pharmacy sees why the claim failed, what Instinct sent upstream, and when to retry the fill.',
    accent: 'from-emerald-800 via-emerald-700 to-teal-500',
    soft: 'from-emerald-50 via-white to-teal-50',
    ring: 'border-emerald-100',
    dot: 'bg-emerald-100 text-emerald-800',
    halo: 'shadow-[0_22px_70px_rgba(5,150,105,0.13)]'
  },
  insurance: {
    label: 'Insurance',
    title: 'Insurance review pipeline',
    subtitle: 'The payer sees a cleaner intake: required documents, missing information, audit trail, and decision reason.',
    accent: 'from-violet-800 via-violet-700 to-indigo-500',
    soft: 'from-violet-50 via-white to-indigo-50',
    ring: 'border-violet-100',
    dot: 'bg-violet-100 text-violet-800',
    halo: 'shadow-[0_22px_70px_rgba(124,58,237,0.13)]'
  },
  patient: {
    label: 'Patient',
    title: 'Patient medication route',
    subtitle: 'The patient sees a simple route from doctor to pharmacy to insurance, without backend paperwork.',
    accent: 'from-teal-800 via-teal-700 to-sky-500',
    soft: 'from-teal-50 via-white to-sky-50',
    ring: 'border-teal-100',
    dot: 'bg-teal-100 text-teal-800',
    halo: 'shadow-[0_22px_70px_rgba(13,148,136,0.13)]'
  }
} satisfies Record<Role, {
  label: string;
  title: string;
  subtitle: string;
  accent: string;
  soft: string;
  ring: string;
  dot: string;
  halo: string;
}>;

export function CaseWorkspace({ accessCase, activeRole, onRoleAction }: CaseWorkspaceProps) {
  if (activeRole === 'patient') {
    return <PatientSimpleDashboard accessCase={accessCase} onRoleAction={onRoleAction} />;
  }

  return (
    <div className="space-y-4">
      {accessCase.liveData && <LiveEpicPanel accessCase={accessCase} />}

      <FixPlanPanel accessCase={accessCase} activeRole={activeRole} />

      <div className="grid grid-cols-4 gap-4 max-2xl:grid-cols-2 max-md:grid-cols-1">
        <SummaryTile icon={Stethoscope} label="Patient" title={accessCase.patient.name} detail={`${accessCase.patient.age} · ${accessCase.prescription.diagnosis}`} />
        <SummaryTile icon={Pill} label="Medication" title={accessCase.prescription.drug} detail={accessCase.prescription.dose} />
        <SummaryTile icon={WalletCards} label="Plan" title={accessCase.insurance.payer} detail={`${accessCase.insurance.plan} · ${accessCase.insurance.status}`} />
        <SummaryTile icon={ShieldAlert} label="Blocker" title={accessCase.blocker.title} detail={accessCase.blocker.explanation} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="panel p-5">
          {activeRole === 'provider' && <ProviderView accessCase={accessCase} onRoleAction={onRoleAction} />}
          {activeRole === 'pharmacy' && <PharmacyView accessCase={accessCase} onRoleAction={onRoleAction} />}
          {activeRole === 'insurance' && <InsuranceView accessCase={accessCase} onRoleAction={onRoleAction} />}
        </div>

        <PortalPipeline accessCase={accessCase} activeRole={activeRole} />
      </div>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  title,
  detail
}: {
  icon: typeof Stethoscope;
  label: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div className="text-base font-semibold text-slate-950">{title}</div>
      <div className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{detail}</div>
    </div>
  );
}

function ProviderView({ accessCase, onRoleAction }: { accessCase: AccessCase; onRoleAction: CaseWorkspaceProps['onRoleAction'] }) {
  return (
    <div className="grid grid-cols-2 gap-5 max-2xl:grid-cols-1">
      <div>
        <SectionHeader icon={AlertCircle} title="Prescribing intelligence" />
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-950">{verdictLabels[accessCase.coverageRule.verdict]}</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{accessCase.coverageRule.summary}</p>
            </div>
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
              {accessCase.blocker.severity}
            </span>
          </div>
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Alternatives</div>
            <div className="flex flex-wrap gap-2">
              {accessCase.coverageRule.alternatives.map((alternative) => (
                <span key={alternative} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  {alternative}
                </span>
              ))}
            </div>
          </div>
        </div>

        <SectionHeader icon={ClipboardList} title="Evidence checklist" className="mt-5" />
        <EvidenceList items={accessCase.chartEvidence} />
      </div>

      <div>
        <SectionHeader icon={FileText} title="Generated packet" />
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-950">{accessCase.paDraft.subject}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{accessCase.paDraft.summary}</p>
          <div className="mt-4 space-y-2">
            {accessCase.paDraft.sections.map((section) => (
              <div key={section} className="flex gap-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {section}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="secondary-button"
              onClick={() => onRoleAction('Instinct marked the chart evidence as reviewed.')}
            >
              Review evidence
            </button>
            <button
              className="primary-button"
              onClick={() => onRoleAction('Provider signed the packet. Instinct moved the case forward.', true)}
            >
              Submit packet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PharmacyView({ accessCase, onRoleAction }: { accessCase: AccessCase; onRoleAction: CaseWorkspaceProps['onRoleAction'] }) {
  return (
    <div className="grid grid-cols-2 gap-5 max-2xl:grid-cols-1">
      <div>
        <SectionHeader icon={Pill} title="Fill attempt" />
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-950">{accessCase.pharmacyEvent.pharmacy}</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <MiniField label="Outcome" value={accessCase.pharmacyEvent.status} />
            <MiniField label="Reject code" value={accessCase.pharmacyEvent.rejectionCode} />
          </div>
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{accessCase.pharmacyEvent.message}</p>
        </div>
      </div>
      <div>
        <SectionHeader icon={ClipboardList} title="Pharmacy actions" />
        <ActionList accessCase={accessCase} role="pharmacy" />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="secondary-button"
            onClick={() => onRoleAction('Pharmacy sent rejection details to Instinct.')}
          >
            Send rejection
          </button>
          <button
            className="primary-button"
            onClick={() => onRoleAction('Pharmacy task completed. Instinct updated the medication route.', true)}
          >
            Retry / update fill
          </button>
        </div>
      </div>
    </div>
  );
}

function InsuranceView({ accessCase, onRoleAction }: { accessCase: AccessCase; onRoleAction: CaseWorkspaceProps['onRoleAction'] }) {
  return (
    <div className="grid grid-cols-2 gap-5 max-2xl:grid-cols-1">
      <div>
        <SectionHeader icon={ShieldAlert} title="PA intake" />
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <MiniField label="Decision status" value={accessCase.payerDecision.status} />
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{accessCase.payerDecision.reason}</p>
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Required documentation</div>
            <ul className="space-y-2">
              {accessCase.coverageRule.requirements.map((requirement) => (
                <li key={requirement} className="flex gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  {requirement}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div>
        <SectionHeader icon={FileText} title="Audit trail" />
        <Timeline accessCase={accessCase} />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="secondary-button"
            onClick={() => onRoleAction('Insurance requested missing information through Instinct.')}
          >
            Request info
          </button>
          <button
            className="primary-button"
            onClick={() => onRoleAction('Insurance decision logged. Instinct notified the care team.', true)}
          >
            Record decision
          </button>
        </div>
      </div>
    </div>
  );
}

function PatientView({ accessCase, onRoleAction }: { accessCase: AccessCase; onRoleAction: CaseWorkspaceProps['onRoleAction'] }) {
  const ownerLabel: Record<Role, string> = {
    provider: 'doctor office',
    pharmacy: 'pharmacy',
    insurance: 'insurance team',
    patient: 'you'
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-5 max-lg:grid-cols-1">
      <div>
        <SectionHeader icon={ClipboardList} title="Where my medication is" />
        <Timeline accessCase={accessCase} />
      </div>
      <div>
        <SectionHeader icon={AlertCircle} title="Current status" />
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-lg font-semibold text-slate-950">
            The {ownerLabel[accessCase.nextAction.owner]} has the next step
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Instinct is routing the blocker to the right team and will update this page when the medication moves forward.
          </p>
          <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm leading-6 text-blue-900">
            Instinct is tracking this medication until it is approved, changed, transferred, or ready for pickup.
          </div>
          <button
            className="primary-button mt-4 w-full justify-center"
            onClick={() => onRoleAction('Instinct refreshed the patient timeline and sent a plain-English status update.')}
          >
            Check latest update
          </button>
        </div>
      </div>
    </div>
  );
}

function PatientSimpleDashboard({ accessCase, onRoleAction }: { accessCase: AccessCase; onRoleAction: CaseWorkspaceProps['onRoleAction'] }) {
  const ownerLabel: Record<Role, string> = {
    provider: 'Doctor office',
    pharmacy: 'Pharmacy',
    insurance: 'Insurance',
    patient: 'You'
  };
  const ownerStage: Record<Role, string> = {
    provider: 'Doctor',
    pharmacy: 'Pharmacy',
    insurance: 'Insurance',
    patient: 'You'
  };
  const latestEvent = accessCase.visibleTimeline.at(-1);
  const isReady =
    accessCase.pharmacyEvent.status === 'ready' ||
    accessCase.payerDecision.status === 'approved' ||
    latestEvent?.status === 'resolved';
  const routeOwner = latestEvent?.actor && latestEvent.actor !== 'system'
    ? latestEvent.actor
    : accessCase.nextAction.owner;
  const currentStage = isReady ? 'Ready' : ownerStage[routeOwner];
  const currentOwner = isReady ? 'Pharmacy' : ownerLabel[routeOwner];
  const patientNextDetail =
    currentStage === 'Doctor'
      ? 'The prescription was sent. Instinct is watching for the pharmacy fill check.'
      : currentStage === 'Pharmacy'
        ? accessCase.pharmacyEvent.message
        : currentStage === 'Insurance'
          ? accessCase.payerDecision.reason
          : 'The medication is ready for pickup.';
  const stages = [
    { label: 'Doctor', detail: 'sent prescription' },
    { label: 'Pharmacy', detail: 'checked fill' },
    { label: 'Insurance', detail: 'reviewing coverage' },
    { label: 'Ready', detail: 'pickup' }
  ];
  const activeIndex = isReady ? 3 : Math.max(0, stages.findIndex((stage) => stage.label === currentStage));

  return (
    <div className="space-y-5">
      <section className="panel overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-sky-500 p-6 text-white">
          <div className="text-base font-semibold text-white/85">Your medication</div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">{accessCase.prescription.drug}</h2>
              <p className="mt-1 text-lg font-medium text-white/90">{accessCase.prescription.dose}</p>
            </div>
            <span className="rounded-full bg-white px-4 py-2 text-base font-extrabold text-teal-800">
              {isReady ? 'Ready for pickup' : 'Delayed'}
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4 text-xl font-extrabold text-slate-950">
            Current stop: <span className="text-teal-700">{currentStage}</span>
          </div>
          {accessCase.liveData && (
            <div className="mb-4 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-base font-semibold text-teal-900">
              Connected to Epic sandbox chart for Patient/{accessCase.liveData.patientId}. Instinct is using live FHIR data where Epic returns it.
            </div>
          )}

          <div className="relative grid grid-cols-4 gap-3 max-sm:grid-cols-1">
            <div className="absolute left-[12.5%] right-[12.5%] top-6 h-2 rounded-full bg-slate-200 max-sm:hidden" />
            <div
              className="absolute left-[12.5%] top-6 h-2 rounded-full bg-gradient-to-r from-teal-600 to-sky-500 max-sm:hidden"
              style={{ width: `${Math.max(0, activeIndex) * 25}%` }}
            />
            {stages.map((stage, index) => {
              const complete = index < activeIndex || isReady;
              const active = index === activeIndex && !isReady;
              return (
                <div key={stage.label} className={`relative rounded-2xl border p-4 text-center ${
                  active
                    ? 'border-teal-300 bg-teal-50 shadow-soft'
                    : complete
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-slate-200 bg-white'
                }`}>
                  <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-lg font-extrabold ${
                    active
                      ? 'bg-teal-600 text-white'
                      : complete
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                  }`}>
                    {complete ? <CheckCircle2 className="h-6 w-6" /> : index + 1}
                  </div>
                  <div className="mt-3 text-lg font-extrabold text-slate-950">{stage.label}</div>
                  <div className="mt-1 text-base text-slate-600">{stage.detail}</div>
                  {active && <div className="mt-3 rounded-full bg-white px-3 py-1 text-sm font-extrabold text-teal-800">Here now</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-5 max-md:grid-cols-1">
        <div className="panel border-teal-200 bg-teal-50/70 p-6">
          <div className="text-base font-bold uppercase tracking-[0.12em] text-teal-700">Who has the next step?</div>
          <div className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">{currentOwner}</div>
          <p className="mt-3 text-lg leading-7 text-slate-700">{patientNextDetail}</p>
        </div>

        <div className="panel border-amber-200 bg-amber-50/80 p-6">
          <div className="text-base font-bold uppercase tracking-[0.12em] text-amber-700">Why is it blocked?</div>
          <div className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">{accessCase.blocker.title}</div>
          <p className="mt-3 text-lg leading-7 text-slate-700">{accessCase.blocker.explanation}</p>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-base font-bold uppercase tracking-[0.12em] text-slate-500">Latest update</div>
            <div className="mt-2 text-2xl font-extrabold text-slate-950">{latestEvent?.title ?? 'Status checked'}</div>
            <p className="mt-2 max-w-2xl text-lg leading-7 text-slate-700">
              {latestEvent?.body ?? 'Instinct is checking the medication route and will update this page when something changes.'}
            </p>
          </div>
          <button
            className="primary-button min-h-12 justify-center px-5 text-base"
            onClick={() => onRoleAction('Instinct refreshed the patient timeline and sent a plain-English status update.')}
          >
            Check status
          </button>
        </div>
      </section>
    </div>
  );
}

function LiveEpicPanel({ accessCase }: { accessCase: AccessCase }) {
  const liveData = accessCase.liveData;
  if (!liveData) return null;

  const loadedCount = liveData.resources.reduce((sum, resource) => sum + resource.count, 0);

  return (
    <div className="panel overflow-hidden border-cyan-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 bg-gradient-to-r from-cyan-700 via-teal-600 to-emerald-500 px-5 py-4 text-white">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-white/75">
            <Database className="h-4 w-4" />
            Live Epic data connection
          </div>
          <h3 className="mt-2 text-xl font-extrabold tracking-tight">
            {loadedCount} sandbox FHIR resources loaded for Patient/{liveData.patientId}
          </h3>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-white/85">
            Instinct is merging live Epic patient, coverage, medication, lab, document, diagnosis, allergy, and encounter data into this case.
            Payer rules, PBM rejection events, and pharmacy status remain simulated until those external workflows are connected.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-teal-800">
          {liveData.source}
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3 p-4">
        {liveData.resources.map((resource) => (
          <div key={resource.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-slate-950">{resource.label}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">{resource.api}</div>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-extrabold ${
                resource.status === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {resource.count}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">{resource.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FixPlanPanel({ accessCase, activeRole }: { accessCase: AccessCase; activeRole: Role }) {
  const portal = rolePortal[activeRole];
  const foundEvidence = accessCase.chartEvidence.filter((item) => item.status === 'found').length;
  const openEvidence = accessCase.chartEvidence.filter((item) => item.status !== 'found').length;
  const nextOwner = rolePortal[accessCase.nextAction.owner].label.toLowerCase();
  const stepsByRole: Record<Role, Array<{ title: string; body: string; state: PipelineItem['status'] }>> = {
    provider: [
      { title: 'Insurance-aware prescribing', body: accessCase.coverageRule.summary, state: 'done' },
      { title: 'Chart proof pulled', body: `${foundEvidence} evidence items found; ${openEvidence} still need attention.`, state: foundEvidence > 0 ? 'active' : 'waiting' },
      { title: 'Packet drafted', body: accessCase.paDraft.subject, state: 'active' },
      { title: 'Clinician signs once', body: `Instinct routes the next action to ${nextOwner}: ${accessCase.nextAction.title}.`, state: 'waiting' }
    ],
    pharmacy: [
      { title: 'Fill result captured', body: `${accessCase.pharmacyEvent.rejectionCode}: ${accessCase.pharmacyEvent.message}`, state: 'done' },
      { title: 'Reject reason decoded', body: accessCase.blocker.title, state: accessCase.pharmacyEvent.status === 'ready' ? 'done' : 'active' },
      { title: 'Upstream team notified', body: 'Instinct sends the exact missing item instead of forcing phone tag.', state: 'active' },
      { title: 'Retry path tracked', body: 'Pharmacy knows when to retry the claim, transfer, or prepare pickup.', state: 'waiting' }
    ],
    insurance: [
      { title: 'Structured case intake', body: accessCase.paDraft.summary, state: 'active' },
      { title: 'Requirements matched', body: accessCase.coverageRule.requirements.join(' · '), state: 'active' },
      { title: 'Precise reason returned', body: accessCase.payerDecision.reason, state: accessCase.payerDecision.status === 'denied' ? 'blocked' : 'waiting' },
      { title: 'Decision synced', body: 'Instinct pushes the decision back to provider, pharmacy, and patient timelines.', state: 'waiting' }
    ],
    patient: [
      { title: 'Prescription sent', body: `${accessCase.prescription.drug} was prescribed for ${accessCase.prescription.diagnosis}.`, state: 'done' },
      { title: 'Blocker explained simply', body: accessCase.blocker.title, state: 'active' },
      { title: 'Right team assigned', body: `The next step is with the ${nextOwner}.`, state: 'active' },
      { title: 'Pickup path tracked', body: 'The patient sees what is happening without calling everyone.', state: 'waiting' }
    ]
  };
  const steps = stepsByRole[activeRole];

  return (
    <div className={`panel overflow-hidden border ${portal.ring} ${portal.halo}`}>
      <div className={`bg-gradient-to-r ${portal.accent} px-4 py-3 text-white`}>
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/80">What Instinct fixes for the {portal.label.toLowerCase()}</h3>
          <div className="mt-1 text-lg font-semibold leading-6">{portal.title}</div>
          <p className="mt-1 text-sm font-medium text-white">{portal.subtitle}</p>
        </div>
      </div>
      <div className={`grid grid-cols-4 gap-3 bg-gradient-to-br ${portal.soft} p-4 max-xl:grid-cols-2 max-md:grid-cols-1`}>
        {steps.map((step, index) => (
          <div key={step.title} className={`relative rounded-xl border ${portal.ring} bg-white/90 p-3 shadow-sm`}>
            <div className="flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${portal.dot}`}>{index + 1}</span>
              <div className="text-sm font-semibold text-slate-950">{step.title}</div>
            </div>
            <span className={`mt-3 inline-flex rounded-full border px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${statusClass[step.state]}`}>
              {step.state}
            </span>
            <p className="mt-2 text-xs leading-5 text-slate-600">{step.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PortalPipeline({ accessCase, activeRole }: { accessCase: AccessCase; activeRole: Role }) {
  const portal = rolePortal[activeRole];

  return (
    <div className={`panel overflow-hidden border ${portal.ring}`}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
        <div>
          <h3 className="section-title">{portal.label} portal pipeline</h3>
          <p className="mt-1 text-sm text-slate-600">{portal.subtitle}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${portal.dot}`}>{portal.label}</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3 p-5">
        {accessCase.rolePipelines[activeRole].map((item, index) => (
          <div key={item.title} className={`relative rounded-xl border p-4 ${statusClass[item.status]}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-xs font-extrabold">
                {index + 1}
              </span>
              <span className="rounded-full bg-white/60 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em]">
                {item.status}
              </span>
            </div>
            <div className="text-sm font-extrabold">{item.title}</div>
            <div className="mt-2 text-xs leading-5 opacity-85">{item.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, className = '' }: { icon: typeof AlertCircle; title: string; className?: string }) {
  return (
    <div className={`mb-3 flex items-center gap-2 ${className}`}>
      <Icon className="h-4 w-4 text-slate-500" />
      <h3 className="section-title">{title}</h3>
    </div>
  );
}

function EvidenceList({ items }: { items: EvidenceItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3">
          <div>
            <div className="text-sm font-semibold text-slate-950">{item.label}</div>
            <div className="mt-1 text-sm text-slate-600">{item.value}</div>
            <div className="mt-1 text-xs text-slate-400">{item.source}</div>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            item.status === 'found' ? 'bg-emerald-100 text-emerald-700' : item.status === 'missing' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {item.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function Timeline({ accessCase }: { accessCase: AccessCase }) {
  return (
    <div className="space-y-3">
      {accessCase.visibleTimeline.map((event, index) => (
        <div key={`${event.title}-${index}`} className="relative rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-950">{event.title}</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{event.body}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">{event.actor}</span>
          </div>
          <div className="mt-3 text-xs font-medium text-slate-400">{event.time}</div>
        </div>
      ))}
    </div>
  );
}

function ActionList({ accessCase, role }: { accessCase: AccessCase; role: Role }) {
  const actions = accessCase.remedies.filter((remedy) => remedy.owner === role);
  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <div key={action.title} className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-950">{action.title}</div>
            <ArrowRight className="h-4 w-4 text-teal-600" />
          </div>
          <div className="mt-1 text-sm leading-6 text-slate-600">{action.detail}</div>
        </div>
      ))}
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold capitalize text-slate-950">{value}</div>
    </div>
  );
}
