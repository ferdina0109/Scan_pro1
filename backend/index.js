// index.js - Full Scan2Sustain backend with Supabase + Twilio WhatsApp + Points system

const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");
const cors = require("cors");
const supabase = require("@supabase/supabase-js").createClient(
  "https://sbrweumvawvcwxztyeeh.supabase.co",           // Replace with your Supabase URL
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicndldW12YXd2Y3d4enR5ZWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMzI5MzEsImV4cCI6MjA4ODcwODkzMX0.CcmUB09BEtGUqRBDmKVhnoX9tF7oAOLDuYmQE34cenk"       // Replace with your Supabase anon key
);

const app = express();
const PORT = 3000;

app.use(cors({
  origin: ["https://ferdina0109.github.io", "http://localhost:3000"], // Allow requests from GitHub Pages and local testing
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(bodyParser.json());
app.use(express.static('../frontend'));

// ---------- Twilio WhatsApp Setup ----------
const accountSid = "ACa8275e629216b73edf11f921bb80188c"; // Twilio SID
const authToken = "5623d7e89ffc99986806796d40160ce4";   // Twilio Auth Token
const client = twilio(accountSid, authToken);
const twilioWhatsAppNumber = "whatsapp:+14155238886"; // Twilio sandbox WhatsApp number

async function sendWhatsApp(phoneNumber, message) {
  try {
    const response = await client.messages.create({
      from: twilioWhatsAppNumber,
      to: `whatsapp:${phoneNumber}`, // Include country code, e.g., +91XXXXXXXXXX
      body: message
    });
    console.log(`WhatsApp sent to ${phoneNumber}: ${response.sid}`);
  } catch (err) {
    console.error("Error sending WhatsApp:", err);
  }
}

// ---------- Endpoint 1: Send WhatsApp message (optional direct use) ----------
app.post("/send-whatsapp", async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    await sendWhatsApp(phoneNumber, message);
    res.json({ message: "WhatsApp sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send WhatsApp" });
  }
});

// ---------- Endpoint 2: Submit Complaint ----------
app.post("/submit-complaint", async (req, res) => {
  try {
    const { location, location_type, issue, staff_floor, photo_name } = req.body;

    // Validate required fields
    if (!location || !location_type || !issue || !staff_floor) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Insert complaint into Supabase
    const { data: complaintData, error: complaintError } = await supabase
      .from("complaints")
      .insert([
        {
          location,
          location_type,
          issue,
          photo_url: photo_name || null,
          created_at: new Date()
        }
      ])
      .select();

    if (complaintError) throw complaintError;

    // Get assigned cleaning staff for this location/floor
    const { data: staffData, error: staffError } = await supabase
      .from("cleaning_staff")
      .select("phone_number")
      .eq("assigned_floor", staff_floor); // match floor/block

    if (staffError) throw staffError;

    const message = `New Complaint:\nLocation: ${location}\nIssue: ${issue}\nTime: ${new Date().toLocaleTimeString()}`;

    // Send WhatsApp to staff
    for (let staff of staffData) {
      await sendWhatsApp(staff.phone_number, message);
    }

    res.json({ message: "Complaint submitted & notifications sent" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to submit complaint" });
  }
});

// ---------- Endpoint 3: Complete Task ----------
app.post("/complete-task", async (req, res) => {
  try {
    const { complaint_id, staff_id } = req.body;

    // Update complaint as completed
    const { error } = await supabase
      .from("complaints")
      .update({ completed_by: staff_id, completed_at: new Date() })
      .eq("id", complaint_id);

    if (error) throw error;

    res.json({ message: "Task marked as completed" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to complete task" });
  }
});

// ---------- Endpoint 4: Get Complaints ----------
app.get("/complaints", async (req, res) => {
  try {
    const { data: complaints } = await supabase
      .from("complaints")
      .select("*")
      .is("completed_at", null)  // Only pending complaints
      .order("created_at", { ascending: false });

    res.json({ complaints });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get complaints" });
  }
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`Scan2Sustain backend running at http://localhost:${PORT}`);
});