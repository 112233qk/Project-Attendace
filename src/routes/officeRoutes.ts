import { Router } from "express";
import {
  getAllOffices,
  getOfficeById,
  createOffice,
  updateOffice,
  deleteOffice,
} from "../controllers/officeController";
import { authenticate, authorize } from "../middlewares/authMiddleware";

const router = Router();

// Semua endpoint di modul ini wajib login
router.use(authenticate);

// ============================================
// ENDPOINT: List & Detail Kantor (semua role login)
// ============================================
router.get("/", getAllOffices);
router.get("/:id", getOfficeById);

// ============================================
// ENDPOINT: Create & Update Kantor (HRD & Admin)
// ============================================
router.post("/", authorize("HRD", "ADMIN"), createOffice);
router.put("/:id", authorize("HRD", "ADMIN"), updateOffice);

// ============================================
// ENDPOINT: Delete Kantor (Admin only)
// ============================================
router.delete("/:id", authorize("ADMIN"), deleteOffice);

export default router;
