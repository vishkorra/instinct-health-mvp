import type { AccessCase, ScenarioId, ScenarioListItem } from './shared/types';
import { buildAccessCase, listScenarioCards } from './shared/caseEngine';
import { getScenario, scenarios } from './shared/scenarios';

const staticConnectorStatus = [
  {
    name: 'Epic SMART Connector',
    mode: 'live-free-api',
    status: 'fallback',
    detail: 'Launch from Epic SMART sandbox to replace demo patient, coverage, medication, lab, and document data with live FHIR resources.'
  },
  {
    name: 'Static Demo Mode',
    mode: 'local-cache',
    status: 'fallback',
    detail: 'This public demo is running from static scenario data without a live backend.'
  },
  {
    name: 'EHR Connector',
    mode: 'synthetic-fhir',
    status: 'connected',
    detail: 'Using local Synthea-style FHIR resources. Epic/SMART can replace this connector later.'
  },
  {
    name: 'Drug Connector',
    mode: 'live-free-api',
    status: 'fallback',
    detail: 'The full-stack app tries RxNav/RxNorm live lookup. Static GitHub Pages uses local RxNorm fallback data.'
  },
  {
    name: 'Label Connector',
    mode: 'live-free-api',
    status: 'fallback',
    detail: 'The full-stack app tries DailyMed first, then openFDA. Static GitHub Pages uses local label fallback data.'
  },
  {
    name: 'Coverage Connector',
    mode: 'simulated',
    status: 'simulated',
    detail: 'Plan rules are local scenario data modeled after CMS Part D formulary concepts, ICD-10 diagnosis evidence, LOINC lab evidence, and Da Vinci PA requirements.'
  },
  {
    name: 'Pharmacy Connector',
    mode: 'simulated',
    status: 'simulated',
    detail: 'NCPDP-style rejection events are simulated until a pharmacy/PBM integration exists.'
  },
  {
    name: 'Payer Connector',
    mode: 'simulated',
    status: 'simulated',
    detail: 'PA decisions and missing-info responses are simulated using the Da Vinci PAS/CRD/DTR workflow model until a real payer endpoint is connected.'
  }
] satisfies AccessCase['connectorStatus'];

const staticDemoEnabled = import.meta.env.VITE_STATIC_DEMO === '1';

function storageKey(scenarioId: ScenarioId) {
  return `instinct:case-step:${scenarioId}`;
}

function getStaticStep(scenarioId: ScenarioId) {
  const value = window.localStorage.getItem(storageKey(scenarioId));
  return value ? Number(value) || 0 : 0;
}

function setStaticStep(scenarioId: ScenarioId, step: number) {
  window.localStorage.setItem(storageKey(scenarioId), String(step));
}

function staticCase(scenarioId: ScenarioId, step = getStaticStep(scenarioId)) {
  const scenario = getScenario(scenarioId);
  if (!scenario) throw new Error('Scenario not found');
  return buildAccessCase(scenario, step, staticConnectorStatus);
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  if (staticDemoEnabled) {
    throw new Error('Static demo mode');
  }

  const headers = options?.body ? { 'Content-Type': 'application/json' } : undefined;
  const response = await fetch(path, {
    headers,
    ...options
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getScenarios() {
  try {
    return await apiRequest<ScenarioListItem[]>('/api/scenarios');
  } catch {
    return listScenarioCards(scenarios);
  }
}

export async function getCase(scenarioId: ScenarioId) {
  try {
    return await apiRequest<AccessCase>(`/api/cases/${scenarioId}`);
  } catch {
    return staticCase(scenarioId);
  }
}

export async function advanceCase(scenarioId: ScenarioId) {
  try {
    return await apiRequest<AccessCase>(`/api/cases/${scenarioId}/advance`, { method: 'POST' });
  } catch {
    const scenario = getScenario(scenarioId);
    if (!scenario) throw new Error('Scenario not found');
    const nextStep = Math.min(getStaticStep(scenarioId) + 1, scenario.timeline.length - 1);
    setStaticStep(scenarioId, nextStep);
    return staticCase(scenarioId, nextStep);
  }
}

export async function resetCase(scenarioId: ScenarioId) {
  try {
    return await apiRequest<AccessCase>(`/api/cases/${scenarioId}/reset`, { method: 'POST' });
  } catch {
    setStaticStep(scenarioId, 0);
    return staticCase(scenarioId, 0);
  }
}
