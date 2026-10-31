import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import api from "../lib/api";
import { compressImage } from "../lib/imageCompression";
import CheckoutReasonModal from "../components/CheckoutReasonModal";

interface AttendanceStatus {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  activePermission: string | null;
  jamPulangKantor: string | null;
}

interface User {
  id: number;
  nama: string;
  role: string;
}

export default function DashboardKaryawan() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isTooEarly, setIsTooEarly] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [locationError, setLocationError] = useState<string | null>(() =>
    typeof window !== "undefined" && !("geolocation" in navigator)
      ? "Geolokasi tidak didukung oleh browser Anda."
      : null
  );
  const [status, setStatus] = useState<AttendanceStatus>({
    hasCheckedIn: false,
    hasCheckedOut: false,
    checkInTime: null,
    checkOutTime: null,
    activePermission: null,
    jamPulangKantor: null,
  });

  // File input ref
  const checkInFileRef = useRef<HTMLInputElement>(null);
  const checkOutFileRef = useRef<HTMLInputElement>(null);

  const [user] = useState<User | null>(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  });

  // 2. Update Jam Real-time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Ambil Lokasi GPS User
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          console.error("Gagal mendapatkan lokasi:", error);
          setLocationError(
            "Izin lokasi ditolak atau tidak tersedia. Aktifkan GPS Anda."
          );
        }
      );
    }
  }, []);

  // 4. Fetch Status Presensi Hari Ini
  const fetchTodayStatus = useCallback(async () => {
    try {
      const response = await api.get("/attendances/today");
      setStatus(response.data.data);
    } catch (err) {
      console.error("Gagal mengambil status presensi:", err);
    }
  }, []);

  // Initial load: inline async (tidak trigger ESLint rule)
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const response = await api.get("/attendances/today");
        if (isMounted) setStatus(response.data.data);
      } catch (err) {
        console.error("Gagal mengambil status presensi:", err);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  // 5. Handle Check-in (Dipanggil otomatis setelah foto diambil)
  const handleCheckIn = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!location) {
      alert(
        "Lokasi GPS belum terdeteksi. Izinkan akses lokasi pada browser Anda."
      );
      return;
    }

    const fileInput = e.target;
    if (!fileInput.files || fileInput.files.length === 0) {
      return; // User membatalkan pengambilan foto
    }

    setLoading(true);
    try {
      const originalFile = fileInput.files[0];
      const compressedFile = await compressImage(originalFile, 1);

      const formData = new FormData();
      formData.append("latitude", location.lat.toString());
      formData.append("longitude", location.lng.toString());
      formData.append("metodeMasuk", "GPS");
      formData.append("fotoMasuk", compressedFile);

      await api.post("/attendances/check-in", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Check-in Berhasil!");
      fetchTodayStatus();
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        alert(err.response?.data?.message || "Gagal melakukan Check-in.");
      } else {
        alert("Terjadi kesalahan yang tidak diketahui.");
      }
    } finally {
      fileInput.value = ""; // Reset input agar bisa foto ulang
      setLoading(false);
    }
  };

  // 6a. Fungsi Eksekusi Check-out (Dipanggil dari normal flow atau Modal)
  const executeCheckOut = async (file: File, alasanPulang: string) => {
    setLoading(true);
    try {
      const compressedFile = await compressImage(file, 1);

      const formData = new FormData();
      formData.append("latitude", location!.lat.toString());
      formData.append("longitude", location!.lng.toString());
      formData.append("fotoPulang", compressedFile);

      if (alasanPulang) {
        formData.append("alasanPulang", alasanPulang);
      }

      await api.post("/attendances/check-out", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Check-out Berhasil!");
      fetchTodayStatus();
      setIsReasonModalOpen(false);
      setPendingFile(null);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        alert(err.response?.data?.message || "Gagal melakukan Check-out.");
      } else {
        alert("Terjadi kesalahan yang tidak diketahui.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 6b. Handle Check-out (Validasi sebelum eksekusi)
  const handleCheckOut = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!location) {
      alert("Lokasi GPS belum terdeteksi.");
      return;
    }

    const fileInput = e.target;
    if (!fileInput.files || fileInput.files.length === 0) return;

    const file = fileInput.files[0];

    // LOGIKA VALIDASI JAM PULANG
    if (status.jamPulangKantor) {
      const now = new Date();
      const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      const currentMinutes = wib.getUTCHours() * 60 + wib.getUTCMinutes();

      const [h, m] = status.jamPulangKantor.split(":").map(Number);
      const officeMinutes = (h ?? 0) * 60 + (m ?? 0);

      const tooEarly = currentMinutes < officeMinutes;
      const tooLate = currentMinutes > officeMinutes + 60;

      if (tooEarly || tooLate) {
        // JIKA DI LUAR JAM KERJA: Tahan file, buka Modal
        setPendingFile(file);
        setIsTooEarly(tooEarly);
        setIsReasonModalOpen(true);
        fileInput.value = ""; // Reset input
        return;
      }
    }

    // JIKA TEPAT WAKTU: Langsung eksekusi
    executeCheckOut(file, "");
    fileInput.value = "";
  };

  // 7. Handle Logout
  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // abaikan error
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-surface-soft flex flex-col">
      <header className="bg-ink-deep border-b border-line px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue rounded-xl flex items-center justify-center shadow-lg shadow-blue/30 shrink-0">
              <span className="text-white text-lg font-bold leading-none font-sans translate-y-[0.5px]">
                {user?.role === "ADMIN"
                  ? "A"
                  : user?.role === "HRD"
                  ? "H"
                  : "K"}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-white">
                Dashboard Karyawan
              </h1>
              <p className="text-xs text-blue-2">
                {user ? `Halo, ${user.nama}` : "Sistem Presensi Kehadiran"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {user?.role === "HRD" && (
              <button
                onClick={() => navigate("/admin")}
                className="px-4 py-2 text-sm bg-white/10 font-medium text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
              >
                Admin Panel
              </button>
            )}
            <button
              onClick={() => navigate("/profil")}
              className="px-4 py-2 text-sm bg-white/10 font-medium text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
            >
              Profil
            </button>
            <button
              onClick={() => navigate("/riwayat")}
              className="px-4 py-2 text-sm bg-blue-500/20 font-medium text-blue-200 hover:bg-blue-500/30 rounded-xl transition-colors cursor-pointer"
            >
              Riwayat
            </button>
            <button
              onClick={() => navigate("/ajukan-izin")}
              className="px-4 py-2 text-sm bg-violet-500/20 font-medium text-violet-200 hover:bg-violet-500/30 rounded-xl transition-colors cursor-pointer"
            >
              Ajukan Izin
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-red-500/20 font-medium text-red-300 hover:bg-red-500/30 rounded-xl transition-colors cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
        {/* Card: Jam & Lokasi */}
        <div className="bg-surface rounded-2xl p-6 shadow-sm border border-line text-center">
          <p className="text-sm font-medium text-muted uppercase tracking-wider mb-1">
            {currentTime.toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <div className="text-4xl md:text-5xl font-extrabold text-blue-2 tracking-tight my-2">
            {currentTime.toLocaleTimeString("id-ID")}
          </div>
          {location ? (
            <p className="text-xs text-emerald-400 font-medium flex items-center justify-center gap-1 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
              Lokasi Terdeteksi ({location.lat.toFixed(4)},{" "}
              {location.lng.toFixed(4)})
            </p>
          ) : locationError ? (
            <p className="text-xs text-red-400 mt-2">{locationError}</p>
          ) : (
            <p className="text-xs text-muted animate-pulse mt-2">
              Mendapatkan lokasi GPS...
            </p>
          )}
        </div>

        {/* Card: Status Presensi */}
        <div className="bg-surface rounded-2xl p-6 shadow-sm border border-line space-y-6">
          <h2 className="text-lg font-bold text-ink border-b border-line pb-3">
            Presensi Hari Ini
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-surface-blue border border-line">
              <p className="text-xs font-semibold text-blue-2">Jam Check-in</p>
              <p className="text-xl font-bold text-ink mt-1">
                {status.checkInTime || "-- : --"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-blue border border-line">
              <p className="text-xs font-semibold text-orange-400">
                Jam Check-out
              </p>
              <p className="text-xl font-bold text-ink mt-1">
                {status.checkOutTime || "-- : --"}
              </p>
            </div>
          </div>

          {/* Tampilan jika sedang izin, atau form presensi */}
          {status.activePermission ? (
            <div className="p-6 text-center space-y-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
              <span className="text-3xl">⚠️</span>
              <h3 className="text-lg font-bold text-yellow-300">
                Anda Sedang Izin / Cuti
              </h3>
              <p className="text-sm text-yellow-200/80">
                Berdasarkan data sistem, Anda sedang dalam masa{" "}
                <strong>{status.activePermission}</strong> yang telah disetujui
                hari ini. Anda tidak dapat melakukan Check-in atau Check-out.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Check-in Section */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-ink-3">
                  1. Presensi Masuk
                </label>
                {/* Input disembunyikan, dipicu oleh tombol di bawahnya */}
                <input
                  ref={checkInFileRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={handleCheckIn}
                />
                <button
                  type="button"
                  onClick={() => checkInFileRef.current?.click()}
                  disabled={status.hasCheckedIn || loading || !location}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-white shadow-sm transition-all cursor-pointer ${
                    status.hasCheckedIn || !location
                      ? "bg-ink-3/40 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700 active:scale-98"
                  }`}
                >
                  {loading
                    ? "Memproses Foto..."
                    : status.hasCheckedIn
                    ? "Sudah Check-in"
                    : !location
                    ? "Menunggu GPS..."
                    : "📷 Check-in & Ambil Foto"}
                </button>
              </div>

              {/* Check-out Section */}
              <div className="space-y-3 pt-4 border-t border-line">
                <label className="block text-sm font-medium text-ink-3">
                  2. Presensi Pulang
                </label>
                <input
                  ref={checkOutFileRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={handleCheckOut}
                />
                <button
                  type="button"
                  onClick={() => checkOutFileRef.current?.click()}
                  disabled={
                    !status.hasCheckedIn ||
                    status.hasCheckedOut ||
                    loading ||
                    !location
                  }
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-white shadow-sm transition-all cursor-pointer ${
                    !status.hasCheckedIn || status.hasCheckedOut || !location
                      ? "bg-ink-3/40 cursor-not-allowed"
                      : "bg-orange-600 hover:bg-orange-700 active:scale-98"
                  }`}
                >
                  {loading
                    ? "Memproses Foto..."
                    : status.hasCheckedOut
                    ? "Sudah Check-out"
                    : !status.hasCheckedIn
                    ? "Belum Check-in"
                    : !location
                    ? "Menunggu GPS..."
                    : "📷 Check-out & Ambil Foto"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Alasan Check-out di luar jam kerja */}
      {isReasonModalOpen && (
        <CheckoutReasonModal
          isTooEarly={isTooEarly}
          jamPulang={status.jamPulangKantor || "17:00"}
          onClose={() => {
            setIsReasonModalOpen(false);
            setPendingFile(null);
          }}
          onSubmit={(reason: string) => {
            if (pendingFile) {
              executeCheckOut(pendingFile, reason);
            }
          }}
          loading={loading}
        />
      )}
    </div>
  );
}
