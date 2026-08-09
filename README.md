<div align="center">
  <img src="docs/assets/index.png" alt="E-Tiket Cover" width="100%" />
  
  # 🎟️ E-Tiket Pro 
  **Sistem Manajemen Tiket Event Berbasis Web**
  
  <p align="center">
    <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  </p>

  <p>
    E-Tiket Pro adalah solusi sistem manajemen tiket acara modern yang memungkinkan penyelenggara acara untuk memanajemen peserta secara real-time. Dilengkapi dengan dashboard admin, scanner barcode terintegrasi, dan notifikasi tiket otomatis via WhatsApp/Email.
  </p>
</div>

---

## 🌟 Fitur Unggulan

Proyek ini dibangun dengan berbagai fitur lengkap untuk memudahkan manajemen tiket. Anda dapat membaca detail dokumentasi fitur pada folder `docs/`:

1. **[📊 Dashboard Admin & Statistik](docs/1_Dashboard_Admin.md)** — Panel admin lengkap dengan analitik, manajemen tabel, import dari Excel, hapus data, dan sistem validasi pembayaran.
2. **[📷 Sistem Scanner Absensi](docs/2_Sistem_Scanner_Absensi.md)** — Mengubah kamera laptop atau HP menjadi alat *scan barcode* (CODE128) untuk absen kehadiran secara *real-time*.
3. **[🎫 Halaman Tiket Publik](docs/3_Public_Ticket.md)** — Halaman khusus yang bisa diakses oleh peserta untuk melihat QR/Barcode tiket mereka sebelum di-scan.
4. **[💌 Pengiriman Notifikasi (WA/Email)](docs/4_Kirim_Tiket_WA_Email.md)** — Fitur pendukung untuk mengirimkan detail tiket langsung ke WhatsApp dan Email milik peserta.

---

## 🛠️ Teknologi yang Digunakan

| Kategori | Teknologi | Deskripsi |
| --- | --- | --- |
| **Frontend Core** | React 18, TypeScript, Vite | Struktur aplikasi single-page modern, cepat dan type-safe. |
| **Database & Auth** | Supabase (PostgreSQL) | Layanan backend-as-a-service yang menampung data peserta. |
| **Barcode & QR** | `react-barcode`, `html5-qrcode` | Untuk generate (CODE128) dan pemindaian barcode dari kamera. |
| **UI/UX & Styling** | Pure CSS (Dark Mode), Framer Motion, Lucide | Memberikan tampilan animasi yang smooth, dan desain responsif. |
| **Utilities** | `xlsx`, `html2canvas`, `jspdf` | Import/Export data menggunakan Excel, serta rendering data. |

---

## 🚀 Panduan Instalasi (Setup)

Ikuti langkah-langkah di bawah ini untuk menjalankan E-Tiket secara lokal.

### 1. Kloning Repositori & Install Dependencies

```bash
git clone <repository-url>
cd E-Tiket
npm install
```

### 2. Konfigurasi Database (Supabase)

Aplikasi ini menggunakan database dari Supabase. Buat proyek baru di Supabase dan buat tabel `participants` dengan skema berikut:

| Kolom | Tipe Data | Pengaturan |
|---|---|---|
| `barcode` | `text` | **Primary Key** |
| `nama_lengkap`, `email`, `jenis_kelamin`, `usia`, `alamat`, `whatsapp` | `text` | - |
| `jenis_tiket`, `jumlah_tiket`, `metode_pembayaran`, `bukti_transfer`, `nama_pengirim`, `harapan_event` | `text` | - |
| `konfirmasi_data` | `boolean` | - |
| `validasi_bayar` | `text` | Default: `'Pending'` |
| `status_absen` | `text` | Default: `'Pending'` |
| `waktu_absen` | `text` | - |
| `created_at` | `timestamptz` | Default: `now()` |

> **Catatan:** Jangan lupa untuk menonaktifkan *Row Level Security* (RLS) di tabel `participants` pada tahap development, atau buat _policies_ yang sesuai jika menuju production.

### 3. Mengatur Kredensial Supabase di Aplikasi

Setelah Anda menjalankan proyek dengan cara:
```bash
npm run dev
```
Buka browser dan arahkan ke `http://localhost:5173`. 
1. Buka halaman utama aplikasi.
2. Klik ikon pengaturan (⚙️) di bagian *navbar*.
3. Masukkan **Project URL** (contoh: `https://xxxx.supabase.co`) dan **Anon Key** (contoh: `eyJhbGci...`) dari proyek Supabase Anda.

---

## 📋 Panduan Import Excel
Untuk mengimpor data massal, gunakan file excel dengan format berikut (file contoh ada di folder `archive/`):

| Kolom Excel Wajib | Keterangan |
| --- | --- |
| `Nama Lengkap` | Nama Lengkap Peserta |
| `Email` | Alamat Email |
| `Jenis Kelamin` | `L` atau `P` |
| `Usia` | Umur (contoh: 21) |
| `Alamat` | Alamat tempat tinggal |
| `Nomor WhatsApp` | Dimulai dengan 08 (contoh: 0812345678) |
| `Jenis Tiket` | Kelas tiket (Regular, VIP, dll) |
| `Jumlah Tiket` | Total tiket per pengguna |
| `Metode Pembayaran` | Transfer Bank / E-Wallet |
| `Validasi Bayar` | `Pending` atau `Approved` |

---

## 📦 Build untuk Production
Ketika siap di-*deploy* (contoh: ke Vercel atau Netlify), cukup jalankan perintah:

```bash
npm run build
```

Hasil _bundle_ statis akan digenerate ke folder `dist`.

---
*Dibuat oleh [Ikhsanuddin Rezki]* 
