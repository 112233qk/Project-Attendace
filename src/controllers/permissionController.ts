import { Request, Response } from "express";
import { PrismaClient, JenisIzin, StatusPermission } from "@prisma/client";
import { logActivity } from "../utils/auditLogger";

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

// Normalisasi tanggal: buang bagian jam (00:00:00)
const normalizeDate = (dateStr: string): Date => {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Cek apakah tanggal valid (format YYYY-MM-DD)
const isValidDate = (dateStr: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
};

// Cek apakah tanggal di masa lalu (bandingkan dengan hari ini di WIB)
const isPastDate = (date: Date): boolean => {
  const now = new Date();
  const nowWIB = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  nowWIB.setHours(0, 0, 0, 0);
  return date < nowWIB;
};

// Cek apakah 2 rentang tanggal overlap
const isOverlap = (a1: Date, a2: Date, b1: Date, b2: Date): boolean => {
  return a1 <= b2 && a2 >= b1;
};

// Cek apakah Karyawan punya pengajuan APPROVED yang overlap
const hasApprovedOverlap = async (
  userId: number,
  tanggalMulai: Date,
  tanggalSelesai: Date,
  excludeId?: number
): Promise<boolean> => {
  const existing = await prisma.permission.findMany({
    where: {
      userId,
      status: "APPROVED",
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });

  return existing.some((p) =>
    isOverlap(p.tanggalMulai, p.tanggalSelesai, tanggalMulai, tanggalSelesai)
  );
};

// ============================================
// 1. CREATE PERMISSION (Karyawan)
// ============================================
export const createPermission = async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.user!;
    const { jenis, tanggalMulai, tanggalSelesai, alasan } = req.body;

    // Validasi input dasar
    if (!jenis || !tanggalMulai || !tanggalSelesai || !alasan) {
      return sendResponse(
        res,
        400,
        false,
        "Jenis, tanggal mulai, tanggal selesai, dan alasan wajib diisi."
      );
    }

    // Validasi jenis
    if (!["IZIN", "SAKIT", "CUTI"].includes(jenis)) {
      return sendResponse(
        res,
        400,
        false,
        "Jenis izin tidak valid. Pilih IZIN, SAKIT, atau CUTI."
      );
    }

    // Validasi format tanggal
    if (!isValidDate(tanggalMulai) || !isValidDate(tanggalSelesai)) {
      return sendResponse(
        res,
        400,
        false,
        "Format tanggal tidak valid. Gunakan YYYY-MM-DD."
      );
    }

    const startDate = normalizeDate(tanggalMulai);
    const endDate = normalizeDate(tanggalSelesai);

    // Validasi tanggal mulai <= tanggal selesai
    if (startDate > endDate) {
      return sendResponse(
        res,
        400,
        false,
        "Tanggal mulai harus lebih awal atau sama dengan tanggal selesai."
      );
    }

    // Validasi tanggal tidak boleh masa lalu
    if (isPastDate(startDate)) {
      return sendResponse(
        res,
        400,
        false,
        "Tanggal mulai tidak boleh di masa lalu."
      );
    }

    // Validasi alasan panjang
    if (typeof alasan !== "string" || alasan.trim().length < 5) {
      return sendResponse(res, 400, false, "Alasan minimal 5 karakter.");
    }

    // Validasi bukti untuk SAKIT
    const buktiFile = req.file
      ? `/uploads/permissions/${req.file.filename}`
      : null;
    if (jenis === "SAKIT" && !buktiFile) {
      return sendResponse(
        res,
        400,
        false,
        "Pengajuan SAKIT wajib melampirkan bukti (surat dokter)."
      );
    }

    // Cek overlap dengan pengajuan APPROVED
    const overlap = await hasApprovedOverlap(userId, startDate, endDate);
    if (overlap) {
      return sendResponse(
        res,
        400,
        false,
        "Anda sudah memiliki pengajuan yang disetujui pada rentang tanggal tersebut."
      );
    }

    const permission = await prisma.permission.create({
      data: {
        userId,
        jenis: jenis as JenisIzin,
        tanggalMulai: startDate,
        tanggalSelesai: endDate,
        alasan: alasan.trim(),
        buktiFile,
        status: "PENDING",
      },
      include: {
        user: { select: { id: true, nama: true, nik: true, email: true } },
      },
    });

    // Audit log
    await logActivity({
      req,
      action: "CREATE_PERMISSION",
      entity: "permissions",
      entityId: permission.id,
      newValue: {
        id: permission.id,
        jenis: permission.jenis,
        tanggalMulai: permission.tanggalMulai,
        tanggalSelesai: permission.tanggalSelesai,
        status: permission.status,
      },
      description: `User ${userId} mengajukan ${jenis} dari ${tanggalMulai} sampai ${tanggalSelesai}.`,
    });

    return sendResponse(
      res,
      201,
      true,
      "Pengajuan berhasil dibuat.",
      permission
    );
  } catch (error: any) {
    console.error("Create Permission Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 2. GET ALL PERMISSIONS
// ============================================
export const getAllPermissions = async (req: Request, res: Response) => {
  try {
    const { id: currentUserId, role } = req.user!;
    const { status, jenis, userId, tanggalMulai, tanggalSelesai, page, limit } =
      req.query;

    const whereClause: any = {};

    // RBAC
    if (role === "KARYAWAN") {
      whereClause.userId = currentUserId;
    } else if (userId) {
      whereClause.userId = parseInt(userId as string);
    }

    // Filter
    if (
      status &&
      ["PENDING", "APPROVED", "REJECTED"].includes(status as string)
    ) {
      whereClause.status = status;
    }
    if (jenis && ["IZIN", "SAKIT", "CUTI"].includes(jenis as string)) {
      whereClause.jenis = jenis;
    }
    if (
      tanggalMulai &&
      typeof tanggalMulai === "string" &&
      isValidDate(tanggalMulai)
    ) {
      whereClause.tanggalMulai = { gte: normalizeDate(tanggalMulai) };
    }
    if (
      tanggalSelesai &&
      typeof tanggalSelesai === "string" &&
      isValidDate(tanggalSelesai)
    ) {
      whereClause.tanggalSelesai = { lte: normalizeDate(tanggalSelesai) };
    }

    // Pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [permissions, total] = await Promise.all([
      prisma.permission.findMany({
        where: whereClause,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, nama: true, nik: true, email: true } },
          approver: { select: { id: true, nama: true, role: true } },
        },
      }),
      prisma.permission.count({ where: whereClause }),
    ]);

    return sendResponse(res, 200, true, "Daftar pengajuan berhasil diambil.", {
      permissions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("Get All Permissions Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 3. GET PERMISSION BY ID
// ============================================
export const getPermissionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const permissionId = parseInt(id as string);
    const { id: currentUserId, role } = req.user!;

    if (isNaN(permissionId)) {
      return sendResponse(res, 400, false, "ID pengajuan tidak valid.");
    }

    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
      include: {
        user: { select: { id: true, nama: true, nik: true, email: true } },
        approver: { select: { id: true, nama: true, role: true } },
      },
    });

    if (!permission) {
      return sendResponse(res, 404, false, "Pengajuan tidak ditemukan.");
    }

    // RBAC: Karyawan hanya bisa lihat milik sendiri
    if (role === "KARYAWAN" && permission.userId !== currentUserId) {
      return sendResponse(
        res,
        403,
        false,
        "Akses ditolak. Anda tidak memiliki izin."
      );
    }

    return sendResponse(
      res,
      200,
      true,
      "Detail pengajuan berhasil diambil.",
      permission
    );
  } catch (error: any) {
    console.error("Get Permission By ID Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 4. UPDATE PERMISSION (Pemilik, PENDING only)
// ============================================
export const updatePermission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const permissionId = parseInt(id as string);
    const { id: currentUserId, role } = req.user!;

    if (isNaN(permissionId)) {
      return sendResponse(res, 400, false, "ID pengajuan tidak valid.");
    }

    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
    });
    if (!permission) {
      return sendResponse(res, 404, false, "Pengajuan tidak ditemukan.");
    }

    // Hanya pemilik yang bisa update (Karyawan)
    if (permission.userId !== currentUserId) {
      return sendResponse(
        res,
        403,
        false,
        "Akses ditolak. Anda hanya dapat mengubah pengajuan Anda sendiri."
      );
    }

    if (permission.status !== "PENDING") {
      return sendResponse(
        res,
        400,
        false,
        "Pengajuan yang sudah diproses tidak dapat diubah."
      );
    }

    const { jenis, tanggalMulai, tanggalSelesai, alasan } = req.body;
    const updateData: any = {};

    if (jenis !== undefined) {
      if (!["IZIN", "SAKIT", "CUTI"].includes(jenis)) {
        return sendResponse(res, 400, false, "Jenis izin tidak valid.");
      }
      updateData.jenis = jenis;
    }

    // Resolve tanggal final
    let finalStart = permission.tanggalMulai;
    let finalEnd = permission.tanggalSelesai;

    if (tanggalMulai !== undefined) {
      if (!isValidDate(tanggalMulai)) {
        return sendResponse(
          res,
          400,
          false,
          "Format tanggal mulai tidak valid."
        );
      }
      finalStart = normalizeDate(tanggalMulai);
    }

    if (tanggalSelesai !== undefined) {
      if (!isValidDate(tanggalSelesai)) {
        return sendResponse(
          res,
          400,
          false,
          "Format tanggal selesai tidak valid."
        );
      }
      finalEnd = normalizeDate(tanggalSelesai);
    }

    if (finalStart > finalEnd) {
      return sendResponse(
        res,
        400,
        false,
        "Tanggal mulai harus lebih awal atau sama dengan tanggal selesai."
      );
    }

    // Validasi masa lalu HANYA jika user mengirim tanggalMulai baru
    if (tanggalMulai !== undefined && isPastDate(finalStart)) {
      return sendResponse(
        res,
        400,
        false,
        "Tanggal mulai tidak boleh di masa lalu."
      );
    }

    updateData.tanggalMulai = finalStart;
    updateData.tanggalSelesai = finalEnd;

    if (alasan !== undefined) {
      if (typeof alasan !== "string" || alasan.trim().length < 5) {
        return sendResponse(res, 400, false, "Alasan minimal 5 karakter.");
      }
      updateData.alasan = alasan.trim();
    }

    // Update bukti jika ada file baru
    if (req.file) {
      updateData.buktiFile = `/uploads/permissions/${req.file.filename}`;
    }

    // Cek ulang validasi bukti SAKIT
    const finalJenis = updateData.jenis || permission.jenis;
    const finalBukti = updateData.buktiFile || permission.buktiFile;
    if (finalJenis === "SAKIT" && !finalBukti) {
      return sendResponse(
        res,
        400,
        false,
        "Pengajuan SAKIT wajib melampirkan bukti."
      );
    }

    // Cek overlap APPROVED (exclude pengajuan sendiri)
    const overlap = await hasApprovedOverlap(
      permission.userId,
      finalStart,
      finalEnd,
      permissionId
    );
    if (overlap) {
      return sendResponse(
        res,
        400,
        false,
        "Anda sudah memiliki pengajuan disetujui pada rentang tanggal tersebut."
      );
    }

    const updated = await prisma.permission.update({
      where: { id: permissionId },
      data: updateData,
    });

    await logActivity({
      req,
      action: "UPDATE_PERMISSION",
      entity: "permissions",
      entityId: permissionId,
      oldValue: {
        jenis: permission.jenis,
        tanggalMulai: permission.tanggalMulai,
        tanggalSelesai: permission.tanggalSelesai,
      },
      newValue: {
        jenis: updated.jenis,
        tanggalMulai: updated.tanggalMulai,
        tanggalSelesai: updated.tanggalSelesai,
      },
      description: `User ${currentUserId} memperbarui pengajuan id ${permissionId}.`,
    });

    return sendResponse(
      res,
      200,
      true,
      "Pengajuan berhasil diperbarui.",
      updated
    );
  } catch (error: any) {
    console.error("Update Permission Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 5. CANCEL PERMISSION (Pemilik, PENDING only)
// ============================================
export const cancelPermission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const permissionId = parseInt(id as string);
    const { id: currentUserId } = req.user!;

    if (isNaN(permissionId)) {
      return sendResponse(res, 400, false, "ID pengajuan tidak valid.");
    }

    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
    });
    if (!permission) {
      return sendResponse(res, 404, false, "Pengajuan tidak ditemukan.");
    }

    if (permission.userId !== currentUserId) {
      return sendResponse(res, 403, false, "Akses ditolak.");
    }

    if (permission.status !== "PENDING") {
      return sendResponse(
        res,
        400,
        false,
        "Hanya pengajuan dengan status PENDING yang dapat dibatalkan."
      );
    }

    await prisma.permission.delete({ where: { id: permissionId } });

    await logActivity({
      req,
      action: "DELETE_PERMISSION",
      entity: "permissions",
      entityId: permissionId,
      oldValue: {
        jenis: permission.jenis,
        tanggalMulai: permission.tanggalMulai,
        tanggalSelesai: permission.tanggalSelesai,
        status: permission.status,
      },
      description: `User ${currentUserId} membatalkan pengajuan id ${permissionId}.`,
    });

    return sendResponse(res, 200, true, "Pengajuan berhasil dibatalkan.");
  } catch (error: any) {
    console.error("Cancel Permission Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 6. APPROVE PERMISSION (HRD & Admin)
// ============================================
export const approvePermission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const permissionId = parseInt(id as string);
    const { id: actorId } = req.user!;

    if (isNaN(permissionId)) {
      return sendResponse(res, 400, false, "ID pengajuan tidak valid.");
    }

    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
    });
    if (!permission) {
      return sendResponse(res, 404, false, "Pengajuan tidak ditemukan.");
    }

    if (permission.status !== "PENDING") {
      return sendResponse(
        res,
        400,
        false,
        `Pengajuan sudah diproses sebelumnya (status: ${permission.status}).`
      );
    }

    const updated = await prisma.permission.update({
      where: { id: permissionId },
      data: {
        status: "APPROVED",
        approvedBy: actorId,
      },
      include: {
        user: { select: { id: true, nama: true, nik: true } },
        approver: { select: { id: true, nama: true, role: true } },
      },
    });

    await logActivity({
      req,
      action: "APPROVE_PERMISSION",
      entity: "permissions",
      entityId: permissionId,
      newValue: { status: "APPROVED", approvedBy: actorId },
      description: `User ${actorId} menyetujui pengajuan ${permission.jenis} dari user ${permission.userId}.`,
    });

    return sendResponse(
      res,
      200,
      true,
      "Pengajuan berhasil disetujui.",
      updated
    );
  } catch (error: any) {
    console.error("Approve Permission Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 7. REJECT PERMISSION (HRD & Admin)
// ============================================
export const rejectPermission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const permissionId = parseInt(id as string);
    const { id: actorId } = req.user!;
    const { rejectionReason } = req.body;

    if (isNaN(permissionId)) {
      return sendResponse(res, 400, false, "ID pengajuan tidak valid.");
    }

    if (
      !rejectionReason ||
      typeof rejectionReason !== "string" ||
      rejectionReason.trim().length < 5
    ) {
      return sendResponse(
        res,
        400,
        false,
        "Alasan penolakan wajib diisi (minimal 5 karakter)."
      );
    }

    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
    });
    if (!permission) {
      return sendResponse(res, 404, false, "Pengajuan tidak ditemukan.");
    }

    if (permission.status !== "PENDING") {
      return sendResponse(
        res,
        400,
        false,
        `Pengajuan sudah diproses sebelumnya (status: ${permission.status}).`
      );
    }

    const updated = await prisma.permission.update({
      where: { id: permissionId },
      data: {
        status: "REJECTED",
        approvedBy: actorId,
        rejectionReason: rejectionReason.trim(),
      },
      include: {
        user: { select: { id: true, nama: true, nik: true } },
        approver: { select: { id: true, nama: true, role: true } },
      },
    });

    await logActivity({
      req,
      action: "REJECT_PERMISSION",
      entity: "permissions",
      entityId: permissionId,
      newValue: { status: "REJECTED", approvedBy: actorId, rejectionReason },
      description: `User ${actorId} menolak pengajuan ${permission.jenis} dari user ${permission.userId}.`,
    });

    return sendResponse(res, 200, true, "Pengajuan berhasil ditolak.", updated);
  } catch (error: any) {
    console.error("Reject Permission Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};
