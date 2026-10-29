import * as SecureStore from "expo-secure-store";
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
type Manifest = { revision: string; count: number };
async function manifest(key: string): Promise<Manifest | null> {
  const raw = await SecureStore.getItemAsync(key, options);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Manifest;
    return typeof value.revision === "string" &&
      /^[a-z0-9]+$/.test(value.revision) &&
      Number.isInteger(value.count) &&
      value.count > 0 &&
      value.count <= 256
      ? value
      : null;
  } catch {
    // Treat corrupt or legacy values as signed out instead of preventing native startup.
    return null;
  }
}
async function removeChunks(key: string, old: Manifest | null) {
  if (old)
    await Promise.all(
      Array.from({ length: old.count }, (_, i) =>
        SecureStore.deleteItemAsync(key + "." + old.revision + "." + i, options),
      ),
    );
}
const storage = {
  async getItem(key: string) {
    const saved = await manifest(key);
    if (!saved) return null;
    const chunks = await Promise.all(
      Array.from({ length: saved.count }, (_, i) =>
        SecureStore.getItemAsync(key + "." + saved.revision + "." + i, options),
      ),
    );
    return chunks.some((chunk) => chunk === null) ? null : chunks.join("");
  },
  async setItem(key: string, value: string) {
    const old = await manifest(key);
    const revision = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    const chunks = value.match(/[\s\S]{1,400}/gu) ?? [""];
    if (chunks.length > 256) throw new Error("This session is too large to store securely.");
    try {
      await Promise.all(
        chunks.map((chunk, i) =>
          SecureStore.setItemAsync(key + "." + revision + "." + i, chunk, options),
        ),
      );
      await SecureStore.setItemAsync(
        key,
        JSON.stringify({ revision, count: chunks.length }),
        options,
      );
    } catch (error) {
      await removeChunks(key, { revision, count: chunks.length }).catch(() => {});
      throw error;
    }
    await removeChunks(key, old).catch(() => {});
  },
  async removeItem(key: string) {
    const old = await manifest(key);
    await SecureStore.deleteItemAsync(key, options);
    await removeChunks(key, old);
  },
};

// SecureStore writes the chunks and their manifest in separate asynchronous calls.
// Serialize operations per key so a slower old write cannot replace a newer bag
// (or restore a session after sign-out). Different keys remain independent.
const pending = new Map<string, Promise<unknown>>();
function inOrder<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const result = (pending.get(key) ?? Promise.resolve()).then(operation);
  const settled = result.then(() => undefined, () => undefined);
  pending.set(key, settled);
  void settled.then(() => {
    if (pending.get(key) === settled) pending.delete(key);
  });
  return result;
}
export const sessionStorage = {
  getItem: (key: string) => inOrder(key, () => storage.getItem(key)),
  setItem: (key: string, value: string) => inOrder(key, () => storage.setItem(key, value)),
  removeItem: (key: string) => inOrder(key, () => storage.removeItem(key)),
};
