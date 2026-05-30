import type { ConnectorStatus, Scenario } from '../../src/shared/types';

export function getPayerDecision(scenario: Scenario) {
  return scenario.payerDecision;
}

export const payerConnectorStatus: ConnectorStatus = {
  name: 'Payer Connector',
  mode: 'simulated',
  status: 'simulated',
  detail: 'PA decisions and missing-info responses are simulated using the Da Vinci PAS/CRD/DTR workflow model until a real payer endpoint is connected.'
};
