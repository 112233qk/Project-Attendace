import request from "supertest";
import app from "../src/app";
import {
  prisma,
  resetDatabase,
  seedBaseUsers,
  BCRYPT_ROUNDS,
} from "./helpers/dbHelper";
import bcrypt from "bcrypt";

describe("Auth Module", () => {
  // ============================================
  // SETUP: Reset database & seed base data sebelum semua test
  // ============================================
  beforeAll(async () => {
    await resetDatabase();
    await seedBaseUsers();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ============================================
  // POST /api/auth/register
  // ============================================
  describe("POST /api/auth/register", () => {
    it("should register a new Karyawan successfully", async () => {
      const res = await request(app).post("/api/auth/register").send({
        nik: "KRY100",
        nama: "New Karyawan",
        email: "new@test.com",
        password: "newpass123",
        officeId: 1,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Registrasi berhasil. Silakan login.");
      expect(res.body.data).toMatchObject({
        nik: "KRY100",
        nama: "New Karyawan",
        email: "new@test.com",
        role: "KARYAWAN",
      });
      expect(res.body.data).not.toHaveProperty("password");
    });

    it("should reject if NIK already exists", async () => {
      const res = await request(app).post("/api/auth/register").send({
        nik: "KRY001", // Sudah ada dari seed
        nama: "Duplicate NIK",
        email: "unique@test.com",
        password: "pass123",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("NIK sudah terdaftar.");
    });

    it("should reject if email already exists", async () => {
      const res = await request(app).post("/api/auth/register").send({
        nik: "NEWNIK999",
        nama: "Duplicate Email",
        email: "karyawan@test.com", // Sudah ada dari seed
        password: "pass123",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Email sudah terdaftar.");
    });

    it("should reject if required fields are missing", async () => {
      const res = await request(app).post("/api/auth/register").send({
        nik: "KRY200",
        // nama & email & password kosong
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject if password is too short", async () => {
      const res = await request(app).post("/api/auth/register").send({
        nik: "KRY300",
        nama: "Short Pass",
        email: "short@test.com",
        password: "12345", // Kurang dari 6
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Password minimal 6 karakter.");
    });

    it("should reject if email format is invalid", async () => {
      const res = await request(app).post("/api/auth/register").send({
        nik: "KRY400",
        nama: "Bad Email",
        email: "not-an-email",
        password: "validpass123",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Format email tidak valid.");
    });

    it("should reject if officeId does not exist", async () => {
      const res = await request(app).post("/api/auth/register").send({
        nik: "KRY500",
        nama: "Bad Office",
        email: "badoffice@test.com",
        password: "validpass123",
        officeId: 99999,
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Office ID tidak ditemukan.");
    });
  });

  // ============================================
  // POST /api/auth/login
  // ============================================
  describe("POST /api/auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "admin@test.com",
        password: "password123",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Login berhasil.");
      expect(res.body.data).toHaveProperty("token");
      expect(res.body.data.user).toMatchObject({
        email: "admin@test.com",
        role: "ADMIN",
      });
      expect(res.body.data.user).not.toHaveProperty("password");
    });

    it("should reject with wrong password", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "admin@test.com",
        password: "wrongpassword",
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Email atau password salah.");
    });

    it("should reject with non-existent email", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "notexist@test.com",
        password: "password123",
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Email atau password salah.");
    });

    it("should reject if email or password is empty", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "",
        password: "",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Email dan password wajib diisi.");
    });

    it("should reject login for inactive user", async () => {
      // Buat user dengan isActive = false
      const hashedPassword = await bcrypt.hash("inactive123", BCRYPT_ROUNDS);
      await prisma.user.create({
        data: {
          nik: "INACTIVE001",
          nama: "Inactive User",
          email: "inactive@test.com",
          password: hashedPassword,
          role: "KARYAWAN",
          isActive: false,
        },
      });

      const res = await request(app).post("/api/auth/login").send({
        email: "inactive@test.com",
        password: "inactive123",
      });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe(
        "Akun Anda telah dinonaktifkan. Hubungi Admin untuk informasi lebih lanjut."
      );
    });
  });

  // ============================================
  // POST /api/auth/logout
  // ============================================
  describe("POST /api/auth/logout", () => {
    let token: string;

    beforeAll(async () => {
      const loginRes = await request(app).post("/api/auth/login").send({
        email: "admin@test.com",
        password: "password123",
      });
      token = loginRes.body.data.token;
    });

    it("should logout successfully with valid token", async () => {
      const res = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Logout berhasil.");
    });

    it("should reject logout without token", async () => {
      const res = await request(app).post("/api/auth/logout");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should reject logout with invalid token", async () => {
      const res = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", "Bearer invalid-token-here");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
