import { Router } from "express";
import { register, login, logout } from "../controllers/authController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

// ============================================
// ENDPOINT PUBLIC (tanpa token)
// ============================================
router.post("/register", register);
router.post("/login", login);

// ============================================
// ENDPOINT PROTECTED (butuh token)
// ============================================
router.post("/logout", authenticate, logout);

export default router;
