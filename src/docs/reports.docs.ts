/**
 * @openapi
 * /api/reports/attendance/preview:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Preview data laporan (JSON)
 *     description: |
 *       Mengambil data laporan absensi dalam format JSON untuk keperluan preview di UI
 *       sebelum di-download sebagai PDF atau Excel.
 *
 *       **Filter:**
 *       - `tanggalMulai` & `tanggalSelesai` **wajib**
 *       - Maksimal periode **3 bulan (92 hari)** per request
 *       - Filter lain bersifat opsional
 *
 *       **RBAC:** HRD & Admin only.
 *     parameters:
 *       - in: query
 *         name: tanggalMulai
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: '2026-09-01'
 *         description: Format YYYY-MM-DD
 *       - in: query
 *         name: tanggalSelesai
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: '2026-09-30'
 *       - in: query
 *         name: officeId
 *         schema:
 *           type: integer
 *         description: Filter berdasarkan ID kantor (opsional)
 *       - in: query
 *         name: statusKehadiran
 *         schema:
 *           type: string
 *           enum: [TEPAT_WAKTU, TERLAMBAT]
 *         description: Filter status kehadiran (opsional)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter user spesifik (opsional)
 *     responses:
 *       200:
 *         description: Preview laporan berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Preview laporan berhasil diambil.' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     periode:
 *                       type: object
 *                       properties:
 *                         mulai: { type: string, example: '01-09-2026' }
 *                         selesai: { type: string, example: '30-09-2026' }
 *                     officeFilter: { type: string, example: 'Semua Kantor' }
 *                     records:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           nik: { type: string, example: 'KRY002' }
 *                           nama: { type: string, example: 'Andi Karyawan' }
 *                           kantor: { type: string, example: 'Kantor Pusat' }
 *                           tanggal: { type: string, example: '25-09-2026' }
 *                           jamMasuk: { type: string, example: '21:08:30' }
 *                           statusMasuk: { type: string, example: 'TERLAMBAT' }
 *                           jamPulang: { type: string, example: '21:09:08' }
 *                           totalJamKerja: { type: string, example: '8 jam 30 menit' }
 *                           keterangan: { type: string, example: '-' }
 *                     recap:
 *                       type: object
 *                       properties:
 *                         totalKaryawan: { type: integer, example: 1 }
 *                         totalTepatWaktu: { type: integer, example: 0 }
 *                         totalTerlambat: { type: integer, example: 1 }
 *                         totalHariKerja: { type: integer, example: 1 }
 *       400:
 *         description: |
 *           - Tanggal wajib diisi
 *           - Format tanggal salah
 *           - Periode > 3 bulan
 *           - Tanggal mulai > tanggal selesai
 *           - Status kehadiran tidak valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Karyawan mencoba akses (hanya HRD/Admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/reports/attendance/pdf:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Export laporan absensi (PDF)
 *     description: |
 *       Mengunduh laporan absensi dalam format **PDF landscape A4**.
 *
 *       **Konten PDF:**
 *       - Header: judul, periode, filter kantor, tanggal cetak WIB
 *       - Tabel data (10 kolom): No, NIK, Nama, Kantor, Tanggal, Jam Masuk, Status, Jam Pulang, Total Jam, Keterangan
 *       - Rekapitulasi: total karyawan, tepat waktu, terlambat, hari kerja
 *       - Footer: nomor halaman
 *
 *       **Nama file:** `laporan-absensi-YYYYMMDD-YYYYMMDD.pdf`
 *     parameters:
 *       - in: query
 *         name: tanggalMulai
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: '2026-09-01'
 *       - in: query
 *         name: tanggalSelesai
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: '2026-09-30'
 *       - in: query
 *         name: officeId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: statusKehadiran
 *         schema:
 *           type: string
 *           enum: [TEPAT_WAKTU, TERLAMBAT]
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: File PDF berhasil di-generate
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Validasi query gagal
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Karyawan mencoba akses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/reports/attendance/excel:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Export laporan absensi (Excel)
 *     description: |
 *       Mengunduh laporan absensi dalam format **Excel (.xlsx)**.
 *
 *       **Fitur Excel:**
 *       - Format tabel bersih tanpa merged cells di area data
 *       - Header biru gelap dengan teks putih
 *       - Frozen header (baris 1-4 tetap terlihat saat scroll)
 *       - Zebra striping (baris selang-seling warna)
 *       - Auto column width
 *
 *       **Nama file:** `laporan-absensi-YYYYMMDD-YYYYMMDD.xlsx`
 *     parameters:
 *       - in: query
 *         name: tanggalMulai
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: '2026-09-01'
 *       - in: query
 *         name: tanggalSelesai
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: '2026-09-30'
 *       - in: query
 *         name: officeId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: statusKehadiran
 *         schema:
 *           type: string
 *           enum: [TEPAT_WAKTU, TERLAMBAT]
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: File Excel berhasil di-generate
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Validasi query gagal
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Karyawan mencoba akses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

export {};
