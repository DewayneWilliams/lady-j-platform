import { Asset } from "expo-asset";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
export async function reportFont(source: number): Promise<Uint8Array> {
  const asset = await Asset.fromModule(source).downloadAsync();
  if (!asset.localUri) throw new Error("Unable to load report fonts.");
  return new File(asset.localUri).bytes();
}
export async function exportReportPdf(filename: string, content: Uint8Array): Promise<void> {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("File sharing is unavailable on this device.");
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(content);
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "Save salon report",
  });
}
