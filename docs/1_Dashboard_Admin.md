# 📊 Dashboard Admin

`AdminDashboard.tsx` adalah pusat kontrol dari E-Tiket Pro. Halaman ini hanya dapat diakses melalui route yang dilindungi (setelah login admin yang valid).

## Fitur Utama

### 1. Panel Statistik Real-Time
Dashboard menampilkan 4 metrik utama:
- **Total Pendaftar**: Menjumlahkan semua data yang masuk.
- **Validasi Pembayaran**: Menunjukkan berapa tiket yang masih *Pending* (menunggu disetujui admin) dan berapa yang sudah *Approved*.
- **Telah Absen**: Menunjukkan jumlah peserta yang sudah melakukan scan barcode.
- **Belum Hadir**: Peserta yang belum men-scan barcode mereka.

Statistik ini diperbarui secara real-time setiap kali ada perubahan pada tabel `participants` di database Supabase.

### 2. Tabel Manajemen Peserta
Admin dapat melihat keseluruhan data melalui tabel interaktif yang mendukung pencarian (berdasarkan nama atau barcode) dan fitur pengurutan data. 

Dari tabel ini, admin dapat melakukan aksi:
- Mengubah status pembayaran (Approve/Reject).
- Menghapus tiket spesifik.
- Membaca metadata spesifik (tipe tiket, metode pembayaran, dll).

### 3. Import Data Massal
Terdapat tombol khusus untuk meng-upload file `.xlsx`. Fitur ini sangat berguna ketika pendaftaran dilakukan secara eksternal (misal lewat Google Forms), admin dapat mem-backup data format Excel dan memasukkannya langsung ke sistem secara kilat menggunakan module `xlsx`. (Contoh excel ada di folder `/archive`).

### 4. Ekspor dan Penghapusan Data Massal
Untuk keamanan, ada mekanisme untuk menghapus semua data jika suatu event telah selesai, dengan prompt konfirmasi untuk menghindari penghapusan yang tidak disengaja.
