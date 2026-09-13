export function GET() {
  return new Response("nama,kelas,jenis_kelamin\nNama Siswa,XII IPA 1,L\n", {
    headers: {
      "Content-Disposition": 'attachment; filename="template-daftar-pemilih.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
