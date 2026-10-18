const memory = new Map<string, string>();
export const sessionStorage = {
  async getItem(key: string) {
    try {
      return typeof globalThis.window === "undefined"
        ? null
        : globalThis.window.localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  async setItem(key: string, value: string) {
    memory.set(key, value);
    try {
      if (typeof globalThis.window !== "undefined")
        globalThis.window.localStorage.setItem(key, value);
    } catch {
      /* Browser storage may be unavailable; retain the in-memory session. */
    }
  },
  async removeItem(key: string) {
    memory.delete(key);
    try {
      if (typeof globalThis.window !== "undefined") globalThis.window.localStorage.removeItem(key);
    } catch {
      /* Browser storage may be unavailable; retain the in-memory session. */
    }
  },
};
