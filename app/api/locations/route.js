export const runtime = "nodejs";

import { getSupabase } from "../_lib/supabase";

function json(data, init) {
  return Response.json(data, init);
}

export async function GET() {
  try {
    const supabase = getSupabase();
    // Some users may already have a `locations` table without `location_type`.
    // Try the full select first, then fall back to the minimal set.
    let locations;
    let error;
    ({ data: locations, error } = await supabase
      .from("locations")
      .select("name, location_type, staff_floor")
      .order("name", { ascending: true }));

    if (error && /location_type/i.test(String(error.message || error))) {
      ({ data: locations, error } = await supabase
        .from("locations")
        .select("name, staff_floor")
        .order("name", { ascending: true }));
    }

    if (error) throw error;
    return json({ locations: locations || [] });
  } catch (err) {
    return json({ error: err?.message || "Failed to get locations" }, { status: 500 });
  }
}
