import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import api from "../lib/api";

interface AttendanceStatus {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
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

  // 5. Handle Check-in
  const handleCheckIn = async () => {
    if (!location) {
      alert(
        "Lokasi GPS belum terdeteksi. Izinkan akses lokasi pada browser Anda."
      );
      return;
    }

    const fileInput = checkInFileRef.current;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      alert("Foto wajib diambil untuk check-in.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("latitude", location.lat.toString());
      formData.append("longitude", location.lng.toString());
      formData.append("metodeMasuk", "GPS");
      formData.append("fotoMasuk", fileInput.files[0]);

      await api.post("/attendances/check-in", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Check-in Berhasil!");
      fileInput.value = ""; // reset input
      fetchTodayStatus();
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        alert(err.response?.data?.message || "Gagal melakukan Check-in.");
      } else {
        alert("Terjadi kesalahan yang tidak diketahui.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 6. Handle Check-out
  const handleCheckOut = async () => {
    if (!location) {
      alert(
        "Lokasi GPS belum terdeteksi. Izinkan akses lokasi pada browser Anda."
      );
      return;
    }

    const fileInput = checkOutFileRef.current;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      alert("Foto wajib diambil untuk check-out.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("latitude", location.lat.toString());
      formData.append("longitude", location.lng.toString());
      formData.append("fotoPulang", fileInput.files[0]);

      await api.post("/attendances/check-out", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Check-out Berhasil!");
      fileInput.value = "";
      fetchTodayStatus();
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-ink border-b border-ink-3 px-6 py-4 shadow-lg">
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
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">
            {currentTime.toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <div className="text-4xl md:text-5xl font-extrabold text-blue-600 tracking-tight my-2">
            {currentTime.toLocaleTimeString("id-ID")}
          </div>
          {location ? (
            <p className="text-xs text-emerald-600 font-medium flex items-center justify-center gap-1 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
              Lokasi Terdeteksi ({location.lat.toFixed(4)},{" "}
              {location.lng.toFixed(4)})
            </p>
          ) : locationError ? (
            <p className="text-xs text-red-500 mt-2">{locationError}</p>
          ) : (
            <p className="text-xs text-gray-400 animate-pulse mt-2">
              Mendapatkan lokasi GPS...
            </p>
          )}
        </div>

        {/* Card: Status Presensi */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-3">
            Presensi Hari Ini
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
              <p className="text-xs font-semibold text-blue-600">
                Jam Check-in
              </p>
              <p className="text-xl font-bold text-gray-800 mt-1">
                {status.checkInTime || "-- : --"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-orange-50/50 border border-orange-100">
              <p className="text-xs font-semibold text-orange-600">
                Jam Check-out
              </p>
              <p className="text-xl font-bold text-gray-800 mt-1">
                {status.checkOutTime || "-- : --"}
              </p>
            </div>
          </div>

          {/* Check-in */}
          <div className="space-y-3 pt-2">
            <label className="block text-sm font-medium text-gray-700">
              1. Ambil Foto Check-in
            </label>
            <input
              ref={checkInFileRef}
              type="file"
              accept="image/*"
              capture="user"
              disabled={status.hasCheckedIn || loading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 disabled:opacity-50"
            />
            <button
              onClick={handleCheckIn}
              disabled={status.hasCheckedIn || loading}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-white shadow-sm transition-all cursor-pointer ${
                status.hasCheckedIn
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 active:scale-98"
              }`}
            >
              {loading
                ? "Memproses..."
                : status.hasCheckedIn
                ? "Sudah Check-in"
                : "Check-in Sekarang"}
            </button>
          </div>

          {/* Check-out */}
          <div className="space-y-3 pt-4 border-t">
            <label className="block text-sm font-medium text-gray-700">
              2. Ambil Foto Check-out
            </label>
            <input
              ref={checkOutFileRef}
              type="file"
              accept="image/*"
              capture="user"
              disabled={!status.hasCheckedIn || status.hasCheckedOut || loading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 disabled:opacity-50"
            />
            <button
              onClick={handleCheckOut}
              disabled={!status.hasCheckedIn || status.hasCheckedOut || loading}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-white shadow-sm transition-all cursor-pointer ${
                !status.hasCheckedIn || status.hasCheckedOut
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-orange-600 hover:bg-orange-700 active:scale-98"
              }`}
            >
              {loading
                ? "Memproses..."
                : status.hasCheckedOut
                ? "Sudah Check-out"
                : "Check-out Sekarang"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
