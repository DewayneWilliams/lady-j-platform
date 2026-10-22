import { GOOGLE_BUSINESS } from "../_shared/googleBusiness.ts";
// Public, read-only Google Places proxy. Provider credentials never enter the app.
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const object = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const string = (v: unknown) => (typeof v === "string" ? v : "");
function googleLink(value: unknown) {
  try {
    const u = new URL(string(value));
    return u.protocol === "https:" &&
      (u.hostname === "google.com" ||
        u.hostname.endsWith(".google.com") ||
        u.hostname === "g.page" ||
        u.hostname === "maps.app.goo.gl")
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export async function handleReviews(
  req: Request,
  env: (name: string) => string | undefined,
  request: typeof fetch = fetch,
) {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (!["POST", "GET"].includes(req.method))
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  const key = env("GOOGLE_PLACES_API_KEY");
  const placeId = env("GOOGLE_PLACE_ID")?.trim();
  const profile = GOOGLE_BUSINESS.profileUrl;
  const empty = (status = "unavailable") =>
    new Response(JSON.stringify({ status, reviews: [], googleMapsUri: profile }), { headers });
  if (!key || !placeId) return empty();
  // Validate the app's project API key at Supabase's gateway before any billable provider call.
  const appKey = req.headers.get("apikey");
  const supabaseUrl = env("SUPABASE_URL");
  if (!appKey || !supabaseUrl)
    return new Response(JSON.stringify({ error: "Application key required" }), {
      status: 401,
      headers,
    });
  try {
    const authorized = await request(
      supabaseUrl + "/rest/v1/lj_public_home_specials?select=id&limit=0",
      { headers: { apikey: appKey }, signal: AbortSignal.timeout(5000) },
    );
    if (!authorized.ok)
      return new Response(JSON.stringify({ error: "Invalid application key" }), {
        status: 401,
        headers,
      });
  } catch {
    return empty();
  }

  try {
    const response = await request(
      "https://places.googleapis.com/v1/places/" + encodeURIComponent(placeId),
      {
        headers: {
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask":
            "id,displayName,formattedAddress,location,rating,userRatingCount,googleMapsUri,reviews,attributions",
        },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) return empty();
    const data = object(await response.json());
    if (data.id !== placeId) return empty();
    const address = string(data.formattedAddress);
    if (!/trinidad/i.test(address) || !/(petit valley|morne coco|west hills)/i.test(address))
      return empty("location_mismatch");
    const rating = Number(data.rating);
    const userRatingCount = Number(data.userRatingCount);
    const location = object(data.location);
    const reviews = (Array.isArray(data.reviews) ? data.reviews : []).flatMap((raw: unknown) => {
      const item = object(raw),
        author = object(item.authorAttribution),
        text = string(object(item.originalText).text) || string(object(item.text).text),
        rating = Number(item.rating),
        name = string(author.displayName),
        date = string(item.publishTime),
        url = googleLink(item.googleMapsUri);
      if (
        !name ||
        !Number.isFinite(rating) ||
        rating < 1 ||
        rating > 5 ||
        !date ||
        Number.isNaN(Date.parse(date)) ||
        !url
      )
        return [];
      return [
        {
          id: string(item.name),
          author: name,
          authorUrl: googleLink(author.uri),
          photoUrl: string(author.photoUri).startsWith("https://") ? string(author.photoUri) : null,
          rating,
          date,
          text,
          url,
          reportUrl: googleLink(item.flagContentUri),
        },
      ];
    });
    return new Response(
      JSON.stringify({
        status: "ready",
        rating: Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : null,
        userRatingCount:
          Number.isInteger(userRatingCount) && userRatingCount >= 0 ? userRatingCount : null,
        address,
        location:
          Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude))
            ? { latitude: Number(location.latitude), longitude: Number(location.longitude) }
            : null,
        reviews,
        googleMapsUri: googleLink(data.googleMapsUri) || profile,
        attributions: Array.isArray(data.attributions) ? data.attributions : [],
      }),
      { headers },
    );
  } catch {
    return empty();
  }
}
Deno.serve((req) => handleReviews(req, (name) => Deno.env.get(name)));
