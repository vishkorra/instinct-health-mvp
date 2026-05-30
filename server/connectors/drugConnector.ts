import type { ConnectorStatus, Scenario } from '../../src/shared/types';

const fallbackRxCuis: Record<string, string> = {
  Ozempic: '1991306',
  'Flovent HFA': '896001',
  Humira: '1747292',
  Eliquis: '1364430',
  Trintellix: '1790885',
  'Nurtec ODT': '2282437'
};

export async function getDrugInfo(scenario: Scenario) {
  const drug = scenario.prescription.drug;

  if (process.env.INSTINCT_LIVE_DRUG_LOOKUP === '1') {
    try {
      const response = await fetch(`https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drug)}`, {
        signal: AbortSignal.timeout(1500)
      });
      const payload = await response.json() as { idGroup?: { rxnormId?: string[] } };
      const rxcui = payload.idGroup?.rxnormId?.[0];
      if (rxcui) {
        return { drug, rxcui, source: 'RxNav live lookup' };
      }
    } catch {
      // Keep demos reliable when offline or rate-limited.
    }
  }

  return { drug, rxcui: fallbackRxCuis[drug] ?? 'unknown', source: 'local RxNorm fallback' };
}

export const drugConnectorStatus: ConnectorStatus = {
  name: 'Drug Connector',
  mode: process.env.INSTINCT_LIVE_DRUG_LOOKUP === '1' ? 'live-free-api' : 'local-cache',
  status: process.env.INSTINCT_LIVE_DRUG_LOOKUP === '1' ? 'connected' : 'fallback',
  detail: process.env.INSTINCT_LIVE_DRUG_LOOKUP === '1'
    ? 'Uses RxNav when live lookup is enabled, with local fallback.'
    : 'Using local RxNorm fallback. Set INSTINCT_LIVE_DRUG_LOOKUP=1 to try RxNav.'
};
