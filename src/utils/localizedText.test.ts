import { describe, expect, it } from 'vitest';
import { localizedList, localizedText } from './localizedText';

const label = { en: 'Box', el: 'Kibotio', label: 'Box truck' };

describe('localizedText', () => {
  it('returns strings unchanged', () => {
    expect(localizedText('Athens')).toBe('Athens');
    expect(localizedText(3)).toBe('3');
    expect(localizedText(null)).toBe('');
  });

  it('picks the active language from {en, el, label}', () => {
    expect(localizedText(label, 'en')).toBe('Box');
    expect(localizedText(label, 'el')).toBe('Kibotio');
  });

  it('falls back to label then the other language', () => {
    expect(localizedText({ en: '  ', el: '', label: 'Shown' }, 'en')).toBe('Shown');
    expect(localizedText({ el: 'Mono' }, 'en')).toBe('Mono');
  });

  it('never returns an object', () => {
    const out = localizedText(label, 'en');
    expect(typeof out).toBe('string');
  });

  it('flattens a list of mixed labels', () => {
    expect(localizedList(['Curtainsider', label], 'el')).toEqual(['Curtainsider', 'Kibotio']);
  });
});