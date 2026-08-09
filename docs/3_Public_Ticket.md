# 🎫 Halaman Tiket Publik

`PublicTicket.tsx` adalah URL khusus yang bisa dibagikan langsung kepada peserta. 
Biasanya format link berupa `https://domain-anda.com/ticket/<ID-Barcode>`.

## Elemen yang Ditampilkan

Halaman ini didesain sesederhana dan semenarik mungkin dengan styling *Dark Mode* modern yang cocok ditunjukkan ketika siang maupun malam hari:
1. **Detail Peserta**: Menampilkan Nama Lengkap, Jenis Tiket, dan ID Unik.
2. **Barcode Area**: Barcode akan digenerate *on-the-fly* secara visual menggunakan komponen `react-barcode`. Jika di-tap/klik, barcode akan membesar (Framer Motion Modal) untuk memudahkan proses scan di gate masuk.
3. **Status Kehadiran / Pembayaran**: Memberikan rasa aman ke peserta dengan menampilkan status bayar hijau ("Approved") dan status absen.
4. **Tombol Unduh Gambar**: Peserta memiliki opsi untuk menyimpan tiket tersebut sebagai `.png` ke galeri HP mereka (didukung oleh `html2canvas`), sehingga apabila di *venue* tidak ada sinyal internet, tiket tetap aman di galeri.

Halaman ini **bisa diakses tanpa perlu login**, sehingga tidak membebani panitia.
