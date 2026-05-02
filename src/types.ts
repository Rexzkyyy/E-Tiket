export interface Participant {
  id: string;
  barcode: string;
  nama_lengkap: string;
  whatsapp: string;
  jenis_tiket: string;
  validasi_bayar: string;
  status_absen: string;
  created_at?: string;
  [key: string]: any;
}
