import { useState, useEffect, useCallback } from "react";
import api from "../../lib/api";
import FilePreviewModal from "./components/FilePreviewModal";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace("/api", "") ||
  "https://project-attendace-production.up.railway.app";

interface AttendanceRecord {
  id: number;
  userId: number;
  tanggal: string;
  jamMasuk: string | null;
  jamPulang: string | null;
  statusMasuk: string | null;
  keterangan: string | null;
  fotoMasuk: string | null;
  fotoPulang: string | null;
  user?: {
    nama: string;
    nik: string;
    email: string;
  };
}

const formatTime = (iso: string | null): string => {
  if (!iso) return "--:--:--";
  const d = new Date(iso);
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const h = String(wib.getUTCHours()).padStart(2, "0");
  const m = String(wib.getUTCMinutes()).padStart(2, "0");
  const s = String(wib.getUTCSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
};

const getTodayDate = (): string => {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().split("T")[0]!;
};

export default function RekapHariIni() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  const fetchToday = useCallback(async () => {
    setLoading(true);
    try {
      const today = getTodayDate();
      const response = await api.get(`/attendances/history?tanggal=${today}`);
      setRecords(response.data.data);
    } catch (err) {
      console.error("Gagal mengambil rekap hari ini:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const today = getTodayDate();
        const response = await api.get(`/attendances/history?tanggal=${today}`);
        if (isMounted) setRecords(response.data.data);
      } catch (err) {
        console.error("Gagal mengambil rekap hari ini:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  // Stats
  const totalHadir = records.length;
  const totalTepatWaktu = records.filter(
    (r) => r.statusMasuk === "TEPAT_WAKTU"
  ).length;
  const totalTerlambat = records.filter(
    (r) => r.statusMasuk === "TERLAMBAT"
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-line">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">
            Total Hadir
          </p>
          <p className="text-3xl font-display font-extrabold text-blue mt-2">
            {totalHadir}
          </p>
        </div>
        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-line">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">
            Tepat Waktu
          </p>
          <p className="text-3xl font-display font-extrabold text-green mt-2">
            {totalTepatWaktu}
          </p>
        </div>
        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-line">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">
            Terlambat
          </p>
          <p className="text-3xl font-display font-extrabold text-red-500 mt-2">
            {totalTerlambat}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex justify-between items-center">
          <h2 className="text-lg font-display font-bold text-ink">
            Rekap Presensi Hari Ini
          </h2>
          <button
            onClick={fetchToday}
            className="text-xs px-3 py-1.5 bg-surface-blue text-blue rounded-lg hover:bg-blue-2/20 cursor-pointer font-semibold transition-colors"
          >
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted">Memuat data...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-muted">
            Belum ada karyawan yang check-in hari ini.
          </div>
        ) : (
          <div className="overflow-x-auto max-w-full">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="bg-surface-soft border-b border-line text-muted font-semibold">
                  <th className="py-3 px-4">NIK</th>
                  <th className="py-3 px-4">Nama</th>
                  <th className="py-3 px-4 whitespace-nowrap">Foto</th>
                  <th className="py-3 px-4">Check-in</th>
                  <th className="py-3 px-4">Check-out</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 whitespace-nowrap">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-soft/50">
                    <td className="py-3 px-4 font-mono text-xs">
                      {r.user?.nik || "-"}
                    </td>
                    <td className="py-3 px-4 font-medium text-ink">
                      {r.user?.nama || "-"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {r.fotoMasuk ? (
                          <button
                            onClick={() =>
                              setPreviewFile(`${BASE_URL}${r.fotoMasuk}`)
                            }
                            className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded hover:bg-blue-500/30 cursor-pointer"
                          >
                            Masuk
                          </button>
                        ) : (
                          <span className="text-xs text-muted">-</span>
                        )}

                        {r.fotoPulang ? (
                          <button
                            onClick={() =>
                              setPreviewFile(`${BASE_URL}${r.fotoPulang}`)
                            }
                            className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded hover:bg-orange-500/30 cursor-pointer"
                          >
                            Pulang
                          </button>
                        ) : (
                          <span className="text-xs text-muted">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-green font-medium">
                      {formatTime(r.jamMasuk)}
                    </td>
                    <td className="py-3 px-4 text-orange-500 font-medium">
                      {formatTime(r.jamPulang)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                          r.statusMasuk === "TEPAT_WAKTU"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : "bg-red-500/20 text-red-300 border-red-500/30"
                        }`}
                      >
                        {r.statusMasuk || "-"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted whitespace-nowrap">
                      {r.keterangan || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <FilePreviewModal
        isOpen={!!previewFile}
        fileUrl={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
