import type { DirectoryItem } from '../types';
import { buildDefaultDirectories } from './locationUtils';

const STORAGE_KEY = 'myvagon-address-book-custom-directories';

export function loadCustomDirectories(t: (k: string) => string): DirectoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultDirectories(t);
    const custom = JSON.parse(raw) as DirectoryItem[];
    const defaults = buildDefaultDirectories(t);
    const archivedIdx = defaults.findIndex((d) => d.id === 'archived');
    const merged = [...defaults];
    merged.splice(archivedIdx, 0, ...custom);
    return merged;
  } catch {
    return buildDefaultDirectories(t);
  }
}

export function saveCustomDirectories(directories: DirectoryItem[]): void {
  const custom = directories.filter((d) => d.id.startsWith('custom-'));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
}
