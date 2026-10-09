import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import DashboardKaryawan from "./pages/DashboardKaryawan";
import RiwayatPresensi from "./pages/RiwayatPresensi";
import DashboardAdmin from "./pages/DashboardAdmin";
import ProtectedRoute from "./components/ProtectedRoute";
import AjukanIzin from "./pages/AjukanIzin";
import RiwayatIzin from "./pages/RiwayatIzin";
import Profil from "./pages/Profil";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* Route Karyawan & HRD — untuk absensi */}
        <Route element={<ProtectedRoute allowedRoles={["KARYAWAN", "HRD"]} />}>
          <Route path="/dashboard" element={<DashboardKaryawan />} />
          <Route path="/riwayat" element={<RiwayatPresensi />} />
          <Route path="/ajukan-izin" element={<AjukanIzin />} />
          <Route path="/riwayat-izin" element={<RiwayatIzin />} />
        </Route>

        {/* Route Admin/HRD — hanya untuk role ADMIN & HRD */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "HRD"]} />}>
          <Route path="/admin" element={<DashboardAdmin />} />
        </Route>

        {/* Route Profile (semua role) */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["KARYAWAN", "HRD", "ADMIN"]} />
          }
        >
          <Route path="/profil" element={<Profil />} />
        </Route>

        {/* Catch-all: redirect ke login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
