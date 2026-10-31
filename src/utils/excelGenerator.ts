import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { ReportData } from "./pdfGenerator";

export const generateAttendanceExcel = async (
  data: ReportData
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistem Absensi";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Laporan Absensi", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });

  const logoPath = path.join(process.cwd(), "public", "logo.png");

  // ============================================
  // HEADER DENGAN LOGO & NAMA PT
  // ============================================

  // 1. Sisipkan Logo
  if (fs.existsSync(logoPath)) {
    const imageId = workbook.addImage({
      filename: logoPath,
      extension: "png",
    });
    sheet.addImage(imageId, {
      tl: { col: 0, row: 0 }, // Top-Left (Cell A1)
      ext: { width: 60, height: 60 }, // Ukuran logo
    });
  }

  // Set tinggi baris 1 dan 2 agar logo muat
  sheet.getRow(1).height = 35;
  sheet.getRow(2).height = 25;

  // 2. Nama PT (di Cell C1)
  sheet.mergeCells("C1:J1");
  const titleCell = sheet.getCell("C1");
  titleCell.value = "PT. ARIDEV STUDIO CREATIVE";
  titleCell.font = { bold: true, size: 16, color: { argb: "FF000000" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };

  // 3. Subtitle (di Cell C2)
  sheet.mergeCells("C2:J2");
  const subCell = sheet.getCell("C2");
  subCell.value = "Sistem Informasi Manajemen Absensi";
  subCell.font = { size: 11, color: { argb: "FF333333" } };
  subCell.alignment = { vertical: "middle", horizontal: "left" };

  // Baris 3: Kosong sebagai jarak
  sheet.addRow([]);

  // ============================================
  // JUDUL LAPORAN (Tengah)
  // ============================================
  sheet.mergeCells("A4:J4");
  const reportTitle = sheet.getCell("A4");
  reportTitle.value = "LAPORAN ABSENSI KARYAWAN";
  reportTitle.font = { bold: true, size: 14 };
  reportTitle.alignment = { horizontal: "center", vertical: "middle" };

  const periodeText =
    `Periode: ${data.periode.mulai} s/d ${data.periode.selesai}` +
    (data.officeFilter !== "Semua Kantor"
      ? ` | Kantor: ${data.officeFilter}`
      : "");

  sheet.mergeCells("A5:J5");
  const periodCell = sheet.getCell("A5");
  periodCell.value = periodeText;
  periodCell.font = { italic: true, size: 10 };
  periodCell.alignment = { horizontal: "center", vertical: "middle" };

  // Baris 6: Kosong (Jarak sebelum tabel)
  sheet.addRow([]);

  // ============================================
  // HEADER TABEL (Baris 7)
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

  // Freeze Pane tepat di bawah header tabel (Baris 8)
  sheet.views = [{ state: "frozen", ySplit: 7 }];

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

      row.getCell(1).alignment = { horizontal: "center" };
      row.getCell(5).alignment = { horizontal: "center" };
      row.getCell(6).alignment = { horizontal: "center" };
      row.getCell(7).alignment = { horizontal: "center" };
      row.getCell(8).alignment = { horizontal: "center" };
      row.getCell(9).alignment = { horizontal: "center" };
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

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};
