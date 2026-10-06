import { useState, useEffect, useCallback } from "react";
import api from "../../lib/api";
import RejectModal from "./components/RejectModal";
import ApproveConfirmModal from "./components/ApproveConfirmModal";
import FilePreviewModal from "./components/FilePreviewModal";

interface Permission {
  id: number;
  userId: number;
  jenis: "IZIN" | "SAKIT" | "CUTI";
  tanggalMulai: string;
  tanggalSelesai: string;
  alasan: string;
  buktiFile: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  approvedBy: number | null;
  createdAt: string;
  user: {
    id: number;
    nama: string;
    nik: string;
    email: string;
  };
  approver?: {
    id: number;
    nama: string;
    role: string;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
};

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace("/api", "") ||
  "https://project-attendace-production.up.railway.app";

export default function ApprovalIzin() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("PENDING");
  const [filterJenis, setFilterJenis] = useState<string>("");
  const [page, setPage] = useState(1);

  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Permission | null>(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<Permission | null>(null);

  const [detailTarget, setDetailTarget] = useState<Permission | null>(null);
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      if (filterJenis) params.append("jenis", filterJenis);
      params.append("page", String(page));
      params.append("limit", "10");

      const res = await api.get(`/permissions?${params.toString()}`);
      setPermissions(res.data.data.permissions);
      setPagination(res.data.data.pagination);
    } catch (err) {
      console.error("Gagal load permissions:", err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterJenis, page]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filterStatus) params.append("status", filterStatus);
        if (filterJenis) params.append("jenis", filterJenis);
        params.append("page", String(page));
        params.append("limit", "10");

        const res = await api.get(`/permissions?${params.toString()}`);
        if (isMounted) {
          setPermissions(res.data.data.permissions);
          setPagination(res.data.data.pagination);
        }
      } catch (err) {
        console.error("Gagal load permissions:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [filterStatus, filterJenis, page]);

  const handleApproveClick = (p: Permission) => {
    setApproveTarget(p);
    setIsApproveOpen(true);
  };

  const handleApproveSuccess = () => {
    setIsApproveOpen(false);
    setApproveTarget(null);
    fetchPermissions();
  };

  const handleRejectClick = (p: Permission) => {
    setRejectTarget(p);
    setIsRejectOpen(true);
  };

  const handleRejectSuccess = () => {
    setIsRejectOpen(false);
    setRejectTarget(null);
    fetchPermissions();
  };

  const getJenisBadge = (jenis: string) => {
    const colors: Record<string, string> = {
      IZIN: "bg-blue-50 text-blue-600 border-blue-100",
      SAKIT: "bg-red-50 text-red-600 border-red-100",
      CUTI: "bg-violet-50 text-violet-600 border-violet-100",
    };
    return colors[jenis] || "bg-gray-50 text-gray-600 border-gray-100";
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-50 text-yellow-600 border-yellow-100",
      APPROVED: "bg-emerald-50 text-emerald-600 border-emerald-100",
      REJECTED: "bg-red-50 text-red-600 border-red-100",
    };
    return colors[status] || "bg-gray-50 text-gray-600 border-gray-100";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-display font-bold text-ink">
          Approval Izin & Cuti
        </h2>
        <p className="text-sm text-muted">
          Setujui atau tolak pengajuan izin karyawan
        </p>
      </div>

      {/* Filter */}
      <div className="bg-surface rounded-2xl p-4 shadow-sm border border-line flex flex-col md:flex-row gap-3">
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          className="px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none"
        >
          <option value="">Semua Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Disetujui</option>
          <option value="REJECTED">Ditolak</option>
        </select>
        <select
          value={filterJenis}
          onChange={(e) => {
            setFilterJenis(e.target.value);
            setPage(1);
          }}
          className="px-4 py-3 bg-surface-soft border border-line rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none"
        >
          <option value="">Semua Jenis</option>
          <option value="IZIN">Izin</option>
          <option value="SAKIT">Sakit</option>
          <option value="CUTI">Cuti</option>
        </select>
        <button
          onClick={fetchPermissions}
          className="px-4 py-3 bg-surface-blue text-blue font-semibold rounded-xl hover:bg-blue-2/20 cursor-pointer transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted">Memuat data...</div>
        ) : permissions.length === 0 ? (
          <div className="p-8 text-center text-muted">
            Tidak ada pengajuan ditemukan.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-surface-soft border-b border-line text-muted font-semibold">
                    <th className="py-3 px-4">Karyawan</th>
                    <th className="py-3 px-4">Jenis</th>
                    <th className="py-3 px-4">Periode</th>
                    <th className="py-3 px-4">Alasan</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {permissions.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-soft/50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-ink">{p.user.nama}</p>
                        <p className="text-xs text-muted font-mono">
                          {p.user.nik}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getJenisBadge(
                            p.jenis
                          )}`}
                        >
                          {p.jenis}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted">
                        {formatDate(p.tanggalMulai)} —{" "}
                        {formatDate(p.tanggalSelesai)}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-ink truncate" title={p.alasan}>
                          {p.alasan}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(
                            p.status
                          )}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => setDetailTarget(p)}
                          className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer"
                        >
                          Detail
                        </button>
                        {p.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleApproveClick(p)}
                              className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 cursor-pointer"
                            >
                              ✓ Setujui
                            </button>
                            <button
                              onClick={() => handleRejectClick(p)}
                              className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 cursor-pointer"
                            >
                              ✗ Tolak
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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

      {/* Reject Modal */}
      <RejectModal
        isOpen={isRejectOpen}
        permissionId={rejectTarget?.id ?? null}
        employeeName={rejectTarget?.user.nama ?? ""}
        onClose={() => setIsRejectOpen(false)}
        onSuccess={handleRejectSuccess}
      />

      <ApproveConfirmModal
        isOpen={isApproveOpen}
        permissionId={approveTarget?.id ?? null}
        employeeName={approveTarget?.user.nama ?? ""}
        jenis={approveTarget?.jenis}
        tanggalMulai={approveTarget?.tanggalMulai}
        tanggalSelesai={approveTarget?.tanggalSelesai}
        onClose={() => setIsApproveOpen(false)}
        onSuccess={handleApproveSuccess}
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={!!previewFile}
        fileUrl={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {/* Detail Modal */}
      {detailTarget && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-line flex justify-between items-center">
              <h3 className="text-lg font-display font-bold text-ink">
                Detail Pengajuan
              </h3>
              <button
                onClick={() => setDetailTarget(null)}
                className="text-muted hover:text-ink text-4xl leading-none cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted mb-1">Nama</p>
                  <p className="font-medium text-ink">
                    {detailTarget.user.nama}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">NIK</p>
                  <p className="font-mono text-ink">{detailTarget.user.nik}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Jenis</p>
                  <span
                    className={`px-2.5 py-1 text-xs font-semibold rounded-full border inline-block ${getJenisBadge(
                      detailTarget.jenis
                    )}`}
                  >
                    {detailTarget.jenis}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Status</p>
                  <span
                    className={`px-2.5 py-1 text-xs font-semibold rounded-full border inline-block ${getStatusBadge(
                      detailTarget.status
                    )}`}
                  >
                    {detailTarget.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Tanggal Mulai</p>
                  <p className="text-ink">
                    {formatDate(detailTarget.tanggalMulai)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Tanggal Selesai</p>
                  <p className="text-ink">
                    {formatDate(detailTarget.tanggalSelesai)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted mb-1">Alasan</p>
                <p className="text-ink bg-surface-soft p-3 rounded-xl">
                  {detailTarget.alasan}
                </p>
              </div>

              {detailTarget.buktiFile && (
                <div>
                  <p className="text-xs text-muted mb-2">Bukti File</p>
                  <button
                    onClick={() =>
                      setPreviewFile(`${BASE_URL}${detailTarget.buktiFile}`)
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 bg-surface-blue text-blue rounded-xl hover:bg-blue-2/20 font-semibold text-xs cursor-pointer"
                  >
                    📎 Lihat Bukti
                  </button>
                </div>
              )}

              {detailTarget.status === "REJECTED" &&
                detailTarget.rejectionReason && (
                  <div>
                    <p className="text-xs text-muted mb-1">Alasan Penolakan</p>
                    <p className="text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
                      {detailTarget.rejectionReason}
                    </p>
                  </div>
                )}

              {detailTarget.approver && (
                <div>
                  <p className="text-xs text-muted mb-1">
                    {detailTarget.status === "APPROVED"
                      ? "Disetujui oleh"
                      : "Ditolak oleh"}
                  </p>
                  <p className="text-ink">
                    {detailTarget.approver.nama} ({detailTarget.approver.role})
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
