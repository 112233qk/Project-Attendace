# Backend API Sistem Absensi Karyawan

> REST API untuk Sistem Absensi Karyawan berbasis **GPS (Haversine)** & **Verifikasi Foto Real-Time**. Dibangun dengan **Node.js, TypeScript, Express.js, Prisma ORM, dan MySQL**.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Tests](https://img.shields.io/badge/tests-129%20passed-success)](#-pengujian)
[![Coverage](https://img.shields.io/badge/coverage-78.74%25-yellowgreen)](#-pengujian)
[![License](https://img.shields.io/badge/license-ISC-blue)](LICENSE)

---

## 📋 Daftar Isi

- [Ringkasan Proyek](#-ringkasan-proyek)
- [Fitur Utama](#-fitur-utama)
- [Stack Teknologi](#-stack-teknologi)
- [Arsitektur Sistem](#-arsitektur-sistem)
- [Struktur Database](#-struktur-database)
- [Struktur Direktori](#-struktur-direktori)
- [Instalasi](#-instalasi)
- [Menjalankan Server](#-menjalankan-server)
- [Dokumentasi API](#-dokumentasi-api)
- [Pengujian](#-pengujian)
- [Environment Variables](#-environment-variables)
- [Scripts](#-scripts)
- [Roadmap](#-roadmap)
- [Kontribusi](#-kontribusi)
- [Lisensi](#-lisensi)

---

## 🎯 Ringkasan Proyek

Sistem Absensi Karyawan ini adalah **standalone backend engine** yang menyediakan REST API untuk:

- **Pencatatan kehadiran** dengan validasi lokasi GPS (Haversine Formula) dan verifikasi foto real-time.
- **Pengajuan izin/cuti** dengan alur persetujuan (approval) oleh HRD/Admin.
- **Manajemen karyawan & kantor** dengan hierarki role (RBAC).
- **Pelaporan absensi** dalam format PDF & Excel.
- **Audit trail** lengkap untuk setiap aktivitas penting.

Sistem mengadopsi konsep **geofencing** dengan radius aman kantor, mencegah praktik "titip absen" melalui kombinasi validasi GPS + bukti foto.

---

## ✨ Fitur Utama

### 🔐 Autentikasi & Otorisasi

- JWT-based authentication (stateless)
- Password hashing dengan **Bcrypt** (salt rounds: 10)
- Role-Based Access Control (RBAC): `KARYAWAN`, `HRD`, `ADMIN`
- Middleware `authenticate` & `authorize` untuk proteksi endpoint

### 📍 Manajemen Absensi

- **Check-in** dengan validasi radius kantor (**Haversine Formula**)
- **Check-out** dengan validasi urutan (wajib check-in dulu)
- Auto-deteksi status: `TEPAT_WAKTU` / `TERLAMBAT` (timezone WIB)
- Upload foto selfie/tempat (multipart/form-data, max 2MB)
- Pencegahan duplikasi check-in/out per hari

### 📝 Pengajuan Izin/Cuti

- Ajukan izin/sakit/cuti dengan upload bukti (PDF/JPG/PNG, max 5MB)
- **Validasi bisnis**:
  - Tanggal tidak boleh di masa lalu
  - `SAKIT` wajib melampirkan bukti
  - Tolak overlap dengan pengajuan yang sudah `APPROVED`
- Alur approval: `PENDING` → `APPROVED` / `REJECTED`
- Reject wajib disertai alasan (`rejectionReason`)

### 🏢 Manajemen Kantor

- CRUD kantor dengan koordinat, radius, dan jam kerja
- Validasi format jam (`HH:mm`) dan `jamMasuk < jamPulang`
- Pencegahan hapus kantor yang masih punya user

### 👥 Manajemen User

- CRUD user dengan **privilege escalation**:
  - HRD: hanya bisa kelola `KARYAWAN`
  - Admin: bisa kelola semua role
- **Soft delete** (nonaktifkan user via `isActive=false`)
- User nonaktif tidak bisa login (data historis tetap tersimpan)
- Profil sendiri: update nama & ganti password

### 📊 Pelaporan

- Export laporan absensi ke **PDF** (landscape A4) & **Excel** (.xlsx)
- Filter by periode, kantor, status kehadiran, user
- Rekapitulasi otomatis: total karyawan, tepat waktu, terlambat
- Max periode: 3 bulan per export

### 🔍 Audit Log

- Catat **setiap aktivitas penting** ke database:
  - `LOGIN`, `LOGOUT`
  - `CREATE_USER`, `UPDATE_USER`, `DELETE_USER`
  - `CREATE_OFFICE`, `UPDATE_OFFICE`, `DELETE_OFFICE`
  - `CREATE_PERMISSION`, `APPROVE_PERMISSION`, `REJECT_PERMISSION`
  - `EXPORT_REPORT`
- Menyimpan `oldValue` & `newValue` (JSON) + `description` human-readable
- Auto-capture IP address & user agent

### 📚 API Documentation

- **Swagger UI** interaktif di `/api-docs`
- OpenAPI 3.0 spec
- 29 endpoint terdokumentasi dengan contoh request/response

---

## 🛠 Stack Teknologi

| Kategori              | Teknologi                          |
| --------------------- | ---------------------------------- |
| **Runtime**           | Node.js v18+                       |
| **Language**          | TypeScript 5.x                     |
| **Framework**         | Express.js 5.x                     |
| **ORM**               | Prisma 6.x                         |
| **Database**          | MySQL 8.0+                         |
| **Authentication**    | jsonwebtoken (JWT)                 |
| **Password Hashing**  | bcrypt                             |
| **File Upload**       | multer                             |
| **PDF Generation**    | pdfkit                             |
| **Excel Generation**  | exceljs                            |
| **API Documentation** | swagger-jsdoc + swagger-ui-express |
| **Testing**           | Jest + Supertest                   |
| **Dev Tools**         | ts-node, nodemon, cross-env        |

---

## 🏗 Arsitektur Sistem

Aplikasi menggunakan **Layered Architecture** untuk _separation of concerns_:

┌─────────────────────────────────────────┐
│ Client (Web / Mobile / Postman) │
└──────────────────┬──────────────────────┘
│ HTTPS
▼
┌─────────────────────────────────────────┐
│ Routing Layer (Express Router) │
├─────────────────────────────────────────┤
│ Middleware Layer │
│ ├─ JWT Authentication │
│ ├─ RBAC Authorization │
│ └─ Multer Upload │
├─────────────────────────────────────────┤
│ Controller Layer (Business Logic) │
│ ├─ Haversine Calculation │
│ ├─ Validation │
│ └─ Audit Logging │
├─────────────────────────────────────────┤
│ Data Access Layer (Prisma ORM) │
└──────────────────┬──────────────────────┘
│
▼
┌─────────────────────────────────────────┐
│ MySQL Database │
└─────────────────────────────────────────┘

---

## 🗄 Struktur Database

Sistem mengelola **5 entitas utama**:

### 1. `offices`

Menyimpan data kantor: nama, koordinat (lat/lng), radius aman, jam kerja.

### 2. `users`

Data pengguna: NIK, nama, email, password (hashed), role, officeId, fotoProfil, isActive.

### 3. `attendances`

Catatan absensi harian: userId, tanggal, jamMasuk/Pulang, koordinat, foto, status, metode.

### 4. `permissions`

Pengajuan izin/sakit/cuti: userId, jenis, tanggal, alasan, bukti, status, approvedBy, rejectionReason.

### 5. `audit_logs`

Audit trail: userId, action, entity, oldValue, newValue, description, ipAddress, userAgent.

> 📌 Skema lengkap tersedia di [`prisma/schema.prisma`](prisma/schema.prisma).

---

## 📂 Struktur Direktori

project-attendance/
├── prisma/
│ ├── migrations/ # Riwayat migrasi database
│ └── schema.prisma # Skema database
├── public/
│ └── uploads/ # File upload user (foto absensi, bukti izin)
├── src/
│ ├── config/
│ │ ├── multer.ts # Konfigurasi upload foto absensi
│ │ ├── multerPermission.ts # Konfigurasi upload bukti izin
│ │ └── swagger.ts # Konfigurasi Swagger
│ ├── controllers/ # Business logic per modul
│ │ ├── authController.ts
│ │ ├── userController.ts
│ │ ├── officeController.ts
│ │ ├── attendanceController.ts
│ │ ├── permissionController.ts
│ │ └── reportController.ts
│ ├── docs/ # Anotasi Swagger (JSDoc)
│ │ ├── auth.docs.ts
│ │ ├── users.docs.ts
│ │ ├── offices.docs.ts
│ │ ├── attendances.docs.ts
│ │ ├── permissions.docs.ts
│ │ └── reports.docs.ts
│ ├── middlewares/
│ │ └── authMiddleware.ts # JWT + RBAC
│ ├── routes/ # Definisi endpoint
│ │ ├── authRoutes.ts
│ │ ├── userRoutes.ts
│ │ ├── officeRoutes.ts
│ │ ├── attendanceRoutes.ts
│ │ ├── permissionRoutes.ts
│ │ └── reportRoutes.ts
│ ├── types/
│ │ └── express/
│ │ └── index.d.ts # Deklarasi tipe req.user
│ ├── utils/
│ │ ├── haversine.ts # Hitung jarak antar koordinat
│ │ ├── auditLogger.ts # Helper audit log
│ │ ├── pdfGenerator.ts # Generate PDF laporan
│ │ └── excelGenerator.ts # Generate Excel laporan
│ ├── app.ts # Setup Express app (export)
│ └── server.ts # Entry point (listen)
├── tests/
│ ├── setup.ts # Setup global Jest
│ ├── helpers/
│ │ ├── authHelper.ts # Generate token untuk test
│ │ └── dbHelper.ts # Reset & seed DB
│ ├── fixtures/
│ │ └── sample.jpg # Fixture upload
│ ├── auth.test.ts
│ ├── users.test.ts
│ ├── offices.test.ts
│ ├── attendances.test.ts
│ ├── permissions.test.ts
│ └── reports.test.ts
├── .env # Environment variables (JANGAN commit)
├── .env.test # Environment untuk testing (JANGAN commit)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md

---

## ⚙️ Instalasi

### Prasyarat

- **Node.js** v18 atau lebih baru
- **MySQL** 8.0 atau lebih baru
- **Git**

## ⚙️ Instalasi

### Langkah Instalasi

**1. Clone repository:**

```bash
git clone https://github.com/username/project-attendance.git
cd project-attendance
```

**2. Install dependencies:**

```bash
npm install
```

**3. Setup environment variables:**

```bash
cp .env.example .env
```

**4. Setup database:**

```bash
npx prisma migrate dev
npx prisma generate
```

**5. (Opsional) Seed data awal:**

```bash
npx prisma studio
```

---

## 🚀 Menjalankan Server

```bash
# Compile TypeScript
npx tsc

# Jalankan server
node dist/server.js
```

Server akan berjalan di `http://localhost:3000`.

---

## 📚 Dokumentasi API

### Swagger UI

Setelah server berjalan, buka:

```
http://localhost:3000/api-docs
```

**Fitur Swagger UI:**

- 📖 Dokumentasi 29 endpoint
- 🔐 Tombol **Authorize** untuk input JWT
- 🧪 Uji endpoint langsung dari browser
- 📋 Skema request & response lengkap

### Raw OpenAPI Spec

```
http://localhost:3000/api-docs.json
```

Bisa diimpor ke **Postman** atau **Insomnia**.

### Daftar Endpoint Utama

| Modul           | Jumlah Endpoint | Contoh                             |
| --------------- | --------------- | ---------------------------------- |
| **Auth**        | 3               | `POST /api/auth/login`             |
| **Users**       | 8               | `GET /api/users/me`                |
| **Offices**     | 5               | `POST /api/offices`                |
| **Attendances** | 3               | `POST /api/attendances/check-in`   |
| **Permissions** | 7               | `PUT /api/permissions/:id/approve` |
| **Reports**     | 3               | `GET /api/reports/attendance/pdf`  |
| **Total**       | **29**          |                                    |

---

## 🧪 Pengujian

Proyek ini dilengkapi **automated testing** menggunakan **Jest + Supertest**.

### Menjalankan Test

```bash
# Semua test
npm test

# Mode watch
npm run test:watch

# Dengan coverage report
npm run test:coverage
```

### Hasil Testing Terkini

| Metrik                  | Hasil                      |
| ----------------------- | -------------------------- |
| **Test Suites**         | 6 passed / 6 total         |
| **Test Cases**          | **129 passed / 129 total** |
| **Statements Coverage** | 78.74%                     |
| **Branches Coverage**   | 65.65%                     |
| **Functions Coverage**  | 95.45%                     |
| **Lines Coverage**      | 79.15%                     |

### Setup Database Testing

Test menggunakan database terpisah `attendance_test`:

```bash
# Buat database test
mysql -u root -p -e "CREATE DATABASE attendance_test;"

# Linux/Mac
DATABASE_URL="mysql://root@localhost:3306/attendance_test" npx prisma migrate deploy

# Windows PowerShell
$env:DATABASE_URL="mysql://root@localhost:3306/attendance_test"
npx prisma migrate deploy
Remove-Item Env:\DATABASE_URL
```

---

## 🔑 Environment Variables

Buat file `.env` di root proyek:

```env
# Database Connection
DATABASE_URL="mysql://username:password@localhost:3306/attendance_db"

# JWT Secret (minimal 32 karakter, acak)
JWT_SECRET=your_super_secret_random_string_here_minimal_32_chars

# Server Port
PORT=3000

# Node Environment
NODE_ENV=development
```

### Cara Generate `JWT_SECRET` yang Aman:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 📜 Scripts

| Command                  | Deskripsi                     |
| ------------------------ | ----------------------------- |
| `npm test`               | Jalankan semua test           |
| `npm run test:watch`     | Test mode watch               |
| `npm run test:coverage`  | Test dengan coverage          |
| `npx tsc`                | Compile TypeScript ke `dist/` |
| `node dist/server.js`    | Jalankan server production    |
| `npx prisma migrate dev` | Migrasi database              |
| `npx prisma generate`    | Regenerate Prisma Client      |
| `npx prisma studio`      | Buka GUI database             |

---

## 🗺 Roadmap

### ✅ Selesai

- [x] Setup Node.js + TypeScript + Prisma
- [x] Autentikasi JWT + RBAC
- [x] Modul Attendance (Check-in/out dengan Haversine)
- [x] Modul Offices (CRUD)
- [x] Modul Users (CRUD + Soft Delete)
- [x] Modul Permissions (Izin/Cuti + Approval)
- [x] Modul Reports (PDF/Excel)
- [x] Audit Log (AI-friendly JSON snapshot)
- [x] Swagger Documentation
- [x] Automated Testing (129 tests, 78% coverage)

### 🚧 Dalam Pengembangan

- [ ] Deployment guide (Nginx + HTTPS + PM2)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Rate limiting & helmet (security hardening)
- [ ] Docker support

---

## 📄 Lisensi

Proyek ini menggunakan lisensi **ISC**. Lihat file [LICENSE](LICENSE) untuk detail.

---

## 👨‍💻 Author

**Nama Anda**

- GitHub: [@112233qk](https://github.com/112233qk)
- Email: Satrio.subakti77@gmail.com

---

## 🙏 Ucapan Terima Kasih

Proyek ini dibangun sebagai bagian dari **Tugas Akhir** dan untuk keperluan portofolio.

Referensi: IEEE Std 830-1998, dokumentasi resmi TypeScript, Express.js, Prisma ORM.
