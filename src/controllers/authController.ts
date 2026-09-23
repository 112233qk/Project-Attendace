import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { logActivity } from "../utils/auditLogger";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 10;

const sendResponse = (
  res: Response,
  status: number,
  success: boolean,
  message: string,
  data: any = null
) => {
  return res.status(status).json({ success, message, data });
};

// ============================================
// 1. LOGIN
// ============================================
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendResponse(res, 400, false, "Email dan password wajib diisi.");
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return sendResponse(res, 401, false, "Email atau password salah.");
    }

    // ⭐ Cek status akun
    if (!user.isActive) {
      return sendResponse(
        res,
        403,
        false,
        "Akun Anda telah dinonaktifkan. Hubungi Admin untuk informasi lebih lanjut."
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return sendResponse(res, 401, false, "Email atau password salah.");
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("FATAL ERROR: JWT_SECRET tidak dikonfigurasi.");
      return sendResponse(
        res,
        500,
        false,
        "Terjadi kesalahan konfigurasi pada server."
      );
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, officeId: user.officeId },
      secret,
      { expiresIn: "1d" }
    );

    // Audit log (login)
    await logActivity({
      req,
      action: "LOGIN",
      entity: "users",
      entityId: user.id,
      description: `User ${user.nama} (${user.role}) berhasil login.`,
    });

    return sendResponse(res, 200, true, "Login berhasil.", {
      token,
      user: {
        id: user.id,
        nik: user.nik,
        nama: user.nama,
        email: user.email,
        role: user.role,
        officeId: user.officeId,
        fotoProfil: user.fotoProfil,
      },
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 1. REGISTER (Public — untuk setup awal Karyawan)
// ============================================
export const register = async (req: Request, res: Response) => {
  try {
    const { nik, nama, email, password, officeId } = req.body;

    // Validasi input
    if (!nik || !nama || !email || !password) {
      return sendResponse(
        res,
        400,
        false,
        "NIK, nama, email, dan password wajib diisi."
      );
    }

    if (typeof password !== "string" || password.length < 6) {
      return sendResponse(res, 400, false, "Password minimal 6 karakter.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendResponse(res, 400, false, "Format email tidak valid.");
    }

    // Cek duplikasi NIK & email
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ nik: nik.trim() }, { email: email.trim().toLowerCase() }],
      },
    });

    if (existing) {
      const msg =
        existing.nik === nik.trim()
          ? "NIK sudah terdaftar."
          : "Email sudah terdaftar.";
      return sendResponse(res, 400, false, msg);
    }

    // Validasi officeId (opsional)
    let parsedOfficeId: number | null = null;
    if (officeId !== undefined && officeId !== null && officeId !== "") {
      parsedOfficeId = parseInt(officeId);
      const officeExists = await prisma.office.findUnique({
        where: { id: parsedOfficeId },
      });
      if (!officeExists) {
        return sendResponse(res, 400, false, "Office ID tidak ditemukan.");
      }
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const newUser = await prisma.user.create({
      data: {
        nik: nik.trim(),
        nama: nama.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: "KARYAWAN", // Register public selalu KARYAWAN
        officeId: parsedOfficeId,
      },
      select: {
        id: true,
        nik: true,
        nama: true,
        email: true,
        role: true,
        officeId: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Audit log (registrasi mandiri)
    await logActivity({
      req,
      action: "CREATE_USER",
      entity: "users",
      entityId: newUser.id,
      newValue: newUser,
      description: `Registrasi mandiri user baru: ${newUser.nama} (KARYAWAN).`,
    });

    return sendResponse(
      res,
      201,
      true,
      "Registrasi berhasil. Silakan login.",
      newUser
    );
  } catch (error: any) {
    console.error("Register Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 2. LOGOUT (catat aktivitas)
// ============================================
export const logout = async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    await logActivity({
      req,
      action: "LOGOUT",
      entity: "users",
      entityId: user.id,
      description: `User ${user.id} logout.`,
    });

    return sendResponse(res, 200, true, "Logout berhasil.");
  } catch (error: any) {
    console.error("Logout Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};
