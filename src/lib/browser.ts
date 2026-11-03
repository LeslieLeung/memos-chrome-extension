/**
 * Firefox's chrome namespace uses callbacks; its browser namespace returns
 * promises. Chrome MV3 returns promises for the shared APIs used here.
 * Keep this adapter limited to that common API surface, typed by @types/chrome.
 */
export function getBrowserApi(): typeof chrome {
  const scope = globalThis as typeof globalThis & { browser?: typeof chrome };
  return scope.browser ?? chrome;
}
