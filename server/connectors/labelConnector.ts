import type { ConnectorStatus, Scenario } from '../../src/shared/types';

export async function getLabelInfo(scenario: Scenario) {
  const drug = scenario.prescription.drug;

  if (process.env.INSTINCT_LIVE_LABEL_LOOKUP === '1') {
    try {
      const response = await fetch(
        `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=${encodeURIComponent(drug)}&page=1&pageSize=1`,
        { signal: AbortSignal.timeout(1500) }
      );
      const payload = await response.json() as { data?: Array<{ title?: string; setid?: string }> };
      const label = payload.data?.[0];
      if (label) {
        return { drug, title: label.title ?? drug, setid: label.setid ?? 'unknown', source: 'DailyMed live lookup' };
      }
    } catch {
      // Local fallback keeps the demo deterministic.
    }
  }

  return { drug, title: `${drug} medication metadata`, setid: 'local-demo', source: 'local label fallback' };
}

export const labelConnectorStatus: ConnectorStatus = {
  name: 'Label Connector',
  mode: process.env.INSTINCT_LIVE_LABEL_LOOKUP === '1' ? 'live-free-api' : 'local-cache',
  status: process.env.INSTINCT_LIVE_LABEL_LOOKUP === '1' ? 'connected' : 'fallback',
  detail: process.env.INSTINCT_LIVE_LABEL_LOOKUP === '1'
    ? 'Uses DailyMed when live lookup is enabled, with local fallback.'
    : 'Using local label fallback. Set INSTINCT_LIVE_LABEL_LOOKUP=1 to try DailyMed.'
};
