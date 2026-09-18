# Backend API Sistem Absensi Karyawan

Dokumentasi utama untuk layanan REST API Sistem Absensi Karyawan berbasis Node.js, TypeScript, Prisma ORM, dan MySQL.

## Ringkasan Proyek

Aplikasi ini mengelola proses kehadiran karyawan, validasi lokasi berdasarkan koordinat GPS dan batas radius kantor, pengunggahan bukti foto kehadiran, serta manajemen permohonan izin/cuti yang memerlukan persetujuan dari pihak HRD atau Admin.

## Fitur Utama

- Autentikasi dan Otorisasi: Pengamanan akses berbasis JSON Web Token (JWT) dengan pembagian peran pengguna (KARYAWAN, HRD, ADMIN).
- Manajemen Absensi: Pencatatan waktu masuk dan pulang, verifikasi lokasi koordinat (latitude/longitude), serta pencatatan foto bukti kehadiran.
- Pengelolaan Izin dan Cuti: Pengajuan izin, sakit, atau cuti oleh karyawan beserta alur persetujuan (approval) oleh pihak pengawas.
- Manajemen Data Kantor: Pengaturan lokasi fisik kantor, batas radius lokasi aman, serta alokasi jam kerja standar.

## Stack Teknologi

- Runtime Environment: Node.js
- Bahasa Pemrograman: TypeScript
- Framework Web: Express.js
- ORM: Prisma ORM
- Database: MySQL
- Pustaka Pendukung:
  - bcrypt (Hashing kata sandi)
  - jsonwebtoken (Pengelolaan token autentikasi)
  - express-validator (Validasi input data API)
  - ts-node-dev (Eksekusi dan pemuatan ulang otomatis saat pengembangan)

## Struktur Entitas Database

Sistem ini memiliki 4 tabel utama:

1. offices: Menyimpan data lokasi kantor, koordinat GPS, radius aman, dan batas jam kerja.
2. users: Menyimpan data identitas pengguna (NIK, nama, email, password, role, serta relasi ke kantor).
3. attendances: Menyimpan catatan absensi harian (jam masuk/pulang, status keterlambatan, koordinat lokasi, dan foto).
4. permissions: Menyimpan pengajuan izin/sakit/cuti beserta status persetujuannya (approved_by).

## Struktur Direktori Proyek

```text
Project Attendance/
├── node_modules/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── routes/
│   ├── utils/
│   └── index.ts
├── .env
├── .gitignore
├── INSTALLATION.md
├── LICENSE
├── package-lock.json
├── package.json
├── README.md
└── tsconfig.json
```

## Panduan Instalasi

Petunjuk lengkap mengenai prasyarat sistem, langkah-langkah instalasi dependensi, konfigurasi lingkungan, dan penyiapan database telah dipisahkan ke dalam file:

INSTALLATION.md

## Rencana Pengembangan API

- Setup Server Express & Middleware Utama (src/index.ts)
- Modul Autentikasi (Register, Login, Middleware JWT)
- Modul Absensi (Check-in, Check-out, Riwayat Absensi)
- Modul Pengajuan Izin (Pengajuan, Persetujuan/Penolakan)
- Modul Master Data Office (Khusus Admin)
