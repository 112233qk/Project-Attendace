import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import api from "../lib/api";

interface User {
  id: number;
  nik: string;
  nama: string;
  email: string;
  role: "KARYAWAN" | "HRD" | "ADMIN";
  officeId: number | null;
  fotoProfil: string | null;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // ← TAMBAH
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/auth/login", { email, password });
      const { token, user } = response.data.data as {
        token: string;
        user: User;
      };

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      if (user.role === "ADMIN" || user.role === "HRD") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        const serverMessage = err.response?.data?.message;

        // Handle per status code (fallback kalau body tidak sesuai)
        if (status === 429) {
          setError(
            serverMessage ||
              "Terlalu banyak percobaan login. Coba lagi setelah 15 menit."
          );
        } else if (status === 401) {
          setError(serverMessage || "Email atau password salah.");
        } else if (status === 403) {
          setError(
            serverMessage ||
              "Akun Anda telah dinonaktifkan. Hubungi Admin untuk informasi lebih lanjut."
          );
        } else if (status === 400) {
          setError(serverMessage || "Email dan password wajib diisi.");
        } else {
          setError(
            serverMessage || "Gagal masuk. Periksa email dan password Anda."
          );
        }
      } else {
        setError("Terjadi kesalahan pada sistem.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink via-ink-2 to-ink-3 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface rounded-3xl shadow-2xl p-10 space-y-8 border border-line/50">
        {/* Logo / Brand */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-blue rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue/30">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
          <h1 className="text-3xl font-display font-extrabold text-ink tracking-tight">
            PT ARIDEV STUDIO
          </h1>
          <p className="text-sm text-muted">Sistem Absensi Karyawan</p>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-ink-3 mb-2">
              Email
            </label>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-3.5 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none transition-all text-ink placeholder:text-muted/60"
              placeholder="nama@aridevstudio.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink-3 mb-2">
              Kata Sandi
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3.5 pr-14 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none transition-all text-ink placeholder:text-muted/60"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer p-1 select-none"
                aria-label={
                  showPassword ? "Sembunyikan password" : "Tampilkan password"
                }
              >
                {showPassword ? (
                  // Mata terbuka
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  // Mata tertutup (dengan garis miring)
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6"
                  >
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue hover:bg-blue-dark text-white font-display font-bold rounded-xl shadow-lg shadow-blue/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="text-center text-xs text-muted">
          © 2026 PT Aridev Studio Creative
        </p>
      </div>
    </div>
  );
}
