export const formatTicketCode = (code: string) => {
  if (!code) return '';
  if (code.startsWith('JSMH')) return code;
  if (!isNaN(Number(code)) && code.length > 5) return `JSMH${code.slice(-3)}`;
  return `JSMH${code.padStart(3, '0')}`;
};
