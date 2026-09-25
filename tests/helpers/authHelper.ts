import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

interface GenerateTokenParams {
  id: number;
  role: Role;
  officeId: number | null;
}

/**
 * Generate JWT token untuk testing tanpa perlu login via endpoint.
 * Lebih cepat & fleksibel untuk skenario test.
 */
export const generateTestToken = (params: GenerateTokenParams): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET tidak dikonfigurasi di .env.test");
  }

  return jwt.sign(
    {
      id: params.id,
      role: params.role,
      officeId: params.officeId,
    },
    secret,
    { expiresIn: "1h" }
  );
};

/**
 * Generate token dengan expiry tertentu (untuk test token expired).
 */
export const generateExpiredToken = (params: GenerateTokenParams): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET tidak dikonfigurasi di .env.test");
  }

  return jwt.sign(
    {
      id: params.id,
      role: params.role,
      officeId: params.officeId,
    },
    secret,
    { expiresIn: "-1h" } // Kadaluarsa 1 jam yang lalu
  );
};
