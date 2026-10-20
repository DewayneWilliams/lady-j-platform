import { Asset } from "expo-asset";
export async function reportFont(source: number): Promise<Uint8Array> {
  const asset = Asset.fromModule(source);
  // This is a bundled font asset, not an external API.
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error("Unable to load report fonts.");
  return new Uint8Array(await response.arrayBuffer());
}
export async function exportReportPdf(filename: string, content: Uint8Array): Promise<void> {
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(content).buffer], { type: "application/pdf" }),
  );
  const anchor = globalThis.document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  globalThis.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
