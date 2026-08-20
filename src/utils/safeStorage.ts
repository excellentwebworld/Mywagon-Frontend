/** WebViews often throw on localStorage/sessionStorage (disabled DOM storage, Origin: null). */

function storageGet(store: Storage | undefined, key: string): string | null {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function storageSet(store: Storage | undefined, key: string, value: string): void {
  try {
    store?.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function storageRemove(store: Storage | undefined, key: string): void {
  try {
    store?.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function safeLocalGet(key: string): string | null {
  return storageGet(typeof localStorage === 'undefined' ? undefined : localStorage, key);
}

export function safeLocalSet(key: string, value: string): void {
  storageSet(typeof localStorage === 'undefined' ? undefined : localStorage, key, value);
}

export function safeLocalRemove(key: string): void {
  storageRemove(typeof localStorage === 'undefined' ? undefined : localStorage, key);
}

export function safeSessionGet(key: string): string | null {
  return storageGet(typeof sessionStorage === 'undefined' ? undefined : sessionStorage, key);
}

export function safeSessionSet(key: string, value: string): void {
  storageSet(typeof sessionStorage === 'undefined' ? undefined : sessionStorage, key, value);
}
