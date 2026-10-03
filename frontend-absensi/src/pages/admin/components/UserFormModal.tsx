import { useState, useEffect } from "react";
import { isAxiosError } from "axios";
import api from "../../../lib/api";

type Role = "KARYAWAN" | "HRD" | "ADMIN";

export interface UserData {
  id?: number;
  nik?: string;
  nama: string;
  email: string;
  password?: string;
  role: Role;
  officeId: number | null;
  isActive?: boolean;
}

interface Props {
  isOpen: boolean;
  mode: "create" | "edit";
  initialData?: UserData;
  currentUserRole: Role;
  onClose: () => void;
  onSuccess: () => void;
}

interface Office {
  id: number;
  name: string;
}

export default function UserFormModal({
  isOpen,
  mode,
  initialData,
  currentUserRole,
  onClose,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);

  // ✅ Form state pakai lazy init
  const [form, setForm] = useState<UserData>(() => {
    if (mode === "edit" && initialData) {
      return {
        id: initialData.id,
        nik: initialData.nik || "",
        nama: initialData.nama,
        email: initialData.email,
        password: "",
        role: initialData.role,
        officeId: initialData.officeId,
      };
    }
    return {
      nik: "",
      nama: "",
      email: "",
      password: "",
      role: "KARYAWAN",
      officeId: null,
    };
  });

  // Load offices — inline async
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const load = async () => {
      try {
        const res = await api.get("/offices");
        if (isMounted) setOffices(res.data.data);
      } catch (err) {
        console.error("Gagal load kantor:", err);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const availableRoles: Role[] =
    currentUserRole === "ADMIN" ? ["KARYAWAN", "HRD", "ADMIN"] : ["KARYAWAN"];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "create") {
        // Validasi password wajib
        if (!form.password) {
          setError("Password wajib diisi untuk user baru.");
          setLoading(false);
          return;
        }

        const payload: Record<string, unknown> = {
          nama: form.nama,
          email: form.email,
          password: form.password,
          role: form.role,
          officeId: form.officeId,
        };
        // Kirim NIK hanya jika diisi manual
        if (form.nik && form.nik.trim() !== "") {
          payload.nik = form.nik.trim();
        }
        await api.post("/users", payload);
      } else {
        // Mode edit
        const payload: Record<string, unknown> = {
          nama: form.nama,
          email: form.email,
          role: form.role,
          officeId: form.officeId,
        };
        if (form.password && form.password.trim() !== "") {
          payload.password = form.password;
        }
        await api.put(`/users/${form.id}`, payload);
      }
      onSuccess();
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Gagal menyimpan data.");
      } else {
        setError("Terjadi kesalahan yang tidak diketahui.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-line flex justify-between items-center">
          <h3 className="text-lg font-display font-bold text-ink">
            {mode === "create" ? "Tambah Karyawan" : "Edit Karyawan"}
          </h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-ink text-2xl leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-ink-3 mb-2">
              NIK{" "}
              {mode === "create" ? (
                <span className="text-xs font-normal text-muted">
                  (kosongkan untuk auto-generate)
                </span>
              ) : (
                <span className="text-red-500">*</span>
              )}
            </label>
            <input
              type="text"
              required={mode === "edit"}
              readOnly={mode === "edit"}
              value={form.nik || ""}
              onChange={(e) => {
                if (mode === "edit") return; // readOnly — tidak bisa diubah
                setForm({ ...form, nik: e.target.value });
              }}
              className={`w-full px-4 py-3 border border-line rounded-xl outline-none ${
                mode === "edit"
                  ? "bg-line/30 text-muted cursor-not-allowed"
                  : "bg-surface-soft focus:ring-2 focus:ring-blue focus:border-blue"
              }`}
              placeholder={
                mode === "create" ? "Auto-generate (contoh: KRY-2026-0001)" : ""
              }
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink-3 mb-2">
              Nama Lengkap *
            </label>
            <input
              type="text"
              required
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none"
              placeholder="Budi Karyawan"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink-3 mb-2">
              Email *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none"
              placeholder="budi@aridevstudio.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink-3 mb-2">
              Password{" "}
              {mode === "create" ? "*" : "(kosongkan jika tidak diubah)"}
            </label>
            <input
              type="password"
              required={mode === "create"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none"
              placeholder="••••••••"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-3 mb-2">
                Role *
              </label>
              <select
                required
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as Role })
                }
                disabled={availableRoles.length === 1}
                className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none disabled:opacity-60"
              >
                {availableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink-3 mb-2">
                Kantor
              </label>
              <select
                value={form.officeId ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    officeId: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none"
              >
                <option value="">- Pilih Kantor -</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
