import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

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
// SEED INITIAL DATA
// ============================================
export const seedInitialData = async (req: Request, res: Response) => {
  try {
    // Safety: cek apakah database sudah punya user
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return sendResponse(
        res,
        400,
        false,
        "Database sudah memiliki data. Seed hanya bisa dijalankan sekali."
      );
    }

    // 1. Buat Office default
    const office = await prisma.office.create({
      data: {
        name: "Kantor Pusat",
        latitude: -6.2088,
        longitude: 106.8456,
        radius: 50,
        jamMasuk: "08:00",
        jamPulang: "17:00",
      },
    });

    // 2. Buat user default (Admin, HRD, Karyawan)
    const adminPassword = await bcrypt.hash("admin123", BCRYPT_ROUNDS);
    const hrdPassword = await bcrypt.hash("hrd123", BCRYPT_ROUNDS);
    const karyawanPassword = await bcrypt.hash("karyawan123", BCRYPT_ROUNDS);

    const admin = await prisma.user.create({
      data: {
        officeId: office.id,
        nik: "ADMIN001",
        nama: "Super Admin",
        email: "admin@test.com",
        password: adminPassword,
        role: "ADMIN",
        isActive: true,
      },
    });

    const hrd = await prisma.user.create({
      data: {
        officeId: office.id,
        nik: "HRD001",
        nama: "Test HRD",
        email: "hrd@test.com",
        password: hrdPassword,
        role: "HRD",
        isActive: true,
      },
    });

    const karyawan = await prisma.user.create({
      data: {
        officeId: office.id,
        nik: "KRY001",
        nama: "Test Karyawan",
        email: "karyawan@test.com",
        password: karyawanPassword,
        role: "KARYAWAN",
        isActive: true,
      },
    });

    return sendResponse(res, 201, true, "Seed berhasil. Silakan login.", {
      office: { id: office.id, name: office.name },
      credentials: [
        { email: "admin@test.com", password: "admin123", role: "ADMIN" },
        { email: "hrd@test.com", password: "hrd123", role: "HRD" },
        {
          email: "karyawan@test.com",
          password: "karyawan123",
          role: "KARYAWAN",
        },
      ],
    });
  } catch (error: any) {
    console.error("Seed Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};
