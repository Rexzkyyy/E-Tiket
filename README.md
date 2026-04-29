# E-Tiket Pro

Sistem manajemen tiket event berbasis web menggunakan **React + TypeScript + Supabase**.

## ✨ Fitur

- 📊 **Dashboard** — Statistik real-time (Total, Validasi, Menunggu, Absen)
- 📂 **Import Excel** — Upload data peserta dari file `.xlsx`
- 🔖 **Barcode Linear** — Generate barcode CODE128 otomatis per peserta
- 📷 **Scanner Kamera** — Scan barcode langsung dari kamera HP/laptop
- ✅ **Validasi Pembayaran** — Approve/Reject status bayar peserta
- 📋 **Absensi Peserta** — Tandai kehadiran via scan barcode
- 💬 **Kirim via WhatsApp** — Kirim tiket + link barcode ke WA peserta
- 📧 **Kirim via Email** — Kirim tiket + link barcode ke email peserta
- 🗑️ **Hapus Data** — Hapus individual / bersihkan semua data
- 📱 **Responsive** — Bisa dipakai di HP, tablet, maupun desktop

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Database**: Supabase (PostgreSQL)
- **Barcode**: react-barcode (CODE128)
- **Scanner**: html5-qrcode
- **Excel**: xlsx
- **Animasi**: Framer Motion
- **Icons**: Lucide React
- **Styling**: Pure CSS (Dark Mode)

## 🚀 Setup

### 1. Clone & Install
```bash
git clone <repo-url>
cd E-Tiket
npm install
```

### 2. Konfigurasi Supabase
Buat tabel `participants` di Supabase dengan kolom berikut:

| Kolom | Tipe |
|-------|------|
| `barcode` | `text` (Primary Key) |
| `nama_lengkap` | `text` |
| `email` | `text` |
| `jenis_kelamin` | `text` |
| `usia` | `text` |
| `alamat` | `text` |
| `whatsapp` | `text` |
| `jenis_tiket` | `text` |
| `jumlah_tiket` | `text` |
| `metode_pembayaran` | `text` |
| `bukti_transfer` | `text` |
| `nama_pengirim` | `text` |
| `harapan_event` | `text` |
| `konfirmasi_data` | `boolean` |
| `validasi_bayar` | `text` (default: `'Pending'`) |
| `status_absen` | `text` (default: `'Pending'`) |
| `waktu_absen` | `text` |
| `created_at` | `timestamptz` (default: `now()`) |

**Disable RLS** untuk table `participants` (atau buat policy yang sesuai).

### 3. Jalankan Aplikasi
```bash
npm run dev
```

Buka browser di `http://localhost:5173`

### 4. Konfigurasi Supabase di Aplikasi
Klik ikon ⚙️ di navbar, masukkan:
- **Project URL**: `https://xxxx.supabase.co`
- **Anon Key**: `eyJhbGci...`

## 📋 Format Excel Import

Kolom yang didukung:

| Nama Kolom di Excel | Keterangan |
|---------------------|------------|
| Nama Lengkap | Nama peserta |
| Email | Alamat email |
| Jenis Kelamin | L / P |
| Usia | Angka |
| Alamat | Alamat peserta |
| Nomor WhatsApp | Format: 08xx |
| Jenis Tiket | Regular / VIP / dst |
| Jumlah Tiket | Angka |
| Metode Pembayaran | Transfer / QRIS / dst |
| Validasi Bayar | Pending / Approved |

> Jika kolom `Barcode` tidak ada di Excel, sistem akan generate otomatis.

## 📦 Build Produksi

```bash
npm run build
```

---

**Made with ❤️ for Event Management**
