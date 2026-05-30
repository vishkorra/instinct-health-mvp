import cors from '@fastify/cors';
import Fastify from 'fastify';
import { listScenarioCards } from '../src/shared/caseEngine';
import { getScenario, scenarios } from '../src/shared/scenarios';
import { assembleAccessCase } from './caseService';
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
      'openFDA reference-ready connector path',
      'CMS Part D formulary reference modeling',
      'Epic/SMART sandbox-ready architecture'
    ],
    note: 'The demo uses synthetic/local clinical data plus simulated payer and pharmacy workflow.'
  }));

  app.get('/api/scenarios', async () => listScenarioCards(scenarios));

  app.get('/api/cases/:scenarioId', async (request, reply) => {
    const { scenarioId } = request.params as { scenarioId: string };
    const scenario = getScenario(scenarioId);
    if (!scenario) return reply.code(404).send({ error: 'Scenario not found' });

    const accessCase = await assembleAccessCase(scenarioId, db.getStep(scenarioId));
    return accessCase;
  });

  app.post('/api/cases/:scenarioId/advance', async (request, reply) => {
    const { scenarioId } = request.params as { scenarioId: string };
    const scenario = getScenario(scenarioId);
    if (!scenario) return reply.code(404).send({ error: 'Scenario not found' });

    const nextStep = Math.min(db.getStep(scenarioId) + 1, scenario.timeline.length - 1);
    db.setStep(scenarioId, nextStep);
    return assembleAccessCase(scenarioId, nextStep);
  });

  app.post('/api/cases/:scenarioId/reset', async (request, reply) => {
    const { scenarioId } = request.params as { scenarioId: string };
    if (!getScenario(scenarioId)) return reply.code(404).send({ error: 'Scenario not found' });

    db.resetStep(scenarioId);
    return assembleAccessCase(scenarioId, 0);
  });

  return app;
}
