import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);
const twilioWhatsAppNumber = 'whatsapp:+14155238886';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { phoneNumber, message } = req.body;
  try {
    const response = await client.messages.create({
      from: twilioWhatsAppNumber,
      to: `whatsapp:${phoneNumber}`,
      body: message
    });
    res.status(200).json({ message: 'WhatsApp sent successfully', sid: response.sid });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to send WhatsApp' });
  }
}
