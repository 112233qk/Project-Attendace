import { useState } from "react";
import { isAxiosError } from "axios";
import api from "../../../lib/api";

interface Props {
  isOpen: boolean;
  permissionId: number | null;
  employeeName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RejectModal({
  isOpen,
  permissionId,
  employeeName,
  onClose,
  onSuccess,
}: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !permissionId) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (reason.trim().length < 5) {
      setError("Alasan penolakan minimal 5 karakter.");
      return;
    }

    setLoading(true);
    try {
      await api.put(`/permissions/${permissionId}/reject`, {
        rejectionReason: reason.trim(),
      });
      setReason("");
      onSuccess();
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Gagal menolak pengajuan.");
      } else {
        setError("Terjadi kesalahan.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5">
        <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-2xl">❌</span>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-lg font-display font-bold text-ink">
            Tolak Pengajuan?
          </h3>
          <p className="text-sm text-muted">
            Pengajuan dari <strong className="text-ink">{employeeName}</strong>{" "}
            akan ditolak.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-300 bg-red-500/20 rounded-xl border border-red-500/30">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-ink-3 mb-2">
              Alasan Penolakan *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
              className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none resize-none"
              placeholder="Contoh: Surat dokter tidak jelas, mohon upload ulang..."
            />
          </div>

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
              className="flex-1 py-3 bg-red-500 text-white font-display font-bold rounded-xl hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Tolak Pengajuan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
