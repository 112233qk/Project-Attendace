import request from "supertest";
import app from "../src/app";
import { prisma, resetDatabase, seedBaseUsers } from "./helpers/dbHelper";
import { generateTestToken } from "./helpers/authHelper";

describe("Offices Module", () => {
  let adminToken: string;
  let hrdToken: string;
  let karyawanToken: string;
  let adminId: number;
  let officeId: number;

  // ============================================
  // SETUP
  // ============================================
  beforeAll(async () => {
    await resetDatabase();
    const { admin, office } = await seedBaseUsers();

    adminId = admin.id;
    officeId = office.id;

    adminToken = generateTestToken({
      id: admin.id,
      role: "ADMIN",
      officeId: office.id,
    });
    hrdToken = generateTestToken({ id: 2, role: "HRD", officeId: office.id });
    karyawanToken = generateTestToken({
      id: 3,
      role: "KARYAWAN",
      officeId: office.id,
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ============================================
  // GET /api/offices
  // ============================================
  describe("GET /api/offices", () => {
    it("should return list of offices (semua role bisa akses)", async () => {
      const res = await request(app)
        .get("/api/offices")
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0]).toHaveProperty("_count");
    });

    it("should reject without token", async () => {
      const res = await request(app).get("/api/offices");
      expect(res.status).toBe(401);
    });
  });

  // ============================================
  // GET /api/offices/:id
  // ============================================
  describe("GET /api/offices/:id", () => {
    it("should return office detail", async () => {
      const res = await request(app)
        .get(`/api/offices/${officeId}`)
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id: officeId,
        name: "Kantor Test",
      });
    });

    it("should return 404 for non-existent ID", async () => {
      const res = await request(app)
        .get("/api/offices/99999")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ============================================
  // POST /api/offices
  // ============================================
  describe("POST /api/offices", () => {
    it("should create office by HRD", async () => {
      const res = await request(app)
        .post("/api/offices")
        .set("Authorization", `Bearer ${hrdToken}`)
        .send({
          name: "Kantor HRD",
          latitude: -6.3,
          longitude: 106.9,
          radius: 75,
          jamMasuk: "09:00",
          jamPulang: "18:00",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("Kantor HRD");
    });

    it("should create office by Admin", async () => {
      const res = await request(app)
        .post("/api/offices")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Kantor Admin",
          latitude: -6.4,
          longitude: 106.95,
          radius: 100,
          jamMasuk: "08:30",
          jamPulang: "17:30",
        });

      expect(res.status).toBe(201);
    });

    it("should reject when Karyawan tries to create", async () => {
      const res = await request(app)
        .post("/api/offices")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .send({
          name: "Kantor Karyawan",
          latitude: -6.5,
          longitude: 107.0,
          radius: 50,
          jamMasuk: "08:00",
          jamPulang: "17:00",
        });

      expect(res.status).toBe(403);
    });

    it("should reject invalid jam format", async () => {
      const res = await request(app)
        .post("/api/offices")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Kantor Invalid",
          latitude: -6.5,
          longitude: 107.0,
          radius: 50,
          jamMasuk: "25:00", // Invalid
          jamPulang: "17:00",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("jamMasuk");
    });

    it("should reject when jamMasuk >= jamPulang", async () => {
      const res = await request(app)
        .post("/api/offices")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Kantor Night",
          latitude: -6.5,
          longitude: 107.0,
          radius: 50,
          jamMasuk: "20:00",
          jamPulang: "08:00",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("lebih awal");
    });

    it("should reject missing required fields", async () => {
      const res = await request(app)
        .post("/api/offices")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Incomplete" });

      expect(res.status).toBe(400);
    });

    it("should reject invalid latitude", async () => {
      const res = await request(app)
        .post("/api/offices")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Bad Lat",
          latitude: 999, // > 90
          longitude: 107.0,
          radius: 50,
          jamMasuk: "08:00",
          jamPulang: "17:00",
        });

      expect(res.status).toBe(400);
    });
  });

  // ============================================
  // PUT /api/offices/:id
  // ============================================
  describe("PUT /api/offices/:id", () => {
    let testOfficeId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post("/api/offices")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Kantor Update Test",
          latitude: -6.2,
          longitude: 106.8,
          radius: 50,
          jamMasuk: "08:00",
          jamPulang: "17:00",
        });
      testOfficeId = res.body.data.id;
    });

    it("should update office by HRD", async () => {
      const res = await request(app)
        .put(`/api/offices/${testOfficeId}`)
        .set("Authorization", `Bearer ${hrdToken}`)
        .send({ name: "Kantor Updated", radius: 100 });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Kantor Updated");
      expect(res.body.data.radius).toBe(100);
    });

    it("should reject cross-validation jamMasuk >= jamPulang", async () => {
      const res = await request(app)
        .put(`/api/offices/${testOfficeId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ jamMasuk: "18:00" }); // jamPulang existing = 17:00

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("lebih awal");
    });

    it("should reject when Karyawan tries to update", async () => {
      const res = await request(app)
        .put(`/api/offices/${testOfficeId}`)
        .set("Authorization", `Bearer ${karyawanToken}`)
        .send({ name: "Hacked" });

      expect(res.status).toBe(403);
    });

    it("should reject update with no fields", async () => {
      const res = await request(app)
        .put(`/api/offices/${testOfficeId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Tidak ada data");
    });

    it("should return 404 for non-existent ID", async () => {
      const res = await request(app)
        .put("/api/offices/99999")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "X" });

      expect(res.status).toBe(404);
    });
  });

  // ============================================
  // DELETE /api/offices/:id
  // ============================================
  describe("DELETE /api/offices/:id", () => {
    let emptyOfficeId: number;

    beforeAll(async () => {
      // Buat kantor kosong (tidak punya user)
      const res = await request(app)
        .post("/api/offices")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Kantor Kosong",
          latitude: -6.7,
          longitude: 107.2,
          radius: 50,
          jamMasuk: "08:00",
          jamPulang: "17:00",
        });
      emptyOfficeId = res.body.data.id;
    });

    it("should reject when HRD tries to delete", async () => {
      const res = await request(app)
        .delete(`/api/offices/${emptyOfficeId}`)
        .set("Authorization", `Bearer ${hrdToken}`);

      expect(res.status).toBe(403);
    });

    it("should reject delete when office has users", async () => {
      const res = await request(app)
        .delete(`/api/offices/${officeId}`) // officeId ini punya user
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("karyawan");
    });

    it("should delete empty office by Admin", async () => {
      const res = await request(app)
        .delete(`/api/offices/${emptyOfficeId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Kantor berhasil dihapus.");

      // Verifikasi sudah hilang di DB
      const office = await prisma.office.findUnique({
        where: { id: emptyOfficeId },
      });
      expect(office).toBeNull();
    });

    it("should return 404 for non-existent ID", async () => {
      const res = await request(app)
        .delete("/api/offices/99999")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
