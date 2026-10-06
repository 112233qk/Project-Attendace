import { useState } from "react";
import { isAxiosError } from "axios";
import api from "../../../lib/api";

interface Props {
  isOpen: boolean;
  permissionId: number | null;
  employeeName: string;
  jenis?: string;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const formatDate = (iso: string): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
};

export default function ApproveConfirmModal({
  isOpen,
  permissionId,
  employeeName,
  jenis,
  tanggalMulai,
  tanggalSelesai,
  onClose,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !permissionId) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.put(`/permissions/${permissionId}/approve`);
      onSuccess();
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Gagal menyetujui pengajuan.");
      } else {
        setError("Terjadi kesalahan.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5">
        {/* Icon Hijau */}
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-2xl">✅</span>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-display font-bold text-ink">
            Setujui Pengajuan?
          </h3>
          <p className="text-sm text-muted">
            Pengajuan dari <strong className="text-ink">{employeeName}</strong>{" "}
            akan disetujui.
          </p>
        </div>

        {/* Detail Info (Opsional) */}
        {(jenis || tanggalMulai) && (
          <div className="bg-surface-soft rounded-xl p-4 space-y-2 text-sm">
            {jenis && (
              <div className="flex justify-between">
                <span className="text-muted">Jenis</span>
                <span className="font-semibold text-ink">{jenis}</span>
              </div>
            )}
            {tanggalMulai && tanggalSelesai && (
              <div className="flex justify-between">
                <span className="text-muted">Periode</span>
                <span className="font-semibold text-ink">
                  {formatDate(tanggalMulai)} — {formatDate(tanggalSelesai)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        {/* Actions */}
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 bg-surface-soft text-ink-3 font-semibold rounded-xl hover:bg-line transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-emerald-500 text-white font-display font-bold rounded-xl hover:bg-emerald-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Setujui Pengajuan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
