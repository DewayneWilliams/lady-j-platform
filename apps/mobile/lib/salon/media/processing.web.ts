import type { ImagePickerAsset } from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import type { PreparedMedia, UploadProgress } from "./types";
const blobFromCanvas = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not create a video thumbnail."))),
      "image/jpeg",
      0.75,
    ),
  );
export async function prepareMedia(
  asset: ImagePickerAsset,
  progress: UploadProgress,
  signal?: AbortSignal,
): Promise<PreparedMedia> {
  if (signal?.aborted) throw new Error("Upload cancelled.");
  const urls: string[] = [];
  const cleanup = () => urls.forEach((u) => URL.revokeObjectURL(u));
  if (asset.type !== "video") {
    try {
      const image = await manipulateAsync(
        asset.uri,
        [
          {
            resize:
              asset.width >= asset.height
                ? { width: Math.min(2048, asset.width || 2048) }
                : { height: Math.min(2048, asset.height || 2048) },
          },
        ],
        { compress: 0.82, format: SaveFormat.JPEG },
      );
      urls.push(image.uri);
      const thumb = await manipulateAsync(
        image.uri,
        [{ resize: { width: Math.min(360, image.width) } }],
        { compress: 0.7, format: SaveFormat.JPEG },
      );
      urls.push(thumb.uri);
      progress(1);
      return {
        uri: image.uri,
        thumbnail: thumb.uri,
        mime: "image/jpeg",
        width: image.width,
        height: image.height,
        duration: null,
        cleanup,
      };
    } catch (error) {
      cleanup();
      throw error;
    }
  }
  const video = globalThis.document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  let stream: MediaStream | undefined;
  let audio: AudioContext | undefined;
  let frame: number | undefined;
  let recorder: MediaRecorder | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Video could not be read. Try an MP4 video.")),
        20000,
      );
      const abort = () => {
        clearTimeout(timer);
        reject(new Error("Upload cancelled."));
      };
      signal?.addEventListener("abort", abort, { once: true });
      video.onloadeddata = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        reject(new Error("Video format is not supported by this browser."));
      };
      video.src = asset.uri;
      video.load();
    });
    if (signal?.aborted) throw new Error("Upload cancelled.");
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration > 180)
      throw new Error("Choose a video of 3 minutes or less.");
    const canvas = globalThis.document.createElement("canvas");
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(2, Math.round((video.videoWidth * scale) / 2) * 2);
    canvas.height = Math.max(2, Math.round((video.videoHeight * scale) / 2) * 2);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Video processing is unavailable.");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const thumbCanvas = globalThis.document.createElement("canvas");
    thumbCanvas.width = 360;
    thumbCanvas.height = Math.max(1, Math.round((360 * canvas.height) / canvas.width));
    thumbCanvas.getContext("2d")?.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
    const thumbnail = URL.createObjectURL(await blobFromCanvas(thumbCanvas));
    urls.push(thumbnail);
    let uri = asset.uri;
    let mime = asset.mimeType || asset.file?.type || "video/mp4";
    let warning: string | undefined;
    const outputType =
      typeof MediaRecorder === "undefined"
        ? ""
        : [
            "video/mp4",
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm",
          ].find((t) => MediaRecorder.isTypeSupported(t));
    if (outputType && canvas.captureStream && typeof AudioContext !== "undefined") {
      stream = canvas.captureStream(24);
      audio = new AudioContext();
      await audio.resume();
      const destination = audio.createMediaStreamDestination();
      audio.createMediaElementSource(video).connect(destination);
      destination.stream.getAudioTracks().forEach((t) => stream?.addTrack(t));
      const chunks: BlobPart[] = [];
      recorder = new MediaRecorder(stream, {
        mimeType: outputType,
        videoBitsPerSecond: 2000000,
        audioBitsPerSecond: 96000,
      });
      const recording = new Promise<Blob>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timeout);
          if (recorder?.state !== "inactive") recorder?.stop();
          reject(new Error("Upload cancelled."));
        };
        signal?.addEventListener("abort", abort, { once: true });
        const timeout = setTimeout(() => {
          video.pause();
          if (recorder?.state !== "inactive") recorder?.stop();
          reject(new Error("Video processing timed out. Please retry with a shorter clip."));
        }, 240000);
        recorder!.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        recorder!.onerror = () => {
          clearTimeout(timeout);
          signal?.removeEventListener("abort", abort);
          reject(new Error("Could not compress this video."));
        };
        recorder!.onstop = () => {
          clearTimeout(timeout);
          signal?.removeEventListener("abort", abort);
          resolve(new Blob(chunks, { type: outputType.split(";")[0] }));
        };
        video.onended = () => {
          if (recorder?.state !== "inactive") recorder?.stop();
        };
        video.onerror = () => {
          clearTimeout(timeout);
          signal?.removeEventListener("abort", abort);
          reject(new Error("Could not play this video for compression."));
        };
      });
      const draw = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        progress(Math.min(0.99, video.currentTime / duration));
        if (!video.ended) frame = globalThis.requestAnimationFrame(draw);
      };
      recorder.start(1000);
      try {
        await video.play();
        draw();
      } catch (e) {
        if (recorder.state !== "inactive") recorder.stop();
        await recording;
        throw e;
      }
      const compressed = await recording;
      if (!compressed.size) throw new Error("Video compression produced an empty file.");
      if (!asset.file || compressed.size < asset.file.size) {
        uri = URL.createObjectURL(compressed);
        urls.push(uri);
        mime = compressed.type;
      }
    } else
      warning =
        "This browser cannot compress video. The original will be uploaded (50 MB maximum).";
    const size =
      uri === asset.uri
        ? asset.file?.size || asset.fileSize || 0
        : await fetch(uri)
            .then((r) => r.blob())
            .then((b) => b.size);
    if (size > 50 * 1024 * 1024)
      throw new Error(
        "Video exceeds 50 MB. Choose a shorter clip or use a browser that supports compression.",
      );
    if (!["video/mp4", "video/quicktime", "video/webm"].includes(mime))
      throw new Error("Choose an MP4, MOV or WebM video.");
    progress(1);
    return {
      uri,
      thumbnail,
      mime,
      width: canvas.width,
      height: canvas.height,
      duration,
      warning,
      cleanup,
    };
  } catch (e) {
    cleanup();
    throw e;
  } finally {
    if (frame) globalThis.cancelAnimationFrame(frame);
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stream?.getTracks().forEach((t) => t.stop());
    if (audio) void audio.close();
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}

export function releasePickedMedia(asset: ImagePickerAsset) {
  if (asset.uri.startsWith("blob:")) URL.revokeObjectURL(asset.uri);
}
