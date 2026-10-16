import request from "supertest";
import path from "path";
import app from "../src/app";
import { prisma, resetDatabase, seedBaseUsers } from "./helpers/dbHelper";
import { generateTestToken } from "./helpers/authHelper";

describe("Attendances Module", () => {
  let karyawanToken: string;
  let hrdToken: string;
  let adminToken: string;
  let karyawanId: number;
  let hrdId: number;
  let adminId: number;

  const FIXTURE_PATH = path.join(__dirname, "fixtures", "sample.jpg");
  const OFFICE_LAT = -6.2088;
  const OFFICE_LNG = 106.8456;
  const FAR_LAT = -6.5;
  const FAR_LNG = 107.0;

  // ============================================
  // SETUP
  // ============================================
  beforeAll(async () => {
    await resetDatabase();
    const { admin, hrd, karyawan } = await seedBaseUsers();

    karyawanId = karyawan.id;
    hrdId = hrd.id;
    adminId = admin.id;

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
  // POST /api/attendances/check-in
  // ============================================
  describe("POST /api/attendances/check-in", () => {
    beforeEach(async () => {
      await prisma.attendance.deleteMany();
    });

    it("should check-in successfully when inside radius", async () => {
      const res = await request(app)
        .post("/api/attendances/check-in")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("latitude", OFFICE_LAT.toString())
        .field("longitude", OFFICE_LNG.toString())
        .field("metodeMasuk", "GPS")
        .attach("fotoMasuk", FIXTURE_PATH);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        userId: karyawanId,
        latMasuk: OFFICE_LAT,
        lngMasuk: OFFICE_LNG,
        metodeMasuk: "GPS",
      });
      expect(["TEPAT_WAKTU", "TERLAMBAT"]).toContain(res.body.data.statusMasuk);
    });

    it("should reject check-in when outside radius", async () => {
      const res = await request(app)
        .post("/api/attendances/check-in")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("latitude", FAR_LAT.toString())
        .field("longitude", FAR_LNG.toString())
        .attach("fotoMasuk", FIXTURE_PATH);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("radius");
    });

    it("should reject duplicate check-in on same day", async () => {
      await request(app)
        .post("/api/attendances/check-in")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("latitude", OFFICE_LAT.toString())
        .field("longitude", OFFICE_LNG.toString())
        .attach("fotoMasuk", FIXTURE_PATH);

      const res = await request(app)
        .post("/api/attendances/check-in")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("latitude", OFFICE_LAT.toString())
        .field("longitude", OFFICE_LNG.toString())
        .attach("fotoMasuk", FIXTURE_PATH);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("sudah melakukan check-in");
    });

    it("should reject missing latitude/longitude", async () => {
      const res = await request(app)
        .post("/api/attendances/check-in")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .attach("fotoMasuk", FIXTURE_PATH);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Latitude");
    });

    it("should reject access without token", async () => {
      const res = await request(app)
        .post("/api/attendances/check-in")
        .field("latitude", OFFICE_LAT.toString())
        .field("longitude", OFFICE_LNG.toString());

      expect(res.status).toBe(401);
    });
  });

  // ============================================
  // POST /api/attendances/check-out
  // ============================================
  describe("POST /api/attendances/check-out", () => {
    beforeEach(async () => {
      await prisma.attendance.deleteMany();
    });

    it("should reject check-out without prior check-in", async () => {
      const res = await request(app)
        .post("/api/attendances/check-out")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("latitude", OFFICE_LAT.toString())
        .field("longitude", OFFICE_LNG.toString())
        .attach("fotoPulang", FIXTURE_PATH);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("belum melakukan check-in");
    });

    it("should check-out successfully after check-in", async () => {
      await request(app)
        .post("/api/attendances/check-in")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("latitude", OFFICE_LAT.toString())
        .field("longitude", OFFICE_LNG.toString())
        .attach("fotoMasuk", FIXTURE_PATH);

      const res = await request(app)
        .post("/api/attendances/check-out")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("latitude", OFFICE_LAT.toString())
        .field("longitude", OFFICE_LNG.toString())
        .attach("fotoPulang", FIXTURE_PATH);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("jamPulang");
      expect(res.body.data).toHaveProperty("fotoPulang");
    });

    it("should reject duplicate check-out", async () => {
      await request(app)
        .post("/api/attendances/check-in")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("latitude", OFFICE_LAT.toString())
        .field("longitude", OFFICE_LNG.toString())
        .attach("fotoMasuk", FIXTURE_PATH);

      await request(app)
        .post("/api/attendances/check-out")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("latitude", OFFICE_LAT.toString())
        .field("longitude", OFFICE_LNG.toString())
        .attach("fotoPulang", FIXTURE_PATH);

      const res = await request(app)
        .post("/api/attendances/check-out")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("latitude", OFFICE_LAT.toString())
        .field("longitude", OFFICE_LNG.toString())
        .attach("fotoPulang", FIXTURE_PATH);

      expect(res.status).toBe(400);
    });
  });

  // ============================================
  // GET /api/attendances/history
  // ============================================
  describe("GET /api/attendances/history", () => {
    beforeAll(async () => {
      await prisma.attendance.deleteMany();

      // Data milik karyawan
      await prisma.attendance.create({
        data: {
          userId: karyawanId,
          tanggal: new Date("2026-01-15"),
          jamMasuk: new Date("2026-01-15T08:00:00Z"),
          jamPulang: new Date("2026-01-15T17:00:00Z"),
          statusMasuk: "TEPAT_WAKTU",
          metodeMasuk: "GPS",
        },
      });

      // Data milik HRD
      await prisma.attendance.create({
        data: {
          userId: hrdId,
          tanggal: new Date("2026-01-15"),
          jamMasuk: new Date("2026-01-15T08:30:00Z"),
          statusMasuk: "TERLAMBAT",
          metodeMasuk: "GPS",
        },
      });
    });

    it("should return only own history when accessed by Karyawan", async () => {
      const res = await request(app)
        .get("/api/attendances/history")
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((a: any) => {
        expect(a.userId).toBe(karyawanId);
      });
    });

    it("should ignore userId param when Karyawan tries to peek", async () => {
      const res = await request(app)
        .get(`/api/attendances/history?userId=${hrdId}`)
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((a: any) => {
        expect(a.userId).toBe(karyawanId);
      });
    });

    it("should return all history when accessed by HRD", async () => {
      const res = await request(app)
        .get("/api/attendances/history")
        .set("Authorization", `Bearer ${hrdToken}`);

      expect(res.status).toBe(200);
      const userIds = res.body.data.map((a: any) => a.userId);
      expect(userIds).toContain(karyawanId);
      expect(userIds).toContain(hrdId);
    });

    it("should filter by userId for HRD/Admin", async () => {
      const res = await request(app)
        .get(`/api/attendances/history?userId=${karyawanId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((a: any) => {
        expect(a.userId).toBe(karyawanId);
      });
    });

    it("should filter by specific date", async () => {
      const res = await request(app)
        .get("/api/attendances/history?tanggal=2026-01-15")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("should reject access without token", async () => {
      const res = await request(app).get("/api/attendances/history");
      expect(res.status).toBe(401);
    });
  });

  // ============================================
  // GET /api/attendances/me
  // ============================================
  describe("GET /api/attendances/me", () => {
    beforeAll(async () => {
      await prisma.attendance.deleteMany();

      // Data milik karyawan
      await prisma.attendance.create({
        data: {
          userId: karyawanId,
          tanggal: new Date("2026-02-01"),
          jamMasuk: new Date("2026-02-01T08:00:00Z"),
          statusMasuk: "TEPAT_WAKTU",
          metodeMasuk: "GPS",
        },
      });

      // Data milik HRD
      await prisma.attendance.create({
        data: {
          userId: hrdId,
          tanggal: new Date("2026-02-01"),
          jamMasuk: new Date("2026-02-01T09:00:00Z"),
          statusMasuk: "TERLAMBAT",
          metodeMasuk: "GPS",
        },
      });

      // Data milik Admin
      await prisma.attendance.create({
        data: {
          userId: adminId,
          tanggal: new Date("2026-02-01"),
          jamMasuk: new Date("2026-02-01T07:30:00Z"),
          statusMasuk: "TEPAT_WAKTU",
          metodeMasuk: "GPS",
        },
      });
    });

    it("should return only own history for Karyawan", async () => {
      const res = await request(app)
        .get("/api/attendances/me")
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach((a: any) => {
        expect(a.userId).toBe(karyawanId);
      });
    });

    it("should return only own history for HRD (not all users)", async () => {
      const res = await request(app)
        .get("/api/attendances/me")
        .set("Authorization", `Bearer ${hrdToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((a: any) => {
        expect(a.userId).toBe(hrdId);
      });
      // Pastikan TIDAK ada data user lain
      const userIds = res.body.data.map((a: any) => a.userId);
      expect(userIds).not.toContain(karyawanId);
      expect(userIds).not.toContain(adminId);
    });

    it("should return only own history for Admin", async () => {
      const res = await request(app)
        .get("/api/attendances/me")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((a: any) => {
        expect(a.userId).toBe(adminId);
      });
      const userIds = res.body.data.map((a: any) => a.userId);
      expect(userIds).not.toContain(karyawanId);
      expect(userIds).not.toContain(hrdId);
    });

    it("should reject access without token", async () => {
      const res = await request(app).get("/api/attendances/me");
      expect(res.status).toBe(401);
    });
    it("should support filter by date", async () => {
      const res = await request(app)
        .get("/api/attendances/me?tanggal=2026-02-01")
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("should return empty when filtering by date without data", async () => {
      const res = await request(app)
        .get("/api/attendances/me?tanggal=2099-12-31")
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  // ============================================
  // GET /api/attendances/today
  // ============================================
  describe("GET /api/attendances/today", () => {
    beforeEach(async () => {
      await prisma.attendance.deleteMany();
    });

    it("should return empty status for Karyawan who hasn't checked in", async () => {
      const res = await request(app)
        .get("/api/attendances/today")
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasCheckedIn).toBe(false);
      expect(res.body.data.hasCheckedOut).toBe(false);
      expect(res.body.data.checkInTime).toBeNull();
      expect(res.body.data.checkOutTime).toBeNull();
      expect(res.body.data.attendance).toBeNull();
    });

    it("should return check-in time after check-in", async () => {
      await request(app)
        .post("/api/attendances/check-in")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("latitude", OFFICE_LAT.toString())
        .field("longitude", OFFICE_LNG.toString())
        .attach("fotoMasuk", FIXTURE_PATH);

      const res = await request(app)
        .get("/api/attendances/today")
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasCheckedIn).toBe(true);
      expect(res.body.data.hasCheckedOut).toBe(false);
      expect(res.body.data.checkInTime).not.toBeNull();
      expect(res.body.data.checkInTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it("should allow HRD to access /today", async () => {
      const res = await request(app)
        .get("/api/attendances/today")
        .set("Authorization", `Bearer ${hrdToken}`);

      expect(res.status).toBe(200);
    });

    it("should reject without token", async () => {
      const res = await request(app).get("/api/attendances/today");
      expect(res.status).toBe(401);
    });
  });
});
