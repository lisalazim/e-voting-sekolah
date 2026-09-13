import type { Metadata } from "next";

import { AnnouncementStage } from "../../features/announcement/announcement-stage";
import { getPublicAnnouncementState } from "../../features/announcement/queries";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pengumuman Hasil | E-Voting Sekolah",
  description: "Layar pengumuman hasil E-Voting Sekolah.",
};

function WaitingScreen({
  electionTitle,
  message,
  schoolLogoUrl,
  schoolName,
  termLabel,
}: {
  electionTitle: string | null;
  message: string;
  schoolLogoUrl: string | null;
  schoolName: string | null;
  termLabel: string | null;
}) {
  return (
    <section className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-8 text-white">
      <div className="w-full max-w-3xl text-center">
        {schoolLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="mx-auto size-20 rounded-lg bg-white object-contain p-2"
            src={schoolLogoUrl}
          />
        ) : null}
        <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-emerald-300">
          {schoolName ?? "E-Voting Sekolah"}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
          {electionTitle ?? "Pengumuman Hasil"}
        </h1>
        <p className="mt-3 text-base text-slate-300">
          Periode {termLabel ?? "-"}
        </p>
        <p className="mt-10 text-2xl font-semibold sm:text-4xl">{message}</p>
      </div>
    </section>
  );
}

export default async function PublicAnnouncementPage() {
  const supabase = await createSupabaseServerClient();
  const state = await getPublicAnnouncementState(supabase);

  if (state.status === "not_ready") {
    return (
      <WaitingScreen
        electionTitle={null}
        message="Hasil pemilihan belum diumumkan."
        schoolLogoUrl={null}
        schoolName={null}
        termLabel={null}
      />
    );
  }

  if (state.status === "waiting") {
    return (
      <WaitingScreen
        electionTitle={state.electionTitle}
        message="Pengumuman akan segera dimulai."
        schoolLogoUrl={state.schoolLogoUrl}
        schoolName={state.schoolName}
        termLabel={state.electionTermLabel}
      />
    );
  }

  return <AnnouncementStage state={state} />;
}
