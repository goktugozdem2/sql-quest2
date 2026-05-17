const storage = new Map();

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  writable: true,
  value: {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  },
});

Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  writable: true,
  value: { language: 'en-US' },
});

if (typeof globalThis.btoa !== 'function') {
  globalThis.btoa = (value) => Buffer.from(String(value), 'binary').toString('base64');
}
