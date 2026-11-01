import request from "supertest";
import path from "path";
import app from "../src/app";
import { prisma, resetDatabase, seedBaseUsers } from "./helpers/dbHelper";
import { generateTestToken } from "./helpers/authHelper";

describe("Permissions Module", () => {
  let adminToken: string;
  let hrdToken: string;
  let karyawanToken: string;
  let adminId: number;
  let hrdId: number;
  let karyawanId: number;

  const FIXTURE_PATH = path.join(__dirname, "fixtures", "sample.jpg");

  // Helper: tanggal besok (YYYY-MM-DD)
  const getTomorrow = (): string => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0]!;
  };

  // Helper: tanggal 2 hari dari sekarang
  const getDayAfterTomorrow = (): string => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0]!;
  };

  // ============================================
  // SETUP
  // ============================================
  beforeAll(async () => {
    await resetDatabase();
    const { admin, hrd, karyawan } = await seedBaseUsers();

    adminId = admin.id;
    hrdId = hrd.id;
    karyawanId = karyawan.id;

    adminToken = generateTestToken({
      id: admin.id,
      role: "ADMIN",
      officeId: 1,
    });
    hrdToken = generateTestToken({ id: hrd.id, role: "HRD", officeId: 1 });
    karyawanToken = generateTestToken({
      id: karyawan.id,
      role: "KARYAWAN",
      officeId: 1,
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ============================================
  // POST /api/permissions (Create)
  // ============================================
  describe("POST /api/permissions", () => {
    beforeEach(async () => {
      await prisma.permission.deleteMany();
    });

    it("should create IZIN without bukti (IZIN tidak wajib bukti)", async () => {
      const res = await request(app)
        .post("/api/permissions")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("jenis", "IZIN")
        .field("tanggalMulai", getTomorrow())
        .field("tanggalSelesai", getDayAfterTomorrow())
        .field("alasan", "Acara keluarga besar");

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        userId: karyawanId,
        jenis: "IZIN",
        status: "PENDING",
      });
    });

    it("should reject SAKIT without bukti", async () => {
      const res = await request(app)
        .post("/api/permissions")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("jenis", "SAKIT")
        .field("tanggalMulai", getTomorrow())
        .field("tanggalSelesai", getDayAfterTomorrow())
        .field("alasan", "Demam tinggi");

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("bukti");
    });

    it("should create SAKIT with bukti", async () => {
      const res = await request(app)
        .post("/api/permissions")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("jenis", "SAKIT")
        .field("tanggalMulai", getTomorrow())
        .field("tanggalSelesai", getDayAfterTomorrow())
        .field("alasan", "Demam tinggi, ada surat dokter")
        .attach("buktiFile", FIXTURE_PATH);

      expect(res.status).toBe(201);
      expect(res.body.data.jenis).toBe("SAKIT");
      expect(res.body.data.buktiFile).toBeTruthy();
    });

    it("should reject tanggal masa lalu", async () => {
      const res = await request(app)
        .post("/api/permissions")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("jenis", "IZIN")
        .field("tanggalMulai", "2020-01-01")
        .field("tanggalSelesai", "2020-01-02")
        .field("alasan", "Test masa lalu");

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("masa lalu");
    });

    it("should reject tanggalMulai > tanggalSelesai", async () => {
      const res = await request(app)
        .post("/api/permissions")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("jenis", "IZIN")
        .field("tanggalMulai", getDayAfterTomorrow())
        .field("tanggalSelesai", getTomorrow())
        .field("alasan", "Tanggal terbalik");

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("lebih awal");
    });

    it("should reject alasan terlalu pendek", async () => {
      const res = await request(app)
        .post("/api/permissions")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("jenis", "IZIN")
        .field("tanggalMulai", getTomorrow())
        .field("tanggalSelesai", getDayAfterTomorrow())
        .field("alasan", "Aku");

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("minimal");
    });

    it("should allow HRD to create IZIN", async () => {
      const res = await request(app)
        .post("/api/permissions")
        .set("Authorization", `Bearer ${hrdToken}`)
        .field("jenis", "IZIN")
        .field("tanggalMulai", getTomorrow())
        .field("tanggalSelesai", getDayAfterTomorrow())
        .field("alasan", "HRD coba buat");

      expect(res.status).toBe(201);
      expect(res.body.data.userId).toBe(hrdId);
    });

    it("should reject when Admin tries to create", async () => {
      const res = await request(app)
        .post("/api/permissions")
        .set("Authorization", `Bearer ${adminToken}`)
        .field("jenis", "IZIN")
        .field("tanggalMulai", getTomorrow())
        .field("tanggalSelesai", getDayAfterTomorrow())
        .field("alasan", "Admin coba buat");

      expect(res.status).toBe(403);
    });

    it("should reject invalid jenis", async () => {
      const res = await request(app)
        .post("/api/permissions")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("jenis", "LIBUR")
        .field("tanggalMulai", getTomorrow())
        .field("tanggalSelesai", getDayAfterTomorrow())
        .field("alasan", "Jenis tidak valid");

      expect(res.status).toBe(400);
    });
  });

  // ============================================
  // POST /api/permissions (Hourly Leave)
  // ============================================
  describe("POST /api/permissions (Hourly)", () => {
    beforeEach(async () => {
      await prisma.permission.deleteMany();
    });

    it("should create hourly IZIN successfully", async () => {
      const res = await request(app)
        .post("/api/permissions")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("jenis", "IZIN")
        .field("tanggalMulai", getTomorrow())
        .field("tanggalSelesai", getTomorrow())
        .field("alasan", "Ke dokter gigi")
        .field("jamMulai", "10:00")
        .field("jamSelesai", "12:00");

      expect(res.status).toBe(201);
      expect(res.body.data.jamMulai).toBe("10:00");
      expect(res.body.data.jamSelesai).toBe("12:00");
    });

    it("should reject invalid time format", async () => {
      const res = await request(app)
        .post("/api/permissions")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("jenis", "IZIN")
        .field("tanggalMulai", getTomorrow())
        .field("tanggalSelesai", getTomorrow())
        .field("alasan", "Ke dokter gigi")
        .field("jamMulai", "25:00")
        .field("jamSelesai", "12:00");

      expect(res.status).toBe(400);
    });

    it("should reject if jamMulai >= jamSelesai", async () => {
      const res = await request(app)
        .post("/api/permissions")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("jenis", "IZIN")
        .field("tanggalMulai", getTomorrow())
        .field("tanggalSelesai", getTomorrow())
        .field("alasan", "Ke dokter gigi")
        .field("jamMulai", "13:00")
        .field("jamSelesai", "11:00");

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("lebih awal");
    });

    it("should reject overlapping hourly leave", async () => {
      // Buat jadwal di jam 10:00 - 12:00
      await prisma.permission.create({
        data: {
          userId: karyawanId,
          jenis: "IZIN",
          tanggalMulai: new Date(getTomorrow()),
          tanggalSelesai: new Date(getTomorrow()),
          alasan: "Jadwal pertama",
          status: "APPROVED",
          jamMulai: "10:00",
          jamSelesai: "12:00",
        },
      });

      // Coba buat di jam 11:00 - 13:00 (Bentrok)
      const res = await request(app)
        .post("/api/permissions")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("jenis", "IZIN")
        .field("tanggalMulai", getTomorrow())
        .field("tanggalSelesai", getTomorrow())
        .field("alasan", "Bentrok jadwal")
        .field("jamMulai", "11:00")
        .field("jamSelesai", "13:00");

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("waktu tersebut");
    });

    it("should allow non-overlapping hourly leave on same day", async () => {
      await prisma.permission.create({
        data: {
          userId: karyawanId,
          jenis: "IZIN",
          tanggalMulai: new Date(getTomorrow()),
          tanggalSelesai: new Date(getTomorrow()),
          alasan: "Jadwal pertama",
          status: "APPROVED",
          jamMulai: "10:00",
          jamSelesai: "12:00",
        },
      });

      // Buat di jam 13:00 - 15:00 (Tidak bentrok)
      const res = await request(app)
        .post("/api/permissions")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("jenis", "IZIN")
        .field("tanggalMulai", getTomorrow())
        .field("tanggalSelesai", getTomorrow())
        .field("alasan", "Tidak bentrok")
        .field("jamMulai", "13:00")
        .field("jamSelesai", "15:00");

      expect(res.status).toBe(201);
    });
  });

  // ============================================
  // GET /api/permissions (List)
  // ============================================
  describe("GET /api/permissions", () => {
    let karyawan2Id: number;
    let karyawan2Token: string;

    beforeAll(async () => {
      await prisma.permission.deleteMany();

      const bcrypt = require("bcrypt");
      const hash = await bcrypt.hash("password123", 10);
      const k2 = await prisma.user.create({
        data: {
          nik: "KRY002",
          nama: "Karyawan 2",
          email: "kry2@test.com",
          password: hash,
          role: "KARYAWAN",
          officeId: 1,
        },
      });
      karyawan2Id = k2.id;
      karyawan2Token = generateTestToken({
        id: k2.id,
        role: "KARYAWAN",
        officeId: 1,
      });

      await prisma.permission.createMany({
        data: [
          {
            userId: karyawanId,
            jenis: "IZIN",
            tanggalMulai: new Date("2026-12-01"),
            tanggalSelesai: new Date("2026-12-02"),
            alasan: "Pengajuan 1",
            status: "PENDING",
          },
          {
            userId: karyawanId,
            jenis: "CUTI",
            tanggalMulai: new Date("2026-12-05"),
            tanggalSelesai: new Date("2026-12-07"),
            alasan: "Pengajuan 2",
            status: "APPROVED",
          },
          {
            userId: karyawan2Id,
            jenis: "SAKIT",
            tanggalMulai: new Date("2026-12-10"),
            tanggalSelesai: new Date("2026-12-11"),
            alasan: "Pengajuan 3",
            status: "PENDING",
          },
        ],
      });
    });

    it("should return only own permissions for Karyawan", async () => {
      const res = await request(app)
        .get("/api/permissions")
        .set("Authorization", `Bearer ${karyawanToken}`);
      expect(res.status).toBe(200);
      res.body.data.permissions.forEach((p: any) =>
        expect(p.userId).toBe(karyawanId)
      );
    });

    it("should return all permissions for HRD", async () => {
      const res = await request(app)
        .get("/api/permissions")
        .set("Authorization", `Bearer ${hrdToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.permissions.length).toBeGreaterThanOrEqual(3);
    });

    it("should filter by status", async () => {
      const res = await request(app)
        .get("/api/permissions?status=APPROVED")
        .set("Authorization", `Bearer ${hrdToken}`);
      expect(res.status).toBe(200);
      res.body.data.permissions.forEach((p: any) =>
        expect(p.status).toBe("APPROVED")
      );
    });

    it("should filter by jenis", async () => {
      const res = await request(app)
        .get("/api/permissions?jenis=SAKIT")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      res.body.data.permissions.forEach((p: any) =>
        expect(p.jenis).toBe("SAKIT")
      );
    });

    it("should support pagination", async () => {
      const res = await request(app)
        .get("/api/permissions?page=1&limit=2")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.permissions.length).toBeLessThanOrEqual(2);
      expect(res.body.data.pagination).toMatchObject({ page: 1, limit: 2 });
    });

    it("should reject without token", async () => {
      const res = await request(app).get("/api/permissions");
      expect(res.status).toBe(401);
    });
  });

  // ============================================
  // PUT /api/permissions/:id/approve (Sederhana)
  // ============================================
  describe("PUT /api/permissions/:id/approve", () => {
    let permId: number;

    beforeEach(async () => {
      await prisma.permission.deleteMany();
      const p = await prisma.permission.create({
        data: {
          userId: karyawanId,
          jenis: "IZIN",
          tanggalMulai: new Date("2026-12-01"),
          tanggalSelesai: new Date("2026-12-02"),
          alasan: "Test Approve",
          status: "PENDING",
        },
      });
      permId = p.id;
    });

    it("should approve by HRD", async () => {
      const res = await request(app)
        .put(`/api/permissions/${permId}/approve`)
        .set("Authorization", `Bearer ${hrdToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("APPROVED");
    });

    it("should reject approve already approved", async () => {
      await request(app)
        .put(`/api/permissions/${permId}/approve`)
        .set("Authorization", `Bearer ${hrdToken}`);
      const res = await request(app)
        .put(`/api/permissions/${permId}/approve`)
        .set("Authorization", `Bearer ${hrdToken}`);
      expect(res.status).toBe(400);
    });

    it("should reject when Karyawan tries to approve", async () => {
      const res = await request(app)
        .put(`/api/permissions/${permId}/approve`)
        .set("Authorization", `Bearer ${karyawanToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ============================================
  // PUT /api/permissions/:id/reject
  // ============================================
  describe("PUT /api/permissions/:id/reject", () => {
    let permId: number;

    beforeEach(async () => {
      await prisma.permission.deleteMany();
      const p = await prisma.permission.create({
        data: {
          userId: karyawanId,
          jenis: "IZIN",
          tanggalMulai: new Date("2026-12-01"),
          tanggalSelesai: new Date("2026-12-02"),
          alasan: "Test Reject",
          status: "PENDING",
        },
      });
      permId = p.id;
    });

    it("should reject by HRD with reason", async () => {
      const res = await request(app)
        .put(`/api/permissions/${permId}/reject`)
        .set("Authorization", `Bearer ${hrdToken}`)
        .send({ rejectionReason: "Alasan kurang jelas" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("REJECTED");
    });

    it("should reject without rejectionReason", async () => {
      const res = await request(app)
        .put(`/api/permissions/${permId}/reject`)
        .set("Authorization", `Bearer ${hrdToken}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
