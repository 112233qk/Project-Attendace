import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================
// HELPER
// ============================================

// Format respons konsisten (Opsi A)
const sendResponse = (
  res: Response,
  status: number,
  success: boolean,
  message: string,
  data: any = null
) => {
  return res.status(status).json({ success, message, data });
};

// Regex format jam HH:mm (00:00 - 23:59)
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Validasi input kantor. Mengembalikan pesan error atau null jika valid.
const validateOfficeInput = (
  body: any,
  isUpdate: boolean = false
): string | null => {
  const { name, latitude, longitude, radius, jamMasuk, jamPulang } = body;

  // name
  if (name !== undefined) {
    if (
      typeof name !== "string" ||
      name.trim().length < 3 ||
      name.trim().length > 100
    ) {
      return "Nama kantor harus berupa string dengan panjang 3-100 karakter.";
    }
  } else if (!isUpdate) {
    return "Nama kantor wajib diisi.";
  }

  // latitude
  if (latitude !== undefined) {
    const lat = parseFloat(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return "Latitude harus berupa angka antara -90 dan 90.";
    }
  } else if (!isUpdate) {
    return "Latitude wajib diisi.";
  }

  // longitude
  if (longitude !== undefined) {
    const lng = parseFloat(longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return "Longitude harus berupa angka antara -180 dan 180.";
    }
  } else if (!isUpdate) {
    return "Longitude wajib diisi.";
  }

  // radius
  if (radius !== undefined) {
    const rad = parseFloat(radius);
    if (isNaN(rad) || rad <= 0) {
      return "Radius harus berupa angka positif (dalam meter).";
    }
  } else if (!isUpdate) {
    return "Radius wajib diisi.";
  }

  // jamMasuk
  if (jamMasuk !== undefined) {
    if (typeof jamMasuk !== "string" || !TIME_REGEX.test(jamMasuk)) {
      return "Format jamMasuk tidak valid. Gunakan format HH:mm (contoh: 08:00).";
    }
  } else if (!isUpdate) {
    return "Jam masuk wajib diisi.";
  }

  // jamPulang
  if (jamPulang !== undefined) {
    if (typeof jamPulang !== "string" || !TIME_REGEX.test(jamPulang)) {
      return "Format jamPulang tidak valid. Gunakan format HH:mm (contoh: 17:00).";
    }
  } else if (!isUpdate) {
    return "Jam pulang wajib diisi.";
  }

  // Validasi jamMasuk < jamPulang (hanya jika keduanya tersedia)
  const finalJamMasuk = jamMasuk;
  const finalJamPulang = jamPulang;
  if (finalJamMasuk && finalJamPulang) {
    if (finalJamMasuk >= finalJamPulang) {
      return "Jam masuk harus lebih awal dari jam pulang.";
    }
  }

  return null;
};

// ============================================
// 1. GET ALL OFFICES
// ============================================
export const getAllOffices = async (req: Request, res: Response) => {
  try {
    const offices = await prisma.office.findMany({
      orderBy: { id: "asc" },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return sendResponse(
      res,
      200,
      true,
      "Daftar kantor berhasil diambil.",
      offices
    );
  } catch (error: any) {
    console.error("Get All Offices Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 2. GET OFFICE BY ID
// ============================================
export const getOfficeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const officeId = parseInt(id as string);

    if (isNaN(officeId)) {
      return sendResponse(res, 400, false, "ID kantor tidak valid.");
    }

    const office = await prisma.office.findUnique({
      where: { id: officeId },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!office) {
      return sendResponse(res, 404, false, "Kantor tidak ditemukan.");
    }

    return sendResponse(
      res,
      200,
      true,
      "Detail kantor berhasil diambil.",
      office
    );
  } catch (error: any) {
    console.error("Get Office By ID Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 3. CREATE OFFICE
// ============================================
export const createOffice = async (req: Request, res: Response) => {
  try {
    const { name, latitude, longitude, radius, jamMasuk, jamPulang } = req.body;

    // Validasi input
    const validationError = validateOfficeInput(req.body, false);
    if (validationError) {
      return sendResponse(res, 400, false, validationError);
    }

    const office = await prisma.office.create({
      data: {
        name: name.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseFloat(radius),
        jamMasuk,
        jamPulang,
      },
    });

    return sendResponse(res, 201, true, "Kantor berhasil dibuat.", office);
  } catch (error: any) {
    console.error("Create Office Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 4. UPDATE OFFICE
// ============================================
export const updateOffice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const officeId = parseInt(id as string);

    if (isNaN(officeId)) {
      return sendResponse(res, 400, false, "ID kantor tidak valid.");
    }

    // Cek apakah kantor ada
    const existingOffice = await prisma.office.findUnique({
      where: { id: officeId },
    });

    if (!existingOffice) {
      return sendResponse(res, 404, false, "Kantor tidak ditemukan.");
    }

    // Validasi input (mode update: field opsional)
    const validationError = validateOfficeInput(req.body, true);
    if (validationError) {
      return sendResponse(res, 400, false, validationError);
    }

    const { name, latitude, longitude, radius, jamMasuk, jamPulang } = req.body;

    // Bangun data update hanya untuk field yang dikirim
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
    if (longitude !== undefined) updateData.longitude = parseFloat(longitude);
    if (radius !== undefined) updateData.radius = parseFloat(radius);
    if (jamMasuk !== undefined) updateData.jamMasuk = jamMasuk;
    if (jamPulang !== undefined) updateData.jamPulang = jamPulang;

    // Validasi jamMasuk < jamPulang dengan data final (existing + update)
    const finalJamMasuk = jamMasuk ?? existingOffice.jamMasuk;
    const finalJamPulang = jamPulang ?? existingOffice.jamPulang;
    if (finalJamMasuk >= finalJamPulang) {
      return sendResponse(
        res,
        400,
        false,
        "Jam masuk harus lebih awal dari jam pulang."
      );
    }

    if (Object.keys(updateData).length === 0) {
      return sendResponse(
        res,
        400,
        false,
        "Tidak ada data yang perlu diupdate."
      );
    }

    const updatedOffice = await prisma.office.update({
      where: { id: officeId },
      data: updateData,
    });

    return sendResponse(
      res,
      200,
      true,
      "Kantor berhasil diperbarui.",
      updatedOffice
    );
  } catch (error: any) {
    console.error("Update Office Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};

// ============================================
// 5. DELETE OFFICE (Admin only — dicek di route)
// ============================================
export const deleteOffice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const officeId = parseInt(id as string);

    if (isNaN(officeId)) {
      return sendResponse(res, 400, false, "ID kantor tidak valid.");
    }

    // Cek apakah kantor ada
    const existingOffice = await prisma.office.findUnique({
      where: { id: officeId },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!existingOffice) {
      return sendResponse(res, 404, false, "Kantor tidak ditemukan.");
    }

    // Cek apakah kantor masih punya user terkait
    if (existingOffice._count.users > 0) {
      return sendResponse(
        res,
        400,
        false,
        `Kantor tidak dapat dihapus karena masih memiliki ${existingOffice._count.users} karyawan terkait. Pindahkan karyawan terlebih dahulu.`
      );
    }

    await prisma.office.delete({
      where: { id: officeId },
    });

    return sendResponse(res, 200, true, "Kantor berhasil dihapus.");
  } catch (error: any) {
    console.error("Delete Office Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message || "Terjadi kesalahan pada server."
    );
  }
};
