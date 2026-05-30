import type { Scenario } from './types';

const commonProvider = 'Dr. Maya Singh, MD';

export const scenarios: Scenario[] = [
  {
    id: 'glp1-diabetes-pa',
    title: 'GLP-1 / Diabetes Prior Authorization',
    shortTitle: 'GLP-1 PA',
    summary: 'Ozempic is blocked until Type 2 diabetes, A1c, and metformin failure are documented.',
    demoMoment: 'Instinct finds A1c + metformin intolerance and drafts the prior auth packet.',
    patient: {
      name: 'Sarah Patel',
      age: 43,
      memberId: 'HX-2049-1182',
      location: 'Newark, NJ',
      conditions: ['Type 2 diabetes mellitus', 'Hypertension', 'Obesity']
    },
    prescription: {
      drug: 'Ozempic',
      dose: '0.25 mg weekly injection',
      prescriber: commonProvider,
      diagnosis: 'Type 2 diabetes mellitus',
      intent: 'Improve glycemic control after oral therapy intolerance.'
    },
    insurance: {
      payer: 'Horizon Choice',
      plan: 'Silver HMO',
      pbm: 'CareScript PBM',
      status: 'active'
    },
    chartEvidence: [
      { label: 'Diagnosis', value: 'E11.9 Type 2 diabetes mellitus', source: 'FHIR chart', status: 'found' },
      { label: 'A1c', value: '8.4% on 2026-05-09', source: 'FHIR chart', status: 'found' },
      { label: 'Step therapy', value: 'Metformin stopped after severe GI intolerance', source: 'FHIR chart', status: 'found' },
      { label: 'Weight trend', value: 'BMI 34.1', source: 'FHIR chart', status: 'found' }
    ],
    coverageRule: {
      verdict: 'pa-required',
      summary: 'Covered with PA when Type 2 diabetes and prior metformin trial/failure are documented.',
      requirements: ['Type 2 diabetes diagnosis', 'Recent A1c', 'Metformin trial or contraindication', 'Prescriber attestation'],
      alternatives: ['Trulicity', 'Rybelsus', 'Metformin ER']
    },
    pharmacyEvent: {
      status: 'rejected',
      rejectionCode: 'NCPDP 75',
      message: 'Prior authorization required before claim can be paid.',
      pharmacy: 'Maple Family Pharmacy'
    },
    payerDecision: {
      status: 'needs-info',
      reason: 'Needs A1c lab and metformin intolerance documentation.',
      expectedTurnaround: '24-72 hours after complete packet'
    },
    blocker: {
      title: 'Prior authorization required',
      severity: 'high',
      explanation: 'The plan will cover Ozempic, but only after clinical evidence proves diabetes indication and failed first-line therapy.'
    },
    remedies: [
      { title: 'Attach A1c lab', detail: 'Use the 8.4% A1c observation from the chart.', owner: 'provider' },
      { title: 'Document metformin failure', detail: 'Include intolerance note and discontinued medication history.', owner: 'provider' },
      { title: 'Submit PA packet', detail: 'Send diagnosis, lab, step therapy, and prescriber rationale to payer.', owner: 'insurance' }
    ],
    tasks: [
      { title: 'Review generated PA packet', detail: 'Provider must sign before submission.', owner: 'provider' },
      { title: 'Retry claim after approval', detail: 'Pharmacy gets a task when payer status changes.', owner: 'pharmacy' },
      { title: 'Notify patient', detail: 'Patient gets a plain-English update while waiting.', owner: 'patient' }
    ],
    timeline: [
      { status: 'prescribed', title: 'Prescription sent', body: 'Ozempic sent electronically to Maple Family Pharmacy.', actor: 'provider', time: '9:04 AM' },
      { status: 'rejected', title: 'Claim rejected', body: 'Pharmacy received prior authorization rejection from PBM.', actor: 'pharmacy', time: '9:18 AM' },
      { status: 'evidence-needed', title: 'Blocker classified', body: 'Instinct found PA requirement and matched missing evidence to chart data.', actor: 'system', time: '9:19 AM' },
      { status: 'submitted', title: 'PA packet ready', body: 'A1c, diagnosis, and metformin failure were assembled for provider signature.', actor: 'provider', time: '9:23 AM' },
      { status: 'approved', title: 'Prior auth approved', body: 'Insurance approved the complete packet and returned an authorization number.', actor: 'insurance', time: '10:11 AM' },
      { status: 'resolved', title: 'Medication ready for pickup', body: 'Maple Family Pharmacy retried the claim successfully. Ozempic is ready for pickup.', actor: 'pharmacy', time: '10:18 AM' }
    ],
    rolePipelines: {
      provider: [
        { title: 'Coverage risk detected', detail: 'Plan requires PA for GLP-1 therapy.', status: 'done' },
        { title: 'Evidence gathered', detail: 'A1c and metformin intolerance found in chart.', status: 'active' },
        { title: 'Sign packet', detail: 'Provider review required before submission.', status: 'waiting' }
      ],
      pharmacy: [
        { title: 'Claim attempted', detail: 'Rejected with PA-required code.', status: 'done' },
        { title: 'Waiting for payer decision', detail: 'Retry claim after approval.', status: 'waiting' }
      ],
      insurance: [
        { title: 'Intake pending', detail: 'Complete packet not yet submitted.', status: 'active' },
        { title: 'Decision window', detail: 'Standard review after complete documentation.', status: 'waiting' }
      ],
      patient: [
        { title: 'Medication delayed', detail: 'Insurance needs more documentation.', status: 'active' },
        { title: 'Instinct collecting evidence', detail: 'No phone calls needed right now.', status: 'done' }
      ]
    },
    stageActions: [
      { owner: 'provider', title: 'Check coverage before patient leaves', detail: 'Warn provider that Ozempic needs PA under this plan.' },
      { owner: 'pharmacy', title: 'Send rejection details to Instinct', detail: 'Classify PA-required rejection and open case.' },
      { owner: 'provider', title: 'Review evidence checklist', detail: 'Confirm A1c and metformin intolerance are correct.' },
      { owner: 'provider', title: 'Sign PA packet', detail: 'Submit complete packet to payer.' },
      { owner: 'insurance', title: 'Approve complete packet', detail: 'Return the authorization decision to Instinct.' },
      { owner: 'pharmacy', title: 'Medication ready for pickup', detail: 'Paid claim succeeded. Tell patient the medication is ready.' }
    ],
    paDraft: {
      subject: 'Prior authorization request for Ozempic 0.25 mg weekly',
      summary: 'Patient has Type 2 diabetes with A1c 8.4% and documented intolerance to metformin. Ozempic is requested for glycemic control.',
      sections: ['Diagnosis: E11.9 Type 2 diabetes mellitus', 'Recent A1c: 8.4%', 'Step therapy: metformin discontinued due to GI intolerance', 'Requested outcome: approve Ozempic under pharmacy benefit']
    }
  },
  {
    id: 'covered-alternative',
    title: 'Covered Alternative Before Prescribing',
    shortTitle: 'Covered Alternative',
    summary: 'A non-covered inhaler is caught before it reaches the pharmacy.',
    demoMoment: 'Instinct prevents the rejection by recommending covered alternatives while the provider is prescribing.',
    patient: {
      name: 'Marcus Reed',
      age: 29,
      memberId: 'AC-8201-5520',
      location: 'Brooklyn, NY',
      conditions: ['Moderate persistent asthma', 'Seasonal allergic rhinitis']
    },
    prescription: {
      drug: 'Flovent HFA',
      dose: '110 mcg, two puffs twice daily',
      prescriber: commonProvider,
      diagnosis: 'Moderate persistent asthma',
      intent: 'Controller inhaler for persistent asthma symptoms.'
    },
    insurance: {
      payer: 'Empire Metro',
      plan: 'Essential Plus',
      pbm: 'NorthStar Rx',
      status: 'active'
    },
    chartEvidence: [
      { label: 'Diagnosis', value: 'J45.40 Moderate persistent asthma', source: 'FHIR chart', status: 'found' },
      { label: 'Recent exacerbation', value: 'Urgent care visit last month', source: 'FHIR chart', status: 'found' },
      { label: 'Current inhaler', value: 'Albuterol rescue inhaler', source: 'FHIR chart', status: 'found' }
    ],
    coverageRule: {
      verdict: 'not-covered',
      summary: 'Flovent HFA is not preferred. Arnuity Ellipta and Qvar RediHaler are covered alternatives.',
      requirements: ['Switch to preferred inhaled corticosteroid or document medical necessity'],
      alternatives: ['Arnuity Ellipta', 'Qvar RediHaler', 'Pulmicort Flexhaler']
    },
    pharmacyEvent: {
      status: 'ready',
      rejectionCode: 'Prevented',
      message: 'No rejection occurred because provider switched to covered alternative.',
      pharmacy: 'Bergen Community Pharmacy'
    },
    payerDecision: {
      status: 'approved',
      reason: 'Covered alternative selected at prescribing.',
      expectedTurnaround: 'Immediate'
    },
    blocker: {
      title: 'Non-covered medication prevented',
      severity: 'medium',
      explanation: 'Instinct identified the non-covered inhaler before the order was sent and surfaced covered alternatives.'
    },
    remedies: [
      { title: 'Switch to covered inhaler', detail: 'Use Arnuity Ellipta to avoid PA and pharmacy rejection.', owner: 'provider' },
      { title: 'Counsel patient', detail: 'Explain device difference and pickup timing.', owner: 'pharmacy' }
    ],
    tasks: [
      { title: 'Confirm alternative', detail: 'Provider switches prescription before checkout.', owner: 'provider' },
      { title: 'Prepare fill', detail: 'Pharmacy receives clean paid claim.', owner: 'pharmacy' }
    ],
    timeline: [
      { status: 'prescribed', title: 'Provider selected Flovent', body: 'Instinct checked coverage during prescribing.', actor: 'provider', time: '2:10 PM' },
      { status: 'access-risk', title: 'Access risk detected', body: 'Plan prefers Arnuity Ellipta or Qvar RediHaler.', actor: 'system', time: '2:10 PM' },
      { status: 'resolved', title: 'Prescription switched', body: 'Provider selected Arnuity Ellipta before sending order.', actor: 'provider', time: '2:12 PM' },
      { status: 'approved', title: 'Medication ready', body: 'Pharmacy received paid claim with no PA required.', actor: 'pharmacy', time: '2:31 PM' }
    ],
    rolePipelines: {
      provider: [
        { title: 'Coverage checked', detail: 'Non-covered medication flagged in workflow.', status: 'done' },
        { title: 'Alternative selected', detail: 'Provider chose preferred therapy.', status: 'active' }
      ],
      pharmacy: [
        { title: 'Clean claim', detail: 'No rejection after alternative switch.', status: 'done' },
        { title: 'Ready for pickup', detail: 'Patient can pick up today.', status: 'active' }
      ],
      insurance: [
        { title: 'Preferred product used', detail: 'No PA review needed.', status: 'done' }
      ],
      patient: [
        { title: 'Medication changed', detail: 'Doctor selected a covered inhaler.', status: 'done' },
        { title: 'Pickup ready', detail: 'Pharmacy is preparing the medication.', status: 'active' }
      ]
    },
    stageActions: [
      { owner: 'provider', title: 'Select covered alternative', detail: 'Switch while patient is still in the office.' },
      { owner: 'provider', title: 'Explain alternative', detail: 'Tell patient the substitute is covered by their plan.' },
      { owner: 'pharmacy', title: 'Fill preferred inhaler', detail: 'Run claim for the covered alternative.' },
      { owner: 'patient', title: 'Pick up medication', detail: 'Patient gets same-day access.' }
    ],
    paDraft: {
      subject: 'PA avoided by covered alternative selection',
      summary: 'Instinct identified a preferred alternative before the prescription reached the pharmacy.',
      sections: ['Original drug: Flovent HFA', 'Covered alternative: Arnuity Ellipta', 'Outcome: PA avoided and claim paid']
    }
  },
  {
    id: 'step-therapy',
    title: 'Step Therapy',
    shortTitle: 'Step Therapy',
    summary: 'A biologic is blocked until prior therapy history and specialist documentation are attached.',
    demoMoment: 'Instinct finds prior failures and flags the missing specialist note.',
    patient: {
      name: 'Elena Morris',
      age: 52,
      memberId: 'UH-7710-3458',
      location: 'Queens, NY',
      conditions: ['Rheumatoid arthritis', 'Chronic pain']
    },
    prescription: {
      drug: 'Humira',
      dose: '40 mg every other week',
      prescriber: 'Dr. Alan Chen, Rheumatology',
      diagnosis: 'Rheumatoid arthritis',
      intent: 'Escalate therapy after inadequate response to conventional DMARDs.'
    },
    insurance: {
      payer: 'United Premier',
      plan: 'Choice PPO',
      pbm: 'OptiRx',
      status: 'active'
    },
    chartEvidence: [
      { label: 'Diagnosis', value: 'M06.9 Rheumatoid arthritis', source: 'FHIR chart', status: 'found' },
      { label: 'Methotrexate trial', value: '12 weeks, inadequate response', source: 'FHIR chart', status: 'found' },
      { label: 'Hydroxychloroquine trial', value: 'Discontinued due to rash', source: 'FHIR chart', status: 'found' },
      { label: 'Specialist note', value: 'Disease activity score missing', source: 'FHIR chart', status: 'missing' }
    ],
    coverageRule: {
      verdict: 'pa-required',
      summary: 'Humira requires step therapy history and rheumatology disease activity documentation.',
      requirements: ['RA diagnosis', 'Two conventional DMARD trials', 'Specialist note', 'TB screening'],
      alternatives: ['Methotrexate', 'Hydroxychloroquine', 'Etanercept preferred biosimilar']
    },
    pharmacyEvent: {
      status: 'rejected',
      rejectionCode: 'NCPDP 75/ST',
      message: 'Prior authorization required; step therapy documentation required.',
      pharmacy: 'Metro Specialty Pharmacy'
    },
    payerDecision: {
      status: 'needs-info',
      reason: 'Disease activity and TB screening documentation missing.',
      expectedTurnaround: '3-5 business days'
    },
    blocker: {
      title: 'Step therapy proof incomplete',
      severity: 'high',
      explanation: 'The plan requires failed conventional therapies plus specialist documentation before approving the biologic.'
    },
    remedies: [
      { title: 'Attach prior DMARD failures', detail: 'Methotrexate and hydroxychloroquine evidence found.', owner: 'provider' },
      { title: 'Request specialist note', detail: 'Need disease activity score and TB screening.', owner: 'provider' },
      { title: 'Route specialty pharmacy status', detail: 'Keep specialty pharmacy updated for cold-chain scheduling.', owner: 'pharmacy' }
    ],
    tasks: [
      { title: 'Upload specialist addendum', detail: 'Rheumatology office must add missing score.', owner: 'provider' },
      { title: 'Hold specialty fill', detail: 'Do not schedule shipment until approval.', owner: 'pharmacy' }
    ],
    timeline: [
      { status: 'prescribed', title: 'Humira prescribed', body: 'Specialty medication order sent.', actor: 'provider', time: '10:00 AM' },
      { status: 'rejected', title: 'Step therapy rejection', body: 'Specialty pharmacy received PA + step therapy rejection.', actor: 'pharmacy', time: '10:07 AM' },
      { status: 'evidence-needed', title: 'Evidence gap found', body: 'Prior therapies found, specialist disease score missing.', actor: 'system', time: '10:08 AM' },
      { status: 'submitted', title: 'Partial packet prepared', body: 'Instinct prepared packet and assigned specialist addendum task.', actor: 'provider', time: '10:16 AM' }
    ],
    rolePipelines: {
      provider: [
        { title: 'Prior therapies matched', detail: 'Two DMARD trials found.', status: 'done' },
        { title: 'Specialist addendum needed', detail: 'Disease activity score missing.', status: 'active' }
      ],
      pharmacy: [
        { title: 'Specialty claim blocked', detail: 'Shipment cannot be scheduled yet.', status: 'blocked' },
        { title: 'Watch for approval', detail: 'Prepare fulfillment once approved.', status: 'waiting' }
      ],
      insurance: [
        { title: 'Step therapy review', detail: 'Needs complete specialist documentation.', status: 'active' }
      ],
      patient: [
        { title: 'Medication delayed', detail: 'Insurance needs specialist documentation.', status: 'active' }
      ]
    },
    stageActions: [
      { owner: 'provider', title: 'Confirm biologic requirement', detail: 'Check plan rule before submission.' },
      { owner: 'pharmacy', title: 'Send step therapy rejection', detail: 'Open Instinct access case.' },
      { owner: 'provider', title: 'Add specialist note', detail: 'Attach disease score and TB screening.' },
      { owner: 'insurance', title: 'Review complete packet', detail: 'Decide once addendum arrives.' }
    ],
    paDraft: {
      subject: 'Prior authorization request for Humira',
      summary: 'Patient has RA with inadequate response or intolerance to conventional DMARDs. Specialist disease activity documentation is pending.',
      sections: ['Diagnosis: rheumatoid arthritis', 'Failed therapy: methotrexate', 'Failed therapy: hydroxychloroquine', 'Missing: disease activity score and TB screening']
    }
  },
  {
    id: 'cost-issue',
    title: 'Cost Issue',
    shortTitle: 'Cost',
    summary: 'Medication is technically covered but patient cost is too high.',
    demoMoment: 'Instinct separates coverage from affordability and surfaces lower-cost remedies.',
    patient: {
      name: 'Tanya Brooks',
      age: 61,
      memberId: 'CV-3902-8110',
      location: 'Philadelphia, PA',
      conditions: ['Atrial fibrillation', 'Hyperlipidemia']
    },
    prescription: {
      drug: 'Eliquis',
      dose: '5 mg twice daily',
      prescriber: commonProvider,
      diagnosis: 'Atrial fibrillation',
      intent: 'Stroke prevention.'
    },
    insurance: {
      payer: 'Aetna Value',
      plan: 'Medicare Advantage',
      pbm: 'CVS Caremark',
      status: 'active'
    },
    chartEvidence: [
      { label: 'Diagnosis', value: 'I48.91 Atrial fibrillation', source: 'FHIR chart', status: 'found' },
      { label: 'Renal function', value: 'eGFR 78', source: 'FHIR chart', status: 'found' },
      { label: 'Cost concern', value: 'Patient reports $412 copay unaffordable', source: 'Patient reported', status: 'found' }
    ],
    coverageRule: {
      verdict: 'covered-high-cost',
      summary: 'Drug is covered but patient is in a high cost-share phase.',
      requirements: ['Confirm deductible phase', 'Check preferred pharmacy', 'Assess assistance eligibility'],
      alternatives: ['Warfarin with INR monitoring', 'Preferred mail order', 'Manufacturer assistance review']
    },
    pharmacyEvent: {
      status: 'high-cost',
      rejectionCode: 'Paid claim / high patient pay',
      message: 'Claim paid but patient responsibility is $412.',
      pharmacy: 'Cedar Rx'
    },
    payerDecision: {
      status: 'approved',
      reason: 'Drug covered; no PA issue. Affordability intervention needed.',
      expectedTurnaround: 'Immediate'
    },
    blocker: {
      title: 'Affordability blocker',
      severity: 'medium',
      explanation: 'Insurance approved the medication, but the out-of-pocket cost is likely to cause abandonment.'
    },
    remedies: [
      { title: 'Check preferred pharmacy', detail: 'Compare retail vs mail order cost.', owner: 'pharmacy' },
      { title: 'Review lower-cost clinical option', detail: 'Provider can consider warfarin if appropriate.', owner: 'provider' },
      { title: 'Screen assistance route', detail: 'Patient may qualify for affordability support.', owner: 'patient' }
    ],
    tasks: [
      { title: 'Run alternate pharmacy estimate', detail: 'Pharmacy compares preferred network options.', owner: 'pharmacy' },
      { title: 'Discuss alternative', detail: 'Provider evaluates whether lower-cost therapy is clinically acceptable.', owner: 'provider' }
    ],
    timeline: [
      { status: 'prescribed', title: 'Eliquis prescribed', body: 'Prescription sent for AFib stroke prevention.', actor: 'provider', time: '11:40 AM' },
      { status: 'access-risk', title: 'High copay found', body: 'Claim paid with $412 patient responsibility.', actor: 'pharmacy', time: '11:55 AM' },
      { status: 'evidence-needed', title: 'Affordability workflow opened', body: 'Instinct suggested pharmacy, assistance, and clinical alternative paths.', actor: 'system', time: '11:56 AM' },
      { status: 'resolved', title: 'Lower-cost path selected', body: 'Preferred mail-order estimate reduced monthly cost.', actor: 'pharmacy', time: '12:15 PM' }
    ],
    rolePipelines: {
      provider: [
        { title: 'Clinical indication verified', detail: 'AFib diagnosis supports anticoagulant therapy.', status: 'done' },
        { title: 'Alternative review available', detail: 'Provider can compare warfarin if needed.', status: 'waiting' }
      ],
      pharmacy: [
        { title: 'Paid claim found', detail: 'No PA issue.', status: 'done' },
        { title: 'Affordability options', detail: 'Preferred pharmacy and assistance routes suggested.', status: 'active' }
      ],
      insurance: [
        { title: 'Coverage active', detail: 'Drug covered under current plan.', status: 'done' }
      ],
      patient: [
        { title: 'Cost problem explained', detail: 'Insurance covered the drug but copay is high.', status: 'active' },
        { title: 'Options available', detail: 'Instinct is checking lower-cost paths.', status: 'done' }
      ]
    },
    stageActions: [
      { owner: 'pharmacy', title: 'Identify high copay', detail: 'Separate coverage approval from affordability blocker.' },
      { owner: 'pharmacy', title: 'Compare pharmacy options', detail: 'Check preferred network and mail order.' },
      { owner: 'provider', title: 'Review clinical alternative', detail: 'Consider lower-cost therapy if appropriate.' },
      { owner: 'patient', title: 'Confirm pickup path', detail: 'Patient chooses affordable route.' }
    ],
    paDraft: {
      subject: 'Affordability intervention summary for Eliquis',
      summary: 'Claim is covered but high patient responsibility creates abandonment risk.',
      sections: ['Diagnosis: atrial fibrillation', 'Claim outcome: paid with high cost share', 'Remedies: preferred pharmacy, assistance screening, clinical alternative review']
    }
  },
  {
    id: 'insurance-mismatch',
    title: 'Insurance Mismatch',
    shortTitle: 'Insurance Mismatch',
    summary: 'Patient switched plans and the pharmacy is billing inactive coverage.',
    demoMoment: 'Instinct detects inactive coverage and asks the patient for updated plan/PBM info.',
    patient: {
      name: 'Jordan Ellis',
      age: 37,
      memberId: 'OLD-1100-2219',
      location: 'Jersey City, NJ',
      conditions: ['Major depressive disorder', 'Generalized anxiety disorder']
    },
    prescription: {
      drug: 'Trintellix',
      dose: '10 mg daily',
      prescriber: commonProvider,
      diagnosis: 'Major depressive disorder',
      intent: 'Continue stable antidepressant therapy after insurance change.'
    },
    insurance: {
      payer: 'OldPlan Health',
      plan: 'Terminated PPO',
      pbm: 'LegacyRx',
      status: 'inactive'
    },
    chartEvidence: [
      { label: 'Medication history', value: 'Trintellix stable for 14 months', source: 'FHIR chart', status: 'found' },
      { label: 'Old coverage', value: 'Terminated 2026-05-01', source: 'Simulated claim', status: 'found' },
      { label: 'New coverage', value: 'Patient upload requested', source: 'Patient reported', status: 'requested' }
    ],
    coverageRule: {
      verdict: 'coverage-unknown',
      summary: 'Current pharmacy benefit cannot be verified because plan on file is inactive.',
      requirements: ['Updated insurance card', 'New PBM BIN/PCN/group', 'Medication history packet for new plan'],
      alternatives: ['Bridge supply request', 'Cash discount check', 'Transfer to preferred pharmacy after plan update']
    },
    pharmacyEvent: {
      status: 'insurance-error',
      rejectionCode: 'NCPDP 65',
      message: 'Patient not covered under submitted plan.',
      pharmacy: 'Hudson Wellness Pharmacy'
    },
    payerDecision: {
      status: 'not-submitted',
      reason: 'No active plan found for benefit check.',
      expectedTurnaround: 'Immediate after updated insurance is added'
    },
    blocker: {
      title: 'Inactive insurance on file',
      severity: 'high',
      explanation: 'The pharmacy is billing old coverage after the patient changed insurance.'
    },
    remedies: [
      { title: 'Request new insurance card', detail: 'Ask patient for front/back card and pharmacy benefit details.', owner: 'patient' },
      { title: 'Create continuity packet', detail: 'Summarize medication history for new plan.', owner: 'provider' },
      { title: 'Rebill under active plan', detail: 'Pharmacy retries once plan details are updated.', owner: 'pharmacy' }
    ],
    tasks: [
      { title: 'Upload card', detail: 'Patient needs to add new coverage information.', owner: 'patient' },
      { title: 'Prepare continuity note', detail: 'Provider documents stable therapy history.', owner: 'provider' }
    ],
    timeline: [
      { status: 'prescribed', title: 'Refill sent', body: 'Continuation prescription sent after insurance switch.', actor: 'provider', time: '4:02 PM' },
      { status: 'rejected', title: 'Coverage mismatch', body: 'Pharmacy rejection says plan is inactive.', actor: 'pharmacy', time: '4:11 PM' },
      { status: 'evidence-needed', title: 'Patient task opened', body: 'Instinct requested updated insurance card and PBM fields.', actor: 'system', time: '4:12 PM' },
      { status: 'submitted', title: 'Continuity packet ready', body: 'Medication history summary prepared for new plan.', actor: 'provider', time: '4:18 PM' }
    ],
    rolePipelines: {
      provider: [
        { title: 'Medication history found', detail: 'Stable therapy history can support continuity.', status: 'done' },
        { title: 'Continuity packet ready', detail: 'Useful for new plan coverage review.', status: 'active' }
      ],
      pharmacy: [
        { title: 'Inactive coverage rejection', detail: 'Old plan cannot pay claim.', status: 'blocked' },
        { title: 'Await updated benefit', detail: 'Rebill after new card arrives.', status: 'waiting' }
      ],
      insurance: [
        { title: 'No active plan', detail: 'Cannot review until active payer/PBM is known.', status: 'blocked' }
      ],
      patient: [
        { title: 'Upload insurance card', detail: 'Instinct needs new plan details.', status: 'active' },
        { title: 'Status visible', detail: 'Patient can see why pharmacy cannot fill yet.', status: 'done' }
      ]
    },
    stageActions: [
      { owner: 'pharmacy', title: 'Report inactive coverage', detail: 'Send rejection details to Instinct.' },
      { owner: 'patient', title: 'Upload new insurance', detail: 'Collect front/back card and PBM fields.' },
      { owner: 'provider', title: 'Prepare history packet', detail: 'Show patient was stable on therapy.' },
      { owner: 'pharmacy', title: 'Rebill new plan', detail: 'Retry when updated benefit is verified.' }
    ],
    paDraft: {
      subject: 'Medication continuity packet for Trintellix',
      summary: 'Patient changed insurance and needs continuity documentation for stable antidepressant therapy.',
      sections: ['Medication stable for 14 months', 'Old coverage inactive', 'Patient asked for updated insurance card', 'Goal: avoid interruption in antidepressant therapy']
    }
  },
  {
    id: 'denied-appeal',
    title: 'Denied, Appeal Needed',
    shortTitle: 'Appeal',
    summary: 'A prior auth was denied because documentation was incomplete.',
    demoMoment: 'Instinct turns the denial reason into an appeal checklist and draft.',
    patient: {
      name: 'Nora Williams',
      age: 48,
      memberId: 'BC-6508-3321',
      location: 'Hoboken, NJ',
      conditions: ['Chronic migraine', 'Medication overuse headache history']
    },
    prescription: {
      drug: 'Nurtec ODT',
      dose: '75 mg as needed',
      prescriber: 'Dr. Leah Morgan, Neurology',
      diagnosis: 'Chronic migraine',
      intent: 'Acute migraine therapy after triptan failure.'
    },
    insurance: {
      payer: 'BlueCare Direct',
      plan: 'Gold EPO',
      pbm: 'PrimeThera Rx',
      status: 'active'
    },
    chartEvidence: [
      { label: 'Diagnosis', value: 'G43.709 Chronic migraine', source: 'FHIR chart', status: 'found' },
      { label: 'Triptan failure', value: 'Sumatriptan ineffective', source: 'FHIR chart', status: 'found' },
      { label: 'Contraindication detail', value: 'Cardiovascular risk statement missing', source: 'FHIR chart', status: 'missing' },
      { label: 'Headache days', value: '15+ days/month documented', source: 'FHIR chart', status: 'found' }
    ],
    coverageRule: {
      verdict: 'pa-required',
      summary: 'Nurtec requires prior triptan failure and migraine frequency documentation.',
      requirements: ['Migraine diagnosis', 'Triptan trial/failure', 'Monthly headache days', 'Clinical rationale'],
      alternatives: ['Rizatriptan', 'Ubrelvy', 'Preventive therapy review']
    },
    pharmacyEvent: {
      status: 'rejected',
      rejectionCode: 'NCPDP 75/DN',
      message: 'Prior authorization denied; appeal rights available.',
      pharmacy: 'Harbor Rx'
    },
    payerDecision: {
      status: 'denied',
      reason: 'Denial states insufficient documentation of failed triptan therapy and clinical rationale.',
      expectedTurnaround: 'Appeal review in 7 calendar days'
    },
    blocker: {
      title: 'PA denied for incomplete documentation',
      severity: 'high',
      explanation: 'The payer denied the PA but provided an actionable reason that can be appealed with clearer evidence.'
    },
    remedies: [
      { title: 'Draft appeal', detail: 'Address each denial reason directly.', owner: 'provider' },
      { title: 'Attach triptan failure evidence', detail: 'Use neurology note and med history.', owner: 'provider' },
      { title: 'Keep patient updated', detail: 'Explain denial and appeal timeline in plain language.', owner: 'patient' }
    ],
    tasks: [
      { title: 'Review appeal language', detail: 'Neurology office signs appeal.', owner: 'provider' },
      { title: 'Hold prescription', detail: 'Pharmacy waits for appeal outcome.', owner: 'pharmacy' },
      { title: 'Review appeal packet', detail: 'Payer reviews corrected documentation.', owner: 'insurance' }
    ],
    timeline: [
      { status: 'prescribed', title: 'Nurtec prescribed', body: 'Neurologist submitted medication for chronic migraine.', actor: 'provider', time: '8:45 AM' },
      { status: 'submitted', title: 'PA submitted', body: 'Initial PA sent with chart notes.', actor: 'provider', time: '9:05 AM' },
      { status: 'denied', title: 'PA denied', body: 'Payer denied due to insufficient triptan failure documentation.', actor: 'insurance', time: '1:20 PM' },
      { status: 'evidence-needed', title: 'Appeal checklist built', body: 'Instinct mapped denial reason to missing evidence and generated appeal draft.', actor: 'system', time: '1:23 PM' },
      { status: 'submitted', title: 'Appeal ready', body: 'Provider can sign appeal with corrected evidence.', actor: 'provider', time: '1:27 PM' }
    ],
    rolePipelines: {
      provider: [
        { title: 'Denial reason parsed', detail: 'Appeal must address failed triptan documentation.', status: 'done' },
        { title: 'Appeal draft ready', detail: 'Provider review needed.', status: 'active' }
      ],
      pharmacy: [
        { title: 'Fill blocked', detail: 'Cannot fill until appeal outcome.', status: 'blocked' },
        { title: 'Monitor outcome', detail: 'Retry when appeal approved.', status: 'waiting' }
      ],
      insurance: [
        { title: 'Denial issued', detail: 'Reason captured in audit trail.', status: 'done' },
        { title: 'Appeal intake', detail: 'Corrected documentation expected.', status: 'active' }
      ],
      patient: [
        { title: 'Denied but not finished', detail: 'Instinct is preparing appeal.', status: 'active' },
        { title: 'Expected timeline', detail: 'Appeal review may take up to 7 days.', status: 'waiting' }
      ]
    },
    stageActions: [
      { owner: 'provider', title: 'Submit initial PA', detail: 'PA goes to payer for review.' },
      { owner: 'insurance', title: 'Return denial reason', detail: 'Denial reason becomes structured next step.' },
      { owner: 'provider', title: 'Attach missing evidence', detail: 'Add failed triptan details and clinical rationale.' },
      { owner: 'provider', title: 'Submit appeal', detail: 'Send corrected appeal packet.' },
      { owner: 'insurance', title: 'Review appeal', detail: 'Decide after complete packet arrives.' }
    ],
    paDraft: {
      subject: 'Appeal for Nurtec ODT denial',
      summary: 'Appeal addresses denial for insufficient documentation by adding chronic migraine frequency and failed triptan therapy evidence.',
      sections: ['Diagnosis: chronic migraine', 'Failed therapy: sumatriptan ineffective', 'Headache frequency: 15+ days/month', 'Request: overturn denial and approve Nurtec ODT']
    }
  }
];

export function getScenario(id: string): Scenario | undefined {
  return scenarios.find((scenario) => scenario.id === id);
}
