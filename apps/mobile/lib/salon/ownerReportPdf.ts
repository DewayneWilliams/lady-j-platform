import { displayDate, displayDateTime } from "./dates";
import type { PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { ReportDocument } from "./ownerReports";
import { reportFont } from "./reportFile";

// The self-contained distribution avoids Metro resolving tslib through its Node ESM shim.
const { PDFDocument, rgb } = require("pdf-lib/dist/pdf-lib.js") as typeof import("pdf-lib");

function color(value: string) {
  if (value.startsWith("#"))
    return rgb(
      ...([1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16) / 255) as [
        number,
        number,
        number,
      ]),
    );
  const [h, s, l] = (value.match(/[\d.]+/g) || ["42", "76", "32"]).map(Number);
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    return l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return rgb(channel(0), channel(8), channel(4));
}
function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of String(text).split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      for (const character of word) {
        if (line && font.widthOfTextAtSize(line + character, size) > width) {
          lines.push(line);
          line = "";
        }
        line += character;
      }
    }
    lines.push(line);
  }
  return lines.length ? lines : [""];
}
let fontBytes: Promise<Uint8Array[]> | undefined;
export async function ownerReportPdf(
  doc: ReportDocument,
  palette: { gold: string; accent: string },
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  fontBytes ||= Promise.all([
    reportFont(require("@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf")),
    reportFont(require("@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf")),
  ]).catch((error) => {
    fontBytes = undefined;
    throw error;
  });
  const [regularBytes, boldBytes] = await fontBytes;
  const regular = await pdf.embedFont(regularBytes, { subset: false });
  const bold = await pdf.embedFont(boldBytes, { subset: false });
  pdf.setTitle(`${doc.businessName} | ${doc.title}`);
  pdf.setAuthor(doc.businessName);
  pdf.setSubject(`${doc.range.from} to ${doc.range.to}`);
  const ink = rgb(0.12, 0.12, 0.12),
    muted = rgb(0.34, 0.34, 0.34),
    gold = color(palette.gold),
    accent = color(palette.accent);
  const white = rgb(1, 1, 1),
    band = rgb(0.965, 0.96, 0.95);
  const width = 842,
    height = 595,
    margin = 34,
    content = width - margin * 2;
  let page = pdf.addPage([width, height]),
    y = 0;
  const configuredBrand = wrap(doc.businessName, bold, 20, content);
  const brand =
    configuredBrand.length <= 3
      ? configuredBrand
      : wrap("Lady J Salon & Day Spa", bold, 20, content);
  const notes =
    configuredBrand.length <= 3 ? doc.notes : ["Business: " + doc.businessName, ...doc.notes];
  const bandHeight = 64 + (brand.length - 1) * 23;
  function heading() {
    page.drawRectangle({ x: 0, y: height - bandHeight, width, height: bandHeight, color: gold });
    page.drawText(brand.join("\n"), {
      x: margin,
      y: height - 29,
      font: bold,
      size: 20,
      lineHeight: 23,
      color: white,
    });
    page.drawText(doc.sample ? "SAMPLE DATA · OWNER REPORT" : "CONFIDENTIAL · OWNER REPORT", {
      x: margin,
      y: height - bandHeight + 11,
      size: 8,
      font: regular,
      color: white,
    });
    page.drawText(doc.title, {
      x: margin,
      y: height - bandHeight - 28,
      font: bold,
      size: 19,
      color: ink,
    });
    page.drawText(
      `${displayDate(doc.range.from)} to ${displayDate(doc.range.to)}  |  Generated ${displayDateTime(doc.generatedAt)} (UTC-4)`,
      { x: margin, y: height - bandHeight - 46, font: regular, size: 10, color: muted },
    );
    page.drawRectangle({
      x: margin,
      y: height - bandHeight - 55,
      width: 38,
      height: 3,
      color: accent,
    });
    y = height - bandHeight - 76;
  }
  function newPage() {
    page = pdf.addPage([width, height]);
    heading();
  }
  heading();
  for (let i = 0; i < doc.summary.length; i += 3) {
    const group = doc.summary.slice(i, i + 3);
    const boxWidth = (content - 24) / 3;
    group.forEach((item, index) => {
      const x = margin + index * (boxWidth + 12);
      page.drawRectangle({ x, y: y - 50, width: boxWidth, height: 54, color: band });
      page.drawText(item.label, { x: x + 12, y: y - 11, font: regular, size: 10, color: muted });
      page.drawText(String(item.value), { x: x + 12, y: y - 34, font: bold, size: 17, color: ink });
    });
    y -= 66;
  }
  for (const note of notes) {
    for (const line of wrap(note, regular, 9, content)) {
      if (y < 65) newPage();
      page.drawText(line, { x: margin, y, font: regular, size: 9, color: muted });
      y -= 13;
    }
    y -= 5;
  }
  y -= 10;
  const natural = doc.headers.map((h, i) =>
    Math.max(
      55,
      Math.min(
        145,
        Math.max(
          bold.widthOfTextAtSize(h, 9),
          ...doc.rows
            .slice(0, 100)
            .map((r) => regular.widthOfTextAtSize(String(r[i] ?? "").replace(/\r?\n/g, " "), 9)),
        ) + 16,
      ),
    ),
  );
  const total = natural.reduce((a, b) => a + b, 0);
  const widths = natural.map((v) => (v * content) / total);
  const headerLines = doc.headers.map((h, i) => wrap(h, bold, 9, widths[i] - 14));
  const headerHeight = Math.max(...headerLines.map((l) => l.length)) * 12 + 16;
  function tableHeader() {
    if (y - headerHeight < 75) newPage();
    page.drawRectangle({
      x: margin,
      y: y - headerHeight,
      width: content,
      height: headerHeight,
      color: gold,
    });
    let x = margin;
    headerLines.forEach((lines, i) => {
      lines.forEach((line, n) =>
        page.drawText(line, { x: x + 7, y: y - 15 - n * 12, font: bold, size: 9, color: white }),
      );
      x += widths[i];
    });
    y -= headerHeight;
  }
  tableHeader();
  if (!doc.rows.length) {
    if (y < 70) {
      newPage();
      tableHeader();
    }
    page.drawText("No records for the selected dates.", {
      x: margin + 8,
      y: y - 23,
      font: regular,
      size: 11,
      color: muted,
    });
  }
  doc.rows.forEach((row, rowIndex) => {
    const cells = doc.headers.map((_, i) => wrap(String(row[i] ?? ""), regular, 9, widths[i] - 14));
    const count = Math.max(...cells.map((c) => c.length));
    let offset = 0;
    while (offset < count) {
      let capacity = Math.floor((y - 46 - 14) / 12);
      // Keep ordinary records together; exceptionally tall rows continue safely on the next page.
      if (capacity < Math.min(count - offset, 18)) {
        newPage();
        tableHeader();
        capacity = Math.floor((y - 60) / 12);
      }
      const length = Math.min(count - offset, capacity),
        rowHeight = length * 12 + 14;
      page.drawRectangle({
        x: margin,
        y: y - rowHeight,
        width: content,
        height: rowHeight,
        color: rowIndex % 2 ? white : band,
      });
      let x = margin;
      cells.forEach((lines, i) => {
        lines.slice(offset, offset + length).forEach((line, n) =>
          page.drawText(line, {
            x: x + 7,
            y: y - 15 - n * 12,
            font: regular,
            size: 9,
            color: ink,
          }),
        );
        x += widths[i];
      });
      y -= rowHeight;
      offset += length;
    }
  });
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText("LADY J SALON & DAY SPA · Owner use only · TTD", {
      x: margin,
      y: 22,
      font: regular,
      size: 8,
      color: muted,
    });
    p.drawText(`Page ${i + 1} of ${pages.length}`, {
      x: width - 100,
      y: 22,
      font: regular,
      size: 8,
      color: muted,
    });
  });
  return pdf.save();
}
