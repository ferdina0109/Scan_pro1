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
  origin: ["https://ferdina0109.github.io"], // Allow requests from GitHub Pages
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

    // Get all supervisors
    const { data: supervisorData, error: supervisorError } = await supabase
      .from("supervisors")
      .select("phone_number");

    if (supervisorError) throw supervisorError;

    const message = `New complaint reported: "${issue}" at ${location}`;

    // Send WhatsApp to staff
    for (let staff of staffData) {
      await sendWhatsApp(staff.phone_number, message);
    }

    // Send WhatsApp to supervisors
    for (let sup of supervisorData) {
      await sendWhatsApp(sup.phone_number, message);
    }

    res.json({ message: "Complaint submitted & notifications sent" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit complaint" });
  }
});

// ---------- Endpoint 3: Complete Task & Points ----------
app.post("/complete-task", async (req, res) => {
  try {
    const { complaint_id, staff_id, supervisor_override } = req.body;

    // Get complaint creation time
    const { data: complaint } = await supabase
      .from("complaints")
      .select("created_at")
      .eq("id", complaint_id)
      .single();

    const completedAt = new Date();
    const createdAt = new Date(complaint.created_at);
    const diffMinutes = (completedAt - createdAt) / 60000;

    // Points calculation
    let earnedPoints = 10; // default
    if (supervisor_override) {
      earnedPoints = -20; // negative points if supervisor says incomplete
    } else if (diffMinutes <= 20) {
      earnedPoints = 100;
    } else if (diffMinutes <= 45) {
      earnedPoints = 50;
    } else if (diffMinutes <= 60) {
      earnedPoints = 25;
    }

    // Update staff points
    await supabase
      .from("cleaning_staff")
      .update({ points: supabase.raw("points + ?", [earnedPoints]) })
      .eq("id", staff_id);

    // Update complaint as completed
    await supabase
      .from("complaints")
      .update({ completed_by: staff_id, completed_at: completedAt })
      .eq("id", complaint_id);

    res.json({
      message: "Task marked completed",
      points: earnedPoints,
      completed_at: completedAt
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to complete task" });
  }
});

// ---------- Endpoint 4: Leaderboard ----------
app.get("/leaderboard", async (req, res) => {
  try {
    const { data: leaderboard } = await supabase
      .from("cleaning_staff")
      .select("name, points")
      .order("points", { ascending: false })
      .limit(10);

    res.json({ leaderboard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get leaderboard" });
  }
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`Scan2Sustain backend running at http://localhost:${PORT}`);
});