import { describe, expect, it } from 'vitest';
import { isAbortOrTimeout, userFacingError } from './userFacingError';

const t = (key: string, fallback?: string) => (key === 'vagonai.live.timeout' ? 'TIMEOUT-COPY' : fallback ?? key);

describe('userFacingError (QA retest #2: raw abort text)', () => {
  it('maps the browser and Node abort/timeout wording', () => {
    expect(isAbortOrTimeout('The operation was aborted due to timeout')).toBe(true);
    expect(isAbortOrTimeout('signal is aborted without reason')).toBe(true);
    expect(isAbortOrTimeout('The MYVAGON core API timed out.')).toBe(true);
    const timeout = new Error('whatever');
    timeout.name = 'TimeoutError';
    expect(isAbortOrTimeout(timeout)).toBe(true);
  });

  it('leaves ordinary messages alone', () => {
    expect(isAbortOrTimeout('Only Excel and CSV files can be imported.')).toBe(false);
    expect(userFacingError(new Error('Only Excel and CSV files can be imported.'), t, 'fallback')).toBe(
      'Only Excel and CSV files can be imported.',
    );
  });

  it('shows the localized sentence instead of the raw text', () => {
    expect(userFacingError(new Error('The operation was aborted due to timeout'), t, 'fallback')).toBe('TIMEOUT-COPY');
    expect(userFacingError('This operation was aborted', t, 'fallback')).toBe('TIMEOUT-COPY');
    expect(userFacingError(undefined, t, 'fallback')).toBe('fallback');
  });
});
