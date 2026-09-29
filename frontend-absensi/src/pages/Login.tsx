import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

// Interface berdasarkan API_CONTRACT.md[cite: 1]
interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: number;
      nik: string;
      nama: string;
      email: string;
      role: string;
      officeId: number;
    };
  };
}

export default function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const response = await api.post<LoginResponse>("/api/auth/login", data); //[cite: 1]

      if (response.data.success) {
        //[cite: 1]
        // Simpan token dan info user[cite: 1]
        localStorage.setItem("token", response.data.data.token); //[cite: 1]
        localStorage.setItem("user", JSON.stringify(response.data.data.user)); //[cite: 1]

        // Redirect berdasarkan role
        const role = response.data.data.user.role; //[cite: 1]
        if (role === "KARYAWAN") navigate("/dashboard"); //[cite: 1]
        else if (role === "HRD") navigate("/hrd"); //[cite: 1]
        else if (role === "ADMIN") navigate("/admin"); //[cite: 1]
      }
    } catch (err: any) {
      // Handle error berdasarkan format API: { success: false, message: "..." }[cite: 1]
      setErrorMsg(
        err.response?.data?.message || "Terjadi kesalahan pada server"
      ); //[cite: 1]
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-2xl border border-slate-800">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Login Portal
          </h1>
          <p className="text-slate-400">Sistem Absensi Karyawan</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <input
              type="email"
              placeholder="Ketik email Anda"
              {...register("email", { required: "Email wajib diisi" })}
              className="w-full px-4 py-3 bg-background border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-white placeholder-slate-500"
            />
            {errors.email && (
              <span className="text-red-400 text-xs mt-1 block">
                {errors.email.message as string}
              </span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              placeholder="Ketik password Anda"
              {...register("password", { required: "Password wajib diisi" })}
              className="w-full px-4 py-3 bg-background border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-white placeholder-slate-500"
            />
            {errors.password && (
              <span className="text-red-400 text-xs mt-1 block">
                {errors.password.message as string}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-primary hover:bg-primaryHover text-white font-semibold rounded-lg shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {isLoading ? (
              <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></span>
            ) : (
              "Masuk"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Gunakan kredensial testing: admin@test.com / admin123
        </div>
      </div>
    </div>
  );
}
