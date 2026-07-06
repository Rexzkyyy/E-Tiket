export const formatTicketCode = (code: string) => {
  if (!code) return '';
  if (code.startsWith('JSMH')) return code;
  if (!isNaN(Number(code)) && code.length > 5) return `JSMH${code.slice(-3)}`;
  return `JSMH${code.padStart(3, '0')}`;
};

export const normalizeJenisTiket = (jenis: string) => {
  if (!jenis) return '';
  const upper = jenis.toUpperCase();
  if (upper.includes('VIP')) {
    return 'VIP Gold 185K';
  }
  if (upper.includes('SILVER')) {
    return 'Silver 130K';
  }
  // Fallback replace
  return jenis.replace(/200K?/gi, '185K');
};
