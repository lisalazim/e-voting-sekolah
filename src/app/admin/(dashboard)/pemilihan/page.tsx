import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminDashboardData } from "../../../../features/admin/dashboard/queries";
import { ElectionSettingsForm } from "../../../../features/admin/elections/election-settings-form";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export const metadata: Metadata = {
  title: "Pengaturan Pemilihan | E-Voting Sekolah",
  description: "Pengaturan kegiatan pemilihan E-Voting Sekolah.",
};

export default async function AdminElectionSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const data = await getAdminDashboardData(supabase);

  if (!data) {
    redirect("/admin/login");
  }

  if (!data.school) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Data sekolah belum tersedia</h2>
        <p className="mt-2 text-sm leading-6">
          Lengkapi data sekolah sebelum membuat kegiatan pemilihan.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
          Kegiatan Pemilihan
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Pengaturan Pemilihan
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Tentukan nama kegiatan, periode kepengurusan, tipe percobaan, serta
          izin tampilan hasil setelah diumumkan. Kotak suara dikendalikan manual
          dari halaman Kotak Suara.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <ElectionSettingsForm election={data.election} />
      </div>
    </section>
  );
}
