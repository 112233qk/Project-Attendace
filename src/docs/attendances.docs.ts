/**
 * @openapi
 * /api/attendances/check-in:
 *   post:
 *     tags:
 *       - Attendances
 *     summary: Check-in (Karyawan)
 *     description: |
 *       Melakukan absen masuk dengan validasi **GPS (Haversine)** dan **foto tempat/selfie**.
 *
 *       **Proses validasi:**
 *       1. Koordinat user harus dalam radius kantor (sesuai `radius` di kantor user)
 *       2. Status otomatis ditentukan: `TEPAT_WAKTU` atau `TERLAMBAT` (berdasarkan jam masuk kantor)
 *       3. Foto wajib diupload (JPG/JPEG/PNG, maks 2MB)
 *       4. Cegah duplikasi check-in di hari yang sama
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [latitude, longitude, fotoMasuk]
 *             properties:
 *               latitude:
 *                 type: string
 *                 example: '-6.2088'
 *                 description: Latitude posisi user
 *               longitude:
 *                 type: string
 *                 example: '106.8456'
 *                 description: Longitude posisi user
 *               metodeMasuk:
 *                 type: string
 *                 enum: [GPS, MANUAL]
 *                 default: GPS
 *                 description: GPS (normal) atau MANUAL (fallback jika GPS gagal)
 *               fotoMasuk:
 *                 type: string
 *                 format: binary
 *                 description: Foto selfie/tempat (JPG/JPEG/PNG, maks 2MB)
 *     responses:
 *       201:
 *         description: Check-in berhasil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Check-in berhasil.' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 1 }
 *                     userId: { type: integer, example: 2 }
 *                     tanggal: { type: string, format: date, example: '2026-09-25' }
 *                     jamMasuk: { type: string, format: date-time }
 *                     latMasuk: { type: number, example: -6.2088 }
 *                     lngMasuk: { type: number, example: 106.8456 }
 *                     fotoMasuk: { type: string, example: '/uploads/fotoMasuk-xxx.png' }
 *                     statusMasuk: { type: string, example: 'TERLAMBAT' }
 *                     metodeMasuk: { type: string, example: 'GPS' }
 *       400:
 *         description: |
 *           - Di luar radius kantor
 *           - Sudah check-in hari ini
 *           - File terlalu besar / format salah
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User atau kantor tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/attendances/check-out:
 *   post:
 *     tags:
 *       - Attendances
 *     summary: Check-out (Karyawan)
 *     description: |
 *       Melakukan absen pulang. Wajib sudah check-in hari ini dan belum check-out.
 *
 *       **Proses validasi:**
 *       1. Cari record absensi hari ini yang belum check-out
 *       2. Update jam pulang, koordinat, dan foto
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [latitude, longitude, fotoPulang]
 *             properties:
 *               latitude:
 *                 type: string
 *                 example: '-6.2088'
 *               longitude:
 *                 type: string
 *                 example: '106.8456'
 *               fotoPulang:
 *                 type: string
 *                 format: binary
 *                 description: Foto selfie/tempat saat pulang (JPG/JPEG/PNG, maks 2MB)
 *     responses:
 *       200:
 *         description: Check-out berhasil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Belum check-in atau sudah check-out
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/attendances/history:
 *   get:
 *     tags:
 *       - Attendances
 *     summary: Riwayat absensi
 *     description: |
 *       Menampilkan riwayat absensi dengan filter.
 *
 *       **RBAC:**
 *       - **KARYAWAN**: hanya bisa melihat riwayat sendiri (parameter `userId` diabaikan)
 *       - **HRD/Admin**: bisa melihat riwayat semua user, atau filter berdasarkan `userId`
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter berdasarkan ID user (hanya berlaku untuk HRD/Admin)
 *       - in: query
 *         name: tanggal
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter berdasarkan tanggal spesifik (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Riwayat absensi berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Riwayat absensi berhasil diambil.' }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer, example: 1 }
 *                       userId: { type: integer, example: 2 }
 *                       tanggal: { type: string, format: date }
 *                       jamMasuk: { type: string, format: date-time }
 *                       jamPulang: { type: string, format: date-time, nullable: true }
 *                       latMasuk: { type: number, nullable: true }
 *                       lngMasuk: { type: number, nullable: true }
 *                       fotoMasuk: { type: string, nullable: true }
 *                       latPulang: { type: number, nullable: true }
 *                       lngPulang: { type: number, nullable: true }
 *                       fotoPulang: { type: string, nullable: true }
 *                       statusMasuk: { type: string, example: 'TEPAT_WAKTU' }
 *                       metodeMasuk: { type: string, example: 'GPS' }
 *                       user:
 *                         type: object
 *                         properties:
 *                           nama: { type: string, example: 'Andi Karyawan' }
 *                           nik: { type: string, example: 'KRY002' }
 *                           email: { type: string, example: 'andi@test.com' }
 *       401:
 *         description: Belum login
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/attendances/today:
 *   get:
 *     tags:
 *       - Attendances
 *     summary: Status presensi hari ini (Karyawan)
 *     description: |
 *       Mendapatkan status presensi user yang login **hari ini**.
 *       Berguna untuk menampilkan tombol Check-in/Check-out yang tepat.
 *
 *       **RBAC:** Karyawan only.
 *     responses:
 *       200:
 *         description: Status presensi hari ini
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Status presensi hari ini.' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasCheckedIn: { type: boolean, example: true }
 *                     hasCheckedOut: { type: boolean, example: false }
 *                     checkInTime: { type: string, nullable: true, example: '08:15:30' }
 *                     checkOutTime: { type: string, nullable: true, example: null }
 *                     attendance:
 *                       type: object
 *                       nullable: true
 *       403:
 *         description: Bukan Karyawan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export {};
