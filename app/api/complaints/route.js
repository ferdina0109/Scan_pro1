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
      .select("*")
      .is("completed_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return json({ complaints });
  } catch (err) {
    return json({ error: err?.message || "Failed to get complaints" }, { status: 500 });
  }
}
