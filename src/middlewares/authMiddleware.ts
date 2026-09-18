import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

interface JwtPayloadCustom {
  id: number;
  role: Role;
  officeId: number | null;
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Akses ditolak. Token tidak ditemukan.",
        data: null, // ← tambahan
      });
    }

    const parts = authHeader.split(" ");
    const token = parts[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Format token tidak valid.",
        data: null, // ← tambahan
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("FATAL ERROR: JWT_SECRET tidak dikonfigurasi di .env");
      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan konfigurasi pada server.",
        data: null, // ← tambahan
      });
    }

    const decoded = jwt.verify(token, secret) as unknown as JwtPayloadCustom;

    req.user = {
      id: decoded.id,
      role: decoded.role,
      officeId: decoded.officeId,
    };

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token sudah kadaluarsa. Silakan login kembali.",
        data: null, // ← tambahan
      });
    }

    return res.status(401).json({
      success: false,
      message: "Token tidak valid.",
      data: null, // ← tambahan
    });
  }
};

export const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak. Anda tidak memiliki izin.",
        data: null, // ← tambahan
      });
    }
    next();
  };
};
