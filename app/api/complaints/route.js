export const runtime = "nodejs";

import { getSupabase } from "../_lib/supabase";

function json(data, init) {
  return Response.json(data, init);
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: complaints, error } = await supabase
      .from("complaints")
      .select(
        "id, location, location_type, issue, staff_floor, photo_url, created_at, completed_by, completed_at",
      )
      .is("completed_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return json({ complaints });
  } catch (err) {
    return json({ error: err?.message || "Failed to get complaints" }, { status: 500 });
  }
}
