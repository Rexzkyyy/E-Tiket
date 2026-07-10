import { createClient } from '@supabase/supabase-js';

const SB_URL = 'https://tydfbrcdvzeggrlzabfq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZGZicmNkdnplZ2dybHphYmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NTUyMDEsImV4cCI6MjA5MzAzMTIwMX0.75_AK06B7aGjIbZk_rG6KBgD6yqDHygPRYg_GHeMJ6o';

const supabase = createClient(SB_URL, SB_KEY);

async function run() {
  const { data: participants, error } = await supabase.from('participants').select('*');
  if (error) {
    console.error('Error fetching participants:', error);
    return;
  }
  
  for (const p of participants) {
    let newJenis = p.jenis_tiket || '';
    let needsUpdate = false;
    
    if (newJenis.toLowerCase() === 'perempuan' || newJenis.toLowerCase() === 'laki-laki') {
      newJenis = 'VIP Gold 185K';
      needsUpdate = true;
    }

    if (newJenis.toLowerCase().includes('silver')) {
        if (newJenis !== 'Silver 130K') {
            newJenis = 'Silver 130K';
            needsUpdate = true;
        }
    } else if (newJenis.toLowerCase().includes('vip')) {
        if (newJenis !== 'VIP Gold 185K') {
            newJenis = 'VIP Gold 185K';
            needsUpdate = true;
        }
    } else if (newJenis.includes('200')) {
        // Fallback for random 200
        newJenis = 'VIP Gold 185K';
        needsUpdate = true;
    }

    if (needsUpdate) {
      console.log(`Updating ${p.nama_lengkap}: ${p.jenis_tiket} -> ${newJenis}`);
      await supabase.from('participants').update({ jenis_tiket: newJenis }).eq('barcode', p.barcode);
    }
  }
  console.log('Done cleaning up database!');
}

run();
