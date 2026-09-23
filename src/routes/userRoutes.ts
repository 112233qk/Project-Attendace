import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
} from "../controllers/userController";
import { authenticate, authorize } from "../middlewares/authMiddleware";

const router = Router();

// Semua endpoint di modul ini wajib login
router.use(authenticate);

// ============================================
// ENDPOINT: Profil Sendiri (semua role login)
// PENTING: Ditaruh sebelum /:id agar tidak konflik
// ============================================
router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);
router.put("/me/password", changeMyPassword);

// ============================================
// ENDPOINT: List & Detail User (HRD & Admin)
// ============================================
router.get("/", authorize("HRD", "ADMIN"), getAllUsers);
router.get("/:id", authorize("HRD", "ADMIN"), getUserById);

// ============================================
// ENDPOINT: Create & Update User (HRD & Admin)
// ============================================
router.post("/", authorize("HRD", "ADMIN"), createUser);
router.put("/:id", authorize("HRD", "ADMIN"), updateUser);

// ============================================
// ENDPOINT: Nonaktifkan User (HRD & Admin)
// RBAC detail (HRD hanya KARYAWAN) dicek di controller
// ============================================
router.delete("/:id", authorize("HRD", "ADMIN"), deleteUser);

export default router;
