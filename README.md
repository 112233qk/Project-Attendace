# Backend API Sistem Absensi Karyawan

> REST API untuk Sistem Absensi Karyawan berbasis **GPS (Haversine)** & **Verifikasi Foto Real-Time**. Dibangun dengan **Node.js, TypeScript, Express.js, Prisma ORM, dan MySQL**. Di-hosting di **Render** dan **TIDB Cloud**.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Tests](https://img.shields.io/badge/tests-119%20passed-success)](#-pengujian)
[![Coverage](https://img.shields.io/badge/coverage-68.5%25-yellowgreen)](#-pengujian)
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
- **Blokir check-in otomatis jika user sedang dalam izin APPROVED**
- **Auto check-out saat HRD approve izin di tanggal yang sama (skenario emergency)**
- **Endpoint `/attendances/me` untuk riwayat milik sendiri (semua role)**
- **Kolom `keterangan` untuk menandai hari izin / auto check-out**
- Wajib alasan (Modal) jika Check-in melewati jam masuk kantor.
- Wajib alasan (Modal) jika Check-out di luar jam kerja (terlalu awal / > 1 jam lembur).
- Blokir check-in otomatis jika user sedang dalam izin APPROVED (khusus untuk izin per jam, blokir hanya berlaku di dalam rentang jam izin).

### 📝 Pengajuan Izin/Cuti

- Ajukan izin/sakit/cuti dengan upload bukti (PDF/JPG/PNG, max 5MB)
- **Validasi bisnis**:
  - Tanggal tidak boleh di masa lalu
  - `SAKIT` wajib melampirkan bukti
  - Tolak overlap dengan pengajuan yang sudah `APPROVED`
- Alur approval: `PENDING` → `APPROVED` / `REJECTED`
- Reject wajib disertai alasan (`rejectionReason`)
- Izin Per Jam (Half-Day): Mendukung pengajuan izin untuk beberapa jam tertentu di hari yang sama (contoh: 10:00 - 12:00) dengan validasi overlap berdasarkan jam.

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
- Profil sendiri: lihat profil (read-only) & ganti password

### 📊 Pelaporan

- Export laporan absensi ke **PDF** (landscape A4) & **Excel** (.xlsx)
- Filter by periode, kantor, status kehadiran, user
- Rekapitulasi otomatis: total karyawan, tepat waktu, terlambat
- Max periode: 3 bulan per export
- Header Laporan Profesional: Dilengkapi dengan Logo PT. ARIDEV STUDIO CREATIVE.

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
- 30 endpoint terdokumentasi dengan contoh request/response

---

## 🛠 Stack Teknologi

| Kategori              | Teknologi                          |
| --------------------- | ---------------------------------- |
| **Runtime**           | Node.js v18+                       |
| **Language**          | TypeScript 5.x                     |
| **Framework**         | Express.js 5.x                     |
| **ORM**               | Prisma 6.x                         |
| **Hosting**           | Render                             |
| **Database**          | MySQL 8.0+ (TIDB Cloud)            |
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

```mermaid
flowchart TB
    Client["🖥️ Client<br/>(Web / Mobile / Postman)"]
    Routing["🔀 Routing Layer<br/>(Express Router)"]
    Middleware["🛡️ Middleware Layer<br/>JWT Auth • RBAC • Multer Upload"]
    Controller["⚙️ Controller Layer<br/>Business Logic • Haversine<br/>Validation • Audit Logging"]
    Data["🗄️ Data Access Layer<br/>(Prisma ORM)"]
    DB[("💾 MySQL Database")]

    Client -->|HTTPS| Routing
    Routing --> Middleware
    Middleware --> Controller
    Controller --> Data
    Data --> DB

    style Client fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style Routing fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style Middleware fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    style Controller fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style Data fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style DB fill:#eceff1,stroke:#455a64,stroke-width:2px
```

## 🗄 Struktur Database

Sistem mengelola **5 entitas utama**:

```mermaid
erDiagram
    OFFICES ||--o{ USERS : "has"
    USERS ||--o{ ATTENDANCES : "records"
    USERS ||--o{ PERMISSIONS : "requests"
    USERS ||--o{ AUDIT_LOGS : "performs"
    USERS ||--o{ PERMISSIONS : "approves"

    OFFICES {
        int id PK
        string name
        float latitude
        float longitude
        float radius
        string jam_masuk
        string jam_pulang
    }
    USERS {
        int id PK
        int office_id FK
        string nik
        string nama
        string email
        string password
        enum role
        bool is_active
    }
    ATTENDANCES {
        int id PK
        int user_id FK
        date tanggal
        datetime jam_masuk
        datetime jam_pulang
        enum status_masuk
        string keterangan
    }
    PERMISSIONS {
        int id PK
        int user_id FK
        int approved_by FK
        enum jenis
        date tanggal_mulai
        date tanggal_selesai
        string jam_mulai
        string jam_selesai
        enum status
    }
    AUDIT_LOGS {
        int id PK
        int user_id FK
        string action
        string entity
        json old_value
        json new_value
    }
```

**Deskripsi singkat:**

- **`offices`** — Data kantor: koordinat, radius, jam kerja.
- **`users`** — Karyawan & staff (role: KARYAWAN/HRD/ADMIN).
- **`attendances`** — Catatan absensi harian.
- **`permissions`** — Pengajuan izin/sakit/cuti.
- **`audit_logs`** — Audit trail semua aktivitas penting.

> 📌 Skema lengkap: [`prisma/schema.prisma`](prisma/schema.prisma)

## 📂 Struktur Direktori

<details>
<summary>Klik untuk melihat struktur folder lengkap</summary>

````text
project-attendance/
├── prisma/
│   ├── migrations/
│   │   ├── 20260907130403_sync_with_erd/
│   │   │   └── migration.sql
│   │   ├── 20260907130815_add_nik_unique/
│   │   │   └── migration.sql
│   │   ├── 20260918095317_alpha/
│   │   │   └── migration.sql
│   │   ├── 20260923001126_rename_roles_to_user_hrd_admin/
│   │   │   └── migration.sql
│   │   ├── 20260923124654_add_audit_log_and_is_active/
│   │   │   └── migration.sql
│   │   ├── 20260923125934/
│   │   │   └── migration.sql
│   │   ├── 20260924130748_add_rejection_reason_to_permissions/
│   │   │   └── migration.sql
│   │   ├── 20261013134116_add_keterangan_to_attendance/
│   │   │   └── migration.sql
│   │   ├── 20261016085700_remove_foto_profil_from_users/
│   │   │   └── migration.sql
│   │   ├── 20261031101116_add_jam_to_permissions/
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   └── schema.prisma
├── public/
│   ├── uploads/
│   │   └── permissions/
│   └── logo.png
├── src/
│   ├── config/
│   │   ├── multer.ts
│   │   ├── multerPermission.ts
│   │   └── swagger.ts
│   ├── controllers/
│   │   ├── attendanceController.ts
│   │   ├── authController.ts
│   │   ├── officeController.ts
│   │   ├── permissionController.ts
│   │   ├── reportController.ts
│   │   ├── seedController.ts
│   │   └── userController.ts
│   ├── docs/
│   │   ├── attendances.docs.ts
│   │   ├── auth.docs.ts
│   │   ├── offices.docs.ts
│   │   ├── permissions.docs.ts
│   │   ├── reports.docs.ts
│   │   └── users.docs.ts
│   ├── middlewares/
│   │   └── authMiddleware.ts
│   ├── routes/
│   │   ├── attendanceRoutes.ts
│   │   ├── authRoutes.ts
│   │   ├── officeRoutes.ts
│   │   ├── permissionRoutes.ts
│   │   ├── reportRoutes.ts
│   │   ├── seedRoutes.ts
│   │   └── userRoutes.ts
│   ├── types/
│   │   └── express/
│   │       └── index.d.ts
│   ├── utils/
│   │   ├── auditLogger.ts
│   │   ├── excelGenerator.ts
│   │   ├── haversine.ts
│   │   └── pdfGenerator.ts
│   ├── app.ts
│   └── server.ts
├── tests/
│   ├── fixtures/
│   │   └── sample.jpg
│   ├── helpers/
│   │   ├── authHelper.ts
│   │   └── dbHelper.ts
│   ├── attendances.test.ts
│   ├── auth.test.ts
│   ├── offices.test.ts
│   ├── permissions.test.ts
│   ├── reports.test.ts
│   ├── setup.ts
│   └── users.test.ts
├── INSTALLATION.md
├── LICENSE
├── package-lock.json
├── package.json
├── README.md
└── tsconfig.json

</details>

</details>
## ⚙️ Instalasi

### Prasyarat

- **Node.js** v18 atau lebih baru
- **MySQL** 8.0 atau lebih baru
- **Git**

### Langkah Instalasi

**1. Clone repository:**

```bash
git clone https://github.com/username/project-attendance.git
cd project-attendance
````

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

- 📖 Dokumentasi 30 endpoint
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
| **Users**       | 7               | `GET /api/users/me`                |
| **Offices**     | 5               | `POST /api/offices`                |
| **Attendances** | 5               | `POST /api/attendances/check-in`   |
| **Permissions** | 7               | `PUT /api/permissions/:id/approve` |
| **Reports**     | 3               | `GET /api/reports/attendance/pdf`  |
| **Total**       | **30**          |                                    |

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
| **Test Cases**          | **119 passed / 119 total** |
| **Statements Coverage** | 68.5%                      |
| **Branches Coverage**   | 57.25%                     |
| **Functions Coverage**  | 76.81%                     |
| **Lines Coverage**      | 68.26%                     |

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
# Database Connection (TIDB Cloud)
DATABASE_URL="mysql://username:password@host:port/attendance_db?ssl-mode=REQUIRED"

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
- [x] Automated Testing (119 tests, 68.5% coverage)
- [x] Fix timezone (simpan UTC asli, tampil WIB)
- [x] Kolom `keterangan` di tabel Attendances
- [x] Blokir check-in saat izin APPROVED
- [x] Auto check-out saat approve izin (emergency)
- [x] Isi keterangan otomatis untuk hari izin
- [x] Endpoint `/attendances/me`
- [x] Rate limiting (global + auth) & Helmet security headers
- [x] Fitur Izin Per Jam (Half-Day Leave) + Validasi Overlap Waktu
- [x] Wajib Alasan Telat Check-in & Check-out di luar jam kerja
- [x] Integrasi Render (Backend) & TIDB Cloud (Database)

### 💡 Ide Pengembangan Lanjutan

_(Aspirasi jangka panjang — di luar scope proyek ini)_

- Face recognition biometrik untuk verifikasi presensi (butuh model ML & dataset)
- Integrasi payroll otomatis dengan sistem HRIS eksternal
- Multi-tenant architecture (melayani banyak perusahaan dalam satu instance)
- Shift scheduling otomatis dengan algoritma penjadwalan
- Perhitungan lembur & saldo cuti otomatis sesuai aturan ketenagakerjaan
- Event-driven architecture dengan message broker (Kafka / RabbitMQ)
- SSO / OAuth 2.0 dengan Google Workspace atau Microsoft 365
- OCR surat dokter untuk validasi bukti sakit secara otomatis

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
