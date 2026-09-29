# Sistem Absensi Karyawan — Frontend

Aplikasi web frontend untuk Sistem Absensi Karyawan berbasis React, TypeScript, Vite, dan Tailwind CSS v4. Aplikasi ini terintegrasi dengan REST API Backend Sistem Absensi.

## 🚀 Tech Stack

- **Framework & UI Library:** React 18+ (Vite)
- **Bahasa Pemrograman:** TypeScript
- **Styling & Tema:** Tailwind CSS v4 (`@tailwindcss/vite`)
- **HTTP Client:** Axios (dilengkapi Interceptor JWT & penanganan error 401)
- **Form Management:** React Hook Form
- **Routing:** React Router DOM

## 📂 Struktur Proyek

```text
frontend-absensi/
├── src/
│   ├── assets/       # Aset statis (gambar, ikon)
│   ├── lib/          # Utilitas & Konfigurasi API (api.ts)
│   ├── pages/        # Halaman aplikasi (Login.tsx)
│   ├── App.tsx       # Routing utama aplikasi
│   ├── main.tsx      # Entry point React
│   └── index.css     # Import Tailwind CSS v4
├── .env.local        # Variable lingkungan lokal
├── vite.config.ts    # Konfigurasi Vite & Tailwind Plugin
└── README.md         # Dokumentasi proyek
```

## 🔑 Kredensial Testing (Backend Railway)

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@test.com` | `admin123` |
| **HRD** | `hrd@test.com` | `hrd123` |
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

- [x] **Setup Proyek:** Vite, TypeScript, Tailwind v4, Axios Interceptor
- [x] **Autentikasi:** Halaman Login terintegrasi API Backend
- [ ] **Dashboard Karyawan:** Absen Check-in (GPS + Foto), Check-out, Riwayat Absensi
- [ ] **Pengajuan Izin/Cuti:** Form pengajuan + upload bukti & list riwayat izin
- [ ] **Dashboard HRD:** Daftar Karyawan, Persetujuan/Penolakan Izin, Rekapitulasi Laporan (PDF/Excel)
- [ ] **Dashboard Admin:** Manajemen User (CRUD) & Manajemen Kantor