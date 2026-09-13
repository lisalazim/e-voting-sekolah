import type { Gender, TokenStatusFilter } from "./types";

type VoterFiltersProps = {
  classNameValue?: string;
  classOptions: string[];
  gender?: Gender;
  query?: string;
  tokenStatus?: TokenStatusFilter;
};

export function VoterFilters({
  classNameValue,
  classOptions,
  gender,
  query,
  tokenStatus,
}: VoterFiltersProps) {
  return (
    <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_150px_120px_190px_auto]">
      <input
        className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        defaultValue={query ?? ""}
        name="q"
        placeholder="Cari nama"
      />
      <select
        className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        defaultValue={classNameValue ?? ""}
        name="kelas"
      >
        <option value="">Semua kelas</option>
        {classOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <select
        className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        defaultValue={gender ?? ""}
        name="jk"
      >
        <option value="">Semua JK</option>
        <option value="L">L</option>
        <option value="P">P</option>
      </select>
      <select
        className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        defaultValue={tokenStatus ?? ""}
        name="status"
      >
        <option value="">Semua status token</option>
        <option value="missing-token">Belum dibuatkan token</option>
        <option value="with-token">Token sudah dibuat</option>
        <option value="voted">Sudah memilih</option>
      </select>
      <button
        className="min-h-10 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
        type="submit"
      >
        Terapkan
      </button>
    </form>
  );
}
