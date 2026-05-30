import type { ConnectorStatus, Scenario } from '../../src/shared/types';

export function checkCoverage(scenario: Scenario) {
  return scenario.coverageRule;
}

export const coverageConnectorStatus: ConnectorStatus = {
  name: 'Coverage Connector',
  mode: 'simulated',
  status: 'simulated',
  detail: 'Plan rules are local scenario data modeled after formulary and PA requirements.'
};
