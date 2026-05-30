import { describe, expect, it } from 'vitest';
import { buildAccessCase } from './caseEngine';
import { scenarios } from './scenarios';

describe('case engine', () => {
  it('builds a complete medication access case for every demo scenario', () => {
    for (const scenario of scenarios) {
      const accessCase = buildAccessCase(scenario, scenario.timeline.length - 1);

      expect(accessCase.id).toBe(scenario.id);
      expect(accessCase.blocker.title.length).toBeGreaterThan(0);
      expect(accessCase.remedies.length).toBeGreaterThan(0);
      expect(accessCase.visibleTimeline.length).toBe(scenario.timeline.length);
      expect(accessCase.rolePipelines.provider.length).toBeGreaterThan(0);
      expect(accessCase.rolePipelines.pharmacy.length).toBeGreaterThan(0);
      expect(accessCase.rolePipelines.insurance.length).toBeGreaterThan(0);
      expect(accessCase.rolePipelines.patient.length).toBeGreaterThan(0);
      expect(accessCase.paDraft.subject.length).toBeGreaterThan(0);
      expect(accessCase.nextAction.owner.length).toBeGreaterThan(0);
    }
  });

  it('limits visible timeline events by current step', () => {
    const accessCase = buildAccessCase(scenarios[0], 1);

    expect(accessCase.visibleTimeline).toHaveLength(2);
    expect(accessCase.hiddenTimelineCount).toBe(scenarios[0].timeline.length - 2);
  });
});
