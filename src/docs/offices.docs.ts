/**
 * @openapi
 * /api/offices:
 *   get:
 *     tags:
 *       - Offices
 *     summary: List semua kantor
 *     description: Mendapatkan daftar semua kantor beserta jumlah karyawan (semua role login).
 *     responses:
 *       200:
 *         description: Daftar kantor berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Daftar kantor berhasil diambil.' }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer, example: 1 }
 *                       name: { type: string, example: 'Kantor Pusat' }
 *                       latitude: { type: number, example: -6.2088 }
 *                       longitude: { type: number, example: 106.8456 }
 *                       radius: { type: number, example: 50 }
 *                       jamMasuk: { type: string, example: '08:00' }
 *                       jamPulang: { type: string, example: '17:00' }
 *                       createdAt: { type: string, format: date-time }
 *                       updatedAt: { type: string, format: date-time }
 *                       _count:
 *                         type: object
 *                         properties:
 *                           users: { type: integer, example: 3 }
 *       401:
 *         description: Belum login
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     tags:
 *       - Offices
 *     summary: Buat kantor baru (HRD & Admin)
 *     description: Menambahkan kantor baru beserta koordinat, radius, dan jam kerja.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, latitude, longitude, radius, jamMasuk, jamPulang]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 example: 'Kantor Cabang Test'
 *               latitude:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 example: -6.3000
 *               longitude:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 example: 106.9000
 *               radius:
 *                 type: number
 *                 minimum: 0
 *                 example: 75
 *                 description: Radius aman dalam meter
 *               jamMasuk:
 *                 type: string
 *                 pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$'
 *                 example: '09:00'
 *               jamPulang:
 *                 type: string
 *                 pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$'
 *                 example: '18:00'
 *     responses:
 *       201:
 *         description: Kantor berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validasi gagal (format jam salah, jamMasuk >= jamPulang, dll)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Karyawan mencoba create
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/offices/{id}:
 *   get:
 *     tags:
 *       - Offices
 *     summary: Detail kantor by ID
 *     description: Mendapatkan detail kantor berdasarkan ID (semua role login).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Detail kantor berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Kantor tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags:
 *       - Offices
 *     summary: Update kantor (HRD & Admin)
 *     description: |
 *       Update data kantor (parsial — hanya field yang dikirim).
 *
 *       **Validasi khusus:**
 *       - `jamMasuk` harus < `jamPulang` (cross-validasi dengan data existing)
 *       - Format jam harus `HH:mm`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: 'Kantor Pusat Updated' }
 *               latitude: { type: number, example: -6.2100 }
 *               longitude: { type: number, example: 106.8500 }
 *               radius: { type: number, example: 100 }
 *               jamMasuk: { type: string, example: '08:30' }
 *               jamPulang: { type: string, example: '17:30' }
 *     responses:
 *       200:
 *         description: Kantor berhasil diperbarui
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validasi gagal
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Karyawan mencoba update
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Kantor tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags:
 *       - Offices
 *     summary: Hapus kantor (Admin only)
 *     description: |
 *       Menghapus kantor secara permanen.
 *
 *       **Batasan:**
 *       - Hanya **Admin** yang boleh menghapus (HRD tidak)
 *       - Kantor **tidak bisa dihapus** jika masih memiliki user terkait.
 *         Pindahkan user ke kantor lain terlebih dahulu.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2
 *     responses:
 *       200:
 *         description: Kantor berhasil dihapus
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Kantor berhasil dihapus.' }
 *                 data: { type: object, nullable: true, example: null }
 *       400:
 *         description: Kantor masih memiliki user terkait
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: HRD/Karyawan mencoba delete
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Kantor tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

export {};
