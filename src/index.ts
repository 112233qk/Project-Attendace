import express, { Request, Response, NextFunction } from "express";
import path from "path";
import multer from "multer";
import attendanceRoutes from "./routes/attendanceRoutes";
// import authRoutes from './routes/authRoutes'; // (jika ada)

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folder untuk akses foto
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Routes
// app.use('/api/auth', authRoutes);
app.use("/api/attendances", attendanceRoutes);

// ============================================
// GLOBAL ERROR HANDLER (WAJIB DI PALING BAWAH)
// ============================================
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Tangani error dari Multer
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

  // Tangani error kustom dari fileFilter multer
  if (err && err.message === "Hanya file JPG, JPEG, dan PNG yang diizinkan!") {
    return res.status(400).json({
      success: false,
      message: err.message,
      data: null,
    });
  }

  // Tangani error umum lainnya
  console.error("Unhandled Error:", err);
  return res.status(500).json({
    success: false,
    message: err.message || "Terjadi kesalahan pada server.",
    data: null,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
