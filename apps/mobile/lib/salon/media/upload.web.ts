import type { UploadProgress } from "./types";
export async function uploadFile(
  url: string,
  uri: string,
  mime: string,
  headers: Record<string, string>,
  progress: UploadProgress,
  signal: AbortSignal,
) {
  const blob = await fetch(uri).then((r) => r.blob()); // Local picker/cache URI only, never an external API.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    if (signal.aborted) {
      reject(new Error("Upload cancelled."));
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    const done = () => signal.removeEventListener("abort", abort);
    xhr.open("POST", url);
    Object.entries({
      ...headers,
      "Content-Type": mime,
      "x-upsert": "true",
      "cache-control": "private, max-age=0",
    }).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) progress(e.loaded / e.total);
    };
    xhr.onload = () => {
      done();
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        let message = "Upload failed. Please retry.";
        try {
          message = JSON.parse(xhr.responseText).message || message;
        } catch {
          /* Keep the readable fallback if the response is not JSON. */
        }
        reject(new Error(message));
      }
    };
    xhr.onerror = () => {
      done();
      reject(new Error("Connection interrupted. Your upload can be retried."));
    };
    xhr.onabort = () => {
      done();
      reject(new Error("Upload cancelled."));
    };
    xhr.timeout = 180000;
    xhr.ontimeout = () => {
      done();
      reject(new Error("Upload timed out. Please retry."));
    };
    xhr.send(blob);
  });
}
