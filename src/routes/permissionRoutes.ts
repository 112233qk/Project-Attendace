import { Router } from "express";
import {
  createPermission,
  getAllPermissions,
  getPermissionById,
  updatePermission,
  cancelPermission,
  approvePermission,
  rejectPermission,
  getMyPermissions,
} from "../controllers/permissionController";
import { authenticate, authorize } from "../middlewares/authMiddleware";
import { uploadPermission } from "../config/multerPermission";

const router = Router();

// Semua endpoint wajib login
router.use(authenticate);

// ============================================
// ENDPOINT: Pengajuan (Karyawan)
// ============================================
// Karyawan ajukan izin/cuti (upload bukti opsional, wajib untuk SAKIT)
router.post(
  "/",
  authorize("KARYAWAN"),
  uploadPermission.single("buktiFile"),
  createPermission
);

// ============================================
// ENDPOINT: List & Detail (semua role login, RBAC di controller)
// ============================================
router.get("/", getAllPermissions);

router.get("/me", authorize("KARYAWAN", "HRD", "ADMIN"), getMyPermissions);

router.get("/:id", getPermissionById);

// ============================================
// ENDPOINT: Update & Cancel oleh Pemilik (hanya PENDING)
// ============================================
router.put(
  "/:id",
  authorize("KARYAWAN"),
  uploadPermission.single("buktiFile"),
  updatePermission
);
router.delete("/:id", authorize("KARYAWAN"), cancelPermission);

// ============================================
// ENDPOINT: Approve & Reject (HRD & Admin)
// ============================================
router.put("/:id/approve", authorize("HRD", "ADMIN"), approvePermission);
router.put("/:id/reject", authorize("HRD", "ADMIN"), rejectPermission);
router.get("/me", authorize("KARYAWAN", "HRD", "ADMIN"), getMyPermissions);

export default router;
