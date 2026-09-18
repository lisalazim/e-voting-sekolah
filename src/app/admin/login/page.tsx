import type { Metadata } from "next";

import { AdminLoginForm } from "../../../features/admin/auth/admin-login-form";

export const metadata: Metadata = {
  title: "Login Admin | E-Voting Sekolah",
  description: "Masuk ke area admin E-Voting Sekolah.",
  robots: {
    follow: false,
    index: false,
  },
};

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <section className="w-full rounded-lg border border-slate-200 bg-white px-5 py-8 shadow-sm sm:px-8">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
            Admin Sekolah
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
            Masuk Dashboard
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Gunakan akun admin yang sudah dibuat melalui Supabase Auth. Aplikasi
            ini tidak menyediakan pendaftaran akun publik.
          </p>
          <AdminLoginForm />
        </section>
      </div>
    </main>
  );
}
