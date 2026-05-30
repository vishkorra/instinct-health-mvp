import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  ClipboardCheck,
  Eye,
  PauseCircle,
  Pill,
  PlayCircle,
  RotateCcw,
  Sparkles,
  StepForward
} from 'lucide-react';
import { advanceCase, getCase, getScenarios, resetCase } from './api';
import { CaseWorkspace } from './components/CaseWorkspace';
import { RightRail } from './components/RightRail';
import { Workqueue } from './components/Workqueue';
import type { AccessCase, Role, ScenarioId, ScenarioListItem } from './shared/types';

const roles: Role[] = ['provider', 'pharmacy', 'insurance', 'patient'];

const roleLabels: Record<Role, string> = {
  provider: 'Doctor office',
  pharmacy: 'Pharmacy',
  insurance: 'Insurance team',
  patient: 'Patient'
};

const roleTheme = {
  provider: {
    appBg: 'bg-[radial-gradient(circle_at_top_left,#dceeff_0%,transparent_34%),linear-gradient(135deg,#edf6ff_0%,#f7fbff_48%,#f3f7fb_100%)]',
    logo: 'from-blue-700 to-cyan-500',
    select: 'border-blue-100',
    status: 'bg-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.14)]',
    simulation: 'from-blue-700 via-cyan-600 to-slate-900'
  },
  pharmacy: {
    appBg: 'bg-[radial-gradient(circle_at_top_left,#dff8ee_0%,transparent_34%),linear-gradient(135deg,#eefbf5_0%,#f7fcfa_48%,#f0f7f2_100%)]',
    logo: 'from-emerald-700 to-teal-500',
    select: 'border-emerald-100',
    status: 'bg-emerald-600 shadow-[0_0_0_4px_rgba(5,150,105,0.14)]',
    simulation: 'from-emerald-700 via-teal-600 to-slate-900'
  },
  insurance: {
    appBg: 'bg-[radial-gradient(circle_at_top_left,#ede9fe_0%,transparent_34%),linear-gradient(135deg,#f5f3ff_0%,#fbfaff_48%,#f3f4f8_100%)]',
    logo: 'from-violet-700 to-indigo-500',
    select: 'border-violet-100',
    status: 'bg-violet-600 shadow-[0_0_0_4px_rgba(124,58,237,0.14)]',
    simulation: 'from-violet-700 via-indigo-600 to-slate-900'
  },
  patient: {
    appBg: 'bg-[radial-gradient(circle_at_top_left,#dff9f6_0%,transparent_34%),linear-gradient(135deg,#effcfb_0%,#fbfffd_50%,#f2f7fb_100%)]',
    logo: 'from-teal-700 to-sky-500',
    select: 'border-teal-100',
    status: 'bg-teal-600 shadow-[0_0_0_4px_rgba(13,148,136,0.14)]',
    simulation: 'from-teal-700 via-sky-600 to-slate-900'
  }
} satisfies Record<Role, { appBg: string; logo: string; select: string; status: string; simulation: string }>;

const simulationSteps: Array<{
  role: Role;
  caseStep: number;
  title: string;
  body: string;
  lens: string;
}> = [
  {
    role: 'patient',
    caseStep: 0,
    title: 'Patient leaves the visit',
    body: 'Sarah sees Ozempic was prescribed, but she does not yet know whether insurance will block it.',
    lens: 'Patient view'
  },
  {
    role: 'pharmacy',
    caseStep: 1,
    title: 'Pharmacy hits prior auth',
    body: 'The claim rejects at the pharmacy. Instinct captures the rejection code and opens the access case.',
    lens: 'Pharmacy view'
  },
  {
    role: 'provider',
    caseStep: 2,
    title: 'Instinct troubleshoots for the doctor',
    body: 'Instinct explains the blocker and pulls A1c, diagnosis, and metformin history into a reviewable packet.',
    lens: 'Doctor view'
  },
  {
    role: 'insurance',
    caseStep: 3,
    title: 'Insurance receives a clean packet',
    body: 'The payer sees structured requirements and missing-info status instead of a messy phone-and-fax loop.',
    lens: 'Insurance view'
  },
  {
    role: 'insurance',
    caseStep: 4,
    title: 'Insurance approves the medication',
    body: 'The packet is complete. Instinct captures the approval and sends the decision back to the pharmacy.',
    lens: 'Insurance view'
  },
  {
    role: 'patient',
    caseStep: 5,
    title: 'Patient sees ready for pickup',
    body: 'The patient gets the answer they actually care about: the medication is ready at the pharmacy.',
    lens: 'Patient view'
  }
];

export default function App() {
  const [scenarios, setScenarios] = useState<ScenarioListItem[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId>('glp1-diabetes-pa');
  const [activeRole, setActiveRole] = useState<Role>('provider');
  const [accessCase, setAccessCase] = useState<AccessCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityMessage, setActivityMessage] = useState<string | null>(null);
  const [simulationIndex, setSimulationIndex] = useState<number | null>(null);

  useEffect(() => {
    getScenarios()
      .then((items) => {
        setScenarios(items);
        if (items[0]) setSelectedScenarioId(items[0].id);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    setLoading(true);
    getCase(selectedScenarioId)
      .then((data) => {
        setAccessCase(data);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedScenarioId]);

  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedScenarioId),
    [scenarios, selectedScenarioId]
  );
  const isPatientPortal = activeRole === 'patient';
  const theme = roleTheme[activeRole];
  const currentSimulationStep = simulationIndex === null ? null : simulationSteps[simulationIndex];

  const moveCaseToStep = async (targetStep: number) => {
    let updated = await resetCase(selectedScenarioId);
    for (let step = 0; step < targetStep; step += 1) {
      updated = await advanceCase(selectedScenarioId);
    }
    setAccessCase(updated);
    return updated;
  };

  const handleAdvance = async () => {
    try {
      const updated = await advanceCase(selectedScenarioId);
      setAccessCase(updated);
      setSimulationIndex(null);
      setActivityMessage(`Instinct advanced the ${roleLabels[activeRole].toLowerCase()} workflow.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to advance case.');
    }
  };

  const handleReset = async () => {
    try {
      const updated = await resetCase(selectedScenarioId);
      setAccessCase(updated);
      setSimulationIndex(null);
      setActivityMessage('Case reset to the start of the demo.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset case.');
    }
  };

  const handleRoleAction = async (message: string, advance = false) => {
    try {
      if (advance) {
        const updated = await advanceCase(selectedScenarioId);
        setAccessCase(updated);
        setSimulationIndex(null);
      }
      setActivityMessage(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update case.');
    }
  };

  const showSimulationStep = async (index: number) => {
    const step = simulationSteps[index];
    setLoading(true);
    try {
      setSelectedScenarioId('glp1-diabetes-pa');
      let updated = await resetCase('glp1-diabetes-pa');
      for (let caseStep = 0; caseStep < step.caseStep; caseStep += 1) {
        updated = await advanceCase('glp1-diabetes-pa');
      }
      setAccessCase(updated);
      setActiveRole(step.role);
      setSimulationIndex(index);
      setError(null);
      setActivityMessage(`${step.lens}: ${step.title}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to run simulation.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSimulation = () => showSimulationStep(0);

  const handleNextSimulationStep = () => {
    const nextIndex = simulationIndex === null ? 0 : Math.min(simulationIndex + 1, simulationSteps.length - 1);
    return showSimulationStep(nextIndex);
  };

  const handleExitSimulation = async () => {
    setSimulationIndex(null);
    await moveCaseToStep(accessCase?.currentStep ?? 0);
    setActivityMessage('Simulation paused. Manual controls are active.');
  };

  return (
    <div className={`min-h-screen ${theme.appBg} text-slate-900`}>
      <header className="border-b border-sky-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-5 px-6 py-4 max-md:flex-col max-md:items-stretch">
          <div className="flex items-center gap-3 max-md:min-w-0">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${theme.logo} text-white shadow-soft`}>
              <Pill className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Instinct</div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-950 max-md:text-lg">
                {isPatientPortal ? 'Medication Status' : 'Medication Access Command Center'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 max-md:grid max-md:grid-cols-[1fr_auto] max-md:items-stretch">
            <label className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg border ${theme.select} bg-white px-3 py-2 text-sm shadow-sm max-md:col-span-2`}>
              <Building2 className="h-4 w-4 text-slate-500" />
              <select
                value={selectedScenarioId}
                onChange={(event) => {
                  setSimulationIndex(null);
                  setSelectedScenarioId(event.target.value as ScenarioId);
                }}
                className="min-w-[260px] bg-transparent text-sm font-medium outline-none max-md:min-w-0 max-md:w-full"
              >
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.title}
                  </option>
                ))}
              </select>
            </label>
            <label className={`flex min-w-0 items-center gap-2 rounded-lg border ${theme.select} bg-white px-3 py-2 text-sm shadow-sm max-md:col-span-2`}>
              <Eye className="h-4 w-4 text-slate-500" />
              <select
                value={activeRole}
                onChange={(event) => {
                  setSimulationIndex(null);
                  setActiveRole(event.target.value as Role);
                }}
                className="bg-transparent text-sm font-medium outline-none max-md:w-full"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={handleReset} className="icon-button" aria-label="Reset case">
              <RotateCcw className="h-4 w-4" />
            </button>
            <button onClick={handleAdvance} className="primary-button max-md:justify-center">
              <StepForward className="h-4 w-4" />
              Advance case
            </button>
          </div>
        </div>
      </header>

      <main className={`mx-auto grid gap-5 px-6 py-5 ${
        isPatientPortal
          ? 'max-w-[980px] grid-cols-1'
          : 'max-w-[1600px] grid-cols-[280px_minmax(0,1fr)_320px] max-xl:grid-cols-[280px_minmax(0,1fr)] max-lg:grid-cols-1'
      }`}>
        {!isPatientPortal && (
          <aside className="space-y-4 max-lg:order-3">
            <div className="panel p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="section-title">Access workqueue</h2>
                <ClipboardCheck className="h-4 w-4 text-slate-500" />
              </div>
              <Workqueue
                scenarios={scenarios}
                selectedScenarioId={selectedScenarioId}
                onSelect={(id) => setSelectedScenarioId(id)}
              />
            </div>
          </aside>
        )}

        <section className="min-w-0 space-y-4 max-lg:order-1">
          <SimulationPanel
            activeRole={activeRole}
            currentStep={currentSimulationStep}
            simulationIndex={simulationIndex}
            theme={theme.simulation}
            onStart={handleStartSimulation}
            onNext={handleNextSimulationStep}
            onExit={handleExitSimulation}
          />

          <div className={`panel flex flex-wrap items-center justify-between gap-3 p-4 ${isPatientPortal ? 'hidden' : ''}`}>
            <div>
              <div className="flex items-center gap-2">
                <span className={`status-dot ${theme.status}`} />
                <span className="text-sm font-semibold text-slate-950">
                  {roleLabels[activeRole]} dashboard · {selectedScenario?.shortTitle ?? 'Loading'}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{accessCase?.demoMoment ?? selectedScenario?.summary}</p>
            </div>
            {activityMessage && (
              <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800">
                {activityMessage}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertTriangle className="mr-2 inline h-4 w-4" />
              {error}
            </div>
          )}

          {loading || !accessCase ? (
            <div className="panel flex h-[540px] items-center justify-center p-8 text-sm text-slate-500">
              Loading Instinct case...
            </div>
          ) : (
            <CaseWorkspace accessCase={accessCase} activeRole={activeRole} onRoleAction={handleRoleAction} />
          )}
        </section>

        {!isPatientPortal && (
          <aside className="max-xl:col-span-2 max-lg:order-2 max-lg:col-span-1">
            {accessCase && <RightRail accessCase={accessCase} activeRole={activeRole} />}
          </aside>
        )}
      </main>
    </div>
  );
}

function SimulationPanel({
  activeRole,
  currentStep,
  simulationIndex,
  theme,
  onStart,
  onNext,
  onExit
}: {
  activeRole: Role;
  currentStep: (typeof simulationSteps)[number] | null;
  simulationIndex: number | null;
  theme: string;
  onStart: () => void;
  onNext: () => void;
  onExit: () => void;
}) {
  const stepNumber = simulationIndex === null ? 0 : simulationIndex + 1;
  const nextDisabled = simulationIndex === simulationSteps.length - 1;

  return (
    <section className={`overflow-hidden rounded-2xl bg-gradient-to-r ${theme} text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 p-5 max-lg:grid-cols-1">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-white/70">
            <Sparkles className="h-4 w-4" />
            Investor walkthrough
            <span className="rounded-full bg-white/15 px-2 py-1 text-white">{currentStep?.lens ?? roleLabels[activeRole]}</span>
          </div>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
            {currentStep?.title ?? 'Watch Instinct resolve a prior authorization breakdown'}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/82">
            {currentStep?.body ??
              'Start with the patient seeing a delayed medication, then jump into the doctor, pharmacy, and insurance dashboards to show how Instinct finds the blocker and coordinates the fix.'}
          </p>
        </div>

        <div className="flex min-w-[250px] flex-col justify-between gap-3 rounded-xl bg-white/12 p-3 backdrop-blur max-lg:min-w-0">
          <div className="grid grid-cols-5 gap-1">
            {simulationSteps.map((step, index) => (
              <div
                key={step.title}
                className={`h-2 rounded-full ${simulationIndex !== null && index <= simulationIndex ? 'bg-white' : 'bg-white/25'}`}
                title={step.title}
              />
            ))}
          </div>
          <div className="text-sm font-semibold text-white/80">
            {simulationIndex === null ? 'Ready to start' : `Scene ${stepNumber} of ${simulationSteps.length}`}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="walkthrough-button" onClick={onStart}>
              <PlayCircle className="h-4 w-4" />
              Start
            </button>
            <button type="button" className="walkthrough-button" onClick={onNext} disabled={nextDisabled}>
              <StepForward className="h-4 w-4" />
              Next scene
            </button>
            <button type="button" className="walkthrough-ghost-button" onClick={onExit}>
              <PauseCircle className="h-4 w-4" />
              Pause
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
