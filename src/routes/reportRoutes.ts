import { Router } from "express";
import {
  previewReport,
  exportPdf,
  exportExcel,
} from "../controllers/reportController";
import { authenticate, authorize } from "../middlewares/authMiddleware";

const router = Router();

// Semua endpoint wajib login
router.use(authenticate);

// Semua endpoint khusus HRD & Admin
router.use(authorize("HRD", "ADMIN"));

// ============================================
// ENDPOINT: Preview data (JSON)
// ============================================
router.get("/attendance/preview", previewReport);

// ============================================
// ENDPOINT: Export PDF
// ============================================
router.get("/attendance/pdf", exportPdf);

// ============================================
// ENDPOINT: Export Excel
// ============================================
router.get("/attendance/excel", exportExcel);

export default router;
