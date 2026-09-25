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

    it("should reject when HRD tries to create", async () => {
      const res = await request(app)
        .post("/api/permissions")
        .set("Authorization", `Bearer ${hrdToken}`)
        .field("jenis", "IZIN")
        .field("tanggalMulai", getTomorrow())
        .field("tanggalSelesai", getDayAfterTomorrow())
        .field("alasan", "HRD coba buat");

      expect(res.status).toBe(403);
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
  // GET /api/permissions (List)
  // ============================================
  describe("GET /api/permissions", () => {
    let karyawan2Id: number;
    let karyawan2Token: string;

    beforeAll(async () => {
      await prisma.permission.deleteMany();

      // Buat user karyawan2 untuk test filter
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

      // Buat 3 pengajuan
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
      res.body.data.permissions.forEach((p: any) => {
        expect(p.userId).toBe(karyawanId);
      });
    });

    it("should ignore userId param when Karyawan tries to peek", async () => {
      const res = await request(app)
        .get(`/api/permissions?userId=${karyawan2Id}`)
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(200);
      res.body.data.permissions.forEach((p: any) => {
        expect(p.userId).toBe(karyawanId);
      });
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
      res.body.data.permissions.forEach((p: any) => {
        expect(p.status).toBe("APPROVED");
      });
    });

    it("should filter by jenis", async () => {
      const res = await request(app)
        .get("/api/permissions?jenis=SAKIT")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.permissions.forEach((p: any) => {
        expect(p.jenis).toBe("SAKIT");
      });
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
  // GET /api/permissions/:id (Detail)
  // ============================================
  describe("GET /api/permissions/:id", () => {
    let permId: number;
    let permOfKaryawan2Id: number;
    let karyawan2Id: number;

    beforeAll(async () => {
      await prisma.permission.deleteMany();

      const bcrypt = require("bcrypt");
      const hash = await bcrypt.hash("password123", 10);
      const k2 = await prisma.user.create({
        data: {
          nik: "KRYDET",
          nama: "Karyawan Detail",
          email: "krydet@test.com",
          password: hash,
          role: "KARYAWAN",
          officeId: 1,
        },
      });
      karyawan2Id = k2.id;

      const p1 = await prisma.permission.create({
        data: {
          userId: karyawanId,
          jenis: "IZIN",
          tanggalMulai: new Date("2026-12-01"),
          tanggalSelesai: new Date("2026-12-02"),
          alasan: "Detail Test",
        },
      });
      permId = p1.id;

      const p2 = await prisma.permission.create({
        data: {
          userId: karyawan2Id,
          jenis: "IZIN",
          tanggalMulai: new Date("2026-12-01"),
          tanggalSelesai: new Date("2026-12-02"),
          alasan: "Detail Test 2",
        },
      });
      permOfKaryawan2Id = p2.id;
    });

    it("should return own permission detail", async () => {
      const res = await request(app)
        .get(`/api/permissions/${permId}`)
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(permId);
    });

    it("should reject when Karyawan tries to access other user permission", async () => {
      const res = await request(app)
        .get(`/api/permissions/${permOfKaryawan2Id}`)
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(403);
    });

    it("should allow HRD to view any permission", async () => {
      const res = await request(app)
        .get(`/api/permissions/${permOfKaryawan2Id}`)
        .set("Authorization", `Bearer ${hrdToken}`);

      expect(res.status).toBe(200);
    });

    it("should return 404 for non-existent ID", async () => {
      const res = await request(app)
        .get("/api/permissions/99999")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ============================================
  // PUT /api/permissions/:id (Update)
  // ============================================
  describe("PUT /api/permissions/:id", () => {
    let permId: number;

    beforeEach(async () => {
      await prisma.permission.deleteMany();

      const p = await prisma.permission.create({
        data: {
          userId: karyawanId,
          jenis: "IZIN",
          tanggalMulai: new Date("2026-12-01"),
          tanggalSelesai: new Date("2026-12-02"),
          alasan: "Awal",
          status: "PENDING",
        },
      });
      permId = p.id;
    });

    it("should update own pending permission", async () => {
      const res = await request(app)
        .put(`/api/permissions/${permId}`)
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("alasan", "Alasan sudah diupdate");

      expect(res.status).toBe(200);
      expect(res.body.data.alasan).toBe("Alasan sudah diupdate");
    });

    it("should reject update after status non-PENDING", async () => {
      // Ubah status jadi APPROVED
      await prisma.permission.update({
        where: { id: permId },
        data: { status: "APPROVED" },
      });

      const res = await request(app)
        .put(`/api/permissions/${permId}`)
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("alasan", "Coba update setelah approve");

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("sudah diproses");
    });

    it("should reject update by non-owner", async () => {
      const bcrypt = require("bcrypt");
      const hash = await bcrypt.hash("password123", 10);
      const k2 = await prisma.user.create({
        data: {
          nik: "KRYNONOWN",
          nama: "Non Owner",
          email: "nonowner@test.com",
          password: hash,
          role: "KARYAWAN",
          officeId: 1,
        },
      });
      const k2Token = generateTestToken({
        id: k2.id,
        role: "KARYAWAN",
        officeId: 1,
      });

      const res = await request(app)
        .put(`/api/permissions/${permId}`)
        .set("Authorization", `Bearer ${k2Token}`)
        .field("alasan", "Hack");

      expect(res.status).toBe(403);
    });
  });

  // ============================================
  // DELETE /api/permissions/:id (Cancel)
  // ============================================
  describe("DELETE /api/permissions/:id", () => {
    let permId: number;

    beforeEach(async () => {
      await prisma.permission.deleteMany();

      const p = await prisma.permission.create({
        data: {
          userId: karyawanId,
          jenis: "IZIN",
          tanggalMulai: new Date("2026-12-01"),
          tanggalSelesai: new Date("2026-12-02"),
          alasan: "Test Cancel",
          status: "PENDING",
        },
      });
      permId = p.id;
    });

    it("should cancel own pending permission", async () => {
      const res = await request(app)
        .delete(`/api/permissions/${permId}`)
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(200);

      // Verifikasi sudah tidak ada
      const check = await prisma.permission.findUnique({
        where: { id: permId },
      });
      expect(check).toBeNull();
    });

    it("should reject cancel after status non-PENDING", async () => {
      await prisma.permission.update({
        where: { id: permId },
        data: { status: "APPROVED" },
      });

      const res = await request(app)
        .delete(`/api/permissions/${permId}`)
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(400);
    });
  });

  // ============================================
  // PUT /api/permissions/:id/approve
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
      expect(res.body.data.approvedBy).toBe(hrdId);
    });

    it("should approve by Admin", async () => {
      const res = await request(app)
        .put(`/api/permissions/${permId}/approve`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.approvedBy).toBe(adminId);
    });

    it("should reject approve already approved", async () => {
      await request(app)
        .put(`/api/permissions/${permId}/approve`)
        .set("Authorization", `Bearer ${hrdToken}`);

      const res = await request(app)
        .put(`/api/permissions/${permId}/approve`)
        .set("Authorization", `Bearer ${hrdToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("sudah diproses");
    });

    it("should reject when Karyawan tries to approve", async () => {
      const res = await request(app)
        .put(`/api/permissions/${permId}/approve`)
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(403);
    });

    it("should return 404 for non-existent permission", async () => {
      const res = await request(app)
        .put("/api/permissions/99999/approve")
        .set("Authorization", `Bearer ${hrdToken}`);

      expect(res.status).toBe(404);
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
      expect(res.body.data.rejectionReason).toBe("Alasan kurang jelas");
    });

    it("should reject without rejectionReason", async () => {
      const res = await request(app)
        .put(`/api/permissions/${permId}/reject`)
        .set("Authorization", `Bearer ${hrdToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Alasan penolakan");
    });

    it("should reject with short rejectionReason", async () => {
      const res = await request(app)
        .put(`/api/permissions/${permId}/reject`)
        .set("Authorization", `Bearer ${hrdToken}`)
        .send({ rejectionReason: "No" });

      expect(res.status).toBe(400);
    });

    it("should reject when Karyawan tries to reject", async () => {
      const res = await request(app)
        .put(`/api/permissions/${permId}/reject`)
        .set("Authorization", `Bearer ${karyawanToken}`)
        .send({ rejectionReason: "Coba reject" });

      expect(res.status).toBe(403);
    });
  });

  // ============================================
  // Overlap Validation
  // ============================================
  describe("Overlap Validation", () => {
    beforeEach(async () => {
      await prisma.permission.deleteMany();
    });

    it("should reject overlapping dates with APPROVED permission", async () => {
      // Buat APPROVED permission
      await prisma.permission.create({
        data: {
          userId: karyawanId,
          jenis: "CUTI",
          tanggalMulai: new Date("2026-12-01"),
          tanggalSelesai: new Date("2026-12-05"),
          alasan: "Cuti panjang",
          status: "APPROVED",
        },
      });

      // Coba ajukan izin dengan tanggal overlap
      const res = await request(app)
        .post("/api/permissions")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("jenis", "IZIN")
        .field("tanggalMulai", "2026-12-03")
        .field("tanggalSelesai", "2026-12-04")
        .field("alasan", "Overlap test");

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("rentang tanggal");
    });
  });
});
