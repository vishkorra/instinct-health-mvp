import type { EpicWorkflowAction, Scenario } from './types';

function payload(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function buildEpicWorkflowActions(scenario: Scenario): EpicWorkflowAction[] {
  const baseMedication = {
    drug: scenario.prescription.drug,
    dose: scenario.prescription.dose,
    diagnosis: scenario.prescription.diagnosis,
    payer: scenario.insurance.payer,
    plan: scenario.insurance.plan,
    requirements: scenario.coverageRule.requirements
  };

  return [
    {
      id: 'crd-request',
      label: 'Check payer requirements before submission',
      api: 'Coverage Requirements Discovery (CRD Request) (R4)',
      method: 'POST',
      status: 'generated',
      owner: 'provider',
      detail: 'Instinct creates the CRD-style request that asks what this patient plan requires for the selected medication.',
      payloadPreview: payload({
        hook: 'medication-prescribe',
        context: {
          patientId: scenario.patient.memberId,
          medication: baseMedication,
          prescriber: scenario.prescription.prescriber
        }
      })
    },
    {
      id: 'dtr-questionnaire-package',
      label: 'Build prior-auth evidence questionnaire',
      api: 'DTR Questionnaire Package Operation (R4)',
      method: 'POST',
      status: 'generated',
      owner: 'provider',
      detail: 'Instinct turns the plan requirements into a checklist and pre-fills answers from chart evidence.',
      payloadPreview: payload({
        resourceType: 'Parameters',
        parameter: [
          { name: 'coverageRule', valueString: scenario.coverageRule.summary },
          {
            name: 'evidence',
            part: scenario.chartEvidence.map((item) => ({
              name: item.label,
              valueString: item.value,
              status: item.status
            }))
          }
        ]
      })
    },
    {
      id: 'questionnaire-response',
      label: 'Capture signed clinical answers',
      api: 'QuestionnaireResponse.Create/Read (Prior Auth) (R4)',
      method: 'POST',
      status: 'generated',
      owner: 'provider',
      detail: 'The doctor office can review and sign the evidence Instinct gathered before it becomes a submitted PA packet.',
      payloadPreview: payload({
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
        subject: { reference: `Patient/${scenario.patient.memberId}` },
        authored: new Date('2026-05-30T12:00:00.000Z').toISOString(),
        item: scenario.coverageRule.requirements.map((requirement) => ({
          text: requirement,
          answer: [{ valueString: matchingEvidence(requirement, scenario) }]
        }))
      })
    },
    {
      id: 'medication-request-update',
      label: 'Update medication order metadata',
      api: 'MedicationRequest.Update (Prior Auth) (R4)',
      method: 'PUT',
      status: 'generated',
      owner: 'provider',
      detail: 'Instinct prepares order metadata showing PA status, covered alternatives, and the selected remedy.',
      payloadPreview: payload({
        resourceType: 'MedicationRequest',
        status: scenario.payerDecision.status === 'approved' ? 'active' : 'on-hold',
        intent: 'order',
        medicationCodeableConcept: { text: scenario.prescription.drug },
        subject: { reference: `Patient/${scenario.patient.memberId}` },
        note: [{ text: `Instinct access status: ${scenario.blocker.title}. ${scenario.payerDecision.reason}` }]
      })
    },
    {
      id: 'claim-submit',
      label: 'Submit structured prior authorization',
      api: 'Claim.$submit (Prior Auth) (R4)',
      method: 'POST',
      status: 'simulated-ready',
      owner: 'insurance',
      detail: 'This is the payer-facing PA submission shape. The demo generates it locally; live submission needs a payer/Epic endpoint that accepts PA operations.',
      payloadPreview: payload({
        resourceType: 'Claim',
        use: 'preauthorization',
        status: 'active',
        patient: { reference: `Patient/${scenario.patient.memberId}` },
        insurer: { display: scenario.insurance.payer },
        diagnosis: [{ diagnosisCodeableConcept: { text: scenario.prescription.diagnosis } }],
        item: [
          {
            sequence: 1,
            productOrService: { text: scenario.prescription.drug },
            programCode: scenario.coverageRule.requirements.map((requirement) => ({ text: requirement }))
          }
        ]
      })
    },
    {
      id: 'submit-attachment',
      label: 'Send supporting documentation',
      api: '$submit-attachment (Prior Auth) (R4)',
      method: 'POST',
      status: 'simulated-ready',
      owner: 'provider',
      detail: 'Instinct packages labs, notes, diagnosis codes, and prior therapy proof as the supporting evidence bundle.',
      payloadPreview: payload({
        resourceType: 'Bundle',
        type: 'collection',
        entry: scenario.chartEvidence
          .filter((item) => item.status === 'found')
          .map((item) => ({
            resource: {
              resourceType: 'DocumentReference',
              status: 'current',
              description: `${item.label}: ${item.value}`
            }
          }))
      })
    },
    {
      id: 'claim-inquire',
      label: 'Track payer decision status',
      api: 'Claim.$inquire (Prior Auth) (R4)',
      method: 'POST',
      status: 'simulated-ready',
      owner: 'insurance',
      detail: 'Instinct polls or receives the PA state so patients, pharmacies, and clinics see the same answer.',
      payloadPreview: payload({
        resourceType: 'Claim',
        use: 'preauthorization',
        patient: { reference: `Patient/${scenario.patient.memberId}` },
        status: scenario.payerDecision.status,
        reason: scenario.payerDecision.reason
      })
    },
    {
      id: 'pas-notification',
      label: 'Notify every portal after decision',
      api: 'PAS Claim Response Notification (R4)',
      method: 'POST',
      status: 'generated',
      owner: 'system',
      detail: 'Instinct converts approval, denial, missing-info, or appeal status into role-specific updates.',
      payloadPreview: payload({
        event: 'prior-auth-decision',
        patient: scenario.patient.name,
        medication: scenario.prescription.drug,
        decision: scenario.payerDecision.status,
        notify: ['provider', 'pharmacy', 'patient']
      })
    }
  ];
}

function matchingEvidence(requirement: string, scenario: Scenario) {
  const normalized = requirement.toLowerCase();
  const evidence = scenario.chartEvidence.find((item) => {
    const haystack = `${item.label} ${item.value}`.toLowerCase();
    return normalized.split(/\s+/).some((word) => word.length > 4 && haystack.includes(word));
  });
  return evidence?.value ?? 'Needs review';
}
