import { useState, useEffect } from "react";
import { isAxiosError } from "axios";
import api from "../../../lib/api";

export interface OfficeData {
  id?: number;
  name: string;
  latitude: number | null;
  longitude: number | null;
  radius: number | null;
  jamMasuk: string;
  jamPulang: string;
}

interface Props {
  isOpen: boolean;
  mode: "create" | "edit";
  initialData?: OfficeData;
  onClose: () => void;
  onSuccess: () => void;
}

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const GOOGLE_MAPS_URL = "https://www.google.com/maps";

// Deteksi mobile: viewport kecil
const isMobileViewport = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
};

export default function OfficeFormModal({
  isOpen,
  mode,
  initialData,
  onClose,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteValue, setPasteValue] = useState("");
  const [isMobile, setIsMobile] = useState(() => isMobileViewport());

  // Form state — lazy init (di-reset via key prop)
  const [form, setForm] = useState<OfficeData>(() => {
    if (mode === "edit" && initialData) {
      return { ...initialData };
    }
    return {
      name: "",
      latitude: null,
      longitude: null,
      radius: null,
      jamMasuk: "08:00",
      jamPulang: "17:00",
    };
  });

  // Subscribe resize event untuk update isMobile
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      setIsMobile(isMobileViewport());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  if (!isOpen) return null;

  // Parse string koordinat jadi { lat, lng }
  // Support format:
  //   "-6.2088, 106.8456"
  //   "-6.2088,106.8456"
  //   "Lat: -6.2088, Long: 106.8456"
  //   "(-6.2088, 106.8456)"
  const parseCoordinates = (
    input: string
  ): { lat: number; lng: number } | null => {
    // Extract semua angka (dengan optional minus dan desimal)
    const matches = input.match(/-?\d+\.?\d*/g);
    if (!matches || matches.length < 2) return null;

    const lat = parseFloat(matches[0]);
    const lng = parseFloat(matches[1]);

    // Validasi range
    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat < -90 || lat > 90) return null;
    if (lng < -180 || lng > 180) return null;

    return { lat, lng };
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    setPasteValue(pastedText);

    const parsed = parseCoordinates(pastedText);
    if (parsed) {
      setForm((f) => ({
        ...f,
        latitude: parsed.lat,
        longitude: parsed.lng,
      }));
      setError(null);
    } else {
      setError("Format koordinat tidak dikenali. Contoh: -6.2088, 106.8456");
    }
  };

  // Handle input manual di kolom paste (fallback jika user ketik bukan paste)
  const handlePasteInputChange = (value: string) => {
    setPasteValue(value);
    if (!value.trim()) return;

    const parsed = parseCoordinates(value);
    if (parsed) {
      setForm((f) => ({
        ...f,
        latitude: parsed.lat,
        longitude: parsed.lng,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validasi
    if (!form.name || form.name.trim().length < 3) {
      setError("Nama kantor minimal 3 karakter.");
      return;
    }
    if (form.latitude === null || form.latitude < -90 || form.latitude > 90) {
      setError("Latitude harus antara -90 dan 90.");
      return;
    }
    if (
      form.longitude === null ||
      form.longitude < -180 ||
      form.longitude > 180
    ) {
      setError("Longitude harus antara -180 dan 180.");
      return;
    }
    if (form.radius === null || form.radius <= 0) {
      setError("Radius harus angka positif (meter).");
      return;
    }
    if (!TIME_REGEX.test(form.jamMasuk)) {
      setError("Format jam masuk tidak valid. Gunakan HH:mm.");
      return;
    }
    if (!TIME_REGEX.test(form.jamPulang)) {
      setError("Format jam pulang tidak valid. Gunakan HH:mm.");
      return;
    }
    if (form.jamMasuk >= form.jamPulang) {
      setError("Jam masuk harus lebih awal dari jam pulang.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
        radius: form.radius,
        jamMasuk: form.jamMasuk,
        jamPulang: form.jamPulang,
      };

      if (mode === "create") {
        await api.post("/offices", payload);
      } else {
        await api.put(`/offices/${form.id}`, payload);
      }
      onSuccess();
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Gagal menyimpan kantor.");
      } else {
        setError("Terjadi kesalahan.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-line flex justify-between items-center sticky top-0 bg-surface z-10">
          <h3 className="text-lg font-display font-bold text-ink">
            {mode === "create" ? "Tambah Kantor" : "Edit Kantor"}
          </h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-ink text-3xl leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Peringatan Mobile */}
          {isMobile && (
            <div className="p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-xl space-y-2">
              <div className="flex gap-3 items-start">
                <span className="text-xl shrink-0">📱</span>
                <div className="text-xs text-yellow-200 space-y-1">
                  <p className="font-bold">Form ini lebih nyaman di Desktop</p>
                  <p>
                    Mengambil koordinat di HP lebih sulit. Disarankan buka
                    halaman ini dari desktop/laptop untuk pengalaman terbaik.
                  </p>
                  <p className="text-yellow-300">
                    Jika tetap ingin lanjut dari HP: buka aplikasi Google Maps,
                    long-press titik lokasi, share link ke diri sendiri, lalu
                    buka link di desktop untuk copy koordinatnya.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 text-sm text-red-300 bg-red-500/20 rounded-xl border border-red-500/30">
              {error}
            </div>
          )}

          {/* Nama Kantor */}
          <div>
            <label className="block text-sm font-semibold text-ink-3 mb-2">
              Nama Kantor *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none"
              placeholder="Kantor Pusat"
            />
          </div>

          {/* Hint Cara Dapat Koordinat */}
          <div className="p-4 bg-surface-blue rounded-xl space-y-3 border border-blue-500/30">
            <div className="flex items-center gap-2">
              <span className="text-lg">📍</span>
              <p className="text-sm font-bold text-blue-200">
                Cara Mendapatkan Koordinat
              </p>
            </div>
            <ol className="text-xs text-blue-200 space-y-1 list-decimal list-inside pl-1">
              <li>Buka Google Maps (klik tombol di bawah)</li>
              <li>Cari lokasi/alamat kantor</li>
              <li>
                <strong>Klik kanan</strong> pada titik lokasi di peta
              </li>
              <li>Angka koordinat akan muncul (contoh: -6.2088, 106.8456)</li>
              <li>Klik angka tersebut untuk copy</li>
              <li>
                Paste di kolom <strong>"Paste Koordinat"</strong> di bawah
              </li>
            </ol>
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue text-white rounded-xl hover:bg-blue-dark font-semibold text-xs transition-colors"
            >
              🔗 Buka Google Maps
            </a>
          </div>

          {/* Paste Koordinat */}
          <div>
            <label className="block text-sm font-semibold text-ink-3 mb-2">
              Paste Koordinat{" "}
              <span className="text-xs font-normal text-muted">
                (auto-pisah latitude & longitude)
              </span>
            </label>
            <input
              type="text"
              value={pasteValue}
              onPaste={handlePaste}
              onChange={(e) => handlePasteInputChange(e.target.value)}
              className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none font-mono text-sm"
              placeholder="Contoh: -6.2088, 106.8456"
            />
            <p className="text-xs text-muted mt-1">
              💡 Copy koordinat dari Google Maps, lalu paste di sini. Latitude &
              longitude akan terisi otomatis.
            </p>
          </div>

          {/* Koordinat Manual */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-3 mb-2">
                Latitude *
              </label>
              <input
                type="number"
                step="any"
                required
                value={form.latitude ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    latitude: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none font-mono text-sm"
                placeholder="-6.2088"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-3 mb-2">
                Longitude *
              </label>
              <input
                type="number"
                step="any"
                required
                value={form.longitude ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    longitude: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none font-mono text-sm"
                placeholder="106.8456"
              />
            </div>
          </div>

          {/* Radius */}
          <div>
            <label className="block text-sm font-semibold text-ink-3 mb-2">
              Radius Aman (meter) *
            </label>
            <input
              type="number"
              step="any"
              required
              min="1"
              value={form.radius ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  radius: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none"
              placeholder="50"
            />
          </div>

          {/* Jam Kerja */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-3 mb-2">
                Jam Masuk *
              </label>
              <input
                type="time"
                required
                value={form.jamMasuk}
                onChange={(e) => setForm({ ...form, jamMasuk: e.target.value })}
                className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-3 mb-2">
                Jam Pulang *
              </label>
              <input
                type="time"
                required
                value={form.jamPulang}
                onChange={(e) =>
                  setForm({ ...form, jamPulang: e.target.value })
                }
                className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-surface-soft text-ink-3 font-semibold rounded-xl hover:bg-line transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-blue text-white font-display font-bold rounded-xl hover:bg-blue-dark transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
