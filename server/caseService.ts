import { buildAccessCase } from '../src/shared/caseEngine';
import { getScenario } from '../src/shared/scenarios';
import type { AccessCase } from '../src/shared/types';
import { checkCoverage, coverageConnectorStatus } from './connectors/coverageConnector';
import { getDrugInfo, drugConnectorStatus } from './connectors/drugConnector';
import { ehrConnectorStatus, getEhrContext } from './connectors/ehrConnector';
import { getLabelInfo, labelConnectorStatus } from './connectors/labelConnector';
import { getPayerDecision, payerConnectorStatus } from './connectors/payerConnector';
import { getPharmacyEvent, pharmacyConnectorStatus } from './connectors/pharmacyConnector';

export async function assembleAccessCase(scenarioId: string, currentStep: number): Promise<AccessCase | undefined> {
  const scenario = getScenario(scenarioId);
  if (!scenario) return undefined;

  getEhrContext(scenario);
  checkCoverage(scenario);
  getPharmacyEvent(scenario);
  getPayerDecision(scenario);
  await Promise.all([getDrugInfo(scenario), getLabelInfo(scenario)]);

  return buildAccessCase(scenario, currentStep, [
    ehrConnectorStatus,
    drugConnectorStatus,
    labelConnectorStatus,
    coverageConnectorStatus,
    pharmacyConnectorStatus,
    payerConnectorStatus
  ]);
}
