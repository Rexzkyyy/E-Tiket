# 💌 Pengiriman Notifikasi (WhatsApp & Email)

Aplikasi E-Tiket ini dilengkapi dengan integrasi semi-otomatis untuk mendistribusikan tiket langsung kepada masing-masing peserta menggunakan platform populer.

## 1. Kirim via WhatsApp
Pada halaman Dashboard, terdapat aksi/tombol (Logo WhatsApp) di tabel peserta.
Sistem menggunakan *WhatsApp API Link* (`wa.me`).

**Bagaimana ini bekerja?**
Ketika tombol diklik, aplikasi akan merakit sebuah *template pesan* (string formatting) yang dinamis.
Contoh pesannya akan berbentuk seperti ini:
> "Halo [Nama Peserta], pembayaran tiket event Anda telah kami setujui! Ini adalah tautan tiket unik Anda: https://domain.com/ticket/XXXX. Mohon simpan link ini. Terima kasih."

Browser secara otomatis akan me-redirect Anda ke aplikasi WhatsApp Desktop/Web tanpa perlu mengetik nomor manual, karena nomor `whatsapp` sudah diambil dari database dan di-format (misal `08...` diubah menjadi `628...`).

## 2. Kirim via Email
Fitur ini bekerja mirip seperti WA namun menggunakan protokol `mailto:`.
Terdapat tombol (Logo Email) di baris peserta.

**Bagaimana ini bekerja?**
Akan membuka aplikasi _default_ mail client Anda (seperti Microsoft Outlook atau Gmail Web jika terkonfigurasi) dengan `To:`, `Subject:`, dan `Body:` yang sudah terisi otomatis dari template tiket peserta tersebut.

> **Saran Pengembangan**: Untuk pengiriman massal dengan satu kali klik tanpa harus membuka client email / WA berkali-kali, Anda dapat memodifikasi *source-code* dan menyambungkannya ke layanan Pihak Ketiga seperti Twilio (untuk WA) atau Resend/Sendgrid (untuk Email) menggunakan arsitektur *Edge Functions* milik Supabase.
