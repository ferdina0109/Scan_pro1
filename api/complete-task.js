import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { complaint_id, staff_id } = req.body;

  try {
    // Update complaint as completed
    const { error } = await supabase
      .from('complaints')
      .update({ completed_by: staff_id, completed_at: new Date() })
      .eq('id', complaint_id);

    if (error) throw error;

    res.status(200).json({ message: 'Task marked as completed' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to complete task' });
  }
}
