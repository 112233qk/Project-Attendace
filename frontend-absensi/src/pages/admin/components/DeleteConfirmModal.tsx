interface Props {
  isOpen: boolean;
  userName: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmModal({
  isOpen,
  userName,
  loading,
  onClose,
  onConfirm,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5">
        <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-2xl">⚠️</span>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-lg font-display font-bold text-ink">
            Nonaktifkan Karyawan?
          </h3>
          <p className="text-sm text-muted">
            Karyawan <strong className="text-ink">{userName}</strong> akan
            dinonaktifkan. Data historis (absensi, izin) tetap tersimpan.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 bg-surface-soft text-ink-3 font-semibold rounded-xl hover:bg-line transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-red-500 text-white font-display font-bold rounded-xl hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Ya, Nonaktifkan"}
          </button>
        </div>
      </div>
    </div>
  );
}
