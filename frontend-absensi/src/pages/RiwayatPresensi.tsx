import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  status: string;
}

export default function RiwayatPresensi() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      try {
        const response = await api.get("/attendance/history");
        if (isMounted) {
          setHistory(response.data);
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
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
                        {item.date}
                      </td>
                      <td className="py-3 px-4 text-emerald-600 font-medium">
                        {item.checkIn}
                      </td>
                      <td className="py-3 px-4 text-orange-600 font-medium">
                        {item.checkOut ? item.checkOut : "-- : --"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                          {item.status}
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
