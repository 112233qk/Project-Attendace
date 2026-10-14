import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import api from "../lib/api";
import ChangePasswordModal from "./components/ChangePasswordModal";

interface UserProfile {
  id: number;
  nik: string;
  nama: string;
  email: string;
  role: "KARYAWAN" | "HRD" | "ADMIN";
  officeId: number | null;
  fotoProfil: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  office?: { id: number; name: string } | null;
}

export default function Profil() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [nama, setNama] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const res = await api.get("/users/me");
        if (isMounted) {
          setUser(res.data.data);
          setNama(res.data.data.nama);
        }
      } catch (err) {
        console.error("Gagal load profil:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!nama || nama.trim().length < 2) {
      setError("Nama minimal 2 karakter.");
      return;
    }

    if (nama.trim() === user?.nama) {
      setError("Tidak ada perubahan pada nama.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put("/users/me", { nama: nama.trim() });
      setUser(res.data.data);
      // Update localStorage user
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        parsed.nama = res.data.data.nama;
        localStorage.setItem("user", JSON.stringify(parsed));
      }
      setSuccess("Profil berhasil diperbarui.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Gagal memperbarui profil.");
      } else {
        setError("Terjadi kesalahan.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSuccess = () => {
    setIsPasswordModalOpen(false);
    setSuccess("Password berhasil diubah.");
    setTimeout(() => setSuccess(null), 3000);
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: "bg-violet-50 text-violet-600 border-violet-100",
      HRD: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      KARYAWAN: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    };
    return colors[role] || "bg-surface-soft text-muted border-line";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-soft flex items-center justify-center">
        <p className="text-muted">Memuat profil...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface-soft flex items-center justify-center">
        <p className="text-muted">Profil tidak ditemukan.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-soft flex flex-col">
      <header className="bg-surface border-b border-line px-6 py-4 shadow-sm">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-display font-bold text-ink">
              Profil Saya
            </h1>
            <p className="text-xs text-muted">Kelola informasi akun Anda</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm bg-surface-soft font-semibold text-ink-3 hover:bg-line rounded-xl transition-colors cursor-pointer"
          >
            Kembali
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-6 space-y-6">
        {/* Alerts */}
        {error && (
          <div className="p-4 text-sm text-red-300 bg-red-500/20 rounded-xl border border-red-500/30">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 text-sm text-emerald-300 bg-emerald-500/20 rounded-xl border border-emerald-500/30 flex items-center gap-3">
            <span className="text-lg">✅</span>
            <span>{success}</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-surface rounded-3xl shadow-sm border border-line p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-blue rounded-3xl flex items-center justify-center shadow-lg shadow-blue/30 shrink-0">
              <span className="text-4xl font-display font-extrabold text-white">
                {user.nama.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left space-y-2">
              <h2 className="text-2xl font-display font-bold text-ink">
                {user.nama}
              </h2>
              <p className="text-sm text-muted">{user.email}</p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full border ${getRoleBadge(
                    user.role
                  )}`}
                >
                  {user.role}
                </span>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-surface-soft text-muted font-mono">
                  {user.nik}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Profile */}
        <div className="bg-surface rounded-3xl shadow-sm border border-line p-8 space-y-6">
          <div>
            <h3 className="text-lg font-display font-bold text-ink">
              Informasi Akun
            </h3>
            <p className="text-xs text-muted mt-1">
              Beberapa informasi tidak dapat diubah (NIK, Email, Role)
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* NIK (readonly) */}
            <div>
              <label className="block text-sm font-semibold text-ink-3 mb-2">
                NIK
              </label>
              <input
                type="text"
                readOnly
                value={user.nik}
                className="w-full px-4 py-3 bg-line/30 border border-line rounded-xl outline-none text-muted cursor-not-allowed font-mono"
              />
            </div>

            {/* Email (readonly) */}
            <div>
              <label className="block text-sm font-semibold text-ink-3 mb-2">
                Email
              </label>
              <input
                type="email"
                readOnly
                value={user.email}
                className="w-full px-4 py-3 bg-line/30 border border-line rounded-xl outline-none text-muted cursor-not-allowed"
              />
            </div>

            {/* Role (readonly) */}
            <div>
              <label className="block text-sm font-semibold text-ink-3 mb-2">
                Role
              </label>
              <input
                type="text"
                readOnly
                value={user.role}
                className="w-full px-4 py-3 bg-line/30 border border-line rounded-xl outline-none text-muted cursor-not-allowed"
              />
            </div>

            {/* Kantor (readonly) */}
            {user.office && (
              <div>
                <label className="block text-sm font-semibold text-ink-3 mb-2">
                  Kantor
                </label>
                <input
                  type="text"
                  readOnly
                  value={user.office.name}
                  className="w-full px-4 py-3 bg-line/30 border border-line rounded-xl outline-none text-muted cursor-not-allowed"
                />
              </div>
            )}

            {/* Nama (editable) */}
            <div>
              <label className="block text-sm font-semibold text-ink-3 mb-2">
                Nama Lengkap *
              </label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none"
                placeholder="Nama Anda"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-blue text-white font-display font-bold rounded-xl hover:bg-blue-dark transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        </div>

        {/* Keamanan */}
        <div className="bg-surface rounded-3xl shadow-sm border border-line p-8 space-y-4">
          <div>
            <h3 className="text-lg font-display font-bold text-ink">
              Keamanan
            </h3>
            <p className="text-xs text-muted mt-1">
              Ubah password akun Anda secara berkala untuk keamanan
            </p>
          </div>

          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="w-full py-3 bg-surface-soft text-ink-3 font-semibold rounded-xl hover:bg-line transition-colors cursor-pointer border border-line"
          >
            🔒 Ganti Password
          </button>
        </div>

        {/* Metadata */}
        <p className="text-center text-xs text-muted">
          Akun dibuat:{" "}
          {new Date(user.createdAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </main>

      {/* Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={handlePasswordSuccess}
      />
    </div>
  );
}
