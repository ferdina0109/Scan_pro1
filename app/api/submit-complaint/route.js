export const runtime = "nodejs";

import { getSupabase } from "../_lib/supabase";
import { sendWhatsApp } from "../_lib/twilio";

function json(data, init) {
  return Response.json(data, init);
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeForTokens(value) {
  return String(value || "")
    .replace(/([a-zA-Z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([a-zA-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set(["building", "block", "floor", "lot", "area", "main", "near", "and", "the"]);

function tokensForMatch(value) {
  const normalized = normalizeForTokens(value).toLowerCase();
  const parts = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  const tokens = [];

  for (let p of parts) {
    if (STOPWORDS.has(p)) continue;
    if (p === "restrooms") p = "restroom";
    if (p === "washroom") p = "restroom";
    tokens.push(p);
  }

  return tokens;
}

function bestTokenMatch(inputTokens, candidates) {
  const inputSet = new Set(inputTokens);
  if (!inputSet.size) return null;

  const inputLetter = inputTokens.find((t) => t.length === 1 && t >= "a" && t <= "z") || null;
  const inputFloor = inputTokens.find((t) => /^\d+$/.test(t)) || null;

  let best = null;
  for (const c of candidates) {
    const candTokens = tokensForMatch(c?.name || "");
    const candSet = new Set(candTokens);

    if (inputFloor && !candSet.has(inputFloor)) continue;
    if (inputLetter && !candSet.has(inputLetter)) continue;

    let score = 0;
    for (const t of candSet) {
      if (inputSet.has(t)) score++;
    }

    if (!best || score > best.score) best = { candidate: c, score };
  }

  if (!best || best.score < 2) return null;
  return best.candidate;
}

function looksLikeUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { location, location_id, location_type, issue, staff_floor, photo_name } = body || {};
  if (!issue) return json({ error: "Missing required field: issue" }, { status: 400 });
  if (!location_id && !location) {
    return json({ error: "Missing required field: location (or location_id)" }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    // Your DB requires complaints.location_id (FK to locations.id).
    let resolvedLocationId = location_id || null;
    if (!resolvedLocationId) {
      const locStr = String(location || "").trim();
      const locTokens = tokensForMatch(locStr);
      if (location_type) locTokens.push(...tokensForMatch(location_type));

      // If QR provides an id/qr_code UUID, support that too.
      if (looksLikeUuid(locStr)) {
        const { data: locById, error: locByIdErr } = await supabase
          .from("locations")
          .select("id")
          .or(`id.eq.${locStr},qr_code.eq.${locStr}`)
          .maybeSingle();
        if (locByIdErr) throw locByIdErr;
        if (locById?.id) resolvedLocationId = locById.id;
      }

      // Name match (case-insensitive): exact-ish then partial.
      if (!resolvedLocationId) {
        const { data: exact, error: exactErr } = await supabase
          .from("locations")
          .select("id")
          .ilike("name", locStr)
          .maybeSingle();
        if (exactErr) throw exactErr;
        if (exact?.id) resolvedLocationId = exact.id;
      }

      if (!resolvedLocationId) {
        const { data: partial, error: partialErr } = await supabase
          .from("locations")
          .select("id")
          .ilike("name", `%${locStr}%`)
          .maybeSingle();
        if (partialErr) throw partialErr;
        if (partial?.id) resolvedLocationId = partial.id;
      }

      // Fuzzy fallback: fetch small list and match normalized keys / token overlap.
      if (!resolvedLocationId) {
        const { data: allLocs, error: allErr } = await supabase
          .from("locations")
          .select("id, name, qr_code")
          .limit(500);
        if (allErr) throw allErr;

        const key = normalizeKey(locStr);
        const exactNormalized = (allLocs || []).find((l) => normalizeKey(l?.name) === key);
        if (exactNormalized?.id) resolvedLocationId = exactNormalized.id;

        if (!resolvedLocationId) {
          const tokenBest = bestTokenMatch(locTokens, allLocs || []);
          if (tokenBest?.id) resolvedLocationId = tokenBest.id;
        }
      }

      if (!resolvedLocationId) {
        return json(
          {
            error:
              `Unknown location "${locStr}". ` +
              `Expected it to match locations.name (or be a UUID matching locations.id / locations.qr_code).`,
          },
          { status: 400 },
        );
      }
    }

    const { data: complaintData, error: complaintError } = await supabase
      .from("complaints")
      .insert([
        {
          issue,
          location_id: resolvedLocationId,
          // Keep these populated when present (your table has these nullable columns).
          location: location ?? null,
          location_type: location_type ?? null,
          staff_floor: staff_floor ?? null,
          photo_url: photo_name || null,
          created_at: new Date(),
          status: "pending",
        },
      ])
      .select(
        "id, location_id, location, location_type, issue, staff_floor, photo_url, status, created_at, updated_at, completed_by, completed_at",
      );

    if (complaintError) throw complaintError;

    // Notifications are best-effort. Complaint submission should not fail if Twilio/cleaning_staff fails.
    try {
      if (staff_floor) {
        const { data: staffData, error: staffError } = await supabase
          .from("cleaning_staff")
          .select("phone_number")
          .eq("assigned_floor", staff_floor);
        if (staffError) throw staffError;

        const message = `New Complaint:\nLocation: ${location || "Unknown"}\nIssue: ${issue}\nTime: ${new Date().toLocaleTimeString()}`;
        for (const staff of staffData || []) {
          if (staff?.phone_number) await sendWhatsApp(staff.phone_number, message);
        }
      }
    } catch (notifyErr) {
      // Intentionally ignore notification errors.
      void notifyErr;
    }

    return json({ message: "Complaint submitted & notifications sent", data: complaintData });
  } catch (err) {
    return json({ error: err?.message || "Failed to submit complaint" }, { status: 500 });
  }
}
