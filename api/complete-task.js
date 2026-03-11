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

  const { complaint_id, staff_id } = req.body || {};
  if (!complaint_id || !staff_id) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
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

    res.status(200).json({ message: "Task marked as completed" });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to complete task" });
  }
};
