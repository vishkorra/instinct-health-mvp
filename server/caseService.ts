import { buildAccessCase } from '../src/shared/caseEngine';
import { getScenario } from '../src/shared/scenarios';
import type { AccessCase, EvidenceItem, Scenario } from '../src/shared/types';
import { checkCoverage, coverageConnectorStatus } from './connectors/coverageConnector';
import { drugConnectorStatusFor, getDrugInfo } from './connectors/drugConnector';
import { ehrConnectorStatus, getEhrContext } from './connectors/ehrConnector';
import { overlayEpicData } from './connectors/epicConnector';
import { getLabelInfo, labelConnectorStatusFor } from './connectors/labelConnector';
import { getPayerDecision, payerConnectorStatus } from './connectors/payerConnector';
import { getPharmacyEvent, pharmacyConnectorStatus } from './connectors/pharmacyConnector';
import type { FastifyRequest } from 'fastify';

export async function assembleAccessCase(
  scenarioId: string,
  currentStep: number,
  request?: FastifyRequest
): Promise<AccessCase | undefined> {
  const scenario = getScenario(scenarioId);
  if (!scenario) return undefined;

  getEhrContext(scenario);
  checkCoverage(scenario);
  getPharmacyEvent(scenario);
  getPayerDecision(scenario);
  const [drugInfo, labelInfo] = await Promise.all([getDrugInfo(scenario), getLabelInfo(scenario)]);
  const epicOverlay = await overlayEpicData(request, scenario);
  const enrichedScenario = addPublicDataEvidence(epicOverlay.scenario, drugInfo, labelInfo);

  return buildAccessCase(enrichedScenario, currentStep, [
    epicOverlay.connectorStatus,
    ehrConnectorStatus,
    drugConnectorStatusFor(drugInfo),
    labelConnectorStatusFor(labelInfo),
    coverageConnectorStatus,
    pharmacyConnectorStatus,
    payerConnectorStatus
  ], epicOverlay.liveData);
}

function addPublicDataEvidence(
  scenario: Scenario,
  drugInfo: Awaited<ReturnType<typeof getDrugInfo>>,
  labelInfo: Awaited<ReturnType<typeof getLabelInfo>>
): Scenario {
  const publicEvidence: EvidenceItem[] = [
    {
      label: 'RxNorm normalized medication',
      value: `${drugInfo.drug} mapped to RxCUI ${drugInfo.rxcui} via ${drugInfo.source}.`,
      source: 'Drug database',
      status: drugInfo.rxcui === 'unknown' ? 'requested' : 'found'
    },
    {
      label: 'Drug label metadata',
      value: `${labelInfo.title} checked through ${labelInfo.source}.`,
      source: 'Drug database',
      status: labelInfo.source === 'local label fallback' ? 'requested' : 'found'
    }
  ];

  return {
    ...scenario,
    chartEvidence: [...publicEvidence, ...scenario.chartEvidence]
  };
}
