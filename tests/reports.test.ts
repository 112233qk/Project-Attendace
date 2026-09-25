import request from "supertest";
import app from "../src/app";
import { prisma, resetDatabase, seedBaseUsers } from "./helpers/dbHelper";
import { generateTestToken } from "./helpers/authHelper";

describe("Reports Module", () => {
  let adminToken: string;
  let hrdToken: string;
  let karyawanToken: string;
  let karyawanId: number;
  let officeId: number;

  // ============================================
  // SETUP
  // ============================================
  beforeAll(async () => {
    await resetDatabase();
    const { admin, hrd, karyawan, office } = await seedBaseUsers();

    karyawanId = karyawan.id;
    officeId = office.id;

    adminToken = generateTestToken({
      id: admin.id,
      role: "ADMIN",
      officeId: office.id,
    });
    hrdToken = generateTestToken({
      id: hrd.id,
      role: "HRD",
      officeId: office.id,
    });
    karyawanToken = generateTestToken({
      id: karyawan.id,
      role: "KARYAWAN",
      officeId: office.id,
    });

    // Seed beberapa data attendance untuk laporan
    await prisma.attendance.createMany({
      data: [
        {
          userId: karyawanId,
          tanggal: new Date("2026-09-15"),
          jamMasuk: new Date("2026-09-15T01:00:00Z"), // 08:00 WIB
          jamPulang: new Date("2026-09-15T10:00:00Z"), // 17:00 WIB
          latMasuk: -6.2088,
          lngMasuk: 106.8456,
          latPulang: -6.2088,
          lngPulang: 106.8456,
          statusMasuk: "TEPAT_WAKTU",
          metodeMasuk: "GPS",
        },
        {
          userId: karyawanId,
          tanggal: new Date("2026-09-16"),
          jamMasuk: new Date("2026-09-16T01:30:00Z"),
          jamPulang: new Date("2026-09-16T10:00:00Z"),
          latMasuk: -6.2088,
          lngMasuk: 106.8456,
          statusMasuk: "TERLAMBAT",
          metodeMasuk: "GPS",
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ============================================
  // GET /api/reports/attendance/preview
  // ============================================
  describe("GET /api/reports/attendance/preview", () => {
    it("should return preview data for Admin", async () => {
      const res = await request(app)
        .get(
          "/api/reports/attendance/preview?tanggalMulai=2026-09-01&tanggalSelesai=2026-09-30"
        )
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.records).toBeInstanceOf(Array);
      expect(res.body.data.records.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.recap).toMatchObject({
        totalKaryawan: expect.any(Number),
        totalTepatWaktu: expect.any(Number),
        totalTerlambat: expect.any(Number),
        totalHariKerja: expect.any(Number),
      });
    });

    it("should return preview data for HRD", async () => {
      const res = await request(app)
        .get(
          "/api/reports/attendance/preview?tanggalMulai=2026-09-01&tanggalSelesai=2026-09-30"
        )
        .set("Authorization", `Bearer ${hrdToken}`);

      expect(res.status).toBe(200);
    });

    it("should reject access by Karyawan", async () => {
      const res = await request(app)
        .get(
          "/api/reports/attendance/preview?tanggalMulai=2026-09-01&tanggalSelesai=2026-09-30"
        )
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(403);
    });

    it("should reject without token", async () => {
      const res = await request(app).get(
        "/api/reports/attendance/preview?tanggalMulai=2026-09-01&tanggalSelesai=2026-09-30"
      );
      expect(res.status).toBe(401);
    });

    it("should reject if tanggalMulai or tanggalSelesai missing", async () => {
      const res = await request(app)
        .get("/api/reports/attendance/preview")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("wajib");
    });

    it("should reject invalid date format", async () => {
      const res = await request(app)
        .get(
          "/api/reports/attendance/preview?tanggalMulai=01-09-2026&tanggalSelesai=2026-09-30"
        )
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Format tanggal");
    });

    it("should reject if periode > 3 months", async () => {
      const res = await request(app)
        .get(
          "/api/reports/attendance/preview?tanggalMulai=2026-01-01&tanggalSelesai=2026-12-31"
        )
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("3 bulan");
    });

    it("should reject if tanggalMulai > tanggalSelesai", async () => {
      const res = await request(app)
        .get(
          "/api/reports/attendance/preview?tanggalMulai=2026-09-30&tanggalSelesai=2026-09-01"
        )
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("lebih awal");
    });

    it("should reject invalid statusKehadiran", async () => {
      const res = await request(app)
        .get(
          "/api/reports/attendance/preview?tanggalMulai=2026-09-01&tanggalSelesai=2026-09-30&statusKehadiran=SALAH"
        )
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Status kehadiran");
    });

    it("should filter by statusKehadiran", async () => {
      const res = await request(app)
        .get(
          "/api/reports/attendance/preview?tanggalMulai=2026-09-01&tanggalSelesai=2026-09-30&statusKehadiran=TERLAMBAT"
        )
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.records.forEach((r: any) => {
        expect(r.statusMasuk).toBe("TERLAMBAT");
      });
    });

    it("should filter by officeId", async () => {
      const res = await request(app)
        .get(
          `/api/reports/attendance/preview?tanggalMulai=2026-09-01&tanggalSelesai=2026-09-30&officeId=${officeId}`
        )
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.officeFilter).toBe("Kantor Test");
    });

    it("should return empty records for period with no data", async () => {
      const res = await request(app)
        .get(
          "/api/reports/attendance/preview?tanggalMulai=2026-10-01&tanggalSelesai=2026-10-31"
        )
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.records).toEqual([]);
    });
  });

  // ============================================
  // GET /api/reports/attendance/pdf
  // ============================================
  describe("GET /api/reports/attendance/pdf", () => {
    it("should generate PDF for Admin", async () => {
      const res = await request(app)
        .get(
          "/api/reports/attendance/pdf?tanggalMulai=2026-09-01&tanggalSelesai=2026-09-30"
        )
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/pdf");
      expect(res.headers["content-disposition"]).toContain("laporan-absensi");
      expect(res.headers["content-disposition"]).toContain(".pdf");
    });

    it("should generate PDF for HRD", async () => {
      const res = await request(app)
        .get(
          "/api/reports/attendance/pdf?tanggalMulai=2026-09-01&tanggalSelesai=2026-09-30"
        )
        .set("Authorization", `Bearer ${hrdToken}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/pdf");
    });

    it("should reject access by Karyawan", async () => {
      const res = await request(app)
        .get(
          "/api/reports/attendance/pdf?tanggalMulai=2026-09-01&tanggalSelesai=2026-09-30"
        )
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(403);
    });

    it("should reject invalid query", async () => {
      const res = await request(app)
        .get("/api/reports/attendance/pdf")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });

  // ============================================
  // GET /api/reports/attendance/excel
  // ============================================
  describe("GET /api/reports/attendance/excel", () => {
    it("should generate Excel for Admin", async () => {
      const res = await request(app)
        .get(
          "/api/reports/attendance/excel?tanggalMulai=2026-09-01&tanggalSelesai=2026-09-30"
        )
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      expect(res.headers["content-disposition"]).toContain(".xlsx");
    });

    it("should generate Excel for HRD", async () => {
      const res = await request(app)
        .get(
          "/api/reports/attendance/excel?tanggalMulai=2026-09-01&tanggalSelesai=2026-09-30"
        )
        .set("Authorization", `Bearer ${hrdToken}`);

      expect(res.status).toBe(200);
    });

    it("should reject access by Karyawan", async () => {
      const res = await request(app)
        .get(
          "/api/reports/attendance/excel?tanggalMulai=2026-09-01&tanggalSelesai=2026-09-30"
        )
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(403);
    });

    it("should reject periode > 3 months", async () => {
      const res = await request(app)
        .get(
          "/api/reports/attendance/excel?tanggalMulai=2026-01-01&tanggalSelesai=2026-12-31"
        )
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it("should generate Excel with empty data (no error)", async () => {
      const res = await request(app)
        .get(
          "/api/reports/attendance/excel?tanggalMulai=2026-10-01&tanggalSelesai=2026-10-31"
        )
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("spreadsheetml");
    });
  });
});
