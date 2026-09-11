import Link from "next/link";

type VoterPaginationProps = {
  page: number;
  pageCount: number;
  searchParams: URLSearchParams;
};

function getPageHref(searchParams: URLSearchParams, page: number): string {
  const params = new URLSearchParams(searchParams);
  params.set("page", String(page));

  return `/admin/pemilih?${params.toString()}`;
}

export function VoterPagination({
  page,
  pageCount,
  searchParams,
}: VoterPaginationProps) {
  return (
    <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <p>
        Halaman {page} dari {pageCount}
      </p>
      <div className="flex gap-2">
        <Link
          aria-disabled={page <= 1}
          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100 aria-disabled:pointer-events-none aria-disabled:text-slate-400"
          href={getPageHref(searchParams, Math.max(page - 1, 1))}
        >
          Sebelumnya
        </Link>
        <Link
          aria-disabled={page >= pageCount}
          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100 aria-disabled:pointer-events-none aria-disabled:text-slate-400"
          href={getPageHref(searchParams, Math.min(page + 1, pageCount))}
        >
          Berikutnya
        </Link>
      </div>
    </div>
  );
}
