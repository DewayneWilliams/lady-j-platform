import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
const sha256 = async (value: string | Uint8Array) => {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply({ error: "Use POST." }, 405);
  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer /i, "");
  if (!token || token === authorization) return reply({ error: "Please sign in." }, 401);
  const url = Deno.env.get("SUPABASE_URL")!;
  const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: identity, error: authError } = await user.auth.getUser(token);
  if (authError || !identity?.user)
    return reply({ error: "Your sign-in has expired. Please sign in again." }, 401);
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  let agreementId: string | null = null;
  let path: string | null = null;
  try {
    const raw = await req.text();
    if (raw.length > 200000)
      return reply({ error: "Signature is too large. Clear it and sign again." }, 400);
    const body = JSON.parse(raw);
    const evidence = {
      acceptedAt: new Date().toISOString(),
      source: "booking-step-3",
      ip: (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null,
      userAgent: (req.headers.get("user-agent") || "").slice(0, 500) || null,
    };
    const saved = await user.rpc("lj_sign_service_agreement_v2", {
      p_name: body.name,
      p_services: body.services,
      p_signature: body.signature || [],
      p_typed_signature: body.typedSignature || "",
      p_signature_method: body.signatureMethod,
      p_version: body.version,
      p_agreed: body.agreed,
      p_evidence: evidence,
    });
    if (saved.error) return reply({ error: saved.error.message }, 400);
    agreementId = saved.data;
    const record = await user
      .from("lj_service_agreements")
      .select("*")
      .eq("id", agreementId)
      .single();
    if (record.error || !record.data) throw new Error("Unable to read the signed agreement.");
    const agreement = record.data;
    const agreementDigest = await sha256(
      JSON.stringify({
        id: agreement.id,
        customerId: agreement.customer_id,
        signerName: agreement.signer_name,
        signedAt: agreement.signed_at,
        policyVersion: agreement.policy_version,
        agreementText: agreement.agreement_text,
        services: agreement.services,
        signatureMethod: agreement.signature_method,
        signature: agreement.signature,
        typedSignature: agreement.typed_signature,
        evidence: agreement.consent_evidence,
      }),
    );
    const catalog = await user.from("lj_services").select("id,name").in("id", agreement.services);
    if (catalog.error) throw new Error("Unable to read the selected services.");
    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
    pdf.setTitle("Lady J - Signed Client Service Agreement");
    pdf.setAuthor("Lady J Salon & Day Spa");
    pdf.setCreationDate(new Date(agreement.signed_at));
    const clean = (text: string) =>
      text
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/[–—]/g, "-")
        .replace(/[^\x20-\x7e\n]/g, "?");
    let page = pdf.addPage([595, 842]);
    let y = 788;
    const next = () => {
      page = pdf.addPage([595, 842]);
      y = 788;
    };
    for (const paragraph of clean(agreement.agreement_text).split("\n")) {
      const content = paragraph.replace(/^#+\s*/, "");
      if (!content.trim()) {
        y -= 9;
        continue;
      }
      const heading = paragraph.startsWith("#") || /^[A-Z &]+$/.test(content);
      const font = heading ? bold : regular;
      const size = paragraph.startsWith("# ") ? 17 : heading ? 12 : 10.5;
      const words = content.split(/\s+/);
      const wrapped: string[] = [];
      let line = "";
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) > 499 && line) {
          wrapped.push(line);
          line = word;
        } else line = candidate;
      }
      if (line) wrapped.push(line);
      for (const text of wrapped) {
        if (y < 68) next();
        page.drawText(text, { x: 48, y, font, size, color: rgb(0.08, 0.16, 0.14) });
        y -= heading ? 19 : 15;
      }
    }
    if (y < 275) next();
    y -= 20;
    page.drawText("[X] I Agree to the Service, Booking & Photography Policies.", {
      x: 48,
      y,
      size: 11,
      font: bold,
    });
    y -= 25;
    page.drawText("Client Name: " + clean(agreement.signer_name), {
      x: 48,
      y,
      size: 11,
      font: bold,
    });
    y -= 20;
    const signedDate = new Date(agreement.signed_at).toLocaleString("en-TT", {
      timeZone: "America/Port_of_Spain",
      dateStyle: "long",
      timeStyle: "short",
    });
    page.drawText("Signed: " + clean(signedDate) + " (Trinidad & Tobago, GMT-4)", {
      x: 48,
      y,
      size: 10,
      font: regular,
    });
    y -= 20;
    const selected = clean((catalog.data || []).map((v: { name: string }) => v.name).join(", "));
    const serviceWords = selected.split(/\s+/);
    let serviceLine = "Services: ";
    for (const word of serviceWords) {
      if (regular.widthOfTextAtSize(serviceLine + word, 10) > 499) {
        page.drawText(serviceLine, { x: 48, y, size: 10, font: regular });
        y -= 15;
        serviceLine = "";
      }
      serviceLine += word + " ";
    }
    page.drawText(serviceLine, { x: 48, y, size: 10, font: regular });
    y -= 25;
    if (y < 180) next();
    page.drawText("Signature:", { x: 48, y, size: 11, font: bold });
    if (agreement.signature_method === "typed") {
      page.drawText(clean(agreement.typed_signature || agreement.signer_name), {
        x: 48,
        y: y - 25,
        size: 18,
        font: italic,
      });
    } else {
      for (const stroke of agreement.signature as { x: number; y: number }[][]) {
        const d = stroke.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
        page.drawSvgPath(d, {
          x: 48,
          y: y - 12,
          scale: 0.75,
          borderWidth: 1.6,
          borderColor: rgb(0.08, 0.12, 0.1),
        });
      }
    }
    for (const [i, p] of pdf.getPages().entries()) {
      p.drawText(
        `Agreement ${agreement.id} | ${agreement.policy_version} | Page ${i + 1} of ${pdf.getPageCount()}`,
        { x: 48, y: 30, size: 7, font: regular },
      );
      p.drawText(`Audit SHA-256 ${agreementDigest}`, { x: 48, y: 19, size: 6, font: regular });
    }
    const bytes = await pdf.save();
    const pdfSha256 = await sha256(bytes);
    path = `${identity.user.id}/${agreement.id}.pdf`;
    const upload = await admin.storage
      .from("lj-service-agreements")
      .upload(path, bytes, { contentType: "application/pdf", upsert: false });
    if (upload.error) throw new Error("Unable to store your PDF. Please try again.");
    const ready = await admin
      .from("lj_service_agreements")
      .update({
        object_path: path,
        pdf_ready: true,
        agreement_digest: agreementDigest,
        pdf_sha256: pdfSha256,
      })
      .eq("id", agreement.id)
      .eq("customer_id", identity.user.id)
      .select("id,signed_at,signer_name,object_path,policy_version,signature_method")
      .single();
    if (ready.error) throw new Error("Unable to finish saving your agreement.");
    return reply({ agreement: ready.data });
  } catch (e) {
    if (path) await admin.storage.from("lj-service-agreements").remove([path]);
    if (agreementId)
      await admin
        .from("lj_service_agreements")
        .delete()
        .eq("id", agreementId)
        .eq("pdf_ready", false);
    return reply({ error: e instanceof Error ? e.message : "Unable to save the agreement." }, 500);
  }
});
