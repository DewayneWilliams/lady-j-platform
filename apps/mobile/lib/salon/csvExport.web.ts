export async function exportCsv(filename: string, content: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = globalThis.document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  globalThis.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
