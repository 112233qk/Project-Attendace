/**
 * @openapi
 * /api/permissions:
 *   post:
 *     tags:
 *       - Permissions
 *     summary: Ajukan izin/sakit/cuti (Karyawan)
 *     description: |
 *       Mengajukan permohonan izin, sakit, atau cuti.
 *
 *       **Aturan:**
 *       - `tanggalMulai` tidak boleh di masa lalu
 *       - `tanggalMulai` <= `tanggalSelesai`
 *       - Untuk jenis `SAKIT`, wajib melampirkan bukti (surat dokter)
 *       - Untuk `IZIN` dan `CUTI`, bukti opsional
 *       - Tidak boleh overlap dengan pengajuan yang sudah `APPROVED`
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [jenis, tanggalMulai, tanggalSelesai, alasan]
 *             properties:
 *               jenis:
 *                 type: string
 *                 enum: [IZIN, SAKIT, CUTI]
 *                 example: IZIN
 *               tanggalMulai:
 *                 type: string
 *                 format: date
 *                 example: '2026-10-01'
 *               tanggalSelesai:
 *                 type: string
 *                 format: date
 *                 example: '2026-10-02'
 *               alasan:
 *                 type: string
 *                 minLength: 5
 *                 example: 'Acara keluarga besar'
 *               buktiFile:
 *                 type: string
 *                 format: binary
 *                 description: Wajib untuk SAKIT. Format JPG/JPEG/PNG/PDF, maks 5MB
 *     responses:
 *       201:
 *         description: Pengajuan berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Pengajuan berhasil dibuat.' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 1 }
 *                     userId: { type: integer, example: 2 }
 *                     jenis: { type: string, example: 'IZIN' }
 *                     tanggalMulai: { type: string, format: date }
 *                     tanggalSelesai: { type: string, format: date }
 *                     alasan: { type: string }
 *                     buktiFile: { type: string, nullable: true }
 *                     status: { type: string, example: 'PENDING' }
 *                     rejectionReason: { type: string, nullable: true }
 *                     user:
 *                       type: object
 *                       properties:
 *                         id: { type: integer }
 *                         nama: { type: string }
 *                         nik: { type: string }
 *                         email: { type: string }
 *       400:
 *         description: Validasi gagal (tanggal masa lalu, bukti SAKIT wajib, overlap, dll)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: HRD/Admin mencoba ajukan (hanya Karyawan)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   get:
 *     tags:
 *       - Permissions
 *     summary: List pengajuan izin/cuti
 *     description: |
 *       Menampilkan daftar pengajuan dengan filter & pagination.
 *
 *       **RBAC:**
 *       - **KARYAWAN**: hanya melihat pengajuan sendiri (parameter `userId` diabaikan)
 *       - **HRD/Admin**: melihat semua pengajuan, atau filter berdasarkan `userId`
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *       - in: query
 *         name: jenis
 *         schema:
 *           type: string
 *           enum: [IZIN, SAKIT, CUTI]
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Hanya berlaku untuk HRD/Admin
 *       - in: query
 *         name: tanggalMulai
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter pengajuan dengan tanggalMulai >= nilai ini
 *       - in: query
 *         name: tanggalSelesai
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter pengajuan dengan tanggalSelesai <= nilai ini
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
 *         description: Daftar pengajuan berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Daftar pengajuan berhasil diambil.' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: integer, example: 1 }
 *                           userId: { type: integer, example: 2 }
 *                           jenis: { type: string, example: 'IZIN' }
 *                           tanggalMulai: { type: string, format: date }
 *                           tanggalSelesai: { type: string, format: date }
 *                           alasan: { type: string }
 *                           buktiFile: { type: string, nullable: true }
 *                           status: { type: string, example: 'PENDING' }
 *                           rejectionReason: { type: string, nullable: true }
 *                           user:
 *                             type: object
 *                             properties:
 *                               id: { type: integer }
 *                               nama: { type: string }
 *                               nik: { type: string }
 *                               email: { type: string }
 *                           approver:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id: { type: integer }
 *                               nama: { type: string }
 *                               role: { type: string }
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page: { type: integer, example: 1 }
 *                         limit: { type: integer, example: 10 }
 *                         total: { type: integer, example: 5 }
 *                         totalPages: { type: integer, example: 1 }
 */

/**
 * @openapi
 * /api/permissions/{id}:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Detail pengajuan by ID
 *     description: |
 *       Menampilkan detail pengajuan. Karyawan hanya bisa melihat pengajuan miliknya sendiri.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Detail pengajuan berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       403:
 *         description: Karyawan mencoba akses pengajuan orang lain
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Pengajuan tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags:
 *       - Permissions
 *     summary: Update pengajuan (Pemilik, PENDING only)
 *     description: |
 *       Update pengajuan milik sendiri. Hanya bisa dilakukan saat status **PENDING**.
 *
 *       **Batasan:**
 *       - Hanya pemilik pengajuan yang bisa update
 *       - Setelah APPROVED/REJECTED, tidak bisa diubah lagi
 *       - Validasi ulang semua field yang diubah (tanggal, bukti SAKIT, overlap)
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               jenis:
 *                 type: string
 *                 enum: [IZIN, SAKIT, CUTI]
 *               tanggalMulai:
 *                 type: string
 *                 format: date
 *               tanggalSelesai:
 *                 type: string
 *                 format: date
 *               alasan:
 *                 type: string
 *                 minLength: 5
 *               buktiFile:
 *                 type: string
 *                 format: binary
 *                 description: Ganti bukti file (opsional)
 *     responses:
 *       200:
 *         description: Pengajuan berhasil diperbarui
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Pengajuan sudah diproses, validasi gagal, atau tidak ada data diupdate
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Bukan pemilik pengajuan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Pengajuan tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags:
 *       - Permissions
 *     summary: Batalkan pengajuan (Pemilik, PENDING only)
 *     description: |
 *       Membatalkan (menghapus) pengajuan milik sendiri. Hanya saat status PENDING.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Pengajuan berhasil dibatalkan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Pengajuan berhasil dibatalkan.' }
 *                 data: { type: object, nullable: true, example: null }
 *       400:
 *         description: Pengajuan sudah diproses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Bukan pemilik
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Pengajuan tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/permissions/{id}/approve:
 *   put:
 *     tags:
 *       - Permissions
 *     summary: Setujui pengajuan (HRD & Admin)
 *     description: |
 *       Menyetujui pengajuan izin/cuti.
 *
 *       **Efek:**
 *       - Status berubah menjadi `APPROVED`
 *       - Field `approvedBy` di-set ke ID user yang approve
 *       - Diaudit sebagai action `APPROVE_PERMISSION`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Pengajuan berhasil disetujui
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Pengajuan berhasil disetujui.' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     status: { type: string, example: 'APPROVED' }
 *                     approvedBy: { type: integer }
 *                     approver:
 *                       type: object
 *                       properties:
 *                         id: { type: integer }
 *                         nama: { type: string }
 *                         role: { type: string }
 *       400:
 *         description: Pengajuan sudah diproses sebelumnya
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Bukan HRD/Admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Pengajuan tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/permissions/{id}/reject:
 *   put:
 *     tags:
 *       - Permissions
 *     summary: Tolak pengajuan (HRD & Admin)
 *     description: |
 *       Menolak pengajuan izin/cuti dengan alasan penolakan yang wajib diisi.
 *
 *       **Efek:**
 *       - Status berubah menjadi `REJECTED`
 *       - Field `rejectionReason` di-set dengan alasan
 *       - Field `approvedBy` di-set ke ID user yang reject
 *       - Diaudit sebagai action `REJECT_PERMISSION`
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
 *             required: [rejectionReason]
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 minLength: 5
 *                 example: 'Surat dokter tidak jelas, mohon upload ulang'
 *     responses:
 *       200:
 *         description: Pengajuan berhasil ditolak
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Pengajuan berhasil ditolak.' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     status: { type: string, example: 'REJECTED' }
 *                     approvedBy: { type: integer }
 *                     rejectionReason: { type: string }
 *       400:
 *         description: Alasan penolakan kosong atau pengajuan sudah diproses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Bukan HRD/Admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Pengajuan tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

export {};
