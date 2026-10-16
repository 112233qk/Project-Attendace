import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import api from "../lib/api";
import { useToast } from "../components/ui/ToastProvider";
import { compressImage } from "../lib/imageCompression";

type JenisIzin = "IZIN" | "SAKIT" | "CUTI";

export default function AjukanIzin() {
  const toast = useToast();
  const navigate = useNavigate();
  const [jenis, setJenis] = useState<JenisIzin>("IZIN");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [alasan, setAlasan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validasi client-side
    if (!tanggalMulai || !tanggalSelesai) {
      setError("Tanggal mulai dan selesai wajib diisi.");
      return;
    }
    if (new Date(tanggalMulai) > new Date(tanggalSelesai)) {
      setError(
        "Tanggal mulai harus lebih awal atau sama dengan tanggal selesai."
      );
      return;
    }
    if (alasan.trim().length < 5) {
      setError("Alasan minimal 5 karakter.");
      return;
    }
    if (jenis === "SAKIT") {
      const fileInput = fileRef.current;
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        setError("Pengajuan SAKIT wajib melampirkan bukti (surat dokter).");
        return;
      }
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("jenis", jenis);
      formData.append("tanggalMulai", tanggalMulai);
      formData.append("tanggalSelesai", tanggalSelesai);
      formData.append("alasan", alasan.trim());

      const fileInput = fileRef.current;
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        const originalFile = fileInput.files[0];
        const compressedFile = await compressImage(originalFile, 1);
        formData.append("buktiFile", compressedFile);
      }

      await api.post("/permissions", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Pengajuan Terkirim", "Menunggu persetujuan HRD/Admin.");
      setSuccess(true);
      // Reset form
      setJenis("IZIN");
      setTanggalMulai("");
      setTanggalSelesai("");
      setAlasan("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        toast.error(
          "Gagal Mengajukan",
          err.response?.data?.message || "Terjadi kesalahan."
        );
      } else {
        toast.error(
          "Gagal Mengajukan",
          "Terjadi kesalahan yang tidak diketahui."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Get today in YYYY-MM-DD
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-surface-soft flex flex-col">
      <header className="bg-surface border-b border-line px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-display font-bold text-ink">
            Ajukan Izin
          </h1>
          <p className="text-xs text-muted">
            Formulir pengajuan izin, sakit, atau cuti
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/riwayat-izin")}
            className="px-4 py-2 text-sm bg-surface-blue font-semibold text-blue hover:bg-blue-2/20 rounded-xl transition-colors cursor-pointer"
          >
            Riwayat Izin
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 text-sm bg-surface-soft font-semibold text-ink-3 hover:bg-line rounded-xl transition-colors cursor-pointer"
          >
            Kembali
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-6">
        <div className="bg-surface rounded-3xl shadow-sm border border-line p-8 space-y-6">
          {success && (
            <div className="p-4 text-sm text-emerald-300 bg-emerald-500/20 rounded-xl border border-emerald-500/30 flex items-center gap-3">
              <span className="text-lg">✅</span>
              <div>
                <p className="font-semibold">Pengajuan berhasil dikirim!</p>
                <p className="text-xs mt-0.5">
                  Menunggu persetujuan HRD/Admin.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 text-sm text-red-300 bg-red-500/20 rounded-xl border border-red-500/30">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Jenis */}
            <div>
              <label className="block text-sm font-semibold text-ink-3 mb-2">
                Jenis Pengajuan *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(["IZIN", "SAKIT", "CUTI"] as JenisIzin[]).map((j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() => setJenis(j)}
                    className={`py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer border-2 ${
                      jenis === j
                        ? "bg-blue text-white border-blue shadow-lg shadow-blue/20"
                        : "bg-surface-soft text-ink-3 border-line hover:border-blue/30"
                    }`}
                  >
                    {j}
                  </button>
                ))}
              </div>
            </div>

            {/* Tanggal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-ink-3 mb-2">
                  Tanggal Mulai *
                </label>
                <input
                  type="date"
                  required
                  min={today}
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
                  min={tanggalMulai || today}
                  value={tanggalSelesai}
                  onChange={(e) => setTanggalSelesai(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none"
                />
              </div>
            </div>

            {/* Alasan */}
            <div>
              <label className="block text-sm font-semibold text-ink-3 mb-2">
                Alasan *
              </label>
              <textarea
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                rows={4}
                required
                className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none resize-none"
                placeholder="Jelaskan alasan pengajuan Anda (minimal 5 karakter)..."
              />
              <p className="text-xs text-muted mt-1">
                {alasan.length} karakter
              </p>
            </div>

            {/* Bukti File */}
            <div>
              <label className="block text-sm font-semibold text-ink-3 mb-2">
                Bukti File{" "}
                {jenis === "SAKIT" ? (
                  <span className="text-red-500">* (wajib untuk SAKIT)</span>
                ) : (
                  <span className="text-xs font-normal text-muted">
                    (opsional)
                  </span>
                )}
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="block w-full text-sm text-muted file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-500/20 file:text-blue-300 hover:file:bg-blue-500/30 file:cursor-pointer"
              />
              <p className="text-xs text-muted mt-1">
                Format: JPG, PNG, atau PDF. Maksimal 5MB.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="flex-1 py-3 bg-surface-soft text-ink-3 font-semibold rounded-xl hover:bg-line transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-blue text-white font-display font-bold rounded-xl hover:bg-blue-dark transition-colors cursor-pointer disabled:opacity-50 shadow-lg shadow-blue/20"
              >
                {loading ? "Mengirim..." : "Kirim Pengajuan"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
