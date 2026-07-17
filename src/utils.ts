export const formatTicketCode = (code: string) => {
  if (!code) return '';
  if (code.startsWith('JSMH')) return code;
  if (!isNaN(Number(code)) && code.length > 5) return `JSMH${code.slice(-3)}`;
  return `JSMH${code.padStart(3, '0')}`;
};

export const normalizeJenisTiket = (jenis: string) => {
  if (!jenis) return '';
  const upper = jenis.toUpperCase();
  
  if (upper.includes('DISKON 100K') || upper.includes('(DISKON 100K)') || upper.includes('PROMO')) {
    return 'Silver Diskon 100k';
  }
  
  if (upper.includes('MAHASISWA') || upper.includes('DISKON 50K')) {
    return 'Silver Diskon 50K';
  }

  if (upper.includes('SILVER')) {
    return 'Silver 130K';
  }
  if (upper.includes('VIP')) {
    return 'VIP Gold 185K';
  }
  // Fallback replace
  return jenis.replace(/200K?/gi, '185K');
};
