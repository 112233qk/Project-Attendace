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
app.set("trust proxy", 1);

// ============================================
// 1. SECURITY HEADERS (Helmet)
// ============================================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

// ============================================
// 2. CORS CONFIGURATION ← HARUS DI ATAS RATE LIMITER
// ============================================
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin) return callback(null, true);

    // 1. Cek apakah origin ada di daftar allowedOrigins (dari env)
    if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      return callback(null, true);
    }

    // 2. Cek apakah origin adalah domain Vercel (preview atau production)
    if (origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    // 3. Cek apakah origin adalah domain Railway (jika masih dipakai)
    if (origin.endsWith(".up.railway.app")) {
      return callback(null, true);
    }

    // 4. Izinkan localhost untuk development
    if (origin.includes("localhost")) {
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
// 3. BODY PARSER
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// 4. RATE LIMITING ← SETELAH CORS
// ============================================
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
  // Skip rate limit saat test
  skip: () => process.env.NODE_ENV === "test",
});

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
  // Skip rate limit saat test
  skip: () => process.env.NODE_ENV === "test",
});

app.use("/api", globalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// ============================================
// 5. STATIC FOLDER
// ============================================
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// ============================================
// 6. SWAGGER UI
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
// 7. ROUTES
// ============================================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/attendances", attendanceRoutes);
app.use("/api/offices", officeRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/seed", seedRoutes);

// ============================================
// 8. GLOBAL ERROR HANDLER
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
