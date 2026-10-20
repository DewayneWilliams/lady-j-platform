import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { File, Paths } from "expo-file-system";
import type { PreparedMedia, UploadProgress } from "./types";
export async function prepareMedia(
  asset: ImagePicker.ImagePickerAsset,
  progress: UploadProgress,
  signal?: AbortSignal,
): Promise<PreparedMedia> {
  if (signal?.aborted) throw new Error("Upload cancelled.");
  const generated: string[] = [];
  const cleanup = () => {
    for (const uri of generated) {
      try {
        new File(uri).delete();
      } catch {
        /* Temporary files may have already been evicted. */
      }
    }
  };
  try {
    if (asset.type !== "video") {
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
      generated.push(image.uri);
      const thumb = await manipulateAsync(
        image.uri,
        [{ resize: { width: Math.min(360, image.width) } }],
        { compress: 0.7, format: SaveFormat.JPEG },
      );
      generated.push(thumb.uri);
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
    }
    const { Video, createVideoThumbnail, getVideoMetaData } = await import(
      "react-native-compressor"
    );
    const metadata = await getVideoMetaData(asset.uri);
    if (metadata.duration > 180) throw new Error("Choose a video of 3 minutes or less.");
    let cancellationId: string | undefined;
    const abort = () => {
      if (cancellationId) Video.cancelCompression(cancellationId);
    };
    signal?.addEventListener("abort", abort, { once: true });
    let uri: string;
    try {
      uri = await Video.compress(
        asset.uri,
        {
          compressionMethod: "auto",
          maxSize: 1280,
          minimumFileSizeForCompress: 0,
          getCancellationId: (id) => {
            cancellationId = id;
            if (signal?.aborted) abort();
          },
        },
        progress,
      );
    } finally {
      signal?.removeEventListener("abort", abort);
    }
    if (uri !== asset.uri) generated.push(uri);
    if (signal?.aborted) throw new Error("Upload cancelled.");
    const poster = await createVideoThumbnail(uri);
    generated.push(poster.path);
    const thumb = await manipulateAsync(poster.path, [{ resize: { width: 360 } }], {
      compress: 0.7,
      format: SaveFormat.JPEG,
    });
    generated.push(thumb.uri);
    if (new File(uri).size > 50 * 1024 * 1024)
      throw new Error("This video is still over 50 MB. Choose a shorter clip.");
    return {
      uri,
      thumbnail: thumb.uri,
      mime: "video/mp4",
      width: asset.width,
      height: asset.height,
      duration: metadata.duration,
      cleanup,
    };
  } catch (e) {
    cleanup();
    throw new Error(
      e instanceof Error &&
      /native module|Nitro|Compressor|TurboModule|NativeEventEmitter/i.test(e.message)
        ? "Video compression requires a native build with the media module. Use Publishing to build it, or upload this video in the web preview."
        : e instanceof Error
          ? e.message
          : "Unable to prepare this media.",
    );
  }
}

export function releasePickedMedia(asset: ImagePicker.ImagePickerAsset) {
  if (asset.uri.startsWith(Paths.cache.uri)) {
    try {
      new File(asset.uri).delete();
    } catch {
      /* Picker caches can already be evicted. */
    }
  }
}
