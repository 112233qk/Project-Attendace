import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useToast } from "../components/ui/ToastProvider";
import FilePreviewModal from "./admin/components/FilePreviewModal";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace("/api", "") ||
  "https://project-attendace.onrender.com";

interface Permission {
  id: number;
  jenis: "IZIN" | "SAKIT" | "CUTI";
  tanggalMulai: string;
  tanggalSelesai: string;
  jamMulai: string | null;
  jamSelesai: string | null;
  alasan: string;
  buktiFile: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  approver?: {
    id: number;
    nama: string;
    role: string;
  } | null;
}

// Format tanggal: "2026-09-29T00:00:00.000Z" → "29/09/2026"
const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

// Format waktu proses: "29/09/2026 14:30"
const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  const hour = String(d.getUTCHours() + 7).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${min}`;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "PENDING":
      return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    case "APPROVED":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    case "REJECTED":
      return "bg-red-500/20 text-red-300 border-red-500/30";
    default:
      return "bg-surface-soft text-ink-3 border-line";
  }
};

const getJenisBadge = (jenis: string) => {
  switch (jenis) {
    case "IZIN":
      return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    case "SAKIT":
      return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    case "CUTI":
      return "bg-violet-500/20 text-violet-300 border-violet-500/30";
    default:
      return "bg-surface-soft text-ink-3 border-line";
  }
};

export default function RiwayatIzin() {
  const navigate = useNavigate();
  const toast = useToast();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Permission | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/permissions/me");
      setPermissions(res.data.data.permissions);
    } catch (err) {
      console.error("Gagal load riwayat izin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/permissions/me");
        if (isMounted) setPermissions(res.data.data.permissions);
      } catch (err) {
        console.error("Gagal load riwayat izin:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await api.delete(`/permissions/${cancelTarget.id}`);
      toast.success("Berhasil", "Pengajuan berhasil dibatalkan.");
      setCancelTarget(null);
      fetchData();
    } catch {
      toast.error("Gagal", "Gagal membatalkan pengajuan.");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-soft flex flex-col">
      <header className="bg-surface border-b border-line px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-display font-bold text-ink">
            Riwayat Izin
          </h1>
          <p className="text-xs text-muted">
            Daftar pengajuan izin/sakit/cuti Anda
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/ajukan-izin")}
            className="px-4 py-2 text-sm bg-blue text-white font-semibold rounded-xl hover:bg-blue-dark transition-colors cursor-pointer"
          >
            + Ajukan Izin
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 text-sm bg-surface-soft font-semibold text-ink-3 hover:bg-line rounded-xl transition-colors cursor-pointer"
          >
            Kembali
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6">
        <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted">Memuat data...</div>
          ) : permissions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <p className="text-4xl">📭</p>
              <p className="text-muted">Belum ada pengajuan.</p>
              <button
                onClick={() => navigate("/ajukan-izin")}
                className="px-5 py-2.5 bg-blue text-white font-semibold rounded-xl hover:bg-blue-dark transition-colors cursor-pointer text-sm"
              >
                Buat Pengajuan Pertama
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto max-w-full">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="bg-surface-soft border-b border-line text-muted font-semibold">
                    <th className="py-3 px-4 whitespace-nowrap">Jenis</th>
                    <th className="py-3 px-4 whitespace-nowrap">Periode</th>
                    <th className="py-3 px-4">Alasan</th>
                    <th className="py-3 px-4 whitespace-nowrap">Bukti</th>
                    <th className="py-3 px-4 whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {permissions.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-soft/50">
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getJenisBadge(
                            p.jenis
                          )}`}
                        >
                          {p.jenis}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted whitespace-nowrap">
                        {formatDate(p.tanggalMulai)}
                        {p.jamMulai && p.jamSelesai && (
                          <span className="block text-blue-300 font-semibold mt-0.5">
                            {p.jamMulai} - {p.jamSelesai}
                          </span>
                        )}
                        {p.tanggalMulai !== p.tanggalSelesai &&
                          ` — ${formatDate(p.tanggalSelesai)}`}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-ink truncate" title={p.alasan}>
                          {p.alasan}
                        </p>
                        {p.status === "REJECTED" && p.rejectionReason && (
                          <p
                            className="text-xs text-red-500 mt-1 truncate"
                            title={p.rejectionReason}
                          >
                            ✗ {p.rejectionReason}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {p.buktiFile ? (
                          <button
                            onClick={() =>
                              setPreviewFile(`${BASE_URL}${p.buktiFile}`)
                            }
                            className="text-xs bg-surface-blue text-blue px-2 py-1 rounded hover:bg-blue-2/20 cursor-pointer"
                          >
                            📎 Lihat
                          </button>
                        ) : (
                          <span className="text-xs text-muted">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(
                            p.status
                          )}`}
                        >
                          {p.status}
                        </span>
                        {p.status !== "PENDING" && p.approver && (
                          <p className="text-[10px] text-muted mt-1 leading-tight">
                            Oleh: {p.approver.nama}
                            <br />
                            {formatDateTime(p.updatedAt)}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {p.status === "PENDING" && (
                          <button
                            onClick={() => setCancelTarget(p)}
                            className="px-3 py-1.5 text-xs font-semibold bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 cursor-pointer"
                          >
                            Batalkan
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Cancel Confirm Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-display font-bold text-ink">
                Batalkan Pengajuan?
              </h3>
              <p className="text-sm text-muted">
                Pengajuan{" "}
                <strong className="text-ink">{cancelTarget.jenis}</strong> (
                {formatDate(cancelTarget.tanggalMulai)} —{" "}
                {formatDate(cancelTarget.tanggalSelesai)}) akan dihapus.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelLoading}
                className="flex-1 py-3 bg-surface-soft text-ink-3 font-semibold rounded-xl hover:bg-line transition-colors cursor-pointer disabled:opacity-50"
              >
                Tidak
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                className="flex-1 py-3 bg-red-500 text-white font-display font-bold rounded-xl hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancelLoading ? "Memproses..." : "Ya, Batalkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={!!previewFile}
        fileUrl={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
