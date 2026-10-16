/**
 * @openapi
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: List semua user (HRD & Admin)
 *     description: |
 *       Menampilkan daftar user dengan filter & pagination.
 *
 *       **RBAC:**
 *       - **HRD**: hanya melihat user dengan role KARYAWAN
 *       - **Admin**: melihat semua role (KARYAWAN, HRD, ADMIN)
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [KARYAWAN, HRD, ADMIN]
 *         description: Filter berdasarkan role (diabaikan jika login sebagai HRD)
 *       - in: query
 *         name: officeId
 *         schema:
 *           type: integer
 *         description: Filter berdasarkan ID kantor
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter berdasarkan status aktif
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Cari di nama, NIK, atau email
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Daftar user berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Daftar user berhasil diambil.' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: integer, example: 2 }
 *                           nik: { type: string, example: KRY001 }
 *                           nama: { type: string, example: Budi Karyawan }
 *                           email: { type: string, example: budi@test.com }
 *                           role: { type: string, example: KARYAWAN }
 *                           officeId: { type: integer, nullable: true, example: 1 }
 *                           isActive: { type: boolean, example: true }
 *                           office:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id: { type: integer, example: 1 }
 *                               name: { type: string, example: 'Kantor Pusat' }
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page: { type: integer, example: 1 }
 *                         limit: { type: integer, example: 10 }
 *                         total: { type: integer, example: 3 }
 *                         totalPages: { type: integer, example: 1 }
 *       401:
 *         description: Belum login
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Tidak punya akses (Karyawan)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     tags:
 *       - Users
 *     summary: Buat user baru (HRD & Admin)
 *     description: |
 *       Membuat user baru dengan role tertentu.
 *
 *       **Privilege Escalation:**
 *       - **HRD**: hanya bisa buat user dengan role KARYAWAN
 *       - **Admin**: bisa buat semua role (KARYAWAN, HRD, ADMIN)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nik, nama, email, password]
 *             properties:
 *               nik: { type: string, example: HRD001 }
 *               nama: { type: string, example: Siti HRD }
 *               email: { type: string, format: email, example: siti@test.com }
 *               password: { type: string, format: password, minLength: 6, example: siti123 }
 *               role:
 *                 type: string
 *                 enum: [KARYAWAN, HRD, ADMIN]
 *                 default: KARYAWAN
 *                 example: HRD
 *               officeId: { type: integer, nullable: true, example: 1 }
 *     responses:
 *       201:
 *         description: User berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validasi gagal (NIK/email duplikat, dll)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: HRD mencoba membuat role di atas levelnya
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     tags:
 *       - Users
 *     summary: Ambil profil sendiri
 *     description: Mendapatkan detail profil user yang sedang login (semua role).
 *     responses:
 *       200:
 *         description: Profil berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: User tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags:
 *       - Users
 *     summary: Update profil sendiri
 *     description: Update nama & foto profil sendiri (semua role). Tidak bisa update NIK, email, atau role.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nama: { type: string, example: 'Budi Updated' }
 *     responses:
 *       200:
 *         description: Profil berhasil diperbarui
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validasi gagal atau tidak ada data yang diupdate
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/users/me/password:
 *   put:
 *     tags:
 *       - Users
 *     summary: Ganti password sendiri
 *     description: Mengubah password akun sendiri dengan memverifikasi password lama.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword]
 *             properties:
 *               oldPassword: { type: string, format: password, example: budi123 }
 *               newPassword: { type: string, format: password, minLength: 6, example: newpass123 }
 *     responses:
 *       200:
 *         description: Password berhasil diubah
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Password lama salah atau password baru terlalu pendek
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Detail user by ID (HRD & Admin)
 *     description: |
 *       Mendapatkan detail user berdasarkan ID.
 *       **RBAC:** HRD hanya bisa lihat user dengan role KARYAWAN.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2
 *     responses:
 *       200:
 *         description: Detail user berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       403:
 *         description: HRD mencoba akses user dengan role lebih tinggi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags:
 *       - Users
 *     summary: Update user by ID (HRD & Admin)
 *     description: |
 *       Update data user. Field yang boleh diupdate: nik, nama, email, role, officeId, isActive, dan password.
 *
 *       **Batasan:**
 *       - HRD hanya bisa update KARYAWAN
 *       - Password user lain hanya bisa diubah oleh **Admin**
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nik: { type: string, example: KRY002 }
 *               nama: { type: string, example: 'Budi Updated' }
 *               email: { type: string, format: email, example: budi2@test.com }
 *               password: { type: string, format: password, minLength: 6 }
 *               role: { type: string, enum: [KARYAWAN, HRD, ADMIN] }
 *               officeId: { type: integer, nullable: true }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: User berhasil diperbarui
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validasi gagal atau tidak ada data yang diupdate
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Tidak punya akses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags:
 *       - Users
 *     summary: Nonaktifkan user (HRD & Admin)
 *     description: |
 *       Melakukan **soft delete** — set `isActive = false`.
 *       User tidak akan bisa login lagi, tapi data historis (absensi, izin) tetap tersimpan.
 *
 *       **Batasan:**
 *       - Tidak bisa menonaktifkan diri sendiri
 *       - HRD hanya bisa nonaktifkan KARYAWAN
 *       - Admin bisa nonaktifkan semua role
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2
 *     responses:
 *       200:
 *         description: User berhasil dinonaktifkan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'User berhasil dinonaktifkan.' }
 *                 data: { type: object, nullable: true, example: null }
 *       400:
 *         description: Mencoba nonaktifkan diri sendiri atau user sudah nonaktif
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Tidak punya akses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

export {};
