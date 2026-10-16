import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

interface AttendanceRecord {
  id: number;
  userId: number;
  tanggal: string;
  jamMasuk: string | null;
  jamPulang: string | null;
  statusMasuk: string | null;
  metodeMasuk: string | null;
  keterangan: string | null;
  user?: {
    nama: string;
    nik: string;
    email: string;
  };
}

// Format tanggal: "2026-09-29T00:00:00.000Z" → "29/09/2026"
const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

// Format jam: "2026-09-29T01:15:30.000Z" → "08:15:30" (WIB)
const formatTime = (iso: string | null): string => {
  if (!iso) return "--:--:--";
  const d = new Date(iso);
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const h = String(wib.getUTCHours()).padStart(2, "0");
  const m = String(wib.getUTCMinutes()).padStart(2, "0");
  const s = String(wib.getUTCSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
};

export default function RiwayatPresensi() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      try {
        const response = await api.get("/attendances/me");
        if (isMounted) {
          setHistory(response.data.data);
        }
      } catch (err) {
        console.error("Gagal mengambil riwayat presensi:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-surface-soft flex flex-col">
      <header className="bg-surface border-b border-line px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-display font-bold text-ink">
            Riwayat Presensi
          </h1>
          <p className="text-xs text-muted">Daftar Kehadiran Anda</p>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-4 py-2 text-sm bg-surface-soft font-semibold text-ink-3 hover:bg-line rounded-xl transition-colors cursor-pointer"
        >
          Kembali ke Dashboard
        </button>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6">
        <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted">
              Memuat data riwayat...
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-muted">
              Belum ada riwayat presensi.
            </div>
          ) : (
            <div className="overflow-x-auto max-w-full">
              <table className="min-w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-soft border-b border-line text-muted font-semibold">
                    <th className="py-3 px-4 whitespace-nowrap">Tanggal</th>
                    <th className="py-3 px-4 whitespace-nowrap">Check-in</th>
                    <th className="py-3 px-4 whitespace-nowrap">Check-out</th>
                    <th className="py-3 px-4 whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 whitespace-nowrap">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-soft/50">
                      <td className="py-3 px-4 font-medium text-ink whitespace-nowrap">
                        {formatDate(item.tanggal)}
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-medium whitespace-nowrap">
                        {formatTime(item.jamMasuk)}
                      </td>
                      <td className="py-3 px-4 text-orange-400 font-medium whitespace-nowrap">
                        {formatTime(item.jamPulang)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                            item.statusMasuk === "TEPAT_WAKTU"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : item.statusMasuk === "TERLAMBAT"
                              ? "bg-red-500/20 text-red-300 border-red-500/30"
                              : "bg-surface-soft text-ink-3 border-line"
                          }`}
                        >
                          {item.statusMasuk || "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted whitespace-nowrap">
                        {item.keterangan || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
