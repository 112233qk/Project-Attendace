import swaggerJsdoc from "swagger-jsdoc";
import path from "path";

// Cari project root (naik 2 level dari __dirname)
// - src/config/    → ../../
// - dist/config/   → ../../
const projectRoot = path.join(__dirname, "../../");

// Selalu baca dari src/docs/*.ts (karena JSDoc hilang saat compile ke dist)
const docsPath = path.join(projectRoot, "src/docs/*.ts").replace(/\\/g, "/");

console.log("🔍 __dirname:", __dirname);
console.log("🔍 projectRoot:", projectRoot);
console.log("🔍 docsPath:", docsPath);

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Sistem Absensi Karyawan API",
      version: "1.0.0",
      description:
        "REST API untuk Sistem Absensi Karyawan berbasis GPS & Verifikasi Foto. " +
        "Dibangun dengan Node.js, Express.js, TypeScript, Prisma ORM, dan MySQL.\n\n" +
        "**Autentikasi:** Login melalui endpoint `/api/auth/login` untuk mendapatkan token JWT, " +
        "lalu klik tombol **Authorize** di atas dan masukkan token dengan format `Bearer <token>`.",
      contact: {
        name: "Developer",
        email: "developer@example.com",
      },
      license: {
        name: "ISC",
      },
    },
    servers: [
      {
        url: process.env.BASE_URL || "http://localhost:3000",
        description:
          process.env.NODE_ENV === "production"
            ? "Production Server"
            : "Development Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Masukkan token JWT dari endpoint login",
        },
      },
      schemas: {
        ApiResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Operasi berhasil." },
            data: { type: "object", nullable: true },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Terjadi kesalahan." },
            data: { type: "object", nullable: true, example: null },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      {
        name: "Auth",
        description: "Autentikasi & Registrasi (Login, Register, Logout)",
      },
      {
        name: "Users",
        description: "Manajemen User (CRUD, Profil Sendiri, Ganti Password)",
      },
      {
        name: "Offices",
        description: "Manajemen Kantor (CRUD, Radius, Jam Kerja)",
      },
      {
        name: "Attendances",
        description: "Presensi Karyawan (Check-in, Check-out, Riwayat)",
      },
      {
        name: "Permissions",
        description: "Pengajuan Izin/Sakit/Cuti & Approval",
      },
      { name: "Reports", description: "Export Laporan Absensi (PDF & Excel)" },
    ],
  },
  apis: [docsPath],
};

export const swaggerSpec = swaggerJsdoc(options);
