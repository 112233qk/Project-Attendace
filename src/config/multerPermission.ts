import multer from "multer";
import path from "path";
import fs from "fs";

// Folder khusus bukti izin
const uploadDir = path.join(__dirname, "../../public/uploads/permissions");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `bukti-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const uploadPermission = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Maks 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Hanya file JPG, JPEG, PNG, dan PDF yang diizinkan!"));
  },
});
