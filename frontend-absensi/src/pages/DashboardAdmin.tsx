import { useNavigate } from "react-router-dom";

export default function DashboardAdmin() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Dashboard Admin</h1>
          <p className="text-xs text-gray-500">Panel Manajemen Presensi</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm bg-red-50 font-medium text-red-600 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
        >
          Keluar
        </button>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Rekap Presensi Karyawan Hari Ini
          </h2>
          <p className="text-gray-500 text-sm">
            Data tabel admin akan segera diintegrasikan...
          </p>
        </div>
      </main>
    </div>
  );
}
