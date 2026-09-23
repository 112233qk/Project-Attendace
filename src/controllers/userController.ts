import { Request, Response } from "express";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { logActivity, userSnapshot } from "../utils/auditLogger";

const prisma = new PrismaClient();

// ============================================
// HELPER
// ============================================

const sendResponse = (
  res: Response,
  status: number,
  success: boolean,
  message: string,
  data: any = null
) => {
  return res.status(status).json({ success, message, data });
};

const BCRYPT_ROUNDS = 10;

// Cek apakah aktor boleh mengelola target role
const canManageRole = (actorRole: Role, targetRole: Role): boolean => {
  if (actorRole === "ADMIN") {
    // Admin bisa kelola semua role termasuk sesama admin
    return true;
  }
  if (actorRole === "HRD") {
    // HRD hanya bisa kelola KARYAWAN
    return targetRole === "KARYAWAN";
  }
  return false;
};

// Cek apakah aktor boleh menetapkan role tertentu
const canAssignRole = (actorRole: Role, assignedRole: Role): boolean => {
  if (actorRole === "ADMIN") {
    return true;
  }
  if (actorRole === "HRD") {
    return assignedRole === "KARYAWAN";
  }
  return false;
};

// Validasi input user
const validateUserInput = (
  body: any,
  isUpdate: boolean = false
): string | null => {
  const { nik, nama, email, password, role, officeId } = body;

  // nik
  if (nik !== undefined) {
    if (
      typeof nik !== "string" ||
      nik.trim().length < 3 ||
      nik.trim().length > 50
    ) {
      return "NIK harus berupa string dengan panjang 3-50 karakter.";
    }
  } else if (!isUpdate) {
    return "NIK wajib diisi.";
  }

  // nama
  if (nama !== undefined) {
    if (
      typeof nama !== "string" ||
      nama.trim().length < 2 ||
      nama.trim().length > 100
    ) {
      return "Nama harus berupa string dengan panjang 2-100 karakter.";
    }
  } else if (!isUpdate) {
    return "Nama wajib diisi.";
  }

  // email
  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== "string" || !emailRegex.test(email)) {
      return "Format email tidak valid.";
    }
  } else if (!isUpdate) {
    return "Email wajib diisi.";
  }

  // password
  if (password !== undefined) {
    if (typeof password !== "string" || password.length < 6) {
      return "Password minimal 6 karakter.";
    }
  } else if (!isUpdate) {
    return "Password wajib diisi.";
  }

  // role
  if (role !== undefined) {
    if (!["KARYAWAN", "HRD", "ADMIN"].includes(role)) {
      return "Role tidak valid. Pilih KARYAWAN, HRD, atau ADMIN.";
    }
  }

  // officeId
  if (officeId !== undefined && officeId !== null) {
    const oid = parseInt(officeId);
    if (isNaN(oid) || oid <= 0) {
      return "Office ID tidak valid.";
    }
  }

  return null;
};

// ============================================
// 1. GET ALL USERS (HRD & Admin)
// ============================================
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { role: actorRole } = req.user!;
    const { role, officeId, isActive, search, page, limit } = req.query;

    const whereClause: any = {};

    // RBAC: HRD hanya bisa lihat KARYAWAN
    if (actorRole === "HRD") {
      whereClause.role = "KARYAWAN";
    } else if (role) {
      whereClause.role = role;
    }

    if (officeId !== undefined) {
      const oid = parseInt(officeId as string);
      if (!isNaN(oid)) whereClause.officeId = oid;
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === "true";
    }

    if (search) {
      whereClause.OR = [
        { nama: { contains: search as string } },
        { nik: { contains: search as string } },
        { email: { contains: search as string } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limitNum,
        orderBy: { id: "asc" },
        select: {
          id: true,
          nik: true,
          nama: true,
          email: true,
          role: true,
          officeId: true,
          fotoProfil: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          office: { select: { id: true, name: true } },
        },
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    return sendResponse(res, 200, true, "Daftar user berhasil diambil.", {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("Get All Users Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 2. GET USER BY ID
// ============================================
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id as string);
    const { role: actorRole } = req.user!;

    if (isNaN(userId)) {
      return sendResponse(res, 400, false, "ID user tidak valid.");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nik: true,
        nama: true,
        email: true,
        role: true,
        officeId: true,
        fotoProfil: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        office: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      return sendResponse(res, 404, false, "User tidak ditemukan.");
    }

    // RBAC: HRD hanya bisa lihat KARYAWAN
    if (actorRole === "HRD" && user.role !== "KARYAWAN") {
      return sendResponse(
        res,
        403,
        false,
        "Akses ditolak. Anda tidak memiliki izin."
      );
    }

    return sendResponse(res, 200, true, "Detail user berhasil diambil.", user);
  } catch (error: any) {
    console.error("Get User By ID Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 3. CREATE USER (HRD & Admin)
// ============================================
export const createUser = async (req: Request, res: Response) => {
  try {
    const { role: actorRole, id: actorId } = req.user!;
    const { nik, nama, email, password, role, officeId, fotoProfil } = req.body;

    const validationError = validateUserInput(req.body, false);
    if (validationError) {
      return sendResponse(res, 400, false, validationError);
    }

    const assignedRole: Role = role || "KARYAWAN";

    // RBAC: cek apakah aktor boleh assign role ini
    if (!canAssignRole(actorRole, assignedRole)) {
      return sendResponse(
        res,
        403,
        false,
        "Akses ditolak. Anda tidak dapat membuat user dengan role tersebut."
      );
    }

    // Cek duplikasi NIK & email
    const existingNik = await prisma.user.findUnique({
      where: { nik: nik.trim() },
    });
    if (existingNik) {
      return sendResponse(res, 400, false, "NIK sudah terdaftar.");
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: email.trim() },
    });
    if (existingEmail) {
      return sendResponse(res, 400, false, "Email sudah terdaftar.");
    }

    // Validasi officeId (jika diisi)
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const newUser = await prisma.user.create({
      data: {
        nik: nik.trim(),
        nama: nama.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: assignedRole,
        officeId: parsedOfficeId,
        fotoProfil: fotoProfil || null,
      },
      select: {
        id: true,
        nik: true,
        nama: true,
        email: true,
        role: true,
        officeId: true,
        fotoProfil: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Audit log
    await logActivity({
      req,
      action: "CREATE_USER",
      entity: "users",
      entityId: newUser.id,
      newValue: userSnapshot({ ...newUser, isActive: newUser.isActive }),
      description: `User ${actorId} membuat user baru: ${newUser.nama} (${newUser.role}).`,
    });

    return sendResponse(res, 201, true, "User berhasil dibuat.", newUser);
  } catch (error: any) {
    console.error("Create User Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 4. UPDATE USER (HRD & Admin)
// ============================================
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id as string);
    const { role: actorRole, id: actorId } = req.user!;

    if (isNaN(userId)) {
      return sendResponse(res, 400, false, "ID user tidak valid.");
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return sendResponse(res, 404, false, "User tidak ditemukan.");
    }

    // RBAC: HRD hanya bisa kelola KARYAWAN
    if (!canManageRole(actorRole, targetUser.role)) {
      return sendResponse(
        res,
        403,
        false,
        "Akses ditolak. Anda tidak memiliki izin."
      );
    }

    const validationError = validateUserInput(req.body, true);
    if (validationError) {
      return sendResponse(res, 400, false, validationError);
    }

    const { nik, nama, email, password, role, officeId, fotoProfil, isActive } =
      req.body;

    const updateData: any = {};

    if (nik !== undefined) {
      const existingNik = await prisma.user.findFirst({
        where: { nik: nik.trim(), NOT: { id: userId } },
      });
      if (existingNik)
        return sendResponse(res, 400, false, "NIK sudah terdaftar.");
      updateData.nik = nik.trim();
    }

    if (email !== undefined) {
      const existingEmail = await prisma.user.findFirst({
        where: { email: email.trim().toLowerCase(), NOT: { id: userId } },
      });
      if (existingEmail)
        return sendResponse(res, 400, false, "Email sudah terdaftar.");
      updateData.email = email.trim().toLowerCase();
    }

    if (nama !== undefined) updateData.nama = nama.trim();

    if (role !== undefined && role !== targetUser.role) {
      if (!canAssignRole(actorRole, role)) {
        return sendResponse(
          res,
          403,
          false,
          "Akses ditolak. Anda tidak dapat menetapkan role tersebut."
        );
      }
      updateData.role = role;
    }

    if (officeId !== undefined) {
      if (officeId === null || officeId === "") {
        updateData.officeId = null;
      } else {
        const oid = parseInt(officeId);
        const officeExists = await prisma.office.findUnique({
          where: { id: oid },
        });
        if (!officeExists)
          return sendResponse(res, 400, false, "Office ID tidak ditemukan.");
        updateData.officeId = oid;
      }
    }

    if (fotoProfil !== undefined) updateData.fotoProfil = fotoProfil;

    if (isActive !== undefined) updateData.isActive = isActive;

    // Password: hanya Admin yang boleh ubah password user lain
    if (password !== undefined) {
      if (actorRole !== "ADMIN" && actorId !== userId) {
        return sendResponse(
          res,
          403,
          false,
          "Hanya Admin yang dapat mengubah password user lain."
        );
      }
      updateData.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    if (Object.keys(updateData).length === 0) {
      return sendResponse(
        res,
        400,
        false,
        "Tidak ada data yang perlu diupdate."
      );
    }

    const oldSnapshot = userSnapshot(targetUser);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        nik: true,
        nama: true,
        email: true,
        role: true,
        officeId: true,
        fotoProfil: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Audit log
    await logActivity({
      req,
      action: "UPDATE_USER",
      entity: "users",
      entityId: userId,
      oldValue: oldSnapshot,
      newValue: userSnapshot({
        ...updatedUser,
        isActive: updatedUser.isActive,
      }),
      description: `User ${actorId} memperbarui data user ${targetUser.nama} (id ${userId}).`,
    });

    return sendResponse(
      res,
      200,
      true,
      "User berhasil diperbarui.",
      updatedUser
    );
  } catch (error: any) {
    console.error("Update User Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 5. DELETE USER (Soft Delete)
// ============================================
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id as string);
    const { role: actorRole, id: actorId } = req.user!;

    if (isNaN(userId)) {
      return sendResponse(res, 400, false, "ID user tidak valid.");
    }

    if (userId === actorId) {
      return sendResponse(
        res,
        400,
        false,
        "Anda tidak dapat menonaktifkan akun Anda sendiri."
      );
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return sendResponse(res, 404, false, "User tidak ditemukan.");
    }

    // RBAC: HRD hanya bisa nonaktifkan KARYAWAN, Admin bisa semua
    if (!canManageRole(actorRole, targetUser.role)) {
      return sendResponse(
        res,
        403,
        false,
        "Akses ditolak. Anda tidak memiliki izin."
      );
    }

    if (!targetUser.isActive) {
      return sendResponse(res, 400, false, "User sudah dalam status nonaktif.");
    }

    const oldSnapshot = userSnapshot(targetUser);

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // Audit log
    await logActivity({
      req,
      action: "DELETE_USER",
      entity: "users",
      entityId: userId,
      oldValue: oldSnapshot,
      newValue: { ...oldSnapshot, isActive: false },
      description: `User ${actorId} menonaktifkan akun ${targetUser.nama} (id ${userId}, role ${targetUser.role}).`,
    });

    return sendResponse(res, 200, true, "User berhasil dinonaktifkan.");
  } catch (error: any) {
    console.error("Delete User Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 6. GET MY PROFILE (/me)
// ============================================
export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.user!;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nik: true,
        nama: true,
        email: true,
        role: true,
        officeId: true,
        fotoProfil: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        office: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      return sendResponse(res, 404, false, "User tidak ditemukan.");
    }

    return sendResponse(res, 200, true, "Profil berhasil diambil.", user);
  } catch (error: any) {
    console.error("Get My Profile Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 7. UPDATE MY PROFILE (/me)
// ============================================
export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.user!;
    const { nama, fotoProfil } = req.body;

    const updateData: any = {};

    if (nama !== undefined) {
      if (
        typeof nama !== "string" ||
        nama.trim().length < 2 ||
        nama.trim().length > 100
      ) {
        return sendResponse(
          res,
          400,
          false,
          "Nama harus berupa string dengan panjang 2-100 karakter."
        );
      }
      updateData.nama = nama.trim();
    }

    if (fotoProfil !== undefined) updateData.fotoProfil = fotoProfil;

    if (Object.keys(updateData).length === 0) {
      return sendResponse(
        res,
        400,
        false,
        "Tidak ada data yang perlu diupdate."
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nik: true,
        nama: true,
        email: true,
        role: true,
        officeId: true,
        fotoProfil: true,
        updatedAt: true,
      },
    });

    return sendResponse(res, 200, true, "Profil berhasil diperbarui.", updated);
  } catch (error: any) {
    console.error("Update My Profile Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 8. CHANGE MY PASSWORD (/me/password)
// ============================================
export const changeMyPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.user!;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return sendResponse(
        res,
        400,
        false,
        "Password lama dan password baru wajib diisi."
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return sendResponse(res, 400, false, "Password baru minimal 6 karakter.");
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return sendResponse(res, 404, false, "User tidak ditemukan.");
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return sendResponse(res, 400, false, "Password lama tidak sesuai.");
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    await logActivity({
      req,
      action: "UPDATE_USER",
      entity: "users",
      entityId: id,
      description: `User ${id} mengubah password akun sendiri.`,
    });

    return sendResponse(res, 200, true, "Password berhasil diubah.");
  } catch (error: any) {
    console.error("Change My Password Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};
