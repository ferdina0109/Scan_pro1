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

  const { location, location_type, issue, staff_floor, photo_name } = body || {};
  if (!location || !location_type || !issue || !staff_floor) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    const { data: complaintData, error: complaintError } = await supabase
      .from("complaints")
      .insert([
        {
          location,
          location_type,
          issue,
          staff_floor,
          photo_url: photo_name || null,
          created_at: new Date(),
        },
      ])
      .select("id, location, location_type, issue, staff_floor, photo_url, created_at, completed_by, completed_at");

    if (complaintError) throw complaintError;

    const { data: staffData, error: staffError } = await supabase
      .from("cleaning_staff")
      .select("phone_number")
      .eq("assigned_floor", staff_floor);

    if (staffError) throw staffError;

    const message = `New Complaint:\nLocation: ${location}\nIssue: ${issue}\nTime: ${new Date().toLocaleTimeString()}`;
    for (const staff of staffData || []) {
      if (staff?.phone_number) await sendWhatsApp(staff.phone_number, message);
    }

    return json({ message: "Complaint submitted & notifications sent", data: complaintData });
  } catch (err) {
    return json({ error: err?.message || "Failed to submit complaint" }, { status: 500 });
  }
}
