import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminDashboardData } from "../../../../features/admin/dashboard/queries";
import { SchoolSettingsForm } from "../../../../features/admin/settings/school-settings-form";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export const metadata: Metadata = {
  title: "Pengaturan Sekolah | E-Voting Sekolah",
  description: "Pengaturan identitas sekolah dan admin E-Voting Sekolah.",
};

export default async function AdminSettingsPage() {
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
          Hubungkan profil admin dengan sekolah terlebih dahulu melalui Supabase.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
          Identitas Sekolah
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Pengaturan Sekolah
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Atur identitas dasar sekolah dan nama admin yang tampil di area
          pengelolaan.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SchoolSettingsForm
          adminName={data.admin.profile.full_name}
          schoolName={data.school.name}
          schoolSlug={data.school.slug}
          timezone={data.school.timezone}
        />
      </div>
    </section>
  );
}
