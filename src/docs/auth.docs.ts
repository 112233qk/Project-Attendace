/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Registrasi user baru (Karyawan)
 *     description: |
 *       Mendaftarkan user baru dengan role default **KARYAWAN**.
 *       Endpoint ini bersifat publik (tidak butuh token).
 *
 *       Untuk membuat user dengan role HRD/ADMIN, gunakan endpoint `POST /api/users` (khusus HRD/Admin).
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nik
 *               - nama
 *               - email
 *               - password
 *             properties:
 *               nik:
 *                 type: string
 *                 example: KRY001
 *                 description: NIK unik (3-50 karakter)
 *               nama:
 *                 type: string
 *                 example: Budi Karyawan
 *               email:
 *                 type: string
 *                 format: email
 *                 example: budi@test.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: budi123
 *               officeId:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *                 description: ID kantor (opsional)
 *     responses:
 *       201:
 *         description: Registrasi berhasil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Registrasi berhasil. Silakan login.' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 2 }
 *                     nik: { type: string, example: KRY001 }
 *                     nama: { type: string, example: Budi Karyawan }
 *                     email: { type: string, example: budi@test.com }
 *                     role: { type: string, example: KARYAWAN }
 *                     officeId: { type: integer, nullable: true, example: 1 }
 *                     isActive: { type: boolean, example: true }
 *       400:
 *         description: Validasi gagal (NIK/email sudah terdaftar, format salah, dll)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Kesalahan server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login user
 *     description: |
 *       Autentikasi user dengan email & password untuk mendapatkan token JWT.
 *
 *       **Cara pakai token:**
 *       1. Copy token dari response ini
 *       2. Klik tombol **Authorize** di atas
 *       3. Masukkan token dengan format `Bearer <token>` (huruf B kapital)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@test.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Login berhasil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Login berhasil.' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     user:
 *                       type: object
 *                       properties:
 *                         id: { type: integer, example: 1 }
 *                         nik: { type: string, example: ADMIN001 }
 *                         nama: { type: string, example: Super Admin }
 *                         email: { type: string, example: admin@test.com }
 *                         role: { type: string, example: ADMIN }
 *                         officeId: { type: integer, nullable: true, example: null }
 *                         fotoProfil: { type: string, nullable: true, example: null }
 *       400:
 *         description: Email atau password kosong
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Email atau password salah
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Akun dinonaktifkan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Logout user
 *     description: |
 *       Mencatat aktivitas logout user ke audit log.
 *       Token JWT bersifat stateless, jadi server tidak menyimpan sesi —
 *       ini hanya untuk keperluan audit trail.
 *     responses:
 *       200:
 *         description: Logout berhasil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Logout berhasil.' }
 *                 data: { type: object, nullable: true, example: null }
 *       401:
 *         description: Token tidak ditemukan atau tidak valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

export {};
