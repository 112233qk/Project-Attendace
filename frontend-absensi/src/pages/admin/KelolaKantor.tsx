import { useState, useEffect, useCallback } from "react";
import { isAxiosError } from "axios";
import api from "../../lib/api";
import OfficeFormModal, { OfficeData } from "./components/OfficeFormModal";
import { useToast } from "../../components/ui/ToastProvider";

type Role = "KARYAWAN" | "HRD" | "ADMIN";

interface Office {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  jamMasuk: string;
  jamPulang: string;
  createdAt: string;
  updatedAt: string;
  _count?: { users: number };
}

export default function KelolaKantor() {
  const toast = useToast();
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentUserRole] = useState<Role>(() => {
    const str = localStorage.getItem("user");
    if (!str) return "KARYAWAN";
    try {
      return JSON.parse(str).role as Role;
    } catch {
      return "KARYAWAN";
    }
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editData, setEditData] = useState<OfficeData | undefined>(undefined);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Office | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOffices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/offices");
      setOffices(res.data.data);
    } catch (err) {
      console.error("Gagal load kantor:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/offices");
        if (isMounted) setOffices(res.data.data);
      } catch (err) {
        console.error("Gagal load kantor:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreate = () => {
    setFormMode("create");
    setEditData(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (office: Office) => {
    setFormMode("edit");
    setEditData({
      id: office.id,
      name: office.name,
      latitude: office.latitude,
      longitude: office.longitude,
      radius: office.radius,
      jamMasuk: office.jamMasuk,
      jamPulang: office.jamPulang,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (office: Office) => {
    setDeleteTarget(office);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await api.delete(`/offices/${deleteTarget.id}`);
      toast.success("Berhasil", `Kantor ${deleteTarget.name} telah dihapus.`);
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      fetchOffices();
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        toast.error(
          "Gagal Menghapus",
          err.response?.data?.message || "Terjadi kesalahan."
        );
      } else {
        toast.error(
          "Gagal Menghapus",
          "Terjadi kesalahan yang tidak diketahui."
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    toast.success(
      "Berhasil",
      formMode === "create"
        ? "Kantor baru berhasil dibuat."
        : "Kantor berhasil diperbarui."
    );
    fetchOffices();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-ink">
            Kelola Kantor
          </h2>
          <p className="text-sm text-muted">
            Kelola lokasi kantor, radius aman, dan jam kerja
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-5 py-3 bg-blue text-white font-display font-bold rounded-xl hover:bg-blue-dark transition-all shadow-lg shadow-blue/30 cursor-pointer active:scale-[0.98]"
        >
          + Tambah Kantor
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted">Memuat data...</div>
        ) : offices.length === 0 ? (
          <div className="p-8 text-center text-muted">
            Belum ada kantor terdaftar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-surface-soft border-b border-line text-muted font-semibold">
                  <th className="py-3 px-4">Nama Kantor</th>
                  <th className="py-3 px-4">Koordinat</th>
                  <th className="py-3 px-4">Radius</th>
                  <th className="py-3 px-4">Jam Kerja</th>
                  <th className="py-3 px-4">Karyawan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {offices.map((o) => (
                  <tr key={o.id} className="hover:bg-surface-soft/50">
                    <td className="py-3 px-4 font-medium text-ink">{o.name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-muted">
                      {o.latitude.toFixed(4)}, {o.longitude.toFixed(4)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 text-xs font-semibold bg-surface-blue text-blue rounded-full">
                        {o.radius} m
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted">
                      {o.jamMasuk} — {o.jamPulang}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-ink font-semibold">
                        {o._count?.users ?? 0}
                      </span>
                      <span className="text-muted text-xs ml-1">orang</span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(o)}
                        className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 cursor-pointer"
                      >
                        Edit
                      </button>
                      {currentUserRole === "ADMIN" && (
                        <button
                          onClick={() => handleDelete(o)}
                          className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 cursor-pointer"
                        >
                          Hapus
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <OfficeFormModal
        key={`${formMode}-${editData?.id ?? "new"}-${isFormOpen}`}
        isOpen={isFormOpen}
        mode={formMode}
        initialData={editData}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirm Modal */}
      {isDeleteOpen && deleteTarget && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
              <span className="text-2xl">⚠️</span>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-display font-bold text-ink">
                Hapus Kantor?
              </h3>
              <p className="text-sm text-muted">
                Kantor <strong className="text-ink">{deleteTarget.name}</strong>{" "}
                akan dihapus permanen.
              </p>
              {(deleteTarget._count?.users ?? 0) > 0 && (
                <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-600 text-left">
                  ⚠️ Kantor ini masih memiliki{" "}
                  <strong>{deleteTarget._count?.users} karyawan</strong>{" "}
                  terkait. Pindahkan mereka terlebih dahulu.
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteOpen(false)}
                disabled={actionLoading}
                className="flex-1 py-3 bg-surface-soft text-ink-3 font-semibold rounded-xl hover:bg-line transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={actionLoading}
                className="flex-1 py-3 bg-red-500 text-white font-display font-bold rounded-xl hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
