# 📷 Sistem Scanner Absensi

Halaman `ScannerPage.tsx` adalah salah satu core-feature E-Tiket Pro yang mengubah device (HP, Tablet, maupun Laptop yang memiliki webcam) menjadi alat absensi super instan.

## Mekanisme Kerja

1. **Pemilihan Kamera**
   Sistem yang ditenagai oleh librari `html5-qrcode` akan meminta izin browser untuk mengakses kamera. Jika terdapat lebih dari 1 kamera (seperti kamera depan dan belakang di HP), user dapat menukar kamera yang aktif melalui antarmuka.

2. **Deteksi Barcode CODE128**
   Ketika tiket peserta didekatkan ke kamera, sistem akan mendeteksi garis barcode secara simultan. Barcode yang digunakan berstandar CODE128 (format populer yang sangat reaktif di layar HP maupun cetakan kertas).

3. **Validasi ke Database**
   Setelah teks barcode tertangkap, aplikasi tidak sekadar menampilkannya. Sistem akan melakukan ping (query) ke database Supabase untuk mencari kolom `barcode` yang persis cocok:
   - **Jika Ditemukan & Belum Absen**: Statusnya akan diubah dari `'Pending'` menjadi `'Hadir'`. Database juga akan mencatat `waktu_absen` (`timestamptz`).
   - **Jika Sudah Pernah Absen**: Sistem akan memberikan warning (UI Toast berwarna merah) bahwa barcode tersebut telah di-scan sebelumnya, mencegah kecurangan tiket masuk berganda.
   - **Jika Tidak Valid**: Menampilkan error tiket tidak terdaftar.

## Tips Penggunaan di Lapangan
Sebaiknya letakkan 1 HP/Tablet khusus di meja registrasi masuk, dengan kecerahan layar tinggi, dan arahkan peserta untuk meletakkan layar HP-nya di bawah kamera registrasi. Animasi garis _scan_ secara visual membantu mempertegas ke arah mana kamera fokus.
