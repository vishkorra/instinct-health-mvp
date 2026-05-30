import { describe, expect, it } from 'vitest';
import { createServer } from './app';

describe('Instinct API', () => {
  it('serves scenarios and advances a persisted case state', async () => {
    const app = await createServer({ dbPath: ':memory:' });

    const scenariosResponse = await app.inject({ method: 'GET', url: '/api/scenarios' });
    expect(scenariosResponse.statusCode).toBe(200);
    const scenarioList = scenariosResponse.json();
    expect(scenarioList).toHaveLength(6);

    const scenarioId = scenarioList[0].id;
    const initialResponse = await app.inject({ method: 'GET', url: `/api/cases/${scenarioId}` });
    expect(initialResponse.statusCode).toBe(200);
    const initialCase = initialResponse.json();
    expect(initialCase.currentStep).toBe(0);

    const advanceResponse = await app.inject({ method: 'POST', url: `/api/cases/${scenarioId}/advance` });
    expect(advanceResponse.statusCode).toBe(200);
    const advancedCase = advanceResponse.json();
    expect(advancedCase.currentStep).toBe(1);
    expect(advancedCase.visibleTimeline).toHaveLength(2);

    await app.close();
  });
});
