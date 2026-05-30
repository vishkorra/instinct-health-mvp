import type { ConnectorStatus, Scenario } from '../../src/shared/types';

export function getEhrContext(scenario: Scenario) {
  return {
    patient: scenario.patient,
    evidence: scenario.chartEvidence,
    fhir: {
      resourceType: 'Bundle',
      type: 'collection',
      source: 'Synthea-style synthetic FHIR sample',
      entry: [
        { resource: { resourceType: 'Patient', name: [{ text: scenario.patient.name }], id: scenario.patient.memberId } },
        ...scenario.patient.conditions.map((condition) => ({
          resource: { resourceType: 'Condition', code: { text: condition }, subject: { display: scenario.patient.name } }
        })),
        ...scenario.chartEvidence.map((item) => ({
          resource: { resourceType: 'Observation', code: { text: item.label }, valueString: item.value }
        }))
      ]
    }
  };
}

export const ehrConnectorStatus: ConnectorStatus = {
  name: 'EHR Connector',
  mode: 'synthetic-fhir',
  status: 'connected',
  detail: 'Using local Synthea-style FHIR resources. Epic/SMART can replace this connector later.'
};
