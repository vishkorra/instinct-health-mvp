import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  ConnectorStatus,
  EvidenceItem,
  InsurancePlan,
  LiveDataResourceSummary,
  LiveDataSummary,
  PatientProfile,
  Scenario
} from '../../src/shared/types';

const sessionCookieName = 'instinct_epic_session';
const defaultSandboxClientId = '5525f4a6-977c-46df-89a6-8de1761cdb89';

const epicScopes = [
  'launch',
  'openid',
  'profile',
  'fhirUser',
  'user/Patient.read',
  'user/Coverage.read',
  'user/MedicationRequest.read',
  'user/MedicationDispense.read',
  'user/Medication.read',
  'user/List.read',
  'user/Condition.read',
  'user/Observation.read',
  'user/DiagnosticReport.read',
  'user/DocumentReference.read',
  'user/Binary.read',
  'user/AllergyIntolerance.read',
  'user/Encounter.read',
  'user/Practitioner.read',
  'user/PractitionerRole.read',
  'user/Organization.read',
  'user/Location.read',
  'user/ExplanationOfBenefit.read',
  'user/QuestionnaireResponse.read',
  'user/ServiceRequest.read'
];

interface SmartConfiguration {
  authorization_endpoint: string;
  token_endpoint: string;
}

interface PendingLaunch {
  issuer: string;
  launch: string;
  codeVerifier: string;
  redirectUri: string;
  createdAt: number;
}

interface EpicSession {
  issuer: string;
  accessToken: string;
  tokenType: string;
  patientId?: string;
  scope?: string;
  expiresAt: number;
}

interface EpicTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  patient?: string;
  scope?: string;
}

interface FhirBundle {
  resourceType?: string;
  entry?: Array<{ resource?: unknown }>;
}

interface EpicCaseOverlay {
  scenario: Scenario;
  connectorStatus: ConnectorStatus;
  liveData?: LiveDataSummary;
}

const pendingLaunches = new Map<string, PendingLaunch>();
const epicSessions = new Map<string, EpicSession>();
const smartConfigurationCache = new Map<string, SmartConfiguration>();

export async function startEpicLaunch(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as { iss?: string; launch?: string };
  if (!query.iss || !query.launch) {
    return reply.type('text/html').send(`
      <main style="font-family: system-ui; max-width: 720px; margin: 48px auto; line-height: 1.5;">
        <h1>Instinct Epic launch endpoint</h1>
        <p>Launch this URL from Epic's SMART sandbox so Epic can include the required <code>iss</code> and <code>launch</code> parameters.</p>
        <p>After launch, Instinct exchanges the authorization code and uses the Epic sandbox FHIR APIs selected for the app.</p>
      </main>
    `);
  }

  const issuer = query.iss.replace(/\/$/, '');
  const smartConfig = await discoverSmartConfiguration(issuer);
  const codeVerifier = base64Url(randomBytes(48));
  const state = randomUUID();
  const redirectUri = getRedirectUri(request);

  pendingLaunches.set(state, {
    issuer,
    launch: query.launch,
    codeVerifier,
    redirectUri,
    createdAt: Date.now()
  });

  const authorizeUrl = new URL(smartConfig.authorization_endpoint);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', getEpicClientId());
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', epicScopes.join(' '));
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('aud', issuer);
  authorizeUrl.searchParams.set('launch', query.launch);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge(codeVerifier));
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');

  return reply.redirect(authorizeUrl.toString());
}

export async function completeEpicCallback(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as { code?: string; state?: string; error?: string; error_description?: string };
  if (query.error) {
    return reply.code(400).send({
      error: query.error,
      detail: query.error_description ?? 'Epic authorization failed.'
    });
  }
  if (!query.code || !query.state) {
    return reply.code(400).send({ error: 'Missing Epic callback code or state.' });
  }

  const pending = pendingLaunches.get(query.state);
  pendingLaunches.delete(query.state);
  if (!pending || Date.now() - pending.createdAt > 10 * 60 * 1000) {
    return reply.code(400).send({ error: 'Epic launch state expired. Start the SMART launch again.' });
  }

  const smartConfig = await discoverSmartConfiguration(pending.issuer);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: query.code,
    redirect_uri: pending.redirectUri,
    client_id: getEpicClientId(),
    code_verifier: pending.codeVerifier
  });

  const response = await fetch(smartConfig.token_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body
  });

  if (!response.ok) {
    return reply.code(502).send({ error: `Epic token exchange failed with ${response.status}.` });
  }

  const token = (await response.json()) as EpicTokenResponse;
  const sessionId = randomUUID();
  const maxAge = token.expires_in ?? 3600;
  epicSessions.set(sessionId, {
    issuer: pending.issuer,
    accessToken: token.access_token,
    tokenType: token.token_type ?? 'Bearer',
    patientId: token.patient,
    scope: token.scope,
    expiresAt: Date.now() + maxAge * 1000
  });

  reply.header('Set-Cookie', makeSessionCookie(sessionId, maxAge, pending.redirectUri.startsWith('https://')));
  return reply.redirect('/?epic=connected');
}

export function getEpicStatus(request: FastifyRequest) {
  const session = getSession(request);
  return {
    connected: Boolean(session),
    issuer: session?.issuer,
    patientId: session?.patientId,
    scope: session?.scope,
    selectedApis: selectedEpicApis(),
    note: session
      ? 'Epic SMART sandbox is connected. Instinct will use live FHIR reads where Epic returns data.'
      : 'Launch from Epic SMART sandbox to connect live FHIR data.'
  };
}

export function clearEpicSession(request: FastifyRequest, reply: FastifyReply) {
  const cookie = parseCookies(request.headers.cookie)[sessionCookieName];
  if (cookie) epicSessions.delete(cookie);
  reply.header('Set-Cookie', `${sessionCookieName}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
  return { connected: false };
}

export async function overlayEpicData(request: FastifyRequest | undefined, scenario: Scenario): Promise<EpicCaseOverlay> {
  const session = request ? getSession(request) : undefined;
  if (!session?.patientId) {
    return {
      scenario,
      connectorStatus: {
        name: 'Epic SMART Connector',
        mode: 'live-free-api',
        status: 'fallback',
        detail: 'Not connected yet. Launch Instinct from the Epic SMART sandbox to load live R4 patient, coverage, medication, lab, and document data.'
      }
    };
  }

  const live = await fetchEpicResources(session);
  const liveData: LiveDataSummary = {
    connected: true,
    source: 'Epic SMART sandbox',
    issuer: session.issuer,
    patientId: session.patientId,
    lastSynced: new Date().toISOString(),
    selectedApis: selectedEpicApis(),
    resources: live.resources,
    note: 'Live Epic sandbox FHIR resources are merged into the demo. Coverage rules, pharmacy rejection events, and payer decisions remain simulated until those external workflows are connected.'
  };

  return {
    scenario: applyLiveOverlay(scenario, session.patientId, live),
    liveData,
    connectorStatus: {
      name: 'Epic SMART Connector',
      mode: 'live-free-api',
      status: 'connected',
      detail: `Connected to Epic SMART sandbox. Loaded ${live.resources.reduce((sum, item) => sum + item.count, 0)} live FHIR resources for Patient/${session.patientId}.`
    }
  };
}

function getEpicClientId() {
  return process.env.EPIC_CLIENT_ID ?? defaultSandboxClientId;
}

function getRedirectUri(request: FastifyRequest) {
  if (process.env.EPIC_REDIRECT_URI) return process.env.EPIC_REDIRECT_URI;

  const configuredBase = process.env.EPIC_PUBLIC_BASE_URL ?? process.env.PUBLIC_BASE_URL;
  if (configuredBase) return `${configuredBase.replace(/\/$/, '')}/epic/callback`;

  const headers = request.headers;
  const host = firstHeader(headers['x-forwarded-host']) ?? headers.host ?? 'localhost:5173';
  const proto = firstHeader(headers['x-forwarded-proto']) ?? (String(host).includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}/epic/callback`;
}

async function discoverSmartConfiguration(issuer: string): Promise<SmartConfiguration> {
  const cached = smartConfigurationCache.get(issuer);
  if (cached) return cached;

  const response = await fetch(`${issuer.replace(/\/$/, '')}/.well-known/smart-configuration`, {
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) {
    throw new Error(`Unable to discover Epic SMART configuration: ${response.status}`);
  }

  const config = (await response.json()) as SmartConfiguration;
  smartConfigurationCache.set(issuer, config);
  return config;
}

async function fetchEpicResources(session: EpicSession) {
  const [patient, coverage, medicationRequests, medicationDispenses, conditions, labs, diagnosticReports, documents, allergies, encounters] =
    await Promise.all([
      fhirRead(session, `/Patient/${encodeURIComponent(session.patientId ?? '')}`),
      fhirSearch(session, '/Coverage', { patient: session.patientId }),
      fhirSearch(session, '/MedicationRequest', { patient: session.patientId }),
      fhirSearch(session, '/MedicationDispense', { patient: session.patientId }),
      fhirSearch(session, '/Condition', { patient: session.patientId }),
      fhirSearch(session, '/Observation', { patient: session.patientId, category: 'laboratory' }),
      fhirSearch(session, '/DiagnosticReport', { patient: session.patientId }),
      fhirSearch(session, '/DocumentReference', { patient: session.patientId }),
      fhirSearch(session, '/AllergyIntolerance', { patient: session.patientId }),
      fhirSearch(session, '/Encounter', { patient: session.patientId })
    ]);

  const resources: LiveDataResourceSummary[] = [
    resourceSummary('Patient', 'Patient.Read (Demographics) (R4)', patient ? 1 : 0),
    resourceSummary('Coverage', 'Coverage.Search (Patient Insurance Information) (R4)', bundleCount(coverage)),
    resourceSummary('Medication orders', 'MedicationRequest.Search (Signed Medication Order) (R4)', bundleCount(medicationRequests)),
    resourceSummary('Fill status', 'MedicationDispense.Search (Fill Status) (R4)', bundleCount(medicationDispenses)),
    resourceSummary('Conditions', 'Condition.Search (Problems / Encounter Diagnosis) (R4)', bundleCount(conditions)),
    resourceSummary('Labs', 'Observation.Search (Labs) (R4)', bundleCount(labs)),
    resourceSummary('Diagnostic reports', 'DiagnosticReport.Search (Results) (R4)', bundleCount(diagnosticReports)),
    resourceSummary('Clinical notes', 'DocumentReference.Search (Clinical Notes) (R4)', bundleCount(documents)),
    resourceSummary('Allergies', 'AllergyIntolerance.Search (Patient Chart) (R4)', bundleCount(allergies)),
    resourceSummary('Encounters', 'Encounter.Search (Patient Chart) (R4)', bundleCount(encounters))
  ];

  return {
    patient,
    coverage,
    medicationRequests,
    medicationDispenses,
    conditions,
    labs,
    diagnosticReports,
    documents,
    allergies,
    encounters,
    resources
  };
}

function applyLiveOverlay(
  scenario: Scenario,
  patientId: string,
  live: Awaited<ReturnType<typeof fetchEpicResources>>
): Scenario {
  const patient = overlayPatient(scenario.patient, patientId, live.patient);
  const insurance = overlayInsurance(scenario.insurance, live.coverage);
  const conditions = extractConditionNames(live.conditions);
  const chartEvidence: EvidenceItem[] = [
    {
      label: 'Epic live chart sync',
      value: `${live.resources.reduce((sum, item) => sum + item.count, 0)} live FHIR resources loaded from Epic sandbox.`,
      source: 'FHIR chart',
      status: 'found'
    },
    {
      label: 'Epic medication orders',
      value: `${bundleCount(live.medicationRequests)} MedicationRequest resources available for this patient.`,
      source: 'FHIR chart',
      status: bundleCount(live.medicationRequests) > 0 ? 'found' : 'requested'
    },
    ...scenario.chartEvidence
  ];

  return {
    ...scenario,
    patient: {
      ...patient,
      conditions: conditions.length > 0 ? conditions : patient.conditions
    },
    insurance,
    chartEvidence
  };
}

function overlayPatient(current: PatientProfile, patientId: string, patient: unknown): PatientProfile {
  if (!isRecord(patient)) return { ...current, memberId: patientId };
  return {
    ...current,
    name: patientName(patient) ?? current.name,
    age: patientAge(patient.birthDate) ?? current.age,
    memberId: String(patient.id ?? patientId),
    location: patientLocation(patient) ?? current.location
  };
}

function overlayInsurance(current: InsurancePlan, coverage: FhirBundle | undefined): InsurancePlan {
  const firstCoverage = coverage?.entry?.[0]?.resource;
  if (!isRecord(firstCoverage)) return current;
  return {
    payer: coveragePayer(firstCoverage) ?? current.payer,
    plan: coveragePlan(firstCoverage) ?? current.plan,
    pbm: current.pbm,
    status: firstCoverage.status === 'active' ? 'active' : current.status
  };
}

async function fhirRead(session: EpicSession, path: string) {
  return fetchJson(session, path);
}

async function fhirSearch(session: EpicSession, path: string, params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }
  return fetchJson(session, `${path}?${searchParams.toString()}`) as Promise<FhirBundle | undefined>;
}

async function fetchJson(session: EpicSession, path: string) {
  const response = await fetch(`${session.issuer}${path}`, {
    headers: {
      Authorization: `${session.tokenType} ${session.accessToken}`,
      Accept: 'application/fhir+json, application/json'
    }
  });
  if (!response.ok) return undefined;
  return response.json() as Promise<unknown>;
}

function getSession(request: FastifyRequest) {
  const sessionId = parseCookies(request.headers.cookie)[sessionCookieName];
  if (!sessionId) return undefined;
  const session = epicSessions.get(sessionId);
  if (!session) return undefined;
  if (session.expiresAt <= Date.now()) {
    epicSessions.delete(sessionId);
    return undefined;
  }
  return session;
}

function parseCookies(cookieHeader: string | undefined) {
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader?.split(';') ?? []) {
    const [rawName, ...rawValue] = pair.trim().split('=');
    if (!rawName || rawValue.length === 0) continue;
    cookies[rawName] = decodeURIComponent(rawValue.join('='));
  }
  return cookies;
}

function makeSessionCookie(sessionId: string, maxAge: number, secure: boolean) {
  const parts = [
    `${sessionCookieName}=${encodeURIComponent(sessionId)}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax'
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

function base64Url(buffer: Buffer) {
  return buffer.toString('base64url');
}

function codeChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value?.split(',')[0];
}

function bundleCount(bundle: FhirBundle | undefined) {
  return bundle?.entry?.length ?? 0;
}

function resourceSummary(label: string, api: string, count: number): LiveDataResourceSummary {
  return {
    label,
    api,
    count,
    status: count > 0 ? 'connected' : 'fallback',
    detail: count > 0 ? `${count} resource${count === 1 ? '' : 's'} returned by Epic.` : 'No resources returned for this sandbox patient.'
  };
}

function selectedEpicApis() {
  return [
    'Patient.Read/Search/$match',
    'Coverage.Read/Search',
    'MedicationRequest.Read/Search',
    'MedicationDispense.Read/Search',
    'Condition.Read/Search',
    'Observation.Read/Search',
    'DiagnosticReport.Read/Search',
    'DocumentReference.Read/Search',
    'Binary.Read',
    'AllergyIntolerance.Read/Search',
    'Encounter.Read/Search',
    'ExplanationOfBenefit.Read/Search',
    'QuestionnaireResponse.Read',
    'Claim.$submit/$inquire',
    'Coverage Requirements Discovery',
    'DTR Questionnaire operations'
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function patientName(patient: Record<string, unknown>) {
  const names = patient.name;
  if (!Array.isArray(names) || !isRecord(names[0])) return undefined;
  const firstName = names[0];
  if (typeof firstName.text === 'string') return firstName.text;
  const given = Array.isArray(firstName.given) ? firstName.given.filter((item): item is string => typeof item === 'string') : [];
  const family = typeof firstName.family === 'string' ? firstName.family : '';
  const fullName = [...given, family].filter(Boolean).join(' ');
  return fullName || undefined;
}

function patientAge(birthDate: unknown) {
  if (typeof birthDate !== 'string') return undefined;
  const born = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(born.getTime())) return undefined;
  const now = new Date();
  let age = now.getUTCFullYear() - born.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - born.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < born.getUTCDate())) age -= 1;
  return age;
}

function patientLocation(patient: Record<string, unknown>) {
  const addresses = patient.address;
  if (!Array.isArray(addresses) || !isRecord(addresses[0])) return undefined;
  const city = typeof addresses[0].city === 'string' ? addresses[0].city : '';
  const state = typeof addresses[0].state === 'string' ? addresses[0].state : '';
  return [city, state].filter(Boolean).join(', ') || undefined;
}

function coveragePayer(coverage: Record<string, unknown>) {
  const payor = coverage.payor;
  if (!Array.isArray(payor) || !isRecord(payor[0])) return undefined;
  return typeof payor[0].display === 'string' ? payor[0].display : undefined;
}

function coveragePlan(coverage: Record<string, unknown>) {
  const classes = coverage.class;
  if (!Array.isArray(classes)) return undefined;
  for (const item of classes) {
    if (!isRecord(item)) continue;
    if (typeof item.name === 'string') return item.name;
    if (typeof item.value === 'string') return item.value;
  }
  return undefined;
}

function extractConditionNames(conditions: FhirBundle | undefined) {
  return (conditions?.entry ?? [])
    .map((entry) => entry.resource)
    .filter(isRecord)
    .map((condition) => displayCode(condition.code))
    .filter((name): name is string => Boolean(name));
}

function displayCode(code: unknown) {
  if (!isRecord(code)) return undefined;
  if (typeof code.text === 'string') return code.text;
  const coding = code.coding;
  if (Array.isArray(coding) && isRecord(coding[0]) && typeof coding[0].display === 'string') {
    return coding[0].display;
  }
  return undefined;
}
