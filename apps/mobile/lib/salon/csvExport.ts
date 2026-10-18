// Metro selects .web or .native; this fallback defines the shared TypeScript contract.
export async function exportCsv(_filename: string, _content: string): Promise<void> {
  throw new Error("CSV export is unavailable on this platform.");
}
