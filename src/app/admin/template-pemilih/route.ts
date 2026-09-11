export function GET() {
  return new Response("nis,nama,kelas,jenis_kelamin\n001234,Nama Siswa,XII IPA 1,L\n", {
    headers: {
      "Content-Disposition": 'attachment; filename="template-daftar-pemilih.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
