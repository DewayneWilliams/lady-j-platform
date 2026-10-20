export async function exportReportPdf(_filename: string, _content: Uint8Array): Promise<void> {
  throw new Error("PDF export is unavailable on this platform.");
}
export async function reportFont(_source: number): Promise<Uint8Array> {
  throw new Error("Report fonts are unavailable on this platform.");
}
