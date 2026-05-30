import type { AccessCase, ConnectorStatus, LiveDataSummary, NextAction, Scenario } from './types';

export function buildAccessCase(
  scenario: Scenario,
  currentStep = 0,
  connectorStatus: ConnectorStatus[] = [],
  liveData?: LiveDataSummary
): AccessCase {
  const clampedStep = Math.max(0, Math.min(currentStep, scenario.timeline.length - 1));
  const visibleTimeline = scenario.timeline.slice(0, clampedStep + 1);
  const nextAction: NextAction =
    scenario.stageActions[clampedStep] ?? scenario.stageActions[scenario.stageActions.length - 1];

  return {
    ...scenario,
    currentStep: clampedStep,
    visibleTimeline,
    hiddenTimelineCount: scenario.timeline.length - visibleTimeline.length,
    nextAction,
    connectorStatus,
    liveData
  };
}

export function listScenarioCards(scenarios: Scenario[]) {
  return scenarios.map((scenario) => ({
    id: scenario.id,
    title: scenario.title,
    shortTitle: scenario.shortTitle,
    summary: scenario.summary,
    medication: scenario.prescription.drug,
    payer: scenario.insurance.payer,
    severity: scenario.blocker.severity
  }));
}
