import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import ChangePasswordModal from "./components/ChangePasswordModal";

interface UserProfile {
  id: number;
  nik: string;
  nama: string;
  email: string;
  role: "KARYAWAN" | "HRD" | "ADMIN";
  officeId: number | null;
  office?: { id: number; name: string };
}

const getRoleBadge = (role: string) => {
  switch (role) {
    case "ADMIN":
      return "bg-violet-500/20 text-violet-300 border-violet-500/30";
    case "HRD":
      return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    case "KARYAWAN":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    default:
      return "bg-surface-soft text-ink-3 border-line";
  }
};

// Generate avatar dari huruf pertama nama
const getInitial = (nama: string): string => {
  if (!nama) return "?";
  return nama.trim().charAt(0).toUpperCase();
};

export default function Profil() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await api.get("/users/me");
        if (isMounted) setProfile(res.data.data);
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

  return (
    <div className="min-h-screen bg-surface-soft flex flex-col">
      <header className="bg-surface border-b border-line px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-display font-bold text-ink">Profil</h1>
          <p className="text-xs text-muted">Informasi akun Anda</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-sm bg-surface-soft font-semibold text-ink-3 hover:bg-line rounded-xl transition-colors cursor-pointer"
        >
          Kembali
        </button>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-6">
        <div className="bg-surface rounded-3xl shadow-sm border border-line p-8 space-y-6">
          {loading ? (
            <div className="p-8 text-center text-muted">Memuat profil...</div>
          ) : !profile ? (
            <div className="p-8 text-center text-muted">
              Gagal memuat profil.
            </div>
          ) : (
            <>
              {/* Avatar & Nama */}
              <div className="text-center space-y-3">
                <div className="w-20 h-20 bg-blue rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-blue/30">
                  <span className="text-white text-3xl font-bold">
                    {getInitial(profile.nama)}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-ink">
                    {profile.nama}
                  </h2>
                  <p className="text-xs text-muted">{profile.email}</p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-line">
                <div>
                  <p className="text-xs text-muted mb-1">NIK</p>
                  <p className="text-sm font-mono text-ink">{profile.nik}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Role</p>
                  <span
                    className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${getRoleBadge(
                      profile.role
                    )}`}
                  >
                    {profile.role}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Kantor</p>
                  <p className="text-sm text-ink">
                    {profile.office?.name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Email</p>
                  <p className="text-sm text-ink truncate">{profile.email}</p>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-surface-blue rounded-xl border border-blue-500/30 text-xs text-blue-200">
                ℹ️ Untuk mengubah data profil (nama, NIK, email, kantor),
                hubungi Admin. Anda hanya dapat mengganti kata sandi sendiri.
              </div>

              {/* Action */}
              <div className="pt-4 border-t border-line">
                <button
                  onClick={() => setIsPasswordOpen(true)}
                  className="w-full py-3 bg-blue text-white font-display font-bold rounded-xl hover:bg-blue-dark transition-colors cursor-pointer shadow-lg shadow-blue/20"
                >
                  🔒 Ganti Kata Sandi
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <ChangePasswordModal
        isOpen={isPasswordOpen}
        onClose={() => setIsPasswordOpen(false)}
        onSuccess={() => setIsPasswordOpen(false)}
      />
    </div>
  );
}
