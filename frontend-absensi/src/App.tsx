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

        {/* Route Karyawan — hanya untuk role KARYAWAN */}
        <Route element={<ProtectedRoute allowedRoles={["KARYAWAN"]} />}>
          <Route path="/dashboard" element={<DashboardKaryawan />} />
          <Route path="/riwayat" element={<RiwayatPresensi />} />
        </Route>

        {/* Route Admin/HRD — hanya untuk role ADMIN & HRD */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "HRD"]} />}>
          <Route path="/admin" element={<DashboardAdmin />} />
        </Route>

        {/* Catch-all: redirect ke login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
