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
  user?: {
    nama: string;
    nik: string;
    email: string;
  };
}

// Format tanggal: "2026-09-29T00:00:00.000Z" → "29-09-2026"
const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
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
        const response = await api.get("/attendances/history");
        if (isMounted) {
          // Response format Opsi A: { success, message, data: [...] }
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Riwayat Presensi</h1>
          <p className="text-xs text-gray-500">Daftar Kehadiran Anda</p>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-4 py-2 text-sm bg-gray-100 font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
        >
          Kembali ke Dashboard
        </button>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Memuat data riwayat...
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Belum ada riwayat presensi.
            </div>
          ) : (
            <div className="overflow-x-auto max-w-full">
              <table className="min-w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-semibold">
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Check-in</th>
                    <th className="py-3 px-4">Check-out</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4 font-medium text-gray-800">
                        {formatDate(item.tanggal)}
                      </td>
                      <td className="py-3 px-4 text-emerald-600 font-medium">
                        {formatTime(item.jamMasuk)}
                      </td>
                      <td className="py-3 px-4 text-orange-600 font-medium">
                        {formatTime(item.jamPulang)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                            item.statusMasuk === "TEPAT_WAKTU"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : item.statusMasuk === "TERLAMBAT"
                              ? "bg-red-50 text-red-600 border-red-100"
                              : "bg-gray-50 text-gray-600 border-gray-200"
                          }`}
                        >
                          {item.statusMasuk || "-"}
                        </span>
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
