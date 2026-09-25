import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export const BCRYPT_ROUNDS = 10;

/**
 * Hapus semua data dari tabel (urutan dari anak ke induk untuk hindari FK error).
 * Reset auto-increment agar ID mulai dari 1.
 */
export const resetDatabase = async (): Promise<void> => {
  // Hapus dalam urutan yang benar (anak dulu)
  await prisma.auditLog.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.user.deleteMany();
  await prisma.office.deleteMany();

  // Reset auto-increment via raw query
  await prisma.$executeRawUnsafe("ALTER TABLE audit_logs AUTO_INCREMENT = 1");
  await prisma.$executeRawUnsafe("ALTER TABLE permissions AUTO_INCREMENT = 1");
  await prisma.$executeRawUnsafe("ALTER TABLE attendances AUTO_INCREMENT = 1");
  await prisma.$executeRawUnsafe("ALTER TABLE users AUTO_INCREMENT = 1");
  await prisma.$executeRawUnsafe("ALTER TABLE offices AUTO_INCREMENT = 1");
};

/**
 * Buat user default (Admin, HRD, Karyawan) untuk testing.
 * Return objek berisi user-user tersebut.
 */
export const seedBaseUsers = async () => {
  const hashedPassword = await bcrypt.hash("password123", BCRYPT_ROUNDS);

  const office = await prisma.office.create({
    data: {
      name: "Kantor Test",
      latitude: -6.2088,
      longitude: 106.8456,
      radius: 50,
      jamMasuk: "08:00",
      jamPulang: "17:00",
    },
  });

  const admin = await prisma.user.create({
    data: {
      officeId: office.id,
      nik: "ADMIN001",
      nama: "Test Admin",
      email: "admin@test.com",
      password: hashedPassword,
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
      password: hashedPassword,
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
      password: hashedPassword,
      role: "KARYAWAN",
      isActive: true,
    },
  });

  return { office, admin, hrd, karyawan };
};

export { prisma };
