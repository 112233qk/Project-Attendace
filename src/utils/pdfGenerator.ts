import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

export interface ReportRecord {
  nik: string;
  nama: string;
  kantor: string;
  tanggal: string;
  jamMasuk: string;
  statusMasuk: string;
  jamPulang: string;
  totalJamKerja: string;
  keterangan: string;
}

export interface ReportData {
  periode: { mulai: string; selesai: string };
  officeFilter: string;
  records: ReportRecord[];
  recap: {
    totalKaryawan: number;
    totalTepatWaktu: number;
    totalTerlambat: number;
    totalHariKerja: number;
  };
}

export const generateAttendancePdf = (data: ReportData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: 30,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const marginLeft = 30;
      const contentWidth = pageWidth - marginLeft * 2;

      // ============================================
      // HEADER DENGAN LOGO & NAMA PT
      // ============================================
      const logoPath = path.join(process.cwd(), "public", "logo.png");

      // Gambar Logo (jika ada)
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, marginLeft, 30, { width: 55 });
      }

      // Teks Nama PT (di sebelah kanan logo)
      doc.fontSize(16).font("Helvetica-Bold").fillColor("#000000");
      doc.text("PT. ARIDEV STUDIO CREATIVE", marginLeft + 70, 38);

      doc.fontSize(10).font("Helvetica").fillColor("#333333");
      doc.text("Sistem Informasi Manajemen Absensi", marginLeft + 70, 58);

      // Garis Horizontal Pemisah Header
      doc
        .moveTo(marginLeft, 95)
        .lineTo(pageWidth - marginLeft, 95)
        .strokeColor("#cccccc")
        .stroke();

      // ============================================
      // JUDUL LAPORAN (Tengah)
      // ============================================
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#000000");
      doc.text("LAPORAN ABSENSI KARYAWAN", marginLeft, 115, {
        align: "center",
      });

      doc.fontSize(10).font("Helvetica").fillColor("#333333");
      doc.text(`Periode: ${data.periode.mulai} s/d ${data.periode.selesai}`, {
        align: "center",
      });

      if (data.officeFilter !== "Semua Kantor") {
        doc.text(`Kantor: ${data.officeFilter}`, { align: "center" });
      }

      doc.fontSize(8).fillColor("#666666");
      doc.text(
        `Dicetak pada: ${new Date().toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
        })} WIB`,
        { align: "center" }
      );

      // Set posisi Y untuk tabel
      let y = 170;

      // ============================================
      // TABEL HEADER
      // ============================================
      const columns = [
        { label: "No", width: 30, align: "center" as const },
        { label: "NIK", width: 70, align: "left" as const },
        { label: "Nama", width: 120, align: "left" as const },
        { label: "Kantor", width: 100, align: "left" as const },
        { label: "Tanggal", width: 75, align: "center" as const },
        { label: "Jam Masuk", width: 65, align: "center" as const },
        { label: "Status", width: 70, align: "center" as const },
        { label: "Jam Pulang", width: 65, align: "center" as const },
        { label: "Total Jam", width: 80, align: "center" as const },
        { label: "Keterangan", width: 90, align: "left" as const },
      ];

      const rowHeight = 20;
      const headerHeight = 22;

      const renderTableHeader = (yPos: number) => {
        let x = marginLeft;
        doc.rect(marginLeft, yPos, contentWidth, headerHeight).fill("#2c3e50");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);

        columns.forEach((col) => {
          doc.text(col.label, x + 4, yPos + 7, {
            width: col.width - 8,
            align: col.align,
          });
          x += col.width;
        });

        return yPos + headerHeight;
      };

      const renderTableRow = (
        yPos: number,
        record: ReportRecord,
        index: number
      ) => {
        let x = marginLeft;
        const bgColor = index % 2 === 0 ? "#ffffff" : "#f5f5f5";

        doc.rect(marginLeft, yPos, contentWidth, rowHeight).fill(bgColor);
        doc.fillColor("#000000").font("Helvetica").fontSize(8);

        const values = [
          (index + 1).toString(),
          record.nik,
          record.nama,
          record.kantor,
          record.tanggal,
          record.jamMasuk,
          record.statusMasuk,
          record.jamPulang,
          record.totalJamKerja,
          record.keterangan,
        ];

        values.forEach((val, i) => {
          const col = columns[i];
          if (!col) return;
          doc.text(val, x + 4, yPos + 6, {
            width: col.width - 8,
            align: col.align,
            lineBreak: false,
            ellipsis: true,
          });
          x += col.width;
        });

        return yPos + rowHeight;
      };

      // ============================================
      // RENDER DATA
      // ============================================
      y = renderTableHeader(y);

      if (data.records.length === 0) {
        doc.rect(marginLeft, y, contentWidth, 40).fill("#fff9e6");
        doc.fillColor("#8a6d00").font("Helvetica-Oblique").fontSize(10);
        doc.text(
          "Tidak ada data absensi pada periode ini.",
          marginLeft,
          y + 14,
          {
            width: contentWidth,
            align: "center",
          }
        );
        y += 40;
      } else {
        data.records.forEach((record, index) => {
          if (y + rowHeight > pageHeight - 80) {
            doc.addPage({ size: "A4", layout: "landscape", margin: 30 });
            // Jika pindah halaman, render ulang header tabel di atas
            y = renderTableHeader(30);
          }
          y = renderTableRow(y, record, index);
        });
      }

      // ============================================
      // REKAPITULASI
      // ============================================
      y += 20;

      if (y + 100 > pageHeight - 30) {
        doc.addPage({ size: "A4", layout: "landscape", margin: 30 });
        y = 30;
      }

      doc.rect(marginLeft, y, 300, 90).fill("#ecf0f1").stroke("#bdc3c7");
      doc.fillColor("#2c3e50").font("Helvetica-Bold").fontSize(11);
      doc.text("REKAPITULASI", marginLeft + 10, y + 10);

      doc.font("Helvetica").fontSize(10).fillColor("#000000");
      const recapItems = [
        ["Total Karyawan", data.recap.totalKaryawan.toString()],
        ["Total Tepat Waktu", data.recap.totalTepatWaktu.toString()],
        ["Total Terlambat", data.recap.totalTerlambat.toString()],
        ["Total Hari Kerja", data.recap.totalHariKerja.toString()],
      ];

      recapItems.forEach((item, idx) => {
        const label = item[0] ?? "";
        const value = item[1] ?? "";
        doc.text(`${label}`, marginLeft + 15, y + 30 + idx * 14);
        doc.text(`: ${value}`, marginLeft + 150, y + 30 + idx * 14);
      });

      // ============================================
      // FOOTER — Nomor halaman
      // ============================================
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc.fontSize(8).fillColor("#666666").font("Helvetica");
        doc.text(
          `Halaman ${i + 1} dari ${range.count}`,
          marginLeft,
          pageHeight - 25,
          {
            width: contentWidth,
            align: "right",
          }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
