import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStreamWatchdog, GatewayStalledError } from './streamWatchdog';

describe('createStreamWatchdog (QA retest #3: endless "Working with your MYVAGON data…")', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('aborts when the response never starts', () => {
    const controller = new AbortController();
    const dog = createStreamWatchdog(controller, { responseMs: 1000, idleMs: 5000 });
    vi.advanceTimersByTime(999);
    expect(controller.signal.aborted).toBe(false);
    vi.advanceTimersByTime(1);
    expect(controller.signal.aborted).toBe(true);
    expect(controller.signal.reason).toBeInstanceOf(GatewayStalledError);
    expect(dog.stalled).toBe(true);
  });

  it('never cuts off a stream that keeps talking, however long it runs', () => {
    const controller = new AbortController();
    const dog = createStreamWatchdog(controller, { responseMs: 1000, idleMs: 5000 });
    vi.advanceTimersByTime(500);
    dog.kick(); // the response started
    for (let i = 0; i < 100; i += 1) {
      vi.advanceTimersByTime(2500); // a progress line every 2.5 s
      dog.kick();
    }
    expect(controller.signal.aborted).toBe(false);
    vi.advanceTimersByTime(5000); // then silence
    expect(controller.signal.aborted).toBe(true);
  });

  it('does nothing once stopped', () => {
    const controller = new AbortController();
    const dog = createStreamWatchdog(controller, { responseMs: 1000, idleMs: 5000 });
    dog.stop();
    vi.advanceTimersByTime(60_000);
    expect(controller.signal.aborted).toBe(false);
    expect(dog.stalled).toBe(false);
  });
});
