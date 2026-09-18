import { Router } from "express";
import {
  checkIn,
  checkOut,
  getAttendanceHistory,
} from "../controllers/attendanceController";
import { authenticate, authorize } from "../middlewares/authMiddleware";
import { upload } from "../config/multer";

const router = Router();

// Semua route di bawah ini memerlukan autentikasi
router.use(authenticate);

// Endpoint Check-in (Multipart/form-data, field foto: 'fotoMasuk')
router.post("/check-in", upload.single("fotoMasuk"), checkIn);

// Endpoint Check-out (Multipart/form-data, field foto: 'fotoPulang')
router.post("/check-out", upload.single("fotoPulang"), checkOut);

// Endpoint Riwayat Absensi
router.get(
  "/history",
  authorize("KARYAWAN", "HRD", "ADMIN"),
  getAttendanceHistory
);

export default router;
