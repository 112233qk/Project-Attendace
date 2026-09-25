import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  generateAttendancePdf,
  ReportData,
  ReportRecord,
} from "../utils/pdfGenerator";
import { generateAttendanceExcel } from "../utils/excelGenerator";
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

const isValidDate = (dateStr: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
};

// Format DateTime ke WIB "HH:mm:ss" (paksa pakai titik dua)
const formatTimeWIB = (date: Date | null): string => {
  if (!date) return "-";

  // Ambil komponen waktu langsung dari WIB (UTC+7)
  const wibDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const hours = String(wibDate.getUTCHours()).padStart(2, "0");
  const minutes = String(wibDate.getUTCMinutes()).padStart(2, "0");
  const seconds = String(wibDate.getUTCSeconds()).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
};

// Format Date ke "DD-MM-YYYY"
const formatDateOnly = (date: Date): string => {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
};

// Hitung total jam kerja (jamPulang - jamMasuk)
const calculateWorkHours = (
  masuk: Date | null,
  pulang: Date | null
): string => {
  if (!masuk || !pulang) return "-";
  const diffMs = pulang.getTime() - masuk.getTime();
  if (diffMs <= 0) return "-";

  const totalMinutes = Math.floor(diffMs / 1000 / 60);
  if (totalMinutes < 1) return "< 1 menit";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} jam ${minutes} menit`;
};

// Cek tanggal (Date saja, tanpa waktu) berada dalam rentang izin
const isDateInRange = (date: Date, start: Date, end: Date): boolean => {
  const d = new Date(date).setHours(0, 0, 0, 0);
  const s = new Date(start).setHours(0, 0, 0, 0);
  const e = new Date(end).setHours(0, 0, 0, 0);
  return d >= s && d <= e;
};

// ============================================
// FUNGSI INTI: Ambil data laporan
// ============================================
interface FetchReportParams {
  tanggalMulai: Date;
  tanggalSelesai: Date;
  officeId?: number;
  statusKehadiran?: string;
  userId?: number;
}

const fetchReportData = async (
  params: FetchReportParams
): Promise<ReportData> => {
  const { tanggalMulai, tanggalSelesai, officeId, statusKehadiran, userId } =
    params;

  // Query attendances dengan include
  const whereClause: any = {
    tanggal: { gte: tanggalMulai, lte: tanggalSelesai },
  };
  if (userId) whereClause.userId = userId;
  if (statusKehadiran) whereClause.statusMasuk = statusKehadiran;

  const attendances = await prisma.attendance.findMany({
    where: whereClause,
    orderBy: [{ tanggal: "asc" }, { userId: "asc" }],
    include: {
      user: {
        select: {
          id: true,
          nik: true,
          nama: true,
          officeId: true,
          office: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Filter by officeId via user.officeId
  const filtered = officeId
    ? attendances.filter((a) => a.user.officeId === officeId)
    : attendances;

  // Ambil semua Permission APPROVED untuk user-user terkait pada rentang tanggal
  const userIds = [...new Set(filtered.map((a) => a.userId))];
  const permissions = await prisma.permission.findMany({
    where: {
      userId: { in: userIds },
      status: "APPROVED",
      OR: [
        { tanggalMulai: { lte: tanggalSelesai } },
        { tanggalSelesai: { gte: tanggalMulai } },
      ],
    },
  });

  // Map permission per user untuk lookup cepat
  const permissionsByUser = new Map<number, typeof permissions>();
  permissions.forEach((p) => {
    const arr = permissionsByUser.get(p.userId) || [];
    arr.push(p);
    permissionsByUser.set(p.userId, arr);
  });

  // Format record
  const records: ReportRecord[] = filtered.map((att) => {
    // Cari permission APPROVED yang overlap dengan tanggal absensi
    const userPerms = permissionsByUser.get(att.userId) || [];
    const matchedPerm = userPerms.find((p) =>
      isDateInRange(att.tanggal, p.tanggalMulai, p.tanggalSelesai)
    );

    return {
      nik: att.user.nik,
      nama: att.user.nama,
      kantor: att.user.office?.name || "-",
      tanggal: formatDateOnly(att.tanggal),
      jamMasuk: formatTimeWIB(att.jamMasuk),
      statusMasuk: att.statusMasuk || "-",
      jamPulang: formatTimeWIB(att.jamPulang),
      totalJamKerja: calculateWorkHours(att.jamMasuk, att.jamPulang),
      keterangan: matchedPerm ? matchedPerm.jenis : "-",
    };
  });

  // Rekapitulasi
  const totalKaryawan = new Set(filtered.map((a) => a.userId)).size;
  const totalTepatWaktu = filtered.filter(
    (a) => a.statusMasuk === "TEPAT_WAKTU"
  ).length;
  const totalTerlambat = filtered.filter(
    (a) => a.statusMasuk === "TERLAMBAT"
  ).length;

  // Total hari kerja = jumlah hari unik dalam periode
  const uniqueDays = new Set(
    filtered.map((a) => new Date(a.tanggal).toISOString().split("T")[0])
  );
  const totalHariKerja = uniqueDays.size;

  // Nama kantor untuk filter info
  let officeFilter = "Semua Kantor";
  if (officeId) {
    const office = await prisma.office.findUnique({ where: { id: officeId } });
    officeFilter = office?.name || `Kantor ID ${officeId}`;
  }

  return {
    periode: {
      mulai: formatDateOnly(tanggalMulai),
      selesai: formatDateOnly(tanggalSelesai),
    },
    officeFilter,
    records,
    recap: {
      totalKaryawan,
      totalTepatWaktu,
      totalTerlambat,
      totalHariKerja,
    },
  };
};

// ============================================
// VALIDASI QUERY PARAMETER
// ============================================
const validateReportQuery = (
  query: any
): { error?: string; params?: FetchReportParams } => {
  const { tanggalMulai, tanggalSelesai, officeId, statusKehadiran, userId } =
    query;

  if (!tanggalMulai || !tanggalSelesai) {
    return { error: "Parameter tanggalMulai dan tanggalSelesai wajib diisi." };
  }

  if (!isValidDate(tanggalMulai) || !isValidDate(tanggalSelesai)) {
    return { error: "Format tanggal tidak valid. Gunakan YYYY-MM-DD." };
  }

  const start = new Date(tanggalMulai);
  const end = new Date(tanggalSelesai);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (start > end) {
    return {
      error: "Tanggal mulai harus lebih awal atau sama dengan tanggal selesai.",
    };
  }

  // Batas maksimum 3 bulan
  const diffDays = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays > 92) {
    return { error: "Periode maksimum 3 bulan (92 hari) per export." };
  }

  // Validasi statusKehadiran
  if (
    statusKehadiran &&
    !["TEPAT_WAKTU", "TERLAMBAT"].includes(statusKehadiran)
  ) {
    return {
      error: "Status kehadiran tidak valid. Pilih TEPAT_WAKTU atau TERLAMBAT.",
    };
  }

  const params: FetchReportParams = {
    tanggalMulai: start,
    tanggalSelesai: end,
  };

  if (officeId) {
    const oid = parseInt(officeId);
    if (isNaN(oid) || oid <= 0) return { error: "Office ID tidak valid." };
    params.officeId = oid;
  }

  if (userId) {
    const uid = parseInt(userId);
    if (isNaN(uid) || uid <= 0) return { error: "User ID tidak valid." };
    params.userId = uid;
  }

  if (statusKehadiran) {
    params.statusKehadiran = statusKehadiran;
  }

  return { params };
};

// ============================================
// 1. PREVIEW DATA (JSON)
// ============================================
export const previewReport = async (req: Request, res: Response) => {
  try {
    const validation = validateReportQuery(req.query);
    if (validation.error || !validation.params) {
      return sendResponse(
        res,
        400,
        false,
        validation.error || "Validasi gagal."
      );
    }

    const data = await fetchReportData(validation.params);

    return sendResponse(
      res,
      200,
      true,
      "Preview laporan berhasil diambil.",
      data
    );
  } catch (error: any) {
    console.error("Preview Report Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 2. EXPORT PDF
// ============================================
export const exportPdf = async (req: Request, res: Response) => {
  try {
    const { id: actorId } = req.user!;

    const validation = validateReportQuery(req.query);
    if (validation.error || !validation.params) {
      return sendResponse(
        res,
        400,
        false,
        validation.error || "Validasi gagal."
      );
    }

    const data = await fetchReportData(validation.params);
    const pdfBuffer = await generateAttendancePdf(data);

    // Buat nama file
    const startStr =
      validation.params.tanggalMulai
        .toISOString()
        .split("T")[0]
        ?.replace(/-/g, "") || "";
    const endStr =
      validation.params.tanggalSelesai
        .toISOString()
        .split("T")[0]
        ?.replace(/-/g, "") || "";
    const filename = `laporan-absensi-${startStr}-${endStr}.pdf`;

    // Audit log
    await logActivity({
      req,
      action: "EXPORT_REPORT",
      entity: "attendances",
      description: `User ${actorId} export laporan PDF periode ${data.periode.mulai} s/d ${data.periode.selesai} (${data.records.length} baris).`,
    });

    // Set header dan kirim
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length.toString());
    return res.send(pdfBuffer);
  } catch (error: any) {
    console.error("Export PDF Error:", error);
    if (!res.headersSent) {
      return sendResponse(
        res,
        500,
        false,
        error.message || "Terjadi kesalahan pada server."
      );
    }
  }
};

// ============================================
// 3. EXPORT EXCEL
// ============================================
export const exportExcel = async (req: Request, res: Response) => {
  try {
    const { id: actorId } = req.user!;

    const validation = validateReportQuery(req.query);
    if (validation.error || !validation.params) {
      return sendResponse(
        res,
        400,
        false,
        validation.error || "Validasi gagal."
      );
    }

    const data = await fetchReportData(validation.params);
    const excelBuffer = await generateAttendanceExcel(data);

    const startStr =
      validation.params.tanggalMulai
        .toISOString()
        .split("T")[0]
        ?.replace(/-/g, "") || "";
    const endStr =
      validation.params.tanggalSelesai
        .toISOString()
        .split("T")[0]
        ?.replace(/-/g, "") || "";
    const filename = `laporan-absensi-${startStr}-${endStr}.xlsx`;

    await logActivity({
      req,
      action: "EXPORT_REPORT",
      entity: "attendances",
      description: `User ${actorId} export laporan Excel periode ${data.periode.mulai} s/d ${data.periode.selesai} (${data.records.length} baris).`,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", excelBuffer.length.toString());
    return res.send(excelBuffer);
  } catch (error: any) {
    console.error("Export Excel Error:", error);
    if (!res.headersSent) {
      return sendResponse(
        res,
        500,
        false,
        error.message || "Terjadi kesalahan pada server."
      );
    }
  }
};
