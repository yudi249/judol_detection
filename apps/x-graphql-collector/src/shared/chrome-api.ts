export type DebuggerTarget = { tabId: number };

export type ChromeApi = {
  runtime: {
    lastError?: { message?: string };
    onMessage: {
      addListener: (
        listener: (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean | void,
      ) => void;
    };
    sendMessage: (message: unknown) => Promise<unknown>;
  };
  tabs: {
    query: (query: { active?: boolean; currentWindow?: boolean }) => Promise<Array<{ id?: number; url?: string; title?: string }>>;
  };
  debugger: {
    attach: (target: DebuggerTarget, requiredVersion: string, callback: () => void) => void;
    detach: (target: DebuggerTarget, callback: () => void) => void;
    sendCommand: (
      target: DebuggerTarget,
      method: string,
      params: Record<string, unknown> | undefined,
      callback: (result?: unknown) => void,
    ) => void;
    onEvent: {
      addListener: (
        listener: (source: DebuggerTarget, method: string, params?: Record<string, unknown>) => void,
      ) => void;
    };
    onDetach: {
      addListener: (listener: (source: DebuggerTarget, reason: string) => void) => void;
    };
  };
  storage: {
    local: {
      get: (keys?: string | string[]) => Promise<Record<string, unknown>>;
      set: (items: Record<string, unknown>) => Promise<void>;
    };
  };
};

export function getChromeApi(): ChromeApi {
  return (globalThis as typeof globalThis & { chrome: ChromeApi }).chrome;
}
