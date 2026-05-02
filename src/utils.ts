export const formatTicketCode = (code: string) => {
  if (!code) return '';
  if (code.startsWith('RTJP')) return code;
  if (!isNaN(Number(code)) && code.length > 5) return `RTJP${code.slice(-3)}`;
  return `RTJP${code.padStart(3, '0')}`;
};
