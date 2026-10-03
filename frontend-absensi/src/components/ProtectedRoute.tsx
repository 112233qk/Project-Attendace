import { Navigate, Outlet } from "react-router-dom";

type Role = "KARYAWAN" | "HRD" | "ADMIN";

interface User {
  id: number;
  nama: string;
  email: string;
  role: Role;
  officeId: number | null;
}

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");

  // 1. Belum login → redirect ke /login
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  // 2. Parse user (safety — kalau corrupt, logout)
  let user: User;
  try {
    user = JSON.parse(userStr);
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  // 3. Cek role (jika allowedRoles diset)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // User login tapi tidak punya akses → redirect ke dashboard sesuai role
    if (user.role === "ADMIN" || user.role === "HRD") {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // 4. Semua OK → render halaman
  return <Outlet />;
}
