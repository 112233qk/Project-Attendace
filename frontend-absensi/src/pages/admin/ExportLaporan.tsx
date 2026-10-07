import { useState, useEffect, useRef } from "react";
import { isAxiosError } from "axios";
import api from "../../lib/api";

interface Office {
  id: number;
  name: string;
}

interface PreviewData {
  periode: { mulai: string; selesai: string };
  officeFilter: string;
  records: Array<{
    nik: string;
    nama: string;
    kantor: string;
    tanggal: string;
    jamMasuk: string;
    statusMasuk: string;
    jamPulang: string;
    totalJamKerja: string;
    keterangan: string;
  }>;
  recap: {
    totalKaryawan: number;
    totalTepatWaktu: number;
    totalTerlambat: number;
    totalHariKerja: number;
  };
}

const getFirstDayOfMonth = (): string => {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const year = wib.getUTCFullYear();
  const month = String(wib.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
};

const getToday = (): string => {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().split("T")[0]!;
};

export default function ExportLaporan() {
  const [tanggalMulai, setTanggalMulai] = useState(getFirstDayOfMonth());
  const [tanggalSelesai, setTanggalSelesai] = useState(getToday());
  const [officeId, setOfficeId] = useState<string>("");
  const [statusKehadiran, setStatusKehadiran] = useState<string>("");

  const [offices, setOffices] = useState<Office[]>([]);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingExport, setLoadingExport] = useState<"pdf" | "excel" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  // Load offices
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await api.get("/offices");
        if (isMounted) setOffices(res.data.data);
      } catch (err) {
        console.error("Gagal load kantor:", err);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const buildQueryParams = (): string => {
    const params = new URLSearchParams();
    params.append("tanggalMulai", tanggalMulai);
    params.append("tanggalSelesai", tanggalSelesai);
    if (officeId) params.append("officeId", officeId);
    if (statusKehadiran) params.append("statusKehadiran", statusKehadiran);
    return params.toString();
  };

  const handlePreview = async () => {
    setError(null);
    setLoadingPreview(true);
    setPreview(null);

    if (!tanggalMulai || !tanggalSelesai) {
      setError("Tanggal mulai dan selesai wajib diisi.");
      setLoadingPreview(false);
      return;
    }
    if (tanggalMulai > tanggalSelesai) {
      setError("Tanggal mulai harus lebih awal dari tanggal selesai.");
      setLoadingPreview(false);
      return;
    }

    try {
      const res = await api.get(
        `/reports/attendance/preview?${buildQueryParams()}`
      );
      setPreview(res.data.data);
      setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Gagal load preview.");
      } else {
        setError("Terjadi kesalahan.");
      }
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async (format: "pdf" | "excel") => {
    setError(null);
    setLoadingExport(format);

    if (!tanggalMulai || !tanggalSelesai) {
      setError("Tanggal mulai dan selesai wajib diisi.");
      setLoadingExport(null);
      return;
    }

    try {
      const res = await api.get(
        `/reports/attendance/${format}?${buildQueryParams()}`,
        { responseType: "blob" }
      );

      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Nama file dari Content-Disposition atau default
      const ext = format === "pdf" ? "pdf" : "xlsx";
      const start = tanggalMulai.replace(/-/g, "");
      const end = tanggalSelesai.replace(/-/g, "");
      a.download = `laporan-absensi-${start}-${end}.${ext}`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data instanceof Blob) {
        // Backend kirim error sebagai blob — perlu parse
        const text = await err.response.data.text();
        try {
          const parsed = JSON.parse(text);
          setError(parsed.message || "Gagal export laporan.");
        } catch {
          setError("Gagal export laporan.");
        }
      } else if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Gagal export laporan.");
      } else {
        setError("Terjadi kesalahan.");
      }
    } finally {
      setLoadingExport(null);
    }
  };

  const getStatusBadge = (status: string) => {
    return status === "TEPAT_WAKTU"
      ? "bg-emerald-50 text-emerald-600"
      : "bg-red-50 text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-display font-bold text-ink">
          Export Laporan Absensi
        </h2>
        <p className="text-sm text-muted">
          Preview dan download laporan dalam format PDF atau Excel
        </p>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {/* Filter Form */}
      <div className="bg-surface rounded-2xl p-6 shadow-sm border border-line space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-ink-3 mb-2">
              Tanggal Mulai *
            </label>
            <input
              type="date"
              required
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
              className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-3 mb-2">
              Tanggal Selesai *
            </label>
            <input
              type="date"
              required
              value={tanggalSelesai}
              onChange={(e) => setTanggalSelesai(e.target.value)}
              className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-3 mb-2">
              Kantor (opsional)
            </label>
            <select
              value={officeId}
              onChange={(e) => setOfficeId(e.target.value)}
              className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none"
            >
              <option value="">Semua Kantor</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-3 mb-2">
              Status Kehadiran (opsional)
            </label>
            <select
              value={statusKehadiran}
              onChange={(e) => setStatusKehadiran(e.target.value)}
              className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none"
            >
              <option value="">Semua Status</option>
              <option value="TEPAT_WAKTU">Tepat Waktu</option>
              <option value="TERLAMBAT">Terlambat</option>
            </select>
          </div>
        </div>

        <p className="text-xs text-muted">
          ⚠️ Periode maksimal 3 bulan (92 hari) per export.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-2 border-t border-line">
          <button
            onClick={handlePreview}
            disabled={loadingPreview || loadingExport !== null}
            className="flex-1 min-w-[160px] py-3 bg-surface-blue text-blue font-semibold rounded-xl hover:bg-blue-2/20 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loadingPreview ? "Memuat..." : "🔍 Preview Data"}
          </button>
          <button
            onClick={() => handleDownload("pdf")}
            disabled={loadingExport !== null || loadingPreview}
            className="flex-1 min-w-[160px] py-3 bg-red-500 text-white font-display font-bold rounded-xl hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loadingExport === "pdf" ? "Mengunduh..." : "📄 Download PDF"}
          </button>
          <button
            onClick={() => handleDownload("excel")}
            disabled={loadingExport !== null || loadingPreview}
            className="flex-1 min-w-[160px] py-3 bg-emerald-500 text-white font-display font-bold rounded-xl hover:bg-emerald-600 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loadingExport === "excel" ? "Mengunduh..." : "📊 Download Excel"}
          </button>
        </div>
      </div>

      {/* Preview Result */}
      {preview && (
        <div ref={previewRef} className="space-y-4">
          {/* Recap Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface rounded-2xl p-5 shadow-sm border border-line">
              <p className="text-xs font-semibold text-muted uppercase">
                Total Karyawan
              </p>
              <p className="text-3xl font-display font-extrabold text-blue mt-2">
                {preview.recap.totalKaryawan}
              </p>
            </div>
            <div className="bg-surface rounded-2xl p-5 shadow-sm border border-line">
              <p className="text-xs font-semibold text-muted uppercase">
                Tepat Waktu
              </p>
              <p className="text-3xl font-display font-extrabold text-emerald-600 mt-2">
                {preview.recap.totalTepatWaktu}
              </p>
            </div>
            <div className="bg-surface rounded-2xl p-5 shadow-sm border border-line">
              <p className="text-xs font-semibold text-muted uppercase">
                Terlambat
              </p>
              <p className="text-3xl font-display font-extrabold text-red-500 mt-2">
                {preview.recap.totalTerlambat}
              </p>
            </div>
            <div className="bg-surface rounded-2xl p-5 shadow-sm border border-line">
              <p className="text-xs font-semibold text-muted uppercase">
                Hari Kerja
              </p>
              <p className="text-3xl font-display font-extrabold text-violet mt-2">
                {preview.recap.totalHariKerja}
              </p>
            </div>
          </div>

          {/* Preview Table */}
          <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
            <div className="px-6 py-4 border-b border-line flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-ink">
                  Preview Data
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Periode {preview.periode.mulai} — {preview.periode.selesai} ·{" "}
                  {preview.officeFilter}
                </p>
              </div>
              <span className="text-xs text-muted">
                {preview.records.length} baris
              </span>
            </div>

            {preview.records.length === 0 ? (
              <div className="p-8 text-center text-muted">
                Tidak ada data pada periode ini.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-surface-soft border-b border-line">
                    <tr className="text-muted font-semibold">
                      <th className="py-2.5 px-4">NIK</th>
                      <th className="py-2.5 px-4">Nama</th>
                      <th className="py-2.5 px-4">Kantor</th>
                      <th className="py-2.5 px-4">Tanggal</th>
                      <th className="py-2.5 px-4">Masuk</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Pulang</th>
                      <th className="py-2.5 px-4">Total</th>
                      <th className="py-2.5 px-4">Ket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {preview.records.map((r, i) => (
                      <tr key={i} className="hover:bg-surface-soft/50">
                        <td className="py-2.5 px-4 font-mono">{r.nik}</td>
                        <td className="py-2.5 px-4 font-medium text-ink">
                          {r.nama}
                        </td>
                        <td className="py-2.5 px-4 text-muted">{r.kantor}</td>
                        <td className="py-2.5 px-4">{r.tanggal}</td>
                        <td className="py-2.5 px-4 text-emerald-600 font-medium">
                          {r.jamMasuk}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(
                              r.statusMasuk
                            )}`}
                          >
                            {r.statusMasuk}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-orange-500 font-medium">
                          {r.jamPulang}
                        </td>
                        <td className="py-2.5 px-4">{r.totalJamKerja}</td>
                        <td className="py-2.5 px-4 text-muted">
                          {r.keterangan}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
