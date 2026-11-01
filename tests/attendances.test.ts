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
        .field("alasanTelat", "Test alasan telat") // <-- TAMBAHAN
        .attach("fotoMasuk", FIXTURE_PATH);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
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
        .field("alasanTelat", "Test alasan telat") // <-- TAMBAHAN
        .attach("fotoMasuk", FIXTURE_PATH);

      const res = await request(app)
        .post("/api/attendances/check-in")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("latitude", OFFICE_LAT.toString())
        .field("longitude", OFFICE_LNG.toString())
        .field("alasanTelat", "Test alasan telat") // <-- TAMBAHAN
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
        .field("alasanPulang", "Test alasan pulang") // <-- TAMBAHAN
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
        .field("alasanTelat", "Test alasan telat") // <-- TAMBAHAN
        .attach("fotoMasuk", FIXTURE_PATH);

      const res = await request(app)
        .post("/api/attendances/check-out")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("latitude", OFFICE_LAT.toString())
        .field("longitude", OFFICE_LNG.toString())
        .field("alasanPulang", "Test alasan pulang") // <-- TAMBAHAN
        .attach("fotoPulang", FIXTURE_PATH);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("jamPulang");
    });

    it("should reject duplicate check-out", async () => {
      await request(app)
        .post("/api/attendances/check-in")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("latitude", OFFICE_LAT.toString())
        .field("longitude", OFFICE_LNG.toString())
        .field("alasanTelat", "Test alasan telat") // <-- TAMBAHAN
        .attach("fotoMasuk", FIXTURE_PATH);

      await request(app)
        .post("/api/attendances/check-out")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .field("latitude", OFFICE_LAT.toString())
        .field("longitude", OFFICE_LNG.toString())
        .field("alasanPulang", "Test alasan pulang") // <-- TAMBAHAN
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

  describe("GET /api/attendances/history", () => {
    beforeAll(async () => {
      await prisma.attendance.deleteMany();
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
      res.body.data.forEach((a: any) => expect(a.userId).toBe(karyawanId));
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

    it("should filter by specific date", async () => {
      const res = await request(app)
        .get("/api/attendances/history?tanggal=2026-01-15")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("GET /api/attendances/me", () => {
    beforeAll(async () => {
      await prisma.attendance.deleteMany();
      await prisma.attendance.create({
        data: {
          userId: karyawanId,
          tanggal: new Date("2026-02-01"),
          jamMasuk: new Date("2026-02-01T08:00:00Z"),
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
      res.body.data.forEach((a: any) => expect(a.userId).toBe(karyawanId));
    });
  });

  describe("GET /api/attendances/today", () => {
    it("should return status for user", async () => {
      const res = await request(app)
        .get("/api/attendances/today")
        .set("Authorization", `Bearer ${karyawanToken}`);
      expect(res.status).toBe(200);
      // Karena activePermission sekarang objek, kita cek apakah tipenya object atau null
      if (res.body.data.activePermission) {
        expect(typeof res.body.data.activePermission).toBe("object");
      } else {
        expect(res.body.data.activePermission).toBeNull();
      }
    });
  });
});
