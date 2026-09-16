import { describe, expect, it } from 'vitest';
import { formatContinueTooltip } from './validation';
import type { Conflict } from '../../hooks/useConflicts';

describe('formatContinueTooltip (BUG-09)', () => {
  const dummyT = (key: string, options?: any) => {
    if (key === 'step1FixOneIssue') return 'Please fix 1 issue before continuing';
    if (key === 'step1FixIssues') return `Please fix ${options?.count} issues before continuing`;
    return options?.defaultValue || key;
  };

  it('returns undefined when there are no blockers', () => {
    const tooltip = formatContinueTooltip([], dummyT);
    expect(tooltip).toBeUndefined();
  });

  it('formats tooltip correctly for a single blocker', () => {
    const blockers: Conflict[] = [
      {
        code: 'D1',
        severity: 'blocker',
        stopIndex: 0,
        lineIndex: -1,
        message: 'Stop 1: No FROM date set',
        resolution: 'Set a date',
      },
    ];

    const tooltip = formatContinueTooltip(blockers, dummyT);
    expect(tooltip).toBe('Please fix 1 issue before continuing: Stop 1: No FROM date set');
  });

  it('formats tooltip correctly for multiple blockers with truncation past 3', () => {
    const blockers: Conflict[] = [
      {
        code: 'D1',
        severity: 'blocker',
        stopIndex: 0,
        lineIndex: -1,
        message: 'Stop 1: No FROM date set',
        resolution: 'Set a date',
      },
      {
        code: 'C3',
        severity: 'blocker',
        stopIndex: 0,
        lineIndex: 0,
        message: 'Stop 1, line 1: Product has zero qty',
        resolution: 'Enter qty > 0',
      },
      {
        code: 'L1',
        severity: 'blocker',
        stopIndex: 1,
        lineIndex: -1,
        message: 'Stop 2: No location selected',
        resolution: 'Select a location',
      },
      {
        code: 'D3',
        severity: 'blocker',
        stopIndex: 1,
        lineIndex: -1,
        message: 'Stop 2: Start is before Stop 1',
        resolution: 'Fix chronological order',
      },
    ];

    const tooltip = formatContinueTooltip(blockers, dummyT);
    expect(tooltip).toContain('Please fix 4 issues before continuing:');
    expect(tooltip).toContain('Stop 1: No FROM date set');
    expect(tooltip).toContain('Stop 1, line 1: Product has zero qty');
    expect(tooltip).toContain('Stop 2: No location selected');
    expect(tooltip).toContain('(+1 more)');
  });
});
