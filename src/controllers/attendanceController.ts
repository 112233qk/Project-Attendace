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

// Helper: Dapatkan waktu saat ini di zona WIB
const getWIBTime = () => {
  const now = new Date();
  // Konversi ke WIB (UTC+7)
  const wibTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wibTime;
};

// Helper: Format tanggal tanpa waktu (YYYY-MM-DD)
const getTodayDate = () => {
  const now = getWIBTime();
  // Gunakan slice(0, 10) untuk menghindari error noUncheckedIndexedAccess
  const dateString = now.toISOString().slice(0, 10);
  return new Date(dateString);
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

    // 2. Validasi Waktu (Keterlambatan)
    const nowWIB = getWIBTime();
    // Gunakan ?. dan || untuk menangani kemungkinan undefined pada split
    const currentTimeString =
      nowWIB.toISOString().split("T")[1]?.substring(0, 5) || "00:00";
    const statusMasuk =
      currentTimeString > office.jamMasuk
        ? StatusMasuk.TERLAMBAT
        : StatusMasuk.TEPAT_WAKTU;

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

    // 4. Simpan Foto
    const fotoMasuk = req.file ? `/uploads/${req.file.filename}` : null;

    // 5. Simpan ke Database
    const attendance = await prisma.attendance.create({
      data: {
        userId,
        tanggal: today,
        jamMasuk: nowWIB,
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
    const nowWIB = getWIBTime();

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        jamPulang: nowWIB,
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
