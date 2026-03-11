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
      const { data: locRow, error: locErr } = await supabase
        .from("locations")
        .select("id")
        .ilike("name", String(location))
        .maybeSingle();

      if (locErr) throw locErr;
      if (!locRow?.id) {
        return json(
          { error: `Unknown location "${location}". Add it to the locations table first.` },
          { status: 400 },
        );
      }
      resolvedLocationId = locRow.id;
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
