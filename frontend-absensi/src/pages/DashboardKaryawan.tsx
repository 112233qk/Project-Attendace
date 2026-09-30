import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import api from "../lib/api";

interface AttendanceStatus {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  checkInTime?: string;
  checkOutTime?: string;
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
  });

  // 1. Update Jam Real-time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Ambil Lokasi GPS User
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

  // 3. Fetch Status Presensi Hari Ini
  const fetchTodayStatus = useCallback(async () => {
    try {
      const response = await api.get("/attendance/today");
      setStatus(response.data);
    } catch (err) {
      console.error("Gagal mengambil status presensi:", err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const response = await api.get("/attendance/today");
        if (isMounted) {
          setStatus(response.data);
        }
      } catch (err) {
        console.error("Gagal mengambil status presensi:", err);
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // 4. Handle Check-in
  const handleCheckIn = async () => {
    if (!location) {
      alert(
        "Lokasi GPS belum terdeteksi. Izinkan akses lokasi pada browser Anda."
      );
      return;
    }

    setLoading(true);
    try {
      await api.post("/attendance/check-in", {
        latitude: location.lat,
        longitude: location.lng,
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
      setLoading(false);
    }
  };

  // 5. Handle Check-out
  const handleCheckOut = async () => {
    if (!location) {
      alert(
        "Lokasi GPS belum terdeteksi. Izinkan akses lokasi pada browser Anda."
      );
      return;
    }

    setLoading(true);
    try {
      await api.post("/attendance/check-out", {
        latitude: location.lat,
        longitude: location.lng,
      });
      alert("Check-out Berhasil!");
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

  // 6. Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            Dashboard Karyawan
          </h1>
          <p className="text-xs text-gray-500">Sistem Presensi Kehadiran</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm bg-red-50 font-medium text-red-600 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
        >
          Keluar
        </button>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
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
                {status.checkInTime ? status.checkInTime : "-- : --"}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-orange-50/50 border border-orange-100">
              <p className="text-xs font-semibold text-orange-600">
                Jam Check-out
              </p>
              <p className="text-xl font-bold text-gray-800 mt-1">
                {status.checkOutTime ? status.checkOutTime : "-- : --"}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button
              onClick={handleCheckIn}
              disabled={status.hasCheckedIn || loading}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-white shadow-sm transition-all cursor-pointer ${
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

            <button
              onClick={handleCheckOut}
              disabled={!status.hasCheckedIn || status.hasCheckedOut || loading}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-white shadow-sm transition-all cursor-pointer ${
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
