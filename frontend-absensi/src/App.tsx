import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import DashboardKaryawan from "./pages/DashboardKaryawan";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect dari root / ke /login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Route Login */}
        <Route path="/login" element={<Login />} />

        {/* Route Dashboard Karyawan */}
        <Route path="/dashboard" element={<DashboardKaryawan />} />

        {/* Catch-all route jika URL tidak ditemukan */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
