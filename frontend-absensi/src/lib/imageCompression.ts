import imageCompression from "browser-image-compression";

/**
 * Kompres file gambar agar ukurannya di bawah batas tertentu.
 * - Resolusi maksimal: 1920×1080
 * - Ukuran target: ~1 MB (backend limit 2 MB, buffer aman)
 * - Format output: JPEG (kualitas 80%)
 *
 * @param file File asli dari input
 * @param maxSizeMB Ukuran maksimal dalam MB (default 1)
 * @returns File terkompresi (atau file asli jika kompresi gagal)
 */
export async function compressImage(
  file: File,
  maxSizeMB: number = 1
): Promise<File> {
  // Kalau bukan gambar, kembalikan apa adanya (misal PDF)
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // Kalau ukuran sudah kecil (<= maxSizeMB), tidak perlu kompres
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return file;
  }

  const options = {
    maxSizeMB,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.8,
  };

  try {
    const compressed = await imageCompression(file, options);

    // Buat File baru dengan nama asli tapi ekstensi .jpg
    // (karena kompresi mengubah format ke JPEG)
    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([compressed], newName, { type: "image/jpeg" });
  } catch (err) {
    console.error("Gagal kompres gambar:", err);
    // Kalau gagal, kembalikan file asli
    return file;
  }
}
