#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const RUN_ID = "automated-photo-import-20261023-complete";
const DRY_RUN = process.argv.includes("--dry-run");
const WORK_DIR = path.resolve(DRY_RUN ? ".cache/catalog-photo-import-dry-run" : ".cache/catalog-photo-import");
const CHECKPOINT_PATH = path.join(WORK_DIR, "checkpoint.json");
const REPORT_PATH = path.join(WORK_DIR, "report.json");
const WIDTHS = [1200, 1800, 2400];
const CONCURRENCY = 6;
const USER_AGENT = "LadyJCatalogImporter/1.0 (commercial photo curation; salon catalog)";
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Set EXPO_PUBLIC_SUPABASE_URL and a Supabase publishable or service-role key.");
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

// Ordered to match the live catalog's category + catalog_sort_order sequence. Every ID was
// reviewed on its Pexels source page under the commercial-use Pexels License.
const pexelsByCategory = {
  Barbering: [12464842, 9403202],
  "Body Treatments": [7020264, 9475391, 6186768, 14438364, 30697233],
  Brows: [17282792, 6135621, 5177993, 33580445, 6135623, 6135629, 4285538, 18809795, 7446924],
  Facials: [3985323, 3985333, 3985330, 3985358, 3985360, 3985321, 3985332, 3985338, 3985329, 3985354],
  "Foot Health": [31091766],
  Hair: [14615063, 7984818, 36587244, 7951589, 8342801, 7506931, 35280076, 3993451, 6502174, 3993290, 3993323, 3993312, 3993320, 6923414, 8468038, 8468125, 8467964, 3993304, 33867544, 30081801],
  Lashes: [33723106, 16554435, 38194466, 38194463, 38194464],
  Massage: [5888079, 5888093, 5888078, 5888077, 5888101, 5888100, 5888087, 5888095, 5888073, 5888074, 5888067],
  Nails: [18112334, 18112337, 13424007, 18112333, 14267567, 16041439, 4783332, 7755214, 7755212, 7607803, 7990099, 14267564, 7446905, 37033372, 3736287, 31091767, 18112335],
  "Skin Treatments": [16131207, 4586723, 7581076, 37229295, 34930154, 14996838, 19242404, 19242407],
  Waxing: [16100079, 6763556, 6763116, 6763617, 6763570, 6763621, 6763629, 6763559, 6763618, 6763613, 6763560, 6763611, 5938278, 9486647, 7281286, 6763615, 7281284],
};

const photographerById = new Map([
  ...[3993451, 3993290, 3993323, 3993312, 3993320, 3993304, 3985323, 3985333, 3985330, 3985358, 3985360, 3985321, 3985332, 3985354, 5888079, 5888093, 5888078, 5888077, 5888101, 5888100, 5888087, 5888095, 5888073, 5888074, 5888067, 7446905, 7446924].map((id) => [String(id), "Gustavo Fring"]),
  ...[35103878, 35103879, 35103880, 35103881, 35103882, 35103883, 35103884, 35103885].map((id) => [String(id), "Larysa Stratiichuk"]),
  ...[6763621, 6763618, 6763116, 6763570, 6763559, 6186768, 7607803].map((id) => [String(id), "Tima Miroshnichenko"]),
  ["27394840", "David Eluwole"], ["18112334", "Maxi Leiva"], ["17282792", "Diana Perez"],
  ["33723106", "Layla Luany"], ["14615063", "Daniil Kondrashin"], ["7951589", "Felicity Tai"],
  ["7506931", "SHVETS production"], ["6923414", "RDNE Stock project"], ["8342801", "Mikhail Nilov"],
]);

function slugify(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

async function retry(label, operation, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await operation(); } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
    }
  }
  throw new Error(`${label}: ${lastError?.message || lastError}`);
}

async function fetchBuffer(url) {
  return retry(`download ${url}`, async () => {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(90_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const length = Number(response.headers.get("content-length") || 0);
    if (length > 40 * 1024 * 1024) throw new Error("source exceeds 40 MB safety limit");
    return Buffer.from(await response.arrayBuffer());
  }, 3);
}

async function runCommand(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}: ${stderr.slice(-500)}`)));
  });
}

async function captureCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(`${command} exited ${code}: ${stderr.slice(-500)}`)));
  });
}

async function optimize(input, output, width, aspect = "4:3") {
  const height = aspect === "16:9" ? Math.round(width * 9 / 16) : Math.round(width * 3 / 4);
  await runCommand("magick", [input, "-auto-orient", "-strip", "-resize", `${width}x${height}^`, "-gravity", "center", "-extent", `${width}x${height}`, "-quality", "86", output]);
}

async function uploadFile(storagePath, filePath, contentType) {
  const body = await readFile(filePath);
  const { error } = await supabase.storage.from("lj-catalog-media").upload(storagePath, body, { contentType, upsert: false, cacheControl: "31536000" });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
}

async function prepareMasterWebp(sourcePath, localDir) {
  const output = path.join(localDir, "original.webp");
  for (const quality of [90, 86, 82, 78, 74]) {
    await runCommand("magick", [sourcePath, "-auto-orient", "-strip", "-quality", String(quality), output]);
    const bytes = (await readFile(output)).byteLength;
    if (bytes <= 5_000_000) return output;
  }
  // Preserve a high-resolution master within the catalog bucket's 5 MB safety limit.
  for (const maxDimension of [4800, 4000, 3200]) {
    await runCommand("magick", [sourcePath, "-auto-orient", "-strip", "-resize", `${maxDimension}x${maxDimension}>`, "-quality", "84", output]);
    const bytes = (await readFile(output)).byteLength;
    if (bytes <= 5_000_000) return output;
  }
  throw new Error("full-resolution WebP master exceeds the 5 MB bucket limit");
}

async function persistStage(row) {
  const { error } = await supabase.from("lj_catalog_photo_import_stage").insert(row);
  if (error && !/duplicate|unique/i.test(error.message)) throw error;
}

async function loadCheckpoint() {
  if (!(await exists(CHECKPOINT_PATH))) return { completed: {}, usedSourceIds: [], usedHashes: [] };
  return JSON.parse(await readFile(CHECKPOINT_PATH, "utf8"));
}

let checkpointWrite = Promise.resolve();
async function saveCheckpoint(checkpoint) {
  checkpointWrite = checkpointWrite.then(() => writeFile(CHECKPOINT_PATH, JSON.stringify(checkpoint, null, 2)));
  await checkpointWrite;
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next++;
      try { results[index] = await worker(items[index], index); }
      catch (error) { results[index] = { status: "failed", error: error?.message || String(error), item: items[index] }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function importCandidate(item, candidate, checkpoint) {
  const itemSlug = item.item_kind === "hero" ? "homepage-hero" : slugify(item.name);
  const base = `${RUN_ID}/${itemSlug}/${candidate.source_name === "Pexels" ? "pexels" : "commons"}-${candidate.source_id}`;
  const localDir = path.join(WORK_DIR, itemSlug);
  await mkdir(localDir, { recursive: true });
  const sourceExt = candidate.mime_type === "image/png" ? "png" : candidate.mime_type === "image/webp" ? "webp" : "jpg";
  const sourcePath = path.join(localDir, `source.${sourceExt}`);
  const master = await fetchBuffer(candidate.download_url);
  const masterHash = sha256(master);
  if (checkpoint.usedHashes.includes(masterHash)) throw new Error("duplicate source hash");
  await writeFile(sourcePath, master);
  const [actualWidth, actualHeight] = (await captureCommand("magick", ["identify", "-format", "%w %h", sourcePath])).split(" ").map(Number);
  if (actualWidth < 1200 || actualHeight < 1200) throw new Error(`source resolution ${actualWidth}x${actualHeight} is below 1200px`);
  candidate.original_width = actualWidth;
  candidate.original_height = actualHeight;
  const masterWebp = await prepareMasterWebp(sourcePath, localDir);
  const optimized = [];
  for (const width of WIDTHS) {
    const localPath = path.join(localDir, `${width}.webp`);
    await optimize(sourcePath, localPath, width, item.item_kind === "hero" ? "16:9" : "4:3");
    optimized.push({ width, localPath, storagePath: `${base}-${width}.webp` });
  }
  if (!DRY_RUN) {
    await uploadFile(`${base}-original.webp`, masterWebp, "image/webp");
    for (const variant of optimized) await uploadFile(variant.storagePath, variant.localPath, "image/webp");
    await persistStage({
      run_id: RUN_ID,
      item_key: `${RUN_ID}:${item.item_kind === "service" ? item.id : "homepage-hero"}`,
      item_kind: item.item_kind,
      service_id: item.item_kind === "service" ? item.id : null,
      slot: item.item_kind === "hero" ? "homepage-hero" : null,
      source_name: candidate.source_name,
      source_id: candidate.source_id,
      source_url: candidate.source_url,
      photographer: candidate.photographer,
      license_name: candidate.license_name,
      license_url: candidate.license_url,
      attribution_required: candidate.attribution_required,
      original_width: candidate.original_width,
      original_height: candidate.original_height,
      storage_base_path: base,
      responsive_widths: WIDTHS,
      master_sha256: masterHash,
      usage_restrictions: candidate.usage_restrictions || "",
      source_metadata: { title: candidate.title, mime_type: candidate.mime_type, downloaded_from: candidate.download_url },
    });
  }
  return { status: DRY_RUN ? "approved-dry-run" : "uploaded", item, candidate: { ...candidate, searchable: undefined, download_url: undefined }, storage_base_path: base, master_sha256: masterHash };
}

async function selectAndImport(item, checkpoint) {
  const key = item.item_kind === "hero" ? "hero" : item.id;
  const expectedSourceId = String(item.item_kind === "hero" ? 33515386 : item.pexels_id);
  const prior = checkpoint.completed[key];
  if (prior?.candidate?.source_id === expectedSourceId) return prior;
  if (prior) {
    checkpoint.usedSourceIds = checkpoint.usedSourceIds.filter((value) => value !== `${prior.candidate.source_name}:${prior.candidate.source_id}`);
    checkpoint.usedHashes = checkpoint.usedHashes.filter((value) => value !== prior.master_sha256);
    delete checkpoint.completed[key];
  }
  let candidates;
  if (item.item_kind === "hero") {
    candidates = [{
      source_name: "Pexels", source_id: "33515386", source_url: "https://www.pexels.com/photo/elegant-portrait-of-smiling-woman-in-natural-light-33515386/",
      download_url: "https://images.pexels.com/photos/33515386/pexels-photo-33515386.jpeg", photographer: "Achi Murusidze",
      license_name: "Pexels License", license_url: "https://www.pexels.com/license/", attribution_required: false,
      original_width: 4000, original_height: 2535, usage_restrictions: "Do not imply endorsement or portray the identifiable person offensively.",
      mime_type: "image/jpeg", title: "Elegant portrait of a smiling woman with healthy curly hair in natural light", searchable: "smiling woman curly healthy hair natural makeup elegant warm portrait",
    }];
  } else {
    const id = item.pexels_id;
    if (!id) throw new Error(`no curated Pexels source assigned for ${item.name}`);
    candidates = [{
      source_name: "Pexels", source_id: String(id), source_url: `https://www.pexels.com/photo/${id}/`,
      download_url: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`,
      photographer: photographerById.get(String(id)) || "Pexels contributor",
      license_name: "Pexels License", license_url: "https://www.pexels.com/license/", attribution_required: false,
      original_width: 1200, original_height: 1200,
      usage_restrictions: "Do not imply endorsement, sell an unaltered copy, or portray identifiable people offensively.",
      mime_type: "image/jpeg", title: `${item.name} — curated service photograph`, searchable: `${item.name} ${item.category}`,
    }];
  }
  const usable = candidates.filter((candidate) => !checkpoint.usedSourceIds.includes(`${candidate.source_name}:${candidate.source_id}`));
  if (!usable.length) throw new Error("no unique commercially licensed candidate found");
  let lastError;
  for (const candidate of usable.slice(0, 8)) {
    try {
      const result = await importCandidate(item, candidate, checkpoint);
      checkpoint.usedSourceIds.push(`${candidate.source_name}:${candidate.source_id}`);
      checkpoint.usedHashes.push(result.master_sha256);
      checkpoint.completed[key] = result;
      await saveCheckpoint(checkpoint);
      process.stdout.write(`OK ${item.item_kind === "hero" ? "Homepage hero" : item.name} <- ${candidate.title}\n`);
      return result;
    } catch (error) {
      lastError = error;
      process.stderr.write(`RETRY ${item.name || "Homepage hero"}: ${error.message}\n`);
    }
  }
  throw lastError || new Error("all candidates failed");
}

async function main() {
  await mkdir(WORK_DIR, { recursive: true });
  const { data, error } = await supabase.from("lj_public_services").select("id,name,category,description,image,photos,is_add_on,bookable,active,catalog_visible,is_special,catalog_sort_order")
    .eq("active", true).eq("catalog_visible", true).eq("is_special", false).eq("is_add_on", false).eq("bookable", true)
    .order("category").order("catalog_sort_order");
  if (error) throw error;
  if (data.length !== 105) throw new Error(`Expected 105 active standalone services, found ${data.length}; refusing an ambiguous import.`);
  const checkpoint = await loadCheckpoint();
  checkpoint.usedSourceIds ||= [];
  checkpoint.usedHashes ||= [];
  checkpoint.completed ||= {};
  const classic = data.find((service) => service.name === "Classic Manicure" && service.image?.startsWith("catalogset:"));
  const categoryOffsets = new Map();
  const assigned = data.map((service) => {
    const offset = categoryOffsets.get(service.category) || 0;
    categoryOffsets.set(service.category, offset + 1);
    return { ...service, item_kind: "service", pexels_id: pexelsByCategory[service.category]?.[offset] };
  });
  const assignedIds = assigned.map((service) => service.pexels_id).filter(Boolean);
  if (assignedIds.length !== 105 || new Set(assignedIds).size !== 105) {
    throw new Error(`Curated source assignment must contain 105 unique IDs; found ${assignedIds.length} assignments and ${new Set(assignedIds).size} unique IDs.`);
  }
  for (const service of assigned) {
    const prior = checkpoint.completed[service.id];
    if (prior && prior.candidate?.source_id !== String(service.pexels_id)) {
      checkpoint.usedSourceIds = checkpoint.usedSourceIds.filter((value) => value !== `${prior.candidate.source_name}:${prior.candidate.source_id}`);
      checkpoint.usedHashes = checkpoint.usedHashes.filter((value) => value !== prior.master_sha256);
      delete checkpoint.completed[service.id];
    }
  }
  const pendingServices = assigned.filter((service) => service.id !== classic?.id);
  const items = [...pendingServices, { item_kind: "hero", name: "Homepage hero" }];
  const results = await mapLimit(items, CONCURRENCY, (item) => selectAndImport(item, checkpoint));
  const report = {
    run_id: RUN_ID,
    dry_run: DRY_RUN,
    active_services_processed: data.length,
    already_compliant_services: classic ? [classic.name] : [],
    uploaded: results.filter((result) => result?.status === "uploaded").length,
    approved_dry_run: results.filter((result) => result?.status === "approved-dry-run").length,
    failed: results.filter((result) => result?.status === "failed").map((result) => ({ name: result.item?.name, error: result.error })),
    results,
  };
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ report: REPORT_PATH, ...report, results: undefined }, null, 2));
  if (report.failed.length) process.exitCode = 2;
}

await main();
