import type { ConnectorStatus, Scenario } from '../../src/shared/types';

export function getPharmacyEvent(scenario: Scenario) {
  return scenario.pharmacyEvent;
}

export const pharmacyConnectorStatus: ConnectorStatus = {
  name: 'Pharmacy Connector',
  mode: 'simulated',
  status: 'simulated',
  detail: 'NCPDP-style rejection events are simulated until a pharmacy/PBM integration exists.'
};
