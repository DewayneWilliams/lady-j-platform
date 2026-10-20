import * as FileSystem from "expo-file-system/legacy";
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
  const task = FileSystem.createUploadTask(
    url,
    uri,
    {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        ...headers,
        "Content-Type": mime,
        "x-upsert": "true",
        "cache-control": "private, max-age=0",
      },
    },
    (e) => {
      if (e.totalBytesExpectedToSend) progress(e.totalBytesSent / e.totalBytesExpectedToSend);
    },
  );
  const abort = () => {
    void task.cancelAsync();
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    const r = await task.uploadAsync();
    if (!r || r.status < 200 || r.status >= 300)
      throw new Error(signal.aborted ? "Upload cancelled." : "Upload failed. Please retry.");
  } finally {
    signal.removeEventListener("abort", abort);
  }
}
