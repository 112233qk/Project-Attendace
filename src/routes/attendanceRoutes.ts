import { Router } from "express";
import {
  checkIn,
  checkOut,
  getAttendanceHistory,
  getMyAttendanceHistory,
  getTodayAttendance,
} from "../controllers/attendanceController";
import { authenticate, authorize } from "../middlewares/authMiddleware";
import { upload } from "../config/multer";

const router = Router();

// Semua route di bawah ini memerlukan autentikasi
router.use(authenticate);

// Endpoint Check-in (Multipart/form-data, field foto: 'fotoMasuk')
router.post(
  "/check-in",
  authorize("KARYAWAN", "HRD"),
  upload.single("fotoMasuk"),
  checkIn
);

// Endpoint Check-out (Multipart/form-data, field foto: 'fotoPulang')
router.post(
  "/check-out",
  authorize("KARYAWAN", "HRD"),
  upload.single("fotoPulang"),
  checkOut
);

// Endpoint: Riwayat absensi milik sendiri (semua role)
// Dipakai oleh halaman "Riwayat Presensi" di Dashboard
// HARUS di atas route yang pakai parameter dinamis (kalau ada)
router.get(
  "/me",
  authorize("KARYAWAN", "HRD", "ADMIN"),
  getMyAttendanceHistory
);

// Endpoint: Riwayat absensi semua user (untuk rekap admin)
// Karyawan hanya lihat milik sendiri, HRD/Admin bisa lihat semua
router.get(
  "/history",
  authorize("KARYAWAN", "HRD", "ADMIN"),
  getAttendanceHistory
);

// Endpoint: Cek status presensi hari ini (Karyawan)
router.get("/today", authorize("KARYAWAN", "HRD"), getTodayAttendance);

export default router;
