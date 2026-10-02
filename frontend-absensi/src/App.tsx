import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import DashboardKaryawan from "./pages/DashboardKaryawan";
import RiwayatPresensi from "./pages/RiwayatPresensi";
import DashboardAdmin from "./pages/DashboardAdmin";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* Route Terproteksi (Harus Login) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardKaryawan />} />
          <Route path="/riwayat" element={<RiwayatPresensi />} />
          <Route path="/admin" element={<DashboardAdmin />} />{" "}
          {/* Tambahkan ini */}
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
