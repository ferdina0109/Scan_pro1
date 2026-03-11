const { createClient } = require("@supabase/supabase-js");
const twilio = require("twilio");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);
const twilioWhatsAppNumber = "whatsapp:+14155238886";

async function sendWhatsApp(phoneNumber, message) {
  await client.messages.create({
    from: twilioWhatsAppNumber,
    to: `whatsapp:${phoneNumber}`,
    body: message,
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { location, location_type, issue, staff_floor, photo_name } = req.body || {};
  if (!location || !location_type || !issue || !staff_floor) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const { data: complaintData, error: complaintError } = await supabase
      .from("complaints")
      .insert([
        {
          location,
          location_type,
          issue,
          photo_url: photo_name || null,
          created_at: new Date(),
        },
      ])
      .select();

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

    res.status(200).json({ message: "Complaint submitted & notifications sent", data: complaintData });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to submit complaint" });
  }
};
