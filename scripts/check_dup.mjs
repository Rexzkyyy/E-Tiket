import { createClient } from '@supabase/supabase-js';

const SB_URL = 'https://tydfbrcdvzeggrlzabfq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZGZicmNkdnplZ2dybHphYmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NTUyMDEsImV4cCI6MjA5MzAzMTIwMX0.75_AK06B7aGjIbZk_rG6KBgD6yqDHygPRYg_GHeMJ6o';
const supabase = createClient(SB_URL, SB_KEY);

async function checkDuplicates() {
  const { data, error } = await supabase.from('participants').select('*');
  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  const groups = {};

  data.forEach(p => {
    // Extract base name by removing "(Tiket X)"
    const baseName = p.nama_lengkap.replace(/\s*\(Tiket \d+\)\s*$/i, '').trim().toLowerCase();
    
    if (!groups[baseName]) {
      groups[baseName] = [];
    }
    groups[baseName].push(p);
  });

  const problematicGroups = [];

  for (const [baseName, participants] of Object.entries(groups)) {
    if (participants.length > 1) {
      // Check if there is a mix of "Base Name" and "Base Name (Tiket X)"
      const hasBase = participants.some(p => p.nama_lengkap.toLowerCase() === baseName);
      const hasTicketX = participants.some(p => p.nama_lengkap.toLowerCase() !== baseName);

      // Or if there are duplicate base names
      const exactNameCounts = {};
      participants.forEach(p => {
        const name = p.nama_lengkap.toLowerCase();
        exactNameCounts[name] = (exactNameCounts[name] || 0) + 1;
      });
      const hasDuplicatesOfSameName = Object.values(exactNameCounts).some(count => count > 1);

      if ((hasBase && hasTicketX) || hasDuplicatesOfSameName) {
        problematicGroups.push({
          baseName,
          participants
        });
      }
    }
  }

  if (problematicGroups.length === 0) {
    console.log("Tidak ada data bermasalah yang ditemukan.");
  } else {
    console.log(`Ditemukan ${problematicGroups.length} grup data yang kemungkinan bermasalah (duplikat lama & baru):`);
    console.log("===============================================================");
    problematicGroups.forEach((group, index) => {
      console.log(`\n${index + 1}. Peserta: ${group.baseName.toUpperCase()}`);
      console.log("   Daftar Baris di Database:");
      group.participants.forEach(p => {
        const isBase = p.nama_lengkap.toLowerCase() === group.baseName;
        console.log(`   - [${isBase ? 'MUNGKIN HARUS DIHAPUS' : 'VALID'}] Nama: ${p.nama_lengkap}, Barcode: ${p.barcode}, Dibuat/Diupdate: ${p.created_at || 'Tidak diketahui'}`);
      });
    });
  }
}

checkDuplicates();
