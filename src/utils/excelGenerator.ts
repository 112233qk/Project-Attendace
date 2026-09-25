import ExcelJS from "exceljs";
import { ReportData } from "./pdfGenerator";

/**
 * Generate Excel laporan absensi (.xlsx).
 * Return sebagai Buffer untuk dikirim langsung via response.
 *
 * Sesuai SRS 3.5: format tabel bersih tanpa merged cells pada area data
 * untuk memudahkan pemrosesan lanjut (payroll, dll).
 */
export const generateAttendanceExcel = async (
  data: ReportData
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistem Absensi";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Laporan Absensi", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    views: [{ state: "frozen", ySplit: 3 }],
  });

  // ============================================
  // HEADER JUDUL (tanpa merged cells di area data)
  // ============================================
  // Baris 1: Judul
  sheet.getCell("A1").value = "LAPORAN ABSENSI KARYAWAN";
  sheet.getCell("A1").font = { bold: true, size: 14 };

  // Baris 2: Periode & kantor
  const periodeText = `Periode: ${data.periode.mulai} s/d ${data.periode.selesai}`;
  const kantorText =
    data.officeFilter !== "Semua Kantor"
      ? ` | Kantor: ${data.officeFilter}`
      : "";

  sheet.getCell("A2").value = `${periodeText}${kantorText}`;
  sheet.getCell("A2").font = { size: 10, italic: true };

  // Baris 3: kosong (spacer)
  sheet.addRow([]);

  // ============================================
  // HEADER TABEL (Baris 4)
  // ============================================
  const headerRow = sheet.addRow([
    "No",
    "NIK",
    "Nama Karyawan",
    "Cabang Kantor",
    "Tanggal",
    "Jam Masuk",
    "Status Masuk",
    "Jam Pulang",
    "Total Jam Kerja",
    "Keterangan",
  ]);

  // Style header
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2C3E50" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  headerRow.height = 22;

  // ============================================
  // DATA ROWS
  // ============================================
  if (data.records.length === 0) {
    const emptyRow = sheet.addRow(["Tidak ada data absensi pada periode ini."]);
    emptyRow.getCell(1).alignment = { horizontal: "center" };
    sheet.mergeCells(`A${emptyRow.number}:J${emptyRow.number}`);
    emptyRow.getCell(1).font = { italic: true, color: { argb: "FF8A6D00" } };
    emptyRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFF9E6" },
    };
  } else {
    data.records.forEach((record, index) => {
      const row = sheet.addRow([
        index + 1,
        record.nik,
        record.nama,
        record.kantor,
        record.tanggal,
        record.jamMasuk,
        record.statusMasuk,
        record.jamPulang,
        record.totalJamKerja,
        record.keterangan,
      ]);

      // Zebra striping
      const bgColor = index % 2 === 0 ? "FFFFFFFF" : "FFF5F5F5";
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: bgColor },
        };
        cell.alignment = { vertical: "middle", horizontal: "left" };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE0E0E0" } },
          left: { style: "thin", color: { argb: "FFE0E0E0" } },
          bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
          right: { style: "thin", color: { argb: "FFE0E0E0" } },
        };
      });

      // Alignment khusus untuk kolom tertentu
      row.getCell(1).alignment = { horizontal: "center" }; // No
      row.getCell(5).alignment = { horizontal: "center" }; // Tanggal
      row.getCell(6).alignment = { horizontal: "center" }; // Jam Masuk
      row.getCell(7).alignment = { horizontal: "center" }; // Status
      row.getCell(8).alignment = { horizontal: "center" }; // Jam Pulang
      row.getCell(9).alignment = { horizontal: "center" }; // Total Jam
    });
  }

  // ============================================
  // REKAPITULASI
  // ============================================
  sheet.addRow([]);
  sheet.addRow([]);

  const recapTitleRow = sheet.addRow(["REKAPITULASI"]);
  recapTitleRow.getCell(1).font = {
    bold: true,
    size: 12,
    color: { argb: "FF2C3E50" },
  };

  const recapItems = [
    ["Total Karyawan", data.recap.totalKaryawan],
    ["Total Tepat Waktu", data.recap.totalTepatWaktu],
    ["Total Terlambat", data.recap.totalTerlambat],
    ["Total Hari Kerja", data.recap.totalHariKerja],
  ];

  recapItems.forEach(([label, value]) => {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
  });

  // ============================================
  // COLUMN WIDTH
  // ============================================
  sheet.columns.forEach((column, index) => {
    const widths = [6, 15, 25, 22, 14, 13, 15, 13, 18, 22];
    column.width = widths[index] ?? 15;
  });

  // ============================================
  // EXPORT KE BUFFER
  // ============================================
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};
