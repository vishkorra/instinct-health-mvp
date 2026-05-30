import cors from '@fastify/cors';
import Fastify from 'fastify';
import { listScenarioCards } from '../src/shared/caseEngine';
import { getScenario, scenarios } from '../src/shared/scenarios';
import { assembleAccessCase } from './caseService';
import { clearEpicSession, completeEpicCallback, getEpicStatus, startEpicLaunch } from './connectors/epicConnector';
import { createDb } from './db';

interface CreateServerOptions {
  dbPath?: string;
}

export async function createServer(options: CreateServerOptions = {}) {
  const app = Fastify({ logger: false });
  const db = createDb(options.dbPath);

  await app.register(cors, { origin: true });

  app.addHook('onClose', async () => {
    db.close();
  });

  app.get('/api/health', async () => ({
    ok: true,
    product: 'Instinct Medication Access Command Center'
  }));

  app.get('/api/tools', async () => ({
    freeTools: [
      'Synthea-style local FHIR samples',
      'RxNav/RxNorm optional free lookup',
      'DailyMed optional free lookup',
      'openFDA drug label fallback lookup',
      'CMS Part D formulary reference modeling',
      'CDC ICD-10-CM diagnosis code modeling',
      'LOINC lab code modeling',
      'Da Vinci PAS/CRD/DTR workflow modeling',
      'Epic SMART on FHIR sandbox OAuth + live R4 reads'
    ],
    note: 'After Epic SMART launch, the demo merges live sandbox FHIR data. Payer rules, PBM rejection events, and pharmacy workflow remain simulated until those external systems are connected.'
  }));

  app.get('/epic/launch', async (request, reply) => startEpicLaunch(request, reply));

  app.get('/epic/callback', async (request, reply) => completeEpicCallback(request, reply));

  app.get('/api/epic/status', async (request) => getEpicStatus(request));

  app.post('/api/epic/disconnect', async (request, reply) => clearEpicSession(request, reply));

  app.get('/api/scenarios', async () => listScenarioCards(scenarios));

  app.get('/api/cases/:scenarioId', async (request, reply) => {
    const { scenarioId } = request.params as { scenarioId: string };
    const scenario = getScenario(scenarioId);
    if (!scenario) return reply.code(404).send({ error: 'Scenario not found' });

    const accessCase = await assembleAccessCase(scenarioId, db.getStep(scenarioId), request);
    return accessCase;
  });

  app.post('/api/cases/:scenarioId/advance', async (request, reply) => {
    const { scenarioId } = request.params as { scenarioId: string };
    const scenario = getScenario(scenarioId);
    if (!scenario) return reply.code(404).send({ error: 'Scenario not found' });

    const nextStep = Math.min(db.getStep(scenarioId) + 1, scenario.timeline.length - 1);
    db.setStep(scenarioId, nextStep);
    return assembleAccessCase(scenarioId, nextStep, request);
  });

  app.post('/api/cases/:scenarioId/reset', async (request, reply) => {
    const { scenarioId } = request.params as { scenarioId: string };
    if (!getScenario(scenarioId)) return reply.code(404).send({ error: 'Scenario not found' });

    db.resetStep(scenarioId);
    return assembleAccessCase(scenarioId, 0, request);
  });

  return app;
}
