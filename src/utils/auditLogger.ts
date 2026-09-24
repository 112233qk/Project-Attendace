import { PrismaClient, Prisma } from "@prisma/client";
import { Request } from "express";

const prisma = new PrismaClient();

// Daftar aksi yang bisa dicatat
export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE_USER"
  | "UPDATE_USER"
  | "DELETE_USER"
  | "CREATE_OFFICE"
  | "UPDATE_OFFICE"
  | "DELETE_OFFICE"
  | "CREATE_PERMISSION"
  | "UPDATE_PERMISSION"
  | "DELETE_PERMISSION"
  | "APPROVE_PERMISSION"
  | "REJECT_PERMISSION"
  | "EXPORT_REPORT";

interface LogActivityParams {
  req: Request;
  action: AuditAction;
  entity: string;
  entityId?: number | null;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  description?: string | null;
}

// Helper: ambil IP address dari request
const getClientIp = (req: Request): string | null => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return req.ip || req.socket.remoteAddress || null;
};

// Helper: ambil user agent
const getUserAgent = (req: Request): string | null => {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : null;
};

/**
 * Catat aktivitas user ke tabel audit_logs.
 * Tidak akan throw error — jika gagal, hanya di-log ke console.
 */
export const logActivity = async (params: LogActivityParams): Promise<void> => {
  try {
    const { req, action, entity, entityId, oldValue, newValue, description } =
      params;

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        oldValue: oldValue ?? Prisma.JsonNull,
        newValue: newValue ?? Prisma.JsonNull,
        description: description ?? null,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      },
    });
  } catch (error) {
    console.error("Audit Log Error:", error);
  }
};

// Helper: buat snapshot user (untuk old/new value)
export const userSnapshot = (user: {
  id: number;
  nik: string;
  nama: string;
  email: string;
  role: string;
  officeId: number | null;
  isActive: boolean;
}) => ({
  id: user.id,
  nik: user.nik,
  nama: user.nama,
  email: user.email,
  role: user.role,
  officeId: user.officeId,
  isActive: user.isActive,
});

// Helper: buat snapshot office
export const officeSnapshot = (office: {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  jamMasuk: string;
  jamPulang: string;
}) => ({
  id: office.id,
  name: office.name,
  latitude: office.latitude,
  longitude: office.longitude,
  radius: office.radius,
  jamMasuk: office.jamMasuk,
  jamPulang: office.jamPulang,
});
