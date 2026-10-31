import { useState } from "react";

interface Props {
  isTooEarly: boolean;
  jamPulang: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  loading: boolean;
}

export default function CheckoutReasonModal({
  isTooEarly,
  jamPulang,
  onClose,
  onSubmit,
  loading,
}: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setError("Alasan minimal 5 karakter.");
      return;
    }
    setError(null);
    onSubmit(reason.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5">
        {/* Icon */}
        <div className="w-14 h-14 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-2xl">⏰</span>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-display font-bold text-ink">
            Check-out Di Luar Jam Kerja
          </h3>
          <p className="text-sm text-muted">
            Anda melakukan check-out{" "}
            <strong className="text-ink">
              {isTooEarly ? "lebih awal" : "lebih dari 1 jam"}
            </strong>{" "}
            dari jam pulang kantor ({jamPulang}).
            <br />
            Mohon berikan alasan Anda.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 text-sm text-red-300 bg-red-500/20 rounded-xl border border-red-500/30">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            disabled={loading}
            className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none resize-none text-ink placeholder:text-muted/60"
            placeholder="Contoh: Ada acara keluarga mendadak..."
          />

          <div className="flex gap-3 pt-3">
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
              className="flex-1 py-3 bg-blue text-white font-display font-bold rounded-xl hover:bg-blue-dark transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Kirim & Check-out"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
