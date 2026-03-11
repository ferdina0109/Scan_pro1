export const runtime = "nodejs";

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

  const { phoneNumber, message } = body || {};
  if (!phoneNumber || !message) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    await sendWhatsApp(phoneNumber, message);
    return json({ message: "WhatsApp sent successfully" });
  } catch (err) {
    return json({ error: err?.message || "Failed to send WhatsApp" }, { status: 500 });
  }
}
