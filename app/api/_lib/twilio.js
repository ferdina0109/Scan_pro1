import twilio from "twilio";
import { requireEnv } from "./env";

let cached;
const twilioWhatsAppNumber = "whatsapp:+14155238886";

function getTwilioClient() {
  if (!cached) cached = twilio(requireEnv("TWILIO_ACCOUNT_SID"), requireEnv("TWILIO_AUTH_TOKEN"));
  return cached;
}

export async function sendWhatsApp(phoneNumber, message) {
  const client = getTwilioClient();
  await client.messages.create({
    from: twilioWhatsAppNumber,
    to: `whatsapp:${phoneNumber}`,
    body: message,
  });
}
