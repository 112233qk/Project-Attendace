import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getDistanceInMeters } from "../utils/haversine";
import { StatusMasuk } from "@prisma/client";

const prisma = new PrismaClient();

// Helper: Format Response Opsi A
const sendResponse = (
  res: Response,
  status: number,
  success: boolean,
  message: string,
  data: any = null
) => {
  return res.status(status).json({ success, message, data });
};

// Helper: Dapatkan tanggal WIB hari ini sebagai UTC midnight
// Contoh: sekarang 12 Okt 2026 07:56 WIB → return 2026-10-12T00:00:00.000Z
const getTodayDate = () => {
  const now = new Date();
  // Geser ke WIB untuk membaca tanggal WIB
  const wibTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const year = wibTime.getUTCFullYear();
  const month = String(wibTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(wibTime.getUTCDate()).padStart(2, "0");
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
};

// 1. ENDPOINT CHECK-IN
export const checkIn = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { latitude, longitude, metodeMasuk } = req.body;

    // Validasi Input (Mencegah undefined)
    if (latitude === undefined || longitude === undefined) {
      return sendResponse(
        res,
        400,
        false,
        "Latitude dan Longitude wajib diisi."
      );
    }

    const latNum = parseFloat(latitude as string);
    const lngNum = parseFloat(longitude as string);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return sendResponse(
        res,
        400,
        false,
        "Format Latitude dan Longitude tidak valid."
      );
    }

    // Ambil data user & office
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { office: true },
    });

    if (!user || !user.office) {
      return sendResponse(
        res,
        404,
        false,
        "User atau data kantor tidak ditemukan."
      );
    }

    // Gunakan const office = user.office; agar TypeScript yakin tidak undefined
    const office = user.office;

    // 1. Validasi Jarak (Haversine)
    const distance = getDistanceInMeters(
      latNum,
      lngNum,
      office.latitude,
      office.longitude
    );

    if (distance > office.radius) {
      return sendResponse(
        res,
        400,
        false,
        `Anda berada di luar radius kantor. Jarak Anda: ${distance.toFixed(
          2
        )} meter, Radius maksimal: ${office.radius} meter.`
      );
    }

    // 2. Validasi Waktu (Keterlambatan) — berdasarkan WIB
    const nowUTC = new Date();
    // Hitung waktu WIB untuk perbandingan
    const wibTime = new Date(nowUTC.getTime() + 7 * 60 * 60 * 1000);
    const currentTimeString =
      String(wibTime.getUTCHours()).padStart(2, "0") +
      ":" +
      String(wibTime.getUTCMinutes()).padStart(2, "0");
    const statusMasuk =
      currentTimeString > office.jamMasuk ? "TERLAMBAT" : "TEPAT_WAKTU";

    // 3. Validasi Duplikasi Check-in
    const today = getTodayDate();
    const existingAttendance = await prisma.attendance.findFirst({
      where: { userId, tanggal: today },
    });

    if (existingAttendance) {
      return sendResponse(
        res,
        400,
        false,
        "Anda sudah melakukan check-in hari ini."
      );
    }

    // 4. Validasi: Blokir jika user sedang dalam izin/cuti APPROVED hari ini
    const approvedPermission = await prisma.permission.findFirst({
      where: {
        userId,
        status: "APPROVED",
        tanggalMulai: { lte: today },
        tanggalSelesai: { gte: today },
      },
      orderBy: { tanggalMulai: "desc" },
    });

    if (approvedPermission) {
      const jenisLabel = approvedPermission.jenis; // IZIN / SAKIT / CUTI
      return sendResponse(
        res,
        400,
        false,
        `Anda sedang dalam masa ${jenisLabel} yang telah disetujui. Tidak dapat melakukan check-in.`
      );
    }

    // 5. Simpan Foto
    const fotoMasuk = req.file ? `/uploads/${req.file.filename}` : null;

    // 6. Simpan ke Database
    const attendance = await prisma.attendance.create({
      data: {
        userId,
        tanggal: today,
        jamMasuk: nowUTC,
        latMasuk: latNum,
        lngMasuk: lngNum,
        fotoMasuk,
        statusMasuk,
        metodeMasuk: metodeMasuk || "GPS",
      },
    });

    return sendResponse(res, 201, true, "Check-in berhasil.", attendance);
  } catch (error: any) {
    console.error("Check-in Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// 2. ENDPOINT CHECK-OUT
export const checkOut = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return sendResponse(
        res,
        400,
        false,
        "Latitude dan Longitude wajib diisi."
      );
    }

    const latNum = parseFloat(latitude as string);
    const lngNum = parseFloat(longitude as string);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return sendResponse(
        res,
        400,
        false,
        "Format Latitude dan Longitude tidak valid."
      );
    }

    const today = getTodayDate();

    // Cari absensi hari ini yang belum check-out
    const attendance = await prisma.attendance.findFirst({
      where: {
        userId,
        tanggal: today,
        jamPulang: null,
      },
    });

    if (!attendance) {
      return sendResponse(
        res,
        400,
        false,
        "Anda belum melakukan check-in hari ini atau sudah melakukan check-out."
      );
    }

    const fotoPulang = req.file ? `/uploads/${req.file.filename}` : null;
    const nowUTC = new Date();

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        jamPulang: nowUTC,
        latPulang: latNum,
        lngPulang: lngNum,
        fotoPulang,
      },
    });

    return sendResponse(
      res,
      200,
      true,
      "Check-out berhasil.",
      updatedAttendance
    );
  } catch (error: any) {
    console.error("Check-out Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// 3. ENDPOINT RIWAYAT ABSENSI
export const getAttendanceHistory = async (req: Request, res: Response) => {
  try {
    const { id: currentUserId, role } = req.user!;
    const { userId, tanggal } = req.query;

    let whereClause: any = {};

    // RBAC: Karyawan hanya bisa melihat milik sendiri
    if (role === "KARYAWAN") {
      whereClause.userId = currentUserId;
    } else {
      // HRD & ADMIN bisa melihat semua, atau filter berdasarkan userId
      if (userId) {
        whereClause.userId = parseInt(userId as string);
      }
    }

    // Filter berdasarkan tanggal (opsional)
    // Gunakan typeof untuk memastikan tanggal adalah string sebelum diubah ke Date
    if (tanggal && typeof tanggal === "string") {
      whereClause.tanggal = new Date(tanggal);
    }

    const history = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        user: {
          select: { nama: true, nik: true, email: true },
        },
      },
      orderBy: { tanggal: "desc" },
    });

    return sendResponse(
      res,
      200,
      true,
      "Riwayat absensi berhasil diambil.",
      history
    );
  } catch (error: any) {
    console.error("Get History Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// 4. GET TODAY ATTENDANCE STATUS (untuk Karyawan cek status hari ini)
export const getTodayAttendance = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = getTodayDate();

    const attendance = await prisma.attendance.findFirst({
      where: { userId, tanggal: today },
    });

    // Format jam ke HH:mm:ss
    const formatTime = (date: Date | null | undefined): string | null => {
      if (!date) return null;
      const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
      const h = String(wib.getUTCHours()).padStart(2, "0");
      const m = String(wib.getUTCMinutes()).padStart(2, "0");
      const s = String(wib.getUTCSeconds()).padStart(2, "0");
      return `${h}:${m}:${s}`;
    };

    if (!attendance) {
      return sendResponse(res, 200, true, "Belum ada presensi hari ini.", {
        hasCheckedIn: false,
        hasCheckedOut: false,
        checkInTime: null,
        checkOutTime: null,
        attendance: null,
      });
    }

    return sendResponse(res, 200, true, "Status presensi hari ini.", {
      hasCheckedIn: !!attendance.jamMasuk,
      hasCheckedOut: !!attendance.jamPulang,
      checkInTime: formatTime(attendance.jamMasuk),
      checkOutTime: formatTime(attendance.jamPulang),
      attendance,
    });
  } catch (error: any) {
    console.error("Get Today Attendance Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};
