import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminShell } from "../../../components/layout/admin-shell";
import { getCurrentAdmin } from "../../../features/admin/auth/queries";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
};

export default async function AdminDashboardLayout({
  children,
}: LayoutProps<"/admin">) {
  const supabase = await createSupabaseServerClient();
  const adminSession = await getCurrentAdmin(supabase);

  if (!adminSession) {
    redirect("/admin/login");
  }

  return (
    <AdminShell adminName={adminSession.profile.full_name}>
      {children}
    </AdminShell>
  );
}
