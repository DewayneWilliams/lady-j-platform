import { Upload } from "tus-js-client";
import type { UploadProgress } from "./types";

export async function uploadFile(
  url: string,
  uri: string,
  mime: string,
  headers: Record<string, string>,
  progress: UploadProgress,
  signal: AbortSignal,
) {
  if (signal.aborted) throw new Error("Upload cancelled.");
  const blob = await fetch(uri).then((response) => response.blob()); // Local picker/cache URI only.
  if (signal.aborted) throw new Error("Upload cancelled.");
  const parsed = new URL(url);
  const marker = "/storage/v1/object/";
  const objectIndex = parsed.pathname.indexOf(marker);
  if (objectIndex < 0) throw new Error("The private upload destination is invalid.");
  const objectParts = parsed.pathname
    .slice(objectIndex + marker.length)
    .split("/")
    .map(decodeURIComponent);
  const bucketName = objectParts.shift();
  const objectName = objectParts.join("/");
  if (!bucketName || !objectName) throw new Error("The private upload destination is incomplete.");
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const upload = new Upload(blob, {
      endpoint: `${parsed.origin}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { ...headers, "x-upsert": "true" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName,
        objectName,
        contentType: mime,
        cacheControl: "0",
      },
      onProgress: (uploaded, total) => total > 0 && progress(uploaded / total),
      onSuccess: () => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", abort);
        resolve();
      },
      onError: (reason) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", abort);
        reject(
          new Error(
            signal.aborted
              ? "Upload paused. Retry to resume it."
              : reason.message || "Connection interrupted. Retry to resume your upload.",
          ),
        );
      },
    });
    const abort = () => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", abort);
      // tus abort deliberately skips onError. Settle our caller so its busy state clears.
      // Keep the remote upload and fingerprint available for the existing retry flow.
      void upload.abort(false).catch(() => undefined);
      reject(new Error("Upload paused. Retry to resume it."));
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    void upload
      .findPreviousUploads()
      .then((previous) => {
        if (settled || signal.aborted) return;
        if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
        upload.start();
      })
      .catch((reason) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", abort);
        reject(reason);
      });
  });
}
