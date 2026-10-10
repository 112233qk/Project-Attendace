import express, { Request, Response, NextFunction } from "express";
import cors, { CorsOptions } from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import multer from "multer";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import attendanceRoutes from "./routes/attendanceRoutes";
import officeRoutes from "./routes/officeRoutes";
import permissionRoutes from "./routes/permissionRoutes";
import reportRoutes from "./routes/reportRoutes";
import seedRoutes from "./routes/seedRoutes";

const app = express();

// ============================================
// SECURITY HEADERS (Helmet)
// ============================================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // izinkan akses foto upload
    contentSecurityPolicy: false, // dimatikan agar Swagger UI berjalan
  })
);

// ============================================
// RATE LIMITING
// ============================================
// Global limiter: 100 request per 15 menit per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Terlalu banyak permintaan. Coba lagi setelah 15 menit.",
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth limiter: 10 request per 15 menit per IP (lebih ketat untuk login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Terlalu banyak percobaan login. Coba lagi setelah 15 menit.",
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Terapkan global limiter (kecuali Swagger UI agar tetap bisa dibuka)
app.use("/api", globalLimiter);

// Terapkan auth limiter khusus untuk endpoint login & register
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// ============================================
// CORS CONFIGURATION
// ============================================
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    // Izinkan request tanpa origin (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);

    // Izinkan origin yang ada di whitelist
    if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      return callback(null, true);
    }

    // ⭐ Izinkan Railway URL sendiri (untuk Swagger UI)
    if (origin.endsWith(".up.railway.app") || origin.includes("localhost")) {
      return callback(null, true);
    }

    return callback(new Error(`CORS: Origin ${origin} tidak diizinkan.`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Disposition"],
  maxAge: 86400,
};

app.use(cors(corsOptions));

// ============================================
// BODY PARSER
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folder untuk akses foto
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// ============================================
// SWAGGER UI
// ============================================
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "Attendance API Docs",
    customCss: ".swagger-ui .topbar { display: none }",
  })
);

app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// ============================================
// ROUTES
// ============================================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/attendances", attendanceRoutes);
app.use("/api/offices", officeRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/seed", seedRoutes);

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Ukuran file terlalu besar. Maksimal 2MB.",
        data: null,
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
      data: null,
    });
  }

  if (
    err &&
    (err.message === "Hanya file JPG, JPEG, dan PNG yang diizinkan!" ||
      err.message === "Hanya file JPG, JPEG, PNG, dan PDF yang diizinkan!")
  ) {
    return res.status(400).json({
      success: false,
      message: err.message,
      data: null,
    });
  }

  console.error("Unhandled Error:", err);
  return res.status(500).json({
    success: false,
    message: err.message || "Terjadi kesalahan pada server.",
    data: null,
  });
});

export default app;
