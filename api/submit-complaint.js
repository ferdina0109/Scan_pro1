import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { location, location_type, issue, staff_floor, photo_name } = req.body;

  try {
    // Insert complaint into Supabase
    const { data, error } = await supabase
      .from('complaints')
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

    if (error) throw error;

    res.status(200).json({ message: 'Complaint submitted', data });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to submit complaint' });
  }
}
