# API Contract — Sistem Absensi Karyawan

**Versi:** 1.0.0
**Terakhir Diperbarui:** 29 September 2026
**Untuk:** Tim Frontend (Gemini)

---

## 📌 Overview

Dokumen ini adalah **kontrak API** antara backend dan frontend. Semua detail yang dibutuhkan frontend untuk integrasi ada di sini.

### Base URL

| Environment              | URL                                                   |
| ------------------------ | ----------------------------------------------------- |
| **Production (Railway)** | `https://project-attendace-production.up.railway.app` |
| **Development (Lokal)**  | `http://localhost:3000`                               |

### Swagger UI (Interaktif)

Dokumentasi interaktif untuk testing langsung dari browser:

```
https://project-attendace-production.up.railway.app/api-docs
```

### Raw OpenAPI Spec

Untuk di-import ke Postman/Insomnia:

```
https://project-attendace-production.up.railway.app/api-docs.json
```

---

## 🔐 Authentication

Semua endpoint **kecuali `/api/auth/register` dan `/api/auth/login`** memerlukan token JWT di header:

```
Authorization: Bearer <token>
```

### Flow Autentikasi

```
1. User login → POST /api/auth/login
2. Backend balas: { token, user }
3. Frontend simpan token (localStorage / state)
4. Setiap request berikutnya: set header Authorization
5. Jika response 401 → token expired/invalid → redirect ke login
```

### Kredensial Testing (Production)

Backend production sudah di-seed dengan 3 user:

| Email               | Password      | Role     |
| ------------------- | ------------- | -------- |
| `admin@test.com`    | `admin123`    | ADMIN    |
| `hrd@test.com`      | `hrd123`      | HRD      |
| `karyawan@test.com` | `karyawan123` | KARYAWAN |

---

## 📋 Format Respons Standar

**Semua endpoint** (kecuali PDF/Excel) mengembalikan JSON dengan format **Opsi A**:

```json
{
  "success": true | false,
  "message": "Pesan untuk manusia",
  "data": { ... } | [ ... ] | null
}
```

### Contoh Response Sukses

```json
{
  "success": true,
  "message": "Login berhasil.",
  "data": {
    "token": "eyJhbGciOiJIUzI1...",
    "user": { "id": 1, "nama": "Super Admin", "role": "ADMIN" }
  }
}
```

### Contoh Response Error

```json
{
  "success": false,
  "message": "Email atau password salah.",
  "data": null
}
```

### Response Khusus: PDF & Excel

Endpoint `/api/reports/attendance/pdf` dan `/excel` mengembalikan **file binary**, bukan JSON.

**Response Headers:**

```
Content-Type: application/pdf  (atau spreadsheet)
Content-Disposition: attachment; filename="laporan-absensi-..."
```

Frontend perlu handle ini dengan **`response.blob()`** di fetch.

---

## 📊 HTTP Status Code

| Kode    | Arti         | Kapan Muncul                      | Aksi Frontend               |
| ------- | ------------ | --------------------------------- | --------------------------- |
| **200** | OK           | Request sukses (GET, PUT, DELETE) | Tampilkan data              |
| **201** | Created      | Data baru dibuat (POST)           | Tampilkan sukses            |
| **400** | Bad Request  | Validasi gagal                    | Tampilkan pesan error       |
| **401** | Unauthorized | Belum login / token invalid       | Redirect ke login           |
| **403** | Forbidden    | Tidak punya akses (RBAC)          | Tampilkan "Akses ditolak"   |
| **404** | Not Found    | Data tidak ditemukan              | Tampilkan "Tidak ditemukan" |
| **500** | Server Error | Error internal server             | Tampilkan "Coba lagi nanti" |

---

## 🎯 Common Query Parameters

Beberapa endpoint mendukung query param ini:

| Param    | Tipe    | Contoh         | Keterangan                     |
| -------- | ------- | -------------- | ------------------------------ |
| `page`   | integer | `?page=1`      | Halaman (default: 1)           |
| `limit`  | integer | `?limit=10`    | Item per halaman (default: 10) |
| `search` | string  | `?search=budi` | Pencarian teks                 |

### Contoh Response dengan Pagination

```json
{
  "success": true,
  "message": "Daftar user berhasil diambil.",
  "data": {
    "users": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

---

## 📦 MODUL 1: AUTH (3 endpoint)

### 1.1. Register — `POST /api/auth/register`

**Akses:** Publik (tanpa token)

**Request Body (JSON):**

```json
{
  "nik": "KRY001",
  "nama": "Budi Karyawan",
  "email": "budi@test.com",
  "password": "budi123",
  "officeId": 1
}
```

| Field    | Tipe    | Wajib | Keterangan               |
| -------- | ------- | ----- | ------------------------ |
| nik      | string  | ✅    | Unik, 3-50 karakter      |
| nama     | string  | ✅    | 2-100 karakter           |
| email    | string  | ✅    | Format email valid, unik |
| password | string  | ✅    | Min 6 karakter           |
| officeId | integer | ❌    | Nullable                 |

**Response Sukses (201 Created):**

```json
{
  "success": true,
  "message": "Registrasi berhasil. Silakan login.",
  "data": {
    "id": 4,
    "nik": "KRY001",
    "nama": "Budi Karyawan",
    "email": "budi@test.com",
    "role": "KARYAWAN",
    "officeId": 1,
    "isActive": true,
    "createdAt": "2026-09-29T12:00:00.000Z"
  }
}
```

**Response Error (400):**

```json
{
  "success": false,
  "message": "NIK sudah terdaftar.",
  "data": null
}
```

**Catatan:** Register publik **selalu** menghasilkan role `KARYAWAN`. Untuk membuat HRD/Admin, gunakan endpoint `POST /api/users` (khusus HRD/Admin).

---

### 1.2. Login — `POST /api/auth/login`

**Akses:** Publik (tanpa token)

**Request Body (JSON):**

```json
{
  "email": "admin@test.com",
  "password": "admin123"
}
```

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "Login berhasil.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "nik": "ADMIN001",
      "nama": "Super Admin",
      "email": "admin@test.com",
      "role": "ADMIN",
      "officeId": 1,
      "fotoProfil": null
    }
  }
}
```

**Response Error (401):**

```json
{
  "success": false,
  "message": "Email atau password salah.",
  "data": null
}
```

**Response Error (403) — Akun dinonaktifkan:**

```json
{
  "success": false,
  "message": "Akun Anda telah dinonaktifkan. Hubungi Admin untuk informasi lebih lanjut.",
  "data": null
}
```

**Catatan Frontend:**

- Simpan `token` di **localStorage** atau **state management** (Redux/Zustand/Context).
- Simpan juga info `user` (nama, role, dll) untuk menampilkan profil.
- Gunakan token di semua request selanjutnya via header `Authorization: Bearer <token>`.

---

### 1.3. Logout — `POST /api/auth/logout`

**Akses:** Semua role (butuh token)

**Request Body:** Tidak ada

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "Logout berhasil.",
  "data": null
}
```

**Catatan Frontend:**

- Endpoint ini hanya mencatat aktivitas logout ke **audit log** di backend.
- Frontend tetap perlu **hapus token** dari localStorage.
- Setelah logout, redirect ke halaman login.

---

## 📦 MODUL 2: USERS (8 endpoint)

### 2.1. List Users — `GET /api/users`

**Akses:** HRD, Admin

**Query Parameters:**
| Param | Tipe | Keterangan |
|-------|------|------------|
| `role` | string | Filter by role (`KARYAWAN`, `HRD`, `ADMIN`) |
| `officeId` | integer | Filter by kantor |
| `isActive` | boolean | Filter status aktif |
| `search` | string | Cari di nama, NIK, atau email |
| `page` | integer | Halaman (default: 1) |
| `limit` | integer | Item per halaman (default: 10) |

**RBAC:**

- **HRD**: hanya melihat user dengan role `KARYAWAN`
- **Admin**: melihat semua role

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "Daftar user berhasil diambil.",
  "data": {
    "users": [
      {
        "id": 3,
        "nik": "KRY001",
        "nama": "Test Karyawan",
        "email": "karyawan@test.com",
        "role": "KARYAWAN",
        "officeId": 1,
        "fotoProfil": null,
        "isActive": true,
        "createdAt": "2026-09-29T12:00:00.000Z",
        "updatedAt": "2026-09-29T12:00:00.000Z",
        "office": { "id": 1, "name": "Kantor Pusat" }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

**Contoh Request:**

```
GET /api/users?role=KARYAWAN&search=budi&page=1&limit=5
```

---

### 2.2. Detail User — `GET /api/users/:id`

**Akses:** HRD, Admin

**URL Parameter:** `id` (integer)

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "Detail user berhasil diambil.",
  "data": {
    "id": 3,
    "nik": "KRY001",
    "nama": "Test Karyawan",
    "email": "karyawan@test.com",
    "role": "KARYAWAN",
    "officeId": 1,
    "fotoProfil": null,
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "...",
    "office": { "id": 1, "name": "Kantor Pusat" }
  }
}
```

**Response Error (403):** HRD mencoba akses HRD/Admin
**Response Error (404):** User tidak ditemukan

---

### 2.3. Create User — `POST /api/users`

**Akses:** HRD, Admin

**Request Body (JSON):**

```json
{
  "nik": "KRY002",
  "nama": "Andi Karyawan",
  "email": "andi@test.com",
  "password": "andi123",
  "role": "KARYAWAN",
  "officeId": 1,
  "fotoProfil": null
}
```

| Field      | Tipe    | Wajib | Keterangan                           |
| ---------- | ------- | ----- | ------------------------------------ |
| nik        | string  | ✅    | Unik, 3-50 karakter                  |
| nama       | string  | ✅    | 2-100 karakter                       |
| email      | string  | ✅    | Format email valid, unik             |
| password   | string  | ✅    | Min 6 karakter                       |
| role       | string  | ❌    | `KARYAWAN` (default), `HRD`, `ADMIN` |
| officeId   | integer | ❌    | Nullable                             |
| fotoProfil | string  | ❌    | Path foto profil                     |

**Privilege Escalation:**

- **HRD** hanya bisa membuat user dengan role `KARYAWAN`
- **Admin** bisa membuat semua role

**Response Sukses (201 Created):**

```json
{
  "success": true,
  "message": "User berhasil dibuat.",
  "data": {
    "id": 4,
    "nik": "KRY002",
    "nama": "Andi Karyawan",
    "email": "andi@test.com",
    "role": "KARYAWAN",
    "officeId": 1,
    "fotoProfil": null,
    "isActive": true,
    "createdAt": "..."
  }
}
```

**Response Error (403) — HRD coba buat HRD/Admin:**

```json
{
  "success": false,
  "message": "Akses ditolak. Anda tidak dapat membuat user dengan role tersebut.",
  "data": null
}
```

---

### 2.4. Update User — `PUT /api/users/:id`

**Akses:** HRD, Admin

**URL Parameter:** `id` (integer)

**Request Body (JSON):** — Semua field opsional (parsial)

```json
{
  "nama": "Budi Updated",
  "email": "budi2@test.com",
  "password": "newpass123",
  "role": "HRD",
  "officeId": 2,
  "fotoProfil": "/uploads/profil/budi.jpg",
  "isActive": true
}
```

**Batasan:**

- **HRD** hanya bisa update user dengan role `KARYAWAN`
- **Password** user lain hanya bisa diubah oleh **Admin**
- Update bersifat **parsial** — hanya field yang dikirim yang diubah

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "User berhasil diperbarui.",
  "data": { "...data user baru..." }
}
```

---

### 2.5. Soft Delete User — `DELETE /api/users/:id`

**Akses:** HRD, Admin

**URL Parameter:** `id` (integer)

**Perilaku:** Set `isActive = false` (soft delete). Data historis (absensi, izin) tetap tersimpan.

**Batasan:**

- Tidak bisa menonaktifkan diri sendiri
- HRD hanya bisa nonaktifkan user `KARYAWAN`
- Admin bisa nonaktifkan semua role

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "User berhasil dinonaktifkan.",
  "data": null
}
```

**Response Error (400) — Nonaktifkan diri sendiri:**

```json
{
  "success": false,
  "message": "Anda tidak dapat menonaktifkan akun Anda sendiri.",
  "data": null
}
```

---

### 2.6. Get My Profile — `GET /api/users/me`

**Akses:** Semua role login

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "Profil berhasil diambil.",
  "data": {
    "id": 1,
    "nik": "ADMIN001",
    "nama": "Super Admin",
    "email": "admin@test.com",
    "role": "ADMIN",
    "officeId": 1,
    "fotoProfil": null,
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "...",
    "office": { "id": 1, "name": "Kantor Pusat" }
  }
}
```

---

### 2.7. Update My Profile — `PUT /api/users/me`

**Akses:** Semua role login

**Request Body (JSON):**

```json
{
  "nama": "Nama Baru",
  "fotoProfil": "/uploads/profil/user.jpg"
}
```

**Catatan:** User hanya bisa update `nama` dan `fotoProfil`. Untuk update email/role/officeId, gunakan `PUT /api/users/:id` (khusus HRD/Admin).

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "Profil berhasil diperbarui.",
  "data": { "...data user..." }
}
```

---

### 2.8. Change Password — `PUT /api/users/me/password`

**Akses:** Semua role login

**Request Body (JSON):**

```json
{
  "oldPassword": "admin123",
  "newPassword": "newpass123"
}
```

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "Password berhasil diubah.",
  "data": null
}
```

**Response Error (400) — Password lama salah:**

```json
{
  "success": false,
  "message": "Password lama tidak sesuai.",
  "data": null
}
```

---

## 🎯 Catatan untuk Frontend

### Token Management

```javascript
// Setelah login
localStorage.setItem("token", data.token);
localStorage.setItem("user", JSON.stringify(data.user));

// Setiap request (contoh dengan fetch)
const token = localStorage.getItem("token");
fetch("https://.../api/users", {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});
```

### Handling 401 (Token Expired)

```javascript
if (response.status === 401) {
  localStorage.removeItem("token");
  window.location.href = "/login";
}
```

### Contoh Full Flow Login

````javascript
async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!data.success) {
    alert(data.message);
    return;
  }

  localStorage.setItem("token", data.data.token);
  localStorage.setItem("user", JSON.stringify(data.data.user));
  window.location.href = "/dashboard";
}
---

## 📦 MODUL 3: OFFICES (5 endpoint)

### 3.1. List Offices — `GET /api/offices`

**Akses:** Semua role login

**Response Sukses (200 OK):**
```json
{
  "success": true,
  "message": "Daftar kantor berhasil diambil.",
  "data": [
    {
      "id": 1,
      "name": "Kantor Pusat",
      "latitude": -6.2088,
      "longitude": 106.8456,
      "radius": 50,
      "jamMasuk": "08:00",
      "jamPulang": "17:00",
      "createdAt": "2026-09-29T12:00:00.000Z",
      "updatedAt": "2026-09-29T12:00:00.000Z",
      "_count": { "users": 3 }
    }
  ]
}
````

**Catatan Frontend:** `_count.users` = jumlah karyawan di kantor tersebut. Berguna untuk menampilkan info di UI.

---

### 3.2. Detail Office — `GET /api/offices/:id`

**Akses:** Semua role login

**URL Parameter:** `id` (integer)

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "Detail kantor berhasil diambil.",
  "data": {
    "id": 1,
    "name": "Kantor Pusat",
    "latitude": -6.2088,
    "longitude": 106.8456,
    "radius": 50,
    "jamMasuk": "08:00",
    "jamPulang": "17:00",
    "createdAt": "...",
    "updatedAt": "...",
    "_count": { "users": 3 }
  }
}
```

**Response Error (404):**

```json
{
  "success": false,
  "message": "Kantor tidak ditemukan.",
  "data": null
}
```

---

### 3.3. Create Office — `POST /api/offices`

**Akses:** HRD, Admin

**Request Body (JSON):**

```json
{
  "name": "Kantor Cabang Test",
  "latitude": -6.3,
  "longitude": 106.9,
  "radius": 75,
  "jamMasuk": "09:00",
  "jamPulang": "18:00"
}
```

| Field     | Tipe   | Wajib | Validasi                         |
| --------- | ------ | ----- | -------------------------------- |
| name      | string | ✅    | 3-100 karakter                   |
| latitude  | number | ✅    | -90 s/d 90                       |
| longitude | number | ✅    | -180 s/d 180                     |
| radius    | number | ✅    | > 0 (dalam meter)                |
| jamMasuk  | string | ✅    | Format `HH:mm` (contoh: `08:00`) |
| jamPulang | string | ✅    | Format `HH:mm`                   |

**Validasi Khusus:**

- `jamMasuk` harus **lebih awal** dari `jamPulang`
- Format jam harus tepat `HH:mm` (jam 2 digit, menit 2 digit)

**Response Sukses (201 Created):**

```json
{
  "success": true,
  "message": "Kantor berhasil dibuat.",
  "data": {
    "id": 2,
    "name": "Kantor Cabang Test",
    "latitude": -6.3,
    "longitude": 106.9,
    "radius": 75,
    "jamMasuk": "09:00",
    "jamPulang": "18:00",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Response Error (400) — Format jam salah:**

```json
{
  "success": false,
  "message": "Format jamMasuk tidak valid. Gunakan format HH:mm (contoh: 08:00).",
  "data": null
}
```

**Response Error (400) — Jam terbalik:**

```json
{
  "success": false,
  "message": "Jam masuk harus lebih awal dari jam pulang.",
  "data": null
}
```

---

### 3.4. Update Office — `PUT /api/offices/:id`

**Akses:** HRD, Admin

**URL Parameter:** `id` (integer)

**Request Body (JSON):** — Semua field opsional (parsial)

```json
{
  "name": "Kantor Pusat Updated",
  "radius": 100,
  "jamMasuk": "08:30"
}
```

**Validasi Khusus:** `jamMasuk` < `jamPulang` (cross-validasi dengan data existing).

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "Kantor berhasil diperbarui.",
  "data": { "...data kantor baru..." }
}
```

**Response Error (400) — Tidak ada data diupdate:**

```json
{
  "success": false,
  "message": "Tidak ada data yang perlu diupdate.",
  "data": null
}
```

---

### 3.5. Delete Office — `DELETE /api/offices/:id`

**Akses:** **Admin only** (HRD tidak boleh delete)

**URL Parameter:** `id` (integer)

**Batasan:**

- Kantor **tidak bisa dihapus** jika masih memiliki user terkait
- Pindahkan user ke kantor lain terlebih dahulu

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "Kantor berhasil dihapus.",
  "data": null
}
```

**Response Error (400) — Masih punya user:**

```json
{
  "success": false,
  "message": "Kantor tidak dapat dihapus karena masih memiliki 3 karyawan terkait. Pindahkan karyawan terlebih dahulu.",
  "data": null
}
```

**Response Error (403) — HRD coba delete:**

```json
{
  "success": false,
  "message": "Akses ditolak. Anda tidak memiliki izin.",
  "data": null
}
```

---

## 📦 MODUL 4: ATTENDANCES (3 endpoint)

### 4.1. Check-in — `POST /api/attendances/check-in`

**Akses:** Karyawan

**Content-Type:** `multipart/form-data`

**Form Data:**

| Field       | Tipe   | Wajib | Keterangan                    |
| ----------- | ------ | ----- | ----------------------------- |
| latitude    | string | ✅    | Contoh: `-6.2088`             |
| longitude   | string | ✅    | Contoh: `106.8456`            |
| fotoMasuk   | File   | ✅    | JPG/JPEG/PNG, maks 2MB        |
| metodeMasuk | string | ❌    | `GPS` (default) atau `MANUAL` |

**Proses Backend:**

1. Validasi radius dengan **Haversine Formula** — user harus dalam radius kantor.
2. Auto-tentukan status: `TEPAT_WAKTU` (jika ≤ jamMasuk kantor) atau `TERLAMBAT`.
3. Cegah duplikasi check-in di hari yang sama.
4. Simpan foto ke server.

**Contoh Request (JavaScript Fetch):**

```javascript
const formData = new FormData();
formData.append("latitude", "-6.2088");
formData.append("longitude", "106.8456");
formData.append("metodeMasuk", "GPS");
formData.append("fotoMasuk", fileInput.files[0]);

const res = await fetch(`${BASE_URL}/api/attendances/check-in`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  // JANGAN set Content-Type — biar browser yang handle
  body: formData,
});
```

**Response Sukses (201 Created):**

```json
{
  "success": true,
  "message": "Check-in berhasil.",
  "data": {
    "id": 1,
    "userId": 3,
    "tanggal": "2026-09-29T00:00:00.000Z",
    "jamMasuk": "2026-09-29T01:15:30.000Z",
    "latMasuk": -6.2088,
    "lngMasuk": 106.8456,
    "fotoMasuk": "/uploads/fotoMasuk-1789726544503.png",
    "latPulang": null,
    "lngPulang": null,
    "fotoPulang": null,
    "statusMasuk": "TERLAMBAT",
    "metodeMasuk": "GPS",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Response Error (400) — Di luar radius:**

```json
{
  "success": false,
  "message": "Anda berada di luar radius kantor. Jarak Anda: 1523.45 meter, Radius maksimal: 50 meter.",
  "data": null
}
```

**Response Error (400) — Duplikasi:**

```json
{
  "success": false,
  "message": "Anda sudah melakukan check-in hari ini.",
  "data": null
}
```

**Response Error (400) — File terlalu besar:**

```json
{
  "success": false,
  "message": "Ukuran file terlalu besar. Maksimal 2MB.",
  "data": null
}
```

**Catatan Frontend:**

- Foto **wajib** diambil real-time dari kamera perangkat (bukan dari galeri).
- Gunakan `<input type="file" accept="image/*" capture="user">` atau MediaDevices API.
- Baca **Geolocation API** untuk dapat `latitude` & `longitude`.

---

### 4.2. Check-out — `POST /api/attendances/check-out`

**Akses:** Karyawan

**Content-Type:** `multipart/form-data`

**Form Data:**

| Field      | Tipe   | Wajib | Keterangan             |
| ---------- | ------ | ----- | ---------------------- |
| latitude   | string | ✅    | Contoh: `-6.2088`      |
| longitude  | string | ✅    | Contoh: `106.8456`     |
| fotoPulang | File   | ✅    | JPG/JPEG/PNG, maks 2MB |

**Proses Backend:**

1. Cari record absensi hari ini yang belum check-out.
2. Update `jamPulang`, koordinat, dan foto.
3. Jika belum check-in atau sudah check-out → tolak.

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "Check-out berhasil.",
  "data": {
    "id": 1,
    "userId": 3,
    "tanggal": "2026-09-29T00:00:00.000Z",
    "jamMasuk": "2026-09-29T01:15:30.000Z",
    "jamPulang": "2026-09-29T10:30:00.000Z",
    "latPulang": -6.2088,
    "lngPulang": 106.8456,
    "fotoPulang": "/uploads/fotoPulang-1789730000000.png",
    "statusMasuk": "TERLAMBAT",
    "metodeMasuk": "GPS"
  }
}
```

**Response Error (400) — Belum check-in:**

```json
{
  "success": false,
  "message": "Anda belum melakukan check-in hari ini atau sudah melakukan check-out.",
  "data": null
}
```

---

### 4.3. Riwayat Absensi — `GET /api/attendances/history`

**Akses:** Semua role login

**Query Parameters:**
| Param | Tipe | Keterangan |
|-------|------|------------|
| `userId` | integer | **Hanya berlaku untuk HRD/Admin**. Karyawan selalu lihat milik sendiri. |
| `tanggal` | string | Filter tanggal spesifik (format `YYYY-MM-DD`) |

**RBAC:**

- **Karyawan**: hanya melihat riwayat milik sendiri (parameter `userId` diabaikan)
- **HRD/Admin**: melihat semua riwayat, atau filter by `userId`

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "Riwayat absensi berhasil diambil.",
  "data": [
    {
      "id": 1,
      "userId": 3,
      "tanggal": "2026-09-29T00:00:00.000Z",
      "jamMasuk": "2026-09-29T01:15:30.000Z",
      "jamPulang": "2026-09-29T10:30:00.000Z",
      "latMasuk": -6.2088,
      "lngMasuk": 106.8456,
      "fotoMasuk": "/uploads/fotoMasuk-xxx.png",
      "latPulang": -6.2088,
      "lngPulang": 106.8456,
      "fotoPulang": "/uploads/fotoPulang-xxx.png",
      "statusMasuk": "TERLAMBAT",
      "metodeMasuk": "GPS",
      "createdAt": "...",
      "updatedAt": "...",
      "user": {
        "nama": "Test Karyawan",
        "nik": "KRY001",
        "email": "karyawan@test.com"
      }
    }
  ]
}
```

**Contoh Request:**

```
GET /api/attendances/history?userId=3&tanggal=2026-09-29
```

**Catatan Frontend:**

- Untuk akses foto: gabungkan `BASE_URL` + path foto: `${BASE_URL}${data.fotoMasuk}`.
- Urutan default: descending by tanggal (terbaru duluan).

---

## 📦 MODUL 5: PERMISSIONS (7 endpoint)

### 5.1. Ajukan Izin/Cuti — `POST /api/permissions`

**Akses:** Karyawan (HRD/Admin **dilarang** ajukan — mereka hanya approve/reject)

**Content-Type:** `multipart/form-data`

**Form Data:**

| Field          | Tipe   | Wajib | Keterangan                                                         |
| -------------- | ------ | ----- | ------------------------------------------------------------------ |
| jenis          | string | ✅    | `IZIN`, `SAKIT`, atau `CUTI`                                       |
| tanggalMulai   | string | ✅    | Format `YYYY-MM-DD`                                                |
| tanggalSelesai | string | ✅    | Format `YYYY-MM-DD`                                                |
| alasan         | string | ✅    | Min 5 karakter                                                     |
| buktiFile      | File   | ⚠️    | **Wajib untuk `SAKIT`** (surat dokter). JPG/JPEG/PNG/PDF, maks 5MB |

**Validasi Backend:**

- `tanggalMulai` tidak boleh di masa lalu
- `tanggalMulai` ≤ `tanggalSelesai`
- Untuk jenis `SAKIT`, **wajib** lampirkan bukti
- Tidak boleh overlap dengan pengajuan yang sudah `APPROVED`

**Contoh Request (JavaScript Fetch):**

```javascript
const formData = new FormData();
formData.append("jenis", "SAKIT");
formData.append("tanggalMulai", "2026-10-01");
formData.append("tanggalSelesai", "2026-10-03");
formData.append("alasan", "Demam tinggi, ada surat dokter");
formData.append("buktiFile", fileInput.files[0]);

const res = await fetch(`${BASE_URL}/api/permissions`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

**Response Sukses (201 Created):**

```json
{
  "success": true,
  "message": "Pengajuan berhasil dibuat.",
  "data": {
    "id": 1,
    "userId": 3,
    "jenis": "SAKIT",
    "tanggalMulai": "2026-10-01T00:00:00.000Z",
    "tanggalSelesai": "2026-10-03T00:00:00.000Z",
    "alasan": "Demam tinggi, ada surat dokter",
    "buktiFile": "/uploads/permissions/bukti-1789730000000.pdf",
    "status": "PENDING",
    "rejectionReason": null,
    "approvedBy": null,
    "createdAt": "...",
    "updatedAt": "...",
    "user": {
      "id": 3,
      "nama": "Test Karyawan",
      "nik": "KRY001",
      "email": "karyawan@test.com"
    }
  }
}
```

**Response Error (400) — SAKIT tanpa bukti:**

```json
{
  "success": false,
  "message": "Pengajuan SAKIT wajib melampirkan bukti (surat dokter).",
  "data": null
}
```

**Response Error (400) — Tanggal masa lalu:**

```json
{
  "success": false,
  "message": "Tanggal mulai tidak boleh di masa lalu.",
  "data": null
}
```

**Response Error (400) — Overlap:**

```json
{
  "success": false,
  "message": "Anda sudah memiliki pengajuan yang disetujui pada rentang tanggal tersebut.",
  "data": null
}
```

**Response Error (403) — HRD coba ajukan:**

```json
{
  "success": false,
  "message": "Akses ditolak. Anda tidak memiliki izin.",
  "data": null
}
```

---

### 5.2. List Pengajuan — `GET /api/permissions`

**Akses:** Semua role login

**Query Parameters:**
| Param | Tipe | Keterangan |
|-------|------|------------|
| `status` | string | `PENDING`, `APPROVED`, `REJECTED` |
| `jenis` | string | `IZIN`, `SAKIT`, `CUTI` |
| `userId` | integer | **Hanya untuk HRD/Admin** |
| `tanggalMulai` | string | Filter tanggal (`YYYY-MM-DD`) |
| `tanggalSelesai` | string | Filter tanggal (`YYYY-MM-DD`) |
| `page` | integer | Default: 1 |
| `limit` | integer | Default: 10 |

**RBAC:**

- **Karyawan**: hanya melihat pengajuan sendiri
- **HRD/Admin**: melihat semua, atau filter by `userId`

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "Daftar pengajuan berhasil diambil.",
  "data": {
    "permissions": [
      {
        "id": 1,
        "userId": 3,
        "approvedBy": null,
        "jenis": "SAKIT",
        "tanggalMulai": "2026-10-01T00:00:00.000Z",
        "tanggalSelesai": "2026-10-03T00:00:00.000Z",
        "alasan": "Demam tinggi",
        "buktiFile": "/uploads/permissions/bukti-xxx.pdf",
        "status": "PENDING",
        "rejectionReason": null,
        "createdAt": "...",
        "updatedAt": "...",
        "user": {
          "id": 3,
          "nama": "Test Karyawan",
          "nik": "KRY001",
          "email": "karyawan@test.com"
        },
        "approver": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

**Contoh Request:**

```
GET /api/permissions?status=PENDING&jenis=SAKIT&page=1&limit=10
```

---

### 5.3. Detail Pengajuan — `GET /api/permissions/:id`

**Akses:** Semua role login (Karyawan hanya bisa lihat milik sendiri)

**URL Parameter:** `id` (integer)

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "Detail pengajuan berhasil diambil.",
  "data": {
    "id": 1,
    "userId": 3,
    "approvedBy": 2,
    "jenis": "CUTI",
    "tanggalMulai": "...",
    "tanggalSelesai": "...",
    "alasan": "...",
    "buktiFile": null,
    "status": "APPROVED",
    "rejectionReason": null,
    "createdAt": "...",
    "updatedAt": "...",
    "user": {
      "id": 3,
      "nama": "Test Karyawan",
      "nik": "KRY001",
      "email": "..."
    },
    "approver": { "id": 2, "nama": "Test HRD", "role": "HRD" }
  }
}
```

**Response Error (403) — Karyawan akses milik orang lain:**

```json
{
  "success": false,
  "message": "Akses ditolak. Anda tidak memiliki izin.",
  "data": null
}
```

---

### 5.4. Update Pengajuan — `PUT /api/permissions/:id`

**Akses:** Pemilik pengajuan (Karyawan)

**URL Parameter:** `id` (integer)

**Content-Type:** `multipart/form-data`

**Batasan:**

- Hanya **pemilik pengajuan** yang bisa update
- Hanya bisa update saat status masih **`PENDING`**
- Setelah APPROVED/REJECTED, tidak bisa diubah

**Form Data:**

| Field          | Tipe   | Keterangan             |
| -------------- | ------ | ---------------------- |
| jenis          | string | Opsional               |
| tanggalMulai   | string | Opsional               |
| tanggalSelesai | string | Opsional               |
| alasan         | string | Opsional               |
| buktiFile      | File   | Opsional (ganti bukti) |

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "Pengajuan berhasil diperbarui.",
  "data": { "...data pengajuan baru..." }
}
```

**Response Error (400) — Setelah approve:**

```json
{
  "success": false,
  "message": "Pengajuan yang sudah diproses tidak dapat diubah.",
  "data": null
}
```

---

### 5.5. Batalkan Pengajuan — `DELETE /api/permissions/:id`

**Akses:** Pemilik pengajuan (Karyawan)

**URL Parameter:** `id` (integer)

**Batasan:** Hanya bisa dibatalkan saat status masih **`PENDING`**.

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "Pengajuan berhasil dibatalkan.",
  "data": null
}
```

---

### 5.6. Setujui Pengajuan — `PUT /api/permissions/:id/approve`

**Akses:** HRD, Admin

**URL Parameter:** `id` (integer)

**Request Body:** Tidak ada

**Efek:**

- Status berubah menjadi `APPROVED`
- Field `approvedBy` di-set ke ID user yang approve
- Tercatat di audit log

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "Pengajuan berhasil disetujui.",
  "data": {
    "id": 1,
    "status": "APPROVED",
    "approvedBy": 2,
    "user": { "id": 3, "nama": "Test Karyawan", "nik": "KRY001" },
    "approver": { "id": 2, "nama": "Test HRD", "role": "HRD" }
  }
}
```

**Response Error (400) — Sudah diproses:**

```json
{
  "success": false,
  "message": "Pengajuan sudah diproses sebelumnya (status: APPROVED).",
  "data": null
}
```

---

### 5.7. Tolak Pengajuan — `PUT /api/permissions/:id/reject`

**Akses:** HRD, Admin

**URL Parameter:** `id` (integer)

**Request Body (JSON):**

```json
{
  "rejectionReason": "Surat dokter tidak jelas, mohon upload ulang"
}
```

**Validasi:** `rejectionReason` wajib, minimal 5 karakter.

**Efek:**

- Status berubah menjadi `REJECTED`
- Field `rejectionReason` di-set
- Field `approvedBy` di-set ke ID user yang reject
- Tercatat di audit log

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "Pengajuan berhasil ditolak.",
  "data": {
    "id": 1,
    "status": "REJECTED",
    "approvedBy": 2,
    "rejectionReason": "Surat dokter tidak jelas, mohon upload ulang"
  }
}
```

**Response Error (400) — Tanpa alasan:**

```json
{
  "success": false,
  "message": "Alasan penolakan wajib diisi (minimal 5 karakter).",
  "data": null
}
```

---

## 📦 MODUL 6: REPORTS (3 endpoint)

**Akses semua endpoint:** HRD, Admin (Karyawan **tidak boleh** akses)

### 6.1. Preview Data Laporan — `GET /api/reports/attendance/preview`

**Query Parameters (WAJIB):**
| Param | Tipe | Keterangan |
|-------|------|------------|
| `tanggalMulai` | string | Format `YYYY-MM-DD` |
| `tanggalSelesai` | string | Format `YYYY-MM-DD` |

**Query Parameters (OPSIONAL):**
| Param | Tipe | Keterangan |
|-------|------|------------|
| `officeId` | integer | Filter kantor |
| `statusKehadiran` | string | `TEPAT_WAKTU` atau `TERLAMBAT` |
| `userId` | integer | Filter user spesifik |

**Batasan:** Maksimal periode **3 bulan (92 hari)** per request.

**Response Sukses (200 OK):**

```json
{
  "success": true,
  "message": "Preview laporan berhasil diambil.",
  "data": {
    "periode": {
      "mulai": "01-09-2026",
      "selesai": "30-09-2026"
    },
    "officeFilter": "Kantor Pusat",
    "records": [
      {
        "nik": "KRY001",
        "nama": "Test Karyawan",
        "kantor": "Kantor Pusat",
        "tanggal": "29-09-2026",
        "jamMasuk": "08:15:30",
        "statusMasuk": "TERLAMBAT",
        "jamPulang": "17:00:00",
        "totalJamKerja": "8 jam 44 menit",
        "keterangan": "-"
      }
    ],
    "recap": {
      "totalKaryawan": 1,
      "totalTepatWaktu": 0,
      "totalTerlambat": 1,
      "totalHariKerja": 1
    }
  }
}
```

**Response Error (400) — Tanpa tanggal:**

```json
{
  "success": false,
  "message": "Parameter tanggalMulai dan tanggalSelesai wajib diisi.",
  "data": null
}
```

**Response Error (400) — Format salah:**

```json
{
  "success": false,
  "message": "Format tanggal tidak valid. Gunakan YYYY-MM-DD.",
  "data": null
}
```

**Response Error (400) — Periode > 3 bulan:**

```json
{
  "success": false,
  "message": "Periode maksimum 3 bulan (92 hari) per export.",
  "data": null
}
```

---

### 6.2. Export PDF — `GET /api/reports/attendance/pdf`

**Query Parameters:** Sama seperti Preview

**Response:** File PDF (binary)

**Response Headers:**

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="laporan-absensi-20260901-20260930.pdf"
Content-Length: 45123
```

**Konten PDF:**

- **Landscape A4**
- Header: judul, periode, filter kantor, tanggal cetak WIB
- Tabel 10 kolom: No, NIK, Nama, Kantor, Tanggal, Jam Masuk, Status, Jam Pulang, Total Jam, Keterangan
- Rekapitulasi: total karyawan, tepat waktu, terlambat, hari kerja
- Footer: nomor halaman

**Contoh Frontend (Fetch & Download):**

```javascript
const res = await fetch(
  `${BASE_URL}/api/reports/attendance/pdf?tanggalMulai=2026-09-01&tanggalSelesai=2026-09-30`,
  {
    headers: { Authorization: `Bearer ${token}` },
  }
);

if (res.ok) {
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `laporan-absensi-${Date.now()}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
}
```

---

### 6.3. Export Excel — `GET /api/reports/attendance/excel`

**Query Parameters:** Sama seperti Preview

**Response:** File Excel (binary)

**Response Headers:**

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="laporan-absensi-20260901-20260930.xlsx"
```

**Fitur Excel:**

- Header biru gelap dengan teks putih
- Frozen header (baris 1-4 tetap terlihat saat scroll)
- Zebra striping (baris selang-seling warna)
- Auto column width
- Tanpa merged cells di area data (siap untuk payroll)

**Contoh Frontend:** Sama seperti PDF, hanya ubah `res.blob()` dan `a.download` dengan `.xlsx`.

---

## 🚨 Error Handling Guide untuk Frontend

### Tabel Aksi Berdasarkan Status Code

| Status  | Arti                  | Aksi Frontend                                   |
| ------- | --------------------- | ----------------------------------------------- |
| **200** | Sukses                | Tampilkan data                                  |
| **201** | Berhasil dibuat       | Tampilkan notifikasi sukses + redirect          |
| **400** | Validasi gagal        | Tampilkan `message` di bawah field atau toast   |
| **401** | Token invalid/expired | Hapus token → redirect ke login                 |
| **403** | Akses ditolak         | Tampilkan "Anda tidak memiliki izin" + redirect |
| **404** | Data tidak ditemukan  | Tampilkan "Data tidak ditemukan"                |
| **500** | Server error          | Tampilkan "Coba lagi nanti" + log error         |

### Contoh Error Handler Global

```javascript
async function apiCall(url, options = {}) {
  const token = localStorage.getItem("token");

  const defaultHeaders = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  // Kalau FormData, jangan set Content-Type (browser yang handle)
  const headers =
    options.body instanceof FormData
      ? { ...(token && { Authorization: `Bearer ${token}` }) }
      : { ...defaultHeaders, ...options.headers };

  try {
    const res = await fetch(`${BASE_URL}${url}`, { ...options, headers });
    const data = await res.json();

    // Handle 401 — token expired
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return null;
    }

    // Handle error lainnya
    if (!data.success) {
      throw new Error(data.message);
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    // Tampilkan toast/notification
    toast.error(error.message);
    throw error;
  }
}

// Penggunaan
const result = await apiCall("/api/users");
if (result) {
  setUsers(result.data.users);
}
```

---

## 🔧 Environment Setup untuk Frontend

Buat file `.env.local` di project frontend:

```env
VITE_API_BASE_URL=https://project-attendace-production.up.railway.app
# atau untuk development:
# VITE_API_BASE_URL=http://localhost:3000
```

Akses di kode:

```javascript
const BASE_URL = import.meta.env.VITE_API_BASE_URL;
```

---

## 📋 Checklist Fitur per Role

### 🟢 Karyawan

- [ ] Login / Logout
- [ ] Registrasi (publik)
- [ ] Check-in (GPS + Foto)
- [ ] Check-out (GPS + Foto)
- [ ] Lihat riwayat absensi sendiri
- [ ] Ajukan izin/cuti/sakit + upload bukti
- [ ] Update/batalkan pengajuan (saat PENDING)
- [ ] Lihat profil sendiri
- [ ] Update profil (nama, foto)
- [ ] Ganti password

### 🟡 HRD

- [ ] Semua fitur Karyawan (kecuali ajukan izin — hanya approve)
- [ ] List/detail semua karyawan
- [ ] Buat/update karyawan baru
- [ ] Nonaktifkan karyawan
- [ ] CRUD kantor
- [ ] Approve/reject izin
- [ ] Export laporan PDF/Excel
- [ ] Preview laporan

### 🔴 Admin

- [ ] Semua fitur HRD
- [ ] Buat/update user dengan role HRD & ADMIN
- [ ] Hapus kantor

---

## 📞 Support & Debugging

**Jika ada pertanyaan atau bug saat integrasi:**

1. Cek **Swagger UI** untuk testing manual: `https://project-attendace-production.up.railway.app/api-docs`
2. Cek **log Railway**: Railway Dashboard → Service backend → Deployments → View Logs
3. Cek **log browser**: DevTools → Console + Network tab

---

## 📝 Changelog

| Versi | Tanggal    | Perubahan               |
| ----- | ---------- | ----------------------- |
| 1.0.0 | 2026-09-29 | Rilis awal API Contract |

---

**🎉 Selamat coding! Semua endpoint siap digunakan.**
