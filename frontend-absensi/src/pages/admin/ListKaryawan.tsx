import { useState, useEffect, useCallback } from "react";
import { isAxiosError } from "axios";
import api from "../../lib/api";
import UserFormModal, { UserData } from "./components/UserFormModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import { useToast } from "../../components/ui/ToastProvider";

type Role = "KARYAWAN" | "HRD" | "ADMIN";

interface User {
  id: number;
  nik: string;
  nama: string;
  email: string;
  role: Role;
  officeId: number | null;
  isActive: boolean;
  office?: { id: number; name: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ListKaryawan() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("");
  const [page, setPage] = useState(1);

  const [currentUserRole] = useState<Role>(() => {
    const str = localStorage.getItem("user");
    if (!str) return "KARYAWAN";
    try {
      return JSON.parse(str).role as Role;
    } catch {
      return "KARYAWAN";
    }
  });

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editData, setEditData] = useState<UserData | undefined>(undefined);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Nilai filter yang benar-benar dipakai untuk request.
  // Kalau user bukan ADMIN, paksa filter "HRD"/"ADMIN" jadi kosong.
  const effectiveFilterRole =
    currentUserRole === "ADMIN" ||
    (filterRole !== "HRD" && filterRole !== "ADMIN")
      ? filterRole
      : "";

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (effectiveFilterRole) params.append("role", effectiveFilterRole);
      params.append("page", String(page));
      params.append("limit", "10");

      const res = await api.get(`/users?${params.toString()}`);
      setUsers(res.data.data.users);
      setPagination(res.data.data.pagination);
    } catch (err) {
      console.error("Gagal load users:", err);
    } finally {
      setLoading(false);
    }
  }, [search, effectiveFilterRole, page]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (effectiveFilterRole) params.append("role", effectiveFilterRole);
        params.append("page", String(page));
        params.append("limit", "10");

        const res = await api.get(`/users?${params.toString()}`);
        if (isMounted) {
          setUsers(res.data.data.users);
          setPagination(res.data.data.pagination);
        }
      } catch (err) {
        console.error("Gagal load users:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [search, effectiveFilterRole, page]);

  const handleCreate = () => {
    setFormMode("create");
    setEditData(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (user: User) => {
    setFormMode("edit");
    setEditData({
      id: user.id,
      nik: user.nik,
      nama: user.nama,
      email: user.email,
      role: user.role,
      officeId: user.officeId,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (user: User) => {
    setDeleteTarget(user);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      toast.success("Berhasil", `${deleteTarget.nama} telah dinonaktifkan.`);
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        toast.error(
          "Gagal Menonaktifkan",
          err.response?.data?.message || "Terjadi kesalahan."
        );
      } else {
        toast.error(
          "Gagal Menonaktifkan",
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
        ? "User baru berhasil dibuat."
        : "User berhasil diperbarui."
    );
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-ink">
            Manajemen Karyawan
          </h2>
          <p className="text-sm text-muted">
            {currentUserRole === "ADMIN"
              ? "Kelola semua akun karyawan & staff"
              : "Kelola akun karyawan"}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-5 py-3 bg-blue text-white font-display font-bold rounded-xl hover:bg-blue-dark transition-all shadow-lg shadow-blue/30 cursor-pointer active:scale-[0.98]"
        >
          + Tambah Karyawan
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface rounded-2xl p-4 shadow-sm border border-line flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="🔍 Cari nama, NIK, atau email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none"
        />
        <select
          value={effectiveFilterRole}
          onChange={(e) => {
            setFilterRole(e.target.value);
            setPage(1);
          }}
          className="px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none"
        >
          <option value="">Semua Role</option>
          <option value="KARYAWAN">Karyawan</option>
          {currentUserRole === "ADMIN" && (
            <>
              <option value="HRD">HRD</option>
              <option value="ADMIN">Admin</option>
            </>
          )}
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted">Memuat data...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-muted">
            Tidak ada karyawan ditemukan.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto max-w-full">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="bg-surface-soft border-b border-line text-muted font-semibold">
                    <th className="py-3 px-4">NIK</th>
                    <th className="py-3 px-4">Nama</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Kantor</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-soft/50">
                      <td className="py-3 px-4 font-mono text-xs">{u.nik}</td>
                      <td className="py-3 px-4 font-medium text-ink">
                        {u.nama}
                      </td>
                      <td className="py-3 px-4 text-muted">{u.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                            u.role === "ADMIN"
                              ? "bg-violet-50 text-violet-600 border-violet-100"
                              : u.role === "HRD"
                              ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted">
                        {u.office?.name || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                            u.isActive
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-surface-soft text-muted"
                          }`}
                        >
                          {u.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(u)}
                          className="px-3 py-1.5 text-xs font-semibold bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 cursor-pointer"
                        >
                          Edit
                        </button>
                        {u.isActive && (
                          <button
                            onClick={() => handleDelete(u)}
                            className="px-3 py-1.5 text-xs font-semibold bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 cursor-pointer"
                          >
                            Nonaktifkan
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-line flex justify-between items-center">
                <p className="text-xs text-muted">
                  Halaman {pagination.page} dari {pagination.totalPages} · Total{" "}
                  {pagination.total} data
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1.5 text-xs bg-surface-soft rounded-lg hover:bg-line disabled:opacity-50 cursor-pointer"
                  >
                    ← Sebelumnya
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(pagination.totalPages, p + 1))
                    }
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1.5 text-xs bg-surface-soft rounded-lg hover:bg-line disabled:opacity-50 cursor-pointer"
                  >
                    Selanjutnya →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <UserFormModal
        key={`${formMode}-${editData?.id ?? "new"}-${isFormOpen}`}
        isOpen={isFormOpen}
        mode={formMode}
        initialData={editData}
        currentUserRole={currentUserRole}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
      />

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        userName={deleteTarget?.nama || ""}
        loading={actionLoading}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
