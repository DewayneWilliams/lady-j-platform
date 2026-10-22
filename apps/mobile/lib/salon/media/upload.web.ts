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
        settled = true;
        signal.removeEventListener("abort", abort);
        resolve();
      },
      onError: (reason) => {
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
      if (!settled) void upload.abort(false);
    };
    signal.addEventListener("abort", abort, { once: true });
    void upload
      .findPreviousUploads()
      .then((previous) => {
        if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
        upload.start();
      })
      .catch((reason) => {
        signal.removeEventListener("abort", abort);
        reject(reason);
      });
  });
}
