import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { data: complaints, error } = await supabase
      .from('complaints')
      .select('*')
      .is('completed_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({ complaints });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to get complaints' });
  }
}
