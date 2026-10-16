# Sistem Absensi Karyawan — Frontend

Aplikasi web frontend untuk Sistem Absensi Karyawan berbasis React, TypeScript, Vite, dan Tailwind CSS v4. Aplikasi ini terintegrasi dengan REST API Backend Sistem Absensi.

## 🚀 Tech Stack

- **Framework & UI Library:** React 18+ (Vite)
- **Bahasa Pemrograman:** TypeScript
- **Styling & Tema:** Tailwind CSS v4 (`@tailwindcss/vite`), dark mode dengan palet Aridev Studio
- **HTTP Client:** Axios (dilengkapi Interceptor JWT & penanganan error 401)
- **Image Compression:** `browser-image-compression` (kompres foto sebelum upload)
- **Routing:** React Router DOM
- **Icons:** Inline SVG

## 📂 Struktur Proyek

```text
frontend-absensi/
├── src/
│   ├── assets/              # Aset statis (gambar, ikon)
│   ├── components/
│   │   └── ui/              # Komponen UI reusable (Toast)
│   ├── lib/
│   │   ├── api.ts           # Konfigurasi Axios + interceptor JWT
│   │   └── imageCompression.ts  # Helper kompres foto
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── components/  # Modal-modal admin
│   │   │   ├── ApprovalIzin.tsx
│   │   │   ├── ExportLaporan.tsx
│   │   │   ├── KelolaKantor.tsx
│   │   │   ├── ListKaryawan.tsx
│   │   │   └── RekapHariIni.tsx
│   │   ├── AjukanIzin.tsx
│   │   ├── DashboardAdmin.tsx
│   │   ├── DashboardKaryawan.tsx
│   │   ├── Login.tsx
│   │   ├── Profil.tsx
│   │   ├── RiwayatIzin.tsx
│   │   └── RiwayatPresensi.tsx
│   ├── App.tsx              # Routing utama aplikasi
│   ├── main.tsx             # Entry point React
│   └── index.css            # Tailwind CSS v4 + @theme dark mode
├── .env.local               # Variable lingkungan lokal
├── vite.config.ts           # Konfigurasi Vite & Tailwind Plugin
└── README.md                # Dokumentasi proyek
```

## 🔑 Kredensial Testing (Backend Railway)

| Role         | Email               | Password      |
| ------------ | ------------------- | ------------- |
| **Admin**    | `admin@test.com`    | `admin123`    |
| **HRD**      | `hrd@test.com`      | `hrd123`      |
| **Karyawan** | `karyawan@test.com` | `karyawan123` |

## ⚙️ Cara Memulai Proyek

### 1. Prasyarat

Pastikan Anda sudah menginstal **Node.js** (versi 18 ke atas) dan **npm**.

### 2. Install Dependensi

```bash
npm install
```

### 3. Konfigurasi Environment Variable

Buat file `.env.local` di root folder proyek dan tambahkan alamat Base URL backend:

```env
VITE_API_BASE_URL=https://project-attendace-production.up.railway.app
```

### 4. Jalankan Development Server

```bash
npm run dev
```

Akses aplikasi di browser pada alamat `http://localhost:5173`.

### 5. Pengecekan Kode & Tipe TypeScript

```bash
npm run lint
npx tsc --noEmit
```

### 6. Build Produksi

```bash
npm run build
```

## 📋 Progress & Rencana Pengembangan Fitur

### ✅ Selesai

**Autentikasi & Sesi**

- [x] Halaman Login dengan validasi & feedback error per status code (401, 403, 429, dll.)
- [x] JWT disimpan di `localStorage`, axios interceptor auto-attach Bearer token
- [x] Auto-redirect berdasarkan role (ADMIN/HRD → `/admin`, KARYAWAN → `/dashboard`)
- [x] Auto-logout jika token expired (401 interceptor)
- [x] Show/hide password toggle
- [x] Background gradient hitam ke biru gelap + border putih pada card

**Dashboard Karyawan**

- [x] Jam real-time (WIB) + deteksi lokasi GPS
- [x] Check-in dengan GPS + foto (kompres otomatis max 1 MB)
- [x] Check-out dengan GPS + foto
- [x] Status presensi hari ini (jam masuk, jam keluar)
- [x] Tampilan mobile-responsive
- [x] Tombol navigasi ke Riwayat, Ajukan Izin, Profil
- [x] Tombol Admin Panel (khusus HRD)

**Dashboard Admin/HRD**

- [x] Rekap Hari Ini — daftar kehadiran hari ini + kolom keterangan
- [x] List Karyawan — CRUD user dengan pagination & filter
- [x] Approval Izin — daftar pengajuan + filter status/jenis + pagination
- [x] Export Laporan — preview + download PDF & Excel (max periode 3 bulan)
- [x] Kelola Kantor — CRUD kantor dengan validasi koordinat & jam, badge radius anti-pecah
- [x] Header dengan tombol Absen (khusus HRD), Profil, Keluar

**Pengajuan Izin**

- [x] Form pengajuan dengan 3 jenis (IZIN/SAKIT/CUTI)
- [x] Validasi client-side: tanggal tidak boleh masa lalu, SAKIT wajib bukti
- [x] Upload bukti file (JPG/PNG/PDF) dengan kompres otomatis
- [x] Riwayat izin pribadi + status badge (PENDING/APPROVED/REJECTED)
- [x] Batalkan pengajuan (hanya untuk PENDING)
- [x] Tampilan alasan penolakan jika REJECTED

**Profil**

- [x] Lihat profil (read-only)
- [x] Ganti password sendiri
- [x] Avatar otomatis dari huruf pertama nama
- [x] Info box: untuk ubah data profil, hubungi Admin

**UI/UX**

- [x] Dark mode dengan palet Aridev Studio (navy gelap + biru #2864ff)
- [x] Toast notification (success/error) dengan progress bar
- [x] Modal konfirmasi (approve, reject, delete, cancel) dengan backdrop gelap
- [x] Responsive mobile (tabel anti-pecah, tab scrollable)
- [x] Format tanggal konsisten: `DD/MM/YYYY`
- [x] Kolom Keterangan untuk hari izin & auto check-out
- [x] Background gradient login (hitam ke biru gelap)

**Kompresi Foto (Fase E)**

- [x] Helper `compressImage()` di `src/lib/imageCompression.ts`
- [x] Kompres otomatis foto >1 MB sebelum upload
- [x] Max resolusi 1920×1080, kualitas 80%, format JPEG
- [x] Skip kompresi untuk file non-gambar (PDF)
- [x] Fallback ke file asli jika kompresi gagal

**Riwayat Presensi (Bug Fix)**

- [x] Endpoint `/attendances/me` untuk riwayat milik sendiri
- [x] HRD/Admin hanya lihat presensi sendiri di halaman ini

### 💡 Ide Pengembangan Lanjutan

_(Aspirasi jangka panjang — di luar scope proyek ini)_

- Aplikasi mobile native (React Native / Flutter)
- Face recognition di sisi klien (TensorFlow.js / MediaPipe)
- Dashboard analitik interaktif dengan visualisasi grafik lanjutan
- Multi-bahasa (i18n) — Indonesia, Inggris, Mandarin
- Progressive Web App offline-first dengan background sync
- Web Push Notification untuk reminder check-in / check-out
- Custom report builder drag-and-drop

## 📖 Aturan Bisnis Penting

- HRD bisa melakukan absen (check-in/out), tapi tidak bisa self-approve izinnya sendiri.
- Auto check-out hanya berlaku saat approve izin di tanggal yang sama dengan check-in.
- Karyawan yang sedang dalam masa izin APPROVED tidak bisa check-in.
- Semua tanggal ditampilkan dalam format `DD/MM/YYYY`.
- Timezone: disimpan UTC, ditampilkan WIB (UTC+7).
- Kompresi foto di frontend: max 1 MB, resolusi max 1920×1080.
- Endpoint `/attendances/me` untuk riwayat pribadi, `/attendances/history` untuk rekap semua (admin/HRD).
- User tidak bisa update profil sendiri (nama, NIK, email, kantor).
  Hanya bisa ganti password. Perubahan data profil harus lewat Admin.

## 🌐 URL Deployment

- **Frontend (Vercel):** https://frontend-absensi-iota.vercel.app
- **Backend (Railway):** https://project-attendace-production.up.railway.app
- **Swagger API Docs:** https://project-attendace-production.up.railway.app/api-docs
- **Repo GitHub:** https://github.com/112233qk/Project-Attendance

## 👨‍💻 Author

- GitHub: [@112233qk](https://github.com/112233qk)
- Email: Satrio.subakti77@gmail.com

## 📄 Lisensi

Proyek ini menggunakan lisensi **ISC**.
