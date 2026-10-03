import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import RekapHariIni from "./admin/RekapHariIni";
import ListKaryawan from "./admin/ListKaryawan";
import ApprovalIzin from "./admin/ApprovalIzin";

type TabType = "rekap" | "karyawan" | "izin";

interface User {
  id: number;
  nama: string;
  role: string;
}

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("rekap");
  const [user] = useState<User | null>(() => {
    const str = localStorage.getItem("user");
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  });

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // abaikan
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "rekap", label: "Rekap Hari Ini", icon: "📊" },
    { key: "karyawan", label: "Karyawan", icon: "👥" },
    { key: "izin", label: "Approval Izin", icon: "📝" },
  ];

  return (
    <div className="min-h-screen bg-surface-soft flex flex-col">
      {/* Header — Tema Gelap Aridev */}
      <header className="bg-ink border-b border-ink-3 px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue rounded-xl flex items-center justify-center shadow-lg shadow-blue/30">
              <span className="text-white text-lg font-bold">A</span>
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-white">
                Dashboard Admin
              </h1>
              <p className="text-xs text-blue-2">
                {user ? `${user.nama} (${user.role})` : "Panel Manajemen"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm bg-red-500/20 font-medium text-red-300 hover:bg-red-500/30 rounded-xl transition-colors cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-surface border-b border-line px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? "border-blue text-blue"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {activeTab === "rekap" && <RekapHariIni />}
        {activeTab === "karyawan" && <ListKaryawan />}
        {activeTab === "izin" && <ApprovalIzin />}
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-line px-6 py-4">
        <p className="text-center text-xs text-muted">
          © 2026 PT Aridev Studio Creative
        </p>
      </footer>
    </div>
  );
}
