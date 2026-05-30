import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer } from './app';

const originalEpicClientId = process.env.EPIC_CLIENT_ID;
const originalDisableDrugLookup = process.env.INSTINCT_DISABLE_LIVE_DRUG_LOOKUP;
const originalDisableLabelLookup = process.env.INSTINCT_DISABLE_LIVE_LABEL_LOOKUP;

function jsonResponse(data: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  );
}

function bundle(resourceType: string, resources: unknown[]) {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    entry: resources.map((resource) => ({ resource }))
  };
}

describe('Instinct API', () => {
  beforeEach(() => {
    process.env.EPIC_CLIENT_ID = 'sandbox-client-id';
    process.env.INSTINCT_DISABLE_LIVE_DRUG_LOOKUP = '1';
    process.env.INSTINCT_DISABLE_LIVE_LABEL_LOOKUP = '1';
  });

  afterEach(() => {
    process.env.EPIC_CLIENT_ID = originalEpicClientId;
    process.env.INSTINCT_DISABLE_LIVE_DRUG_LOOKUP = originalDisableDrugLookup;
    process.env.INSTINCT_DISABLE_LIVE_LABEL_LOOKUP = originalDisableLabelLookup;
    vi.restoreAllMocks();
  });

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

  it('starts an Epic SMART launch using the sandbox client id and PKCE', async () => {
    const fetchMock = vi.fn((url: string | URL) => {
      const requestUrl = String(url);
      if (requestUrl.endsWith('/.well-known/smart-configuration')) {
        return jsonResponse({
          authorization_endpoint: 'https://epic.example/oauth2/authorize',
          token_endpoint: 'https://epic.example/oauth2/token'
        });
      }
      throw new Error(`Unexpected URL ${requestUrl}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const app = await createServer({ dbPath: ':memory:' });
    const response = await app.inject({
      method: 'GET',
      url: '/epic/launch?iss=https%3A%2F%2Fepic.example%2Ffhir%2FR4&launch=launch-token'
    });

    expect(response.statusCode).toBe(302);
    const location = response.headers.location;
    expect(location).toContain('https://epic.example/oauth2/authorize');
    expect(location).toContain('client_id=sandbox-client-id');
    expect(location).toContain('launch=launch-token');
    expect(location).toContain('scope=launch+openid+profile+fhirUser+user%2FPatient.read');
    expect(location).toContain('code_challenge=');
    expect(location).toContain('code_challenge_method=S256');

    await app.close();
  });

  it('uses forwarded public host headers for the Epic callback redirect URI', async () => {
    const fetchMock = vi.fn((url: string | URL) => {
      const requestUrl = String(url);
      if (requestUrl.endsWith('/.well-known/smart-configuration')) {
        return jsonResponse({
          authorization_endpoint: 'https://epic.example/oauth2/authorize',
          token_endpoint: 'https://epic.example/oauth2/token'
        });
      }
      throw new Error(`Unexpected URL ${requestUrl}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const app = await createServer({ dbPath: ':memory:' });
    const response = await app.inject({
      method: 'GET',
      url: '/epic/launch?iss=https%3A%2F%2Fepic.example%2Ffhir%2FR4&launch=launch-token',
      headers: {
        'x-forwarded-host': 'public-demo.ngrok-free.app',
        'x-forwarded-proto': 'https'
      }
    });

    const redirectUri = new URL(String(response.headers.location)).searchParams.get('redirect_uri');
    expect(redirectUri).toBe('https://public-demo.ngrok-free.app/epic/callback');

    await app.close();
  });

  it('stores an Epic sandbox session after SMART callback', async () => {
    const fetchMock = vi.fn((url: string | URL, init?: RequestInit) => {
      const requestUrl = String(url);
      if (requestUrl.endsWith('/.well-known/smart-configuration')) {
        return jsonResponse({
          authorization_endpoint: 'https://epic.example/oauth2/authorize',
          token_endpoint: 'https://epic.example/oauth2/token'
        });
      }
      if (requestUrl === 'https://epic.example/oauth2/token') {
        expect(init?.method).toBe('POST');
        const body = init?.body as URLSearchParams;
        expect(body.get('client_id')).toBe('sandbox-client-id');
        expect(body.get('code')).toBe('auth-code');
        expect(body.get('code_verifier')).toBeTruthy();
        return jsonResponse({
          access_token: 'epic-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          patient: 'patient-1',
          scope: 'launch openid profile fhirUser user/Patient.read'
        });
      }
      throw new Error(`Unexpected URL ${requestUrl}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const app = await createServer({ dbPath: ':memory:' });
    const launchResponse = await app.inject({
      method: 'GET',
      url: '/epic/launch?iss=https%3A%2F%2Fepic.example%2Ffhir%2FR4&launch=launch-token'
    });
    const state = new URL(String(launchResponse.headers.location)).searchParams.get('state');

    const callbackResponse = await app.inject({
      method: 'GET',
      url: `/epic/callback?code=auth-code&state=${state}`
    });

    expect(callbackResponse.statusCode).toBe(302);
    const cookie = callbackResponse.headers['set-cookie'];
    expect(String(cookie)).toContain('instinct_epic_session=');

    const statusResponse = await app.inject({
      method: 'GET',
      url: '/api/epic/status',
      headers: { cookie: String(cookie) }
    });

    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json()).toMatchObject({
      connected: true,
      issuer: 'https://epic.example/fhir/R4',
      patientId: 'patient-1'
    });

    await app.close();
  });

  it('overlays connected Epic sandbox data onto the medication access case', async () => {
    const fetchMock = vi.fn((url: string | URL, init?: RequestInit) => {
      const requestUrl = String(url);
      if (requestUrl.endsWith('/.well-known/smart-configuration')) {
        return jsonResponse({
          authorization_endpoint: 'https://epic.example/oauth2/authorize',
          token_endpoint: 'https://epic.example/oauth2/token'
        });
      }
      if (requestUrl === 'https://epic.example/oauth2/token') {
        return jsonResponse({
          access_token: 'epic-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          patient: 'patient-1',
          scope: 'launch openid profile fhirUser user/Patient.read'
        });
      }

      expect(init?.headers).toMatchObject({ Authorization: 'Bearer epic-access-token' });
      if (requestUrl.endsWith('/Patient/patient-1')) {
        return jsonResponse({
          resourceType: 'Patient',
          id: 'patient-1',
          birthDate: '1970-05-01',
          name: [{ given: ['Jordan'], family: 'Lee' }],
          address: [{ city: 'Madison', state: 'WI' }]
        });
      }
      if (requestUrl.endsWith('/Patient/$match')) {
        expect(init?.method).toBe('POST');
        return jsonResponse(bundle('Patient', [
          {
            resourceType: 'Patient',
            id: 'patient-1',
            birthDate: '1970-05-01',
            name: [{ given: ['Jordan'], family: 'Lee' }]
          }
        ]));
      }
      if (requestUrl.includes('/Coverage?')) {
        return jsonResponse(bundle('Coverage', [
          {
            resourceType: 'Coverage',
            id: 'coverage-1',
            status: 'active',
            payor: [{ display: 'Epic Sandbox Plan' }],
            class: [{ type: { text: 'Plan' }, name: 'Sandbox PPO' }]
          }
        ]));
      }
      if (requestUrl.includes('/MedicationRequest?')) {
        return jsonResponse(bundle('MedicationRequest', [
          {
            resourceType: 'MedicationRequest',
            id: 'med-1',
            status: 'active',
            medicationCodeableConcept: { text: 'Ozempic 0.25 MG Injection' }
          }
        ]));
      }
      if (requestUrl.includes('/List?')) {
        return jsonResponse(bundle('List', [
          { resourceType: 'List', id: 'current-meds', title: 'Current Medications' }
        ]));
      }
      if (requestUrl.includes('/Medication?')) {
        return jsonResponse(bundle('Medication', [
          { resourceType: 'Medication', id: 'rx-ozempic', code: { text: 'Ozempic' } }
        ]));
      }
      if (requestUrl.includes('/MedicationDispense?')) {
        return jsonResponse(bundle('MedicationDispense', []));
      }
      if (requestUrl.includes('/Condition?')) {
        return jsonResponse(bundle('Condition', [
          {
            resourceType: 'Condition',
            id: 'condition-1',
            code: { text: 'Type 2 diabetes mellitus' }
          }
        ]));
      }
      if (requestUrl.includes('/Observation?')) {
        return jsonResponse(bundle('Observation', [
          {
            resourceType: 'Observation',
            id: 'a1c-1',
            code: { text: 'Hemoglobin A1c' },
            valueQuantity: { value: 8.4, unit: '%' }
          }
        ]));
      }
      if (requestUrl.includes('/ExplanationOfBenefit?')) {
        return jsonResponse(bundle('ExplanationOfBenefit', [
          { resourceType: 'ExplanationOfBenefit', id: 'eob-pa-1', use: 'preauthorization' }
        ]));
      }
      if (requestUrl.includes('/QuestionnaireResponse?')) {
        return jsonResponse(bundle('QuestionnaireResponse', [
          { resourceType: 'QuestionnaireResponse', id: 'qr-pa-1', status: 'completed' }
        ]));
      }
      if (requestUrl.includes('/CareTeam?')) {
        return jsonResponse(bundle('CareTeam', [
          { resourceType: 'CareTeam', id: 'careteam-1', status: 'active' }
        ]));
      }
      if (requestUrl.includes('/CarePlan?')) {
        return jsonResponse(bundle('CarePlan', [
          { resourceType: 'CarePlan', id: 'careplan-1', status: 'active' }
        ]));
      }
      if (requestUrl.includes('/Procedure?')) {
        return jsonResponse(bundle('Procedure', [
          { resourceType: 'Procedure', id: 'procedure-1', status: 'completed' }
        ]));
      }
      if (requestUrl.includes('/ServiceRequest?')) {
        return jsonResponse(bundle('ServiceRequest', [
          { resourceType: 'ServiceRequest', id: 'service-request-1', status: 'active' }
        ]));
      }
      if (requestUrl.includes('/Appointment?')) {
        return jsonResponse(bundle('Appointment', [
          { resourceType: 'Appointment', id: 'appointment-1', status: 'booked' }
        ]));
      }
      if (requestUrl.includes('/DiagnosticReport?')) {
        return jsonResponse(bundle('DiagnosticReport', []));
      }
      if (requestUrl.includes('/DocumentReference?')) {
        return jsonResponse(bundle('DocumentReference', [
          { resourceType: 'DocumentReference', id: 'note-1', description: 'Medication follow-up note' }
        ]));
      }
      if (requestUrl.includes('/AllergyIntolerance?')) {
        return jsonResponse(bundle('AllergyIntolerance', []));
      }
      if (requestUrl.includes('/Encounter?')) {
        return jsonResponse(bundle('Encounter', [
          { resourceType: 'Encounter', id: 'encounter-1', status: 'finished' }
        ]));
      }
      throw new Error(`Unexpected URL ${requestUrl}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const app = await createServer({ dbPath: ':memory:' });
    const launchResponse = await app.inject({
      method: 'GET',
      url: '/epic/launch?iss=https%3A%2F%2Fepic.example%2Ffhir%2FR4&launch=launch-token'
    });
    const state = new URL(String(launchResponse.headers.location)).searchParams.get('state');
    const callbackResponse = await app.inject({
      method: 'GET',
      url: `/epic/callback?code=auth-code&state=${state}`
    });

    const caseResponse = await app.inject({
      method: 'GET',
      url: '/api/cases/glp1-diabetes-pa',
      headers: { cookie: String(callbackResponse.headers['set-cookie']) }
    });

    expect(caseResponse.statusCode).toBe(200);
    const accessCase = caseResponse.json();
    expect(accessCase.patient.name).toBe('Jordan Lee');
    expect(accessCase.patient.memberId).toBe('patient-1');
    expect(accessCase.insurance.payer).toBe('Epic Sandbox Plan');
    expect(accessCase.insurance.plan).toBe('Sandbox PPO');
    expect(accessCase.liveData).toMatchObject({
      connected: true,
      source: 'Epic SMART sandbox',
      patientId: 'patient-1'
    });
    expect(accessCase.liveData.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Conditions', count: 1, status: 'connected' }),
        expect.objectContaining({ label: 'Labs', count: 1, status: 'connected' }),
        expect.objectContaining({ label: 'Clinical notes', count: 1, status: 'connected' }),
        expect.objectContaining({ label: 'Patient match', api: 'Patient.$match (R4)', count: 1, status: 'connected' }),
        expect.objectContaining({ label: 'Medication list', api: 'List.Search (Medication List) (R4)', count: 1, status: 'connected' }),
        expect.objectContaining({ label: 'Formulary history', api: 'ExplanationOfBenefit.Search (Prior Auth History) (R4)', count: 1, status: 'connected' }),
        expect.objectContaining({ label: 'PA questionnaires', api: 'QuestionnaireResponse.Search (Prior Auth) (R4)', count: 1, status: 'connected' }),
        expect.objectContaining({ label: 'Care team', api: 'CareTeam.Search (R4)', count: 1, status: 'connected' }),
        expect.objectContaining({ label: 'Care plans', api: 'CarePlan.Search (R4)', count: 1, status: 'connected' }),
        expect.objectContaining({ label: 'Procedures', api: 'Procedure.Search (R4)', count: 1, status: 'connected' }),
        expect.objectContaining({ label: 'Service requests', api: 'ServiceRequest.Search (R4)', count: 1, status: 'connected' }),
        expect.objectContaining({ label: 'Appointments', api: 'Appointment.Search (R4)', count: 1, status: 'connected' })
      ])
    );
    expect(accessCase.epicWorkflowActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Check payer requirements before submission',
          api: 'Coverage Requirements Discovery (CRD Request) (R4)',
          method: 'POST',
          status: 'generated'
        }),
        expect.objectContaining({
          label: 'Build prior-auth evidence questionnaire',
          api: 'DTR Questionnaire Package Operation (R4)',
          method: 'POST',
          status: 'generated'
        }),
        expect.objectContaining({
          label: 'Submit structured prior authorization',
          api: 'Claim.$submit (Prior Auth) (R4)',
          method: 'POST',
          status: 'simulated-ready'
        }),
        expect.objectContaining({
          label: 'Send supporting documentation',
          api: '$submit-attachment (Prior Auth) (R4)',
          method: 'POST',
          status: 'simulated-ready'
        })
      ])
    );
    expect(accessCase.chartEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Epic live chart sync',
          source: 'FHIR chart',
          status: 'found'
        })
      ])
    );
    expect(accessCase.connectorStatus).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Epic SMART Connector',
          mode: 'live-free-api',
          status: 'connected'
        })
      ])
    );

    await app.close();
  });
});
