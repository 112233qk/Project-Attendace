import request from "supertest";
import app from "../src/app";
import { prisma, resetDatabase, seedBaseUsers } from "./helpers/dbHelper";
import { generateTestToken } from "./helpers/authHelper";

describe("Users Module", () => {
  let adminToken: string;
  let hrdToken: string;
  let karyawanToken: string;
  let adminId: number;
  let hrdId: number;
  let karyawanId: number;
  let officeId: number;

  // ============================================
  // SETUP: Reset DB & seed users + generate tokens
  // ============================================
  beforeAll(async () => {
    await resetDatabase();
    const { admin, hrd, karyawan, office } = await seedBaseUsers();

    adminId = admin.id;
    hrdId = hrd.id;
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ============================================
  // GET /api/users
  // ============================================
  describe("GET /api/users", () => {
    it("should return only KARYAWAN when accessed by HRD", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${hrdToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toBeInstanceOf(Array);

      res.body.data.users.forEach((u: any) => {
        expect(u.role).toBe("KARYAWAN");
      });
    });

    it("should return all roles when accessed by Admin", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      const roles = res.body.data.users.map((u: any) => u.role);
      expect(roles).toContain("KARYAWAN");
      expect(roles).toContain("HRD");
      expect(roles).toContain("ADMIN");
    });

    it("should reject access without token", async () => {
      const res = await request(app).get("/api/users");
      expect(res.status).toBe(401);
    });

    it("should reject access by KARYAWAN", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(403);
    });

    it("should support filter by role", async () => {
      const res = await request(app)
        .get("/api/users?role=KARYAWAN")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.users.forEach((u: any) => {
        expect(u.role).toBe("KARYAWAN");
      });
    });

    it("should support search filter", async () => {
      const res = await request(app)
        .get("/api/users?search=Test HRD")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(1);
    });

    it("should support pagination", async () => {
      const res = await request(app)
        .get("/api/users?page=1&limit=2")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.users.length).toBeLessThanOrEqual(2);
      expect(res.body.data.pagination).toMatchObject({
        page: 1,
        limit: 2,
      });
    });
  });

  // ============================================
  // GET /api/users/me
  // ============================================
  describe("GET /api/users/me", () => {
    it("should return own profile for Karyawan", async () => {
      const res = await request(app)
        .get("/api/users/me")
        .set("Authorization", `Bearer ${karyawanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id: karyawanId,
        email: "karyawan@test.com",
        role: "KARYAWAN",
      });
      expect(res.body.data).not.toHaveProperty("password");
    });
  });

  // ============================================
  // PUT /api/users/me/password
  // ============================================
  describe("PUT /api/users/me/password", () => {
    it("should reject wrong old password", async () => {
      const res = await request(app)
        .put("/api/users/me/password")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .send({ oldPassword: "wrongpass", newPassword: "newpass123" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Password lama tidak sesuai.");
    });

    it("should change password successfully", async () => {
      const res = await request(app)
        .put("/api/users/me/password")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .send({ oldPassword: "password123", newPassword: "newpass123" });

      expect(res.status).toBe(200);

      // Verifikasi: login dengan password baru
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "karyawan@test.com", password: "newpass123" });

      expect(loginRes.status).toBe(200);
    });
    it("should reject missing old password", async () => {
      const res = await request(app)
        .put("/api/users/me/password")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .send({ newPassword: "newpass123" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("wajib diisi");
    });

    it("should reject new password too short", async () => {
      const res = await request(app)
        .put("/api/users/me/password")
        .set("Authorization", `Bearer ${karyawanToken}`)
        .send({ oldPassword: "password123", newPassword: "abc" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("minimal 6 karakter");
    });
  });

  // ============================================
  // GET /api/users/:id
  // ============================================
  describe("GET /api/users/:id", () => {
    it("should return detail for Admin", async () => {
      const res = await request(app)
        .get(`/api/users/${hrdId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(hrdId);
    });

    it("should reject when HRD tries to view ADMIN", async () => {
      const res = await request(app)
        .get(`/api/users/${adminId}`)
        .set("Authorization", `Bearer ${hrdToken}`);

      expect(res.status).toBe(403);
    });

    it("should return 404 for non-existent ID", async () => {
      const res = await request(app)
        .get("/api/users/99999")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it("should allow HRD to view Karyawan detail", async () => {
      const res = await request(app)
        .get(`/api/users/${karyawanId}`)
        .set("Authorization", `Bearer ${hrdToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(karyawanId);
      expect(res.body.data.role).toBe("KARYAWAN");
    });
  });

  // ============================================
  // POST /api/users
  // ============================================
  describe("POST /api/users", () => {
    it("should create KARYAWAN by HRD", async () => {
      const res = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${hrdToken}`)
        .send({
          nik: "KRY999",
          nama: "New Karyawan HRD",
          email: "newhrd@test.com",
          password: "password123",
          role: "KARYAWAN",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe("KARYAWAN");
    });

    it("should reject when HRD tries to create ADMIN", async () => {
      const res = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${hrdToken}`)
        .send({
          nik: "ADM999",
          nama: "Bad Admin",
          email: "badadmin@test.com",
          password: "password123",
          role: "ADMIN",
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("role");
    });

    it("should allow Admin to create HRD", async () => {
      const res = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nik: "HRD999",
          nama: "New HRD",
          email: "newhrdadmin@test.com",
          password: "password123",
          role: "HRD",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe("HRD");
    });

    it("should reject duplicate NIK", async () => {
      const res = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nik: "KRY001",
          nama: "Dup",
          email: "unique@test.com",
          password: "password123",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("NIK sudah terdaftar.");
    });
  });

  // ============================================
  // PUT /api/users/:id
  // ============================================
  describe("PUT /api/users/:id", () => {
    it("should allow Admin to update HRD", async () => {
      const res = await request(app)
        .put(`/api/users/${hrdId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ nama: "Updated HRD" });

      expect(res.status).toBe(200);
      expect(res.body.data.nama).toBe("Updated HRD");
    });

    it("should reject when HRD tries to update ADMIN", async () => {
      const res = await request(app)
        .put(`/api/users/${adminId}`)
        .set("Authorization", `Bearer ${hrdToken}`)
        .send({ nama: "Hacked" });

      expect(res.status).toBe(403);
    });
  });

  // ============================================
  // DELETE /api/users/:id (Soft Delete)
  // ============================================
  describe("DELETE /api/users/:id", () => {
    let tempUserId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nik: "TEMPDEL",
          nama: "Temp Delete",
          email: "tempdel@test.com",
          password: "password123",
          role: "KARYAWAN",
        });
      tempUserId = res.body.data.id;
    });

    it("should soft delete user by HRD", async () => {
      const res = await request(app)
        .delete(`/api/users/${tempUserId}`)
        .set("Authorization", `Bearer ${hrdToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User berhasil dinonaktifkan.");

      const user = await prisma.user.findUnique({ where: { id: tempUserId } });
      expect(user?.isActive).toBe(false);
    });

    it("should reject deleting self", async () => {
      const res = await request(app)
        .delete(`/api/users/${adminId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("sendiri");
    });

    it("should reject when HRD tries to delete ADMIN", async () => {
      const res = await request(app)
        .delete(`/api/users/${adminId}`)
        .set("Authorization", `Bearer ${hrdToken}`);

      expect(res.status).toBe(403);
    });
  });
});
