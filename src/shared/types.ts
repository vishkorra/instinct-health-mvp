export type Role = 'provider' | 'pharmacy' | 'insurance' | 'patient';

export type ScenarioId =
  | 'glp1-diabetes-pa'
  | 'covered-alternative'
  | 'step-therapy'
  | 'cost-issue'
  | 'insurance-mismatch'
  | 'denied-appeal';

export type CaseStatus =
  | 'prescribed'
  | 'access-risk'
  | 'rejected'
  | 'evidence-needed'
  | 'submitted'
  | 'approved'
  | 'denied'
  | 'resolved';

export type PipelineStatus = 'done' | 'active' | 'waiting' | 'blocked';

export interface PatientProfile {
  name: string;
  age: number;
  memberId: string;
  location: string;
  conditions: string[];
}

export interface Prescription {
  drug: string;
  dose: string;
  prescriber: string;
  diagnosis: string;
  intent: string;
}

export interface InsurancePlan {
  payer: string;
  plan: string;
  pbm: string;
  status: 'active' | 'inactive' | 'unknown';
}

export interface EvidenceItem {
  label: string;
  value: string;
  source: 'FHIR chart' | 'Patient reported' | 'Pharmacy' | 'Payer rule' | 'Simulated claim' | 'Drug database';
  status: 'found' | 'missing' | 'requested';
}

export interface CoverageRule {
  verdict: 'covered' | 'not-covered' | 'pa-required' | 'covered-high-cost' | 'coverage-unknown';
  summary: string;
  requirements: string[];
  alternatives: string[];
}

export interface PharmacyEvent {
  status: 'ready' | 'rejected' | 'high-cost' | 'insurance-error';
  rejectionCode: string;
  message: string;
  pharmacy: string;
}

export interface PayerDecision {
  status: 'not-submitted' | 'needs-info' | 'approved' | 'denied' | 'appeal-open';
  reason: string;
  expectedTurnaround: string;
}

export interface TimelineEvent {
  status: CaseStatus;
  title: string;
  body: string;
  actor: Role | 'system';
  time: string;
}

export interface Remedy {
  title: string;
  detail: string;
  owner: Role;
}

export interface PipelineItem {
  title: string;
  detail: string;
  status: PipelineStatus;
}

export interface NextAction {
  owner: Role;
  title: string;
  detail: string;
}

export interface DraftPacket {
  subject: string;
  summary: string;
  sections: string[];
}

export interface Scenario {
  id: ScenarioId;
  title: string;
  shortTitle: string;
  summary: string;
  demoMoment: string;
  patient: PatientProfile;
  prescription: Prescription;
  insurance: InsurancePlan;
  chartEvidence: EvidenceItem[];
  coverageRule: CoverageRule;
  pharmacyEvent: PharmacyEvent;
  payerDecision: PayerDecision;
  blocker: {
    title: string;
    severity: 'low' | 'medium' | 'high';
    explanation: string;
  };
  remedies: Remedy[];
  tasks: Remedy[];
  timeline: TimelineEvent[];
  rolePipelines: Record<Role, PipelineItem[]>;
  stageActions: NextAction[];
  paDraft: DraftPacket;
}

export interface ConnectorStatus {
  name: string;
  mode: 'live-free-api' | 'synthetic-fhir' | 'simulated' | 'local-cache';
  status: 'connected' | 'fallback' | 'simulated';
  detail: string;
}

export interface LiveDataResourceSummary {
  label: string;
  api: string;
  count: number;
  status: 'connected' | 'fallback';
  detail: string;
}

export interface LiveDataSummary {
  connected: boolean;
  source: 'Epic SMART sandbox';
  issuer: string;
  patientId?: string;
  lastSynced: string;
  selectedApis: string[];
  resources: LiveDataResourceSummary[];
  note: string;
}

export type EpicWorkflowActionStatus = 'live-read' | 'generated' | 'simulated-ready' | 'blocked';

export interface EpicWorkflowAction {
  id: string;
  label: string;
  api: string;
  method: 'GET' | 'POST' | 'PUT';
  status: EpicWorkflowActionStatus;
  owner: Role | 'system';
  detail: string;
  payloadPreview: string;
}

export interface AccessCase extends Scenario {
  currentStep: number;
  visibleTimeline: TimelineEvent[];
  hiddenTimelineCount: number;
  nextAction: NextAction;
  connectorStatus: ConnectorStatus[];
  epicWorkflowActions: EpicWorkflowAction[];
  liveData?: LiveDataSummary;
}

export interface ScenarioListItem {
  id: ScenarioId;
  title: string;
  shortTitle: string;
  summary: string;
  medication: string;
  payer: string;
  severity: 'low' | 'medium' | 'high';
}
