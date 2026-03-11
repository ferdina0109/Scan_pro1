export const runtime = "nodejs";

import { getSupabase } from "../_lib/supabase";

function json(data, init) {
  return Response.json(data, init);
}

function inferFloorFromName(name) {
  if (!name) return null;
  const m = String(name).match(/floor\s*([0-9]+)/i);
  return m?.[1] ? String(m[1]) : null;
}

function inferTypeFromName(name) {
  const n = String(name || "").toLowerCase();
  if (!n) return null;
  if (n.includes("washroom") || n.includes("restroom") || n.includes("restrooms") || n.includes("toilet")) {
    return "washroom";
  }
  if (n.includes("corridor") || n.includes("entrance") || n.includes("lobby")) {
    return "corridor";
  }
  if (n.includes("cafeteria") || n.includes("canteen") || n.includes("dining")) {
    return "drinking area";
  }
  return null;
}

export async function GET() {
  try {
    const supabase = getSupabase();
    // Your current `locations` table (per screenshot) has: id, name, qr_code, description, created_at.
    // Don’t select non-existent columns; instead infer `location_type` and `staff_floor` from `name`.
    const { data: locations, error } = await supabase
      .from("locations")
      .select("id, name, qr_code, description")
      .order("name", { ascending: true });

    if (error) throw error;
    const shaped = (locations || []).map((l) => ({
      id: l.id,
      name: l.name,
      qr_code: l.qr_code ?? null,
      description: l.description ?? null,
      location_type: inferTypeFromName(l.name),
      staff_floor: inferFloorFromName(l.name),
    }));
    return json({ locations: shaped });
  } catch (err) {
    return json({ error: err?.message || "Failed to get locations" }, { status: 500 });
  }
}
