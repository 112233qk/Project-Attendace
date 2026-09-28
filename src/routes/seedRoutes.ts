import { Router, Request, Response, NextFunction } from "express";
import { seedInitialData } from "../controllers/seedController";

const router = Router();

// Middleware: proteksi dengan secret key
const requireSeedSecret = (req: Request, res: Response, next: NextFunction) => {
  const secret = req.headers["x-seed-secret"];
  const expectedSecret = process.env.SEED_SECRET;

  if (!expectedSecret) {
    return res.status(500).json({
      success: false,
      message: "SEED_SECRET tidak dikonfigurasi di server.",
      data: null,
    });
  }

  if (secret !== expectedSecret) {
    return res.status(401).json({
      success: false,
      message: "Akses ditolak. Secret tidak valid.",
      data: null,
    });
  }

  next();
};

router.post("/", requireSeedSecret, seedInitialData);

export default router;
