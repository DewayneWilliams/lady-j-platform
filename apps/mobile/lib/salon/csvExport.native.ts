import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
export async function exportCsv(filename: string, content: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("File sharing is unavailable on this device.");
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(content);
  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle: "Save revenue report",
  });
}
