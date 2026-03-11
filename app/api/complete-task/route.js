export const runtime = "nodejs";

import { getSupabase } from "../_lib/supabase";
import { sendWhatsApp } from "../_lib/twilio";

function json(data, init) {
  return Response.json(data, init);
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { complaint_id, staff_id } = body || {};
  if (!complaint_id || !staff_id) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    const { data: complaint, error: complaintFetchError } = await supabase
      .from("complaints")
      .select("location, issue")
      .eq("id", complaint_id)
      .single();

    if (complaintFetchError) throw complaintFetchError;

    const { error: updateError } = await supabase
      .from("complaints")
      .update({ completed_by: staff_id, completed_at: new Date() })
      .eq("id", complaint_id);

    if (updateError) throw updateError;

    const { data: staff, error: staffError } = await supabase
      .from("cleaning_staff")
      .select("phone_number")
      .eq("id", staff_id)
      .single();

    if (staffError) throw staffError;

    const message = `Task Completed!\nLocation: ${complaint.location}\nIssue: ${complaint.issue}\nCompleted at: ${new Date().toLocaleString()}`;
    if (staff?.phone_number) await sendWhatsApp(staff.phone_number, message);

    return json({ message: "Task marked as completed" });
  } catch (err) {
    return json({ error: err?.message || "Failed to complete task" }, { status: 500 });
  }
}
