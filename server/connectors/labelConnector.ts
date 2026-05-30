import type { ConnectorStatus, Scenario } from '../../src/shared/types';

export async function getLabelInfo(scenario: Scenario) {
  const drug = scenario.prescription.drug;

  if (process.env.INSTINCT_DISABLE_LIVE_LABEL_LOOKUP !== '1') {
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
      // Try the next public source before falling back locally.
    }

    try {
      const search = new URLSearchParams({
        search: `openfda.brand_name:"${drug}"`,
        limit: '1'
      });
      const response = await fetch(`https://api.fda.gov/drug/label.json?${search.toString()}`, {
        signal: AbortSignal.timeout(1500)
      });
      const payload = await response.json() as { results?: Array<{ id?: string; openfda?: { brand_name?: string[] } }> };
      const label = payload.results?.[0];
      if (label) {
        return {
          drug,
          title: label.openfda?.brand_name?.[0] ?? drug,
          setid: label.id ?? 'openfda',
          source: 'openFDA live lookup'
        };
      }
    } catch {
      // Local fallback keeps the demo deterministic.
    }
  }

  return { drug, title: `${drug} medication metadata`, setid: 'local-demo', source: 'local label fallback' };
}

export function labelConnectorStatusFor(info: Awaited<ReturnType<typeof getLabelInfo>>): ConnectorStatus {
  const isLive = info.source === 'DailyMed live lookup' || info.source === 'openFDA live lookup';
  return {
    name: 'Label Connector',
    mode: isLive ? 'live-free-api' : 'local-cache',
    status: isLive ? 'connected' : 'fallback',
    detail: isLive
      ? `${info.source} returned label metadata for ${info.drug}.`
      : `Using local label fallback for ${info.drug}.`
  };
}
