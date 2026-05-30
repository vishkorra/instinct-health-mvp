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

  if (process.env.INSTINCT_DISABLE_LIVE_DRUG_LOOKUP !== '1') {
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

export function drugConnectorStatusFor(info: Awaited<ReturnType<typeof getDrugInfo>>): ConnectorStatus {
  const isLive = info.source === 'RxNav live lookup';
  return {
    name: 'Drug Connector',
    mode: isLive ? 'live-free-api' : 'local-cache',
    status: isLive ? 'connected' : 'fallback',
    detail: isLive
      ? `RxNav normalized ${info.drug} to RxCUI ${info.rxcui}.`
      : `Using local RxNorm fallback for ${info.drug} with RxCUI ${info.rxcui}.`
  };
}
