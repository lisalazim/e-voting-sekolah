# Architecture: E-Voting Sekolah

## Prinsip Struktur

Kode aplikasi disimpan di dalam `src` agar terpisah dari konfigurasi proyek di root. Route publik dan layout Next.js berada di `src/app`, sementara komponen, fitur, helper, tipe, dan konfigurasi aplikasi ditempatkan di direktori khusus sesuai tanggung jawabnya.

Data sekolah, jadwal pemilihan, kandidat, dan pemilih tidak boleh ditulis permanen di komponen. Pada fase berikutnya, data tersebut harus berasal dari konfigurasi, database, atau service layer yang dapat diganti per sekolah.

## Struktur Direktori

```text
src/
  app/
  components/
    layout/
    ui/
  config/
  features/
    candidates/
    elections/
    results/
    voters/
    voting/
  lib/
  types/
  utils/
supabase/
  migrations/
```

## Tanggung Jawab Direktori

### `src/app`

Berisi App Router Next.js, termasuk `layout.tsx`, `page.tsx`, metadata, stylesheet global, dan route aplikasi. Folder ini bertanggung jawab pada routing dan komposisi halaman, bukan penyimpanan permanen data sekolah.

### `src/components/ui`

Berisi komponen UI kecil dan generik seperti tombol, input, badge, dialog, tabel, dan elemen presentasional lain yang tidak terikat langsung pada domain e-voting.

### `src/components/layout`

Berisi komponen layout bersama seperti shell aplikasi, header, navigasi, container halaman, dan pola layout responsif.

### `src/features/elections`

Berisi modul terkait periode pemilihan, status pemilihan, jadwal, dan konfigurasi pemilihan per sekolah.

### `src/features/candidates`

Berisi modul terkait kandidat, profil kandidat, nomor urut, visi misi, dan validasi data kandidat.

### `src/features/voters`

Berisi modul terkait daftar pemilih, status pemilih, impor data pemilih, dan validasi hak pilih.

### `src/features/voting`

Berisi modul alur pemberian suara publik, termasuk login token pemilih, cookie sesi pemilih sementara, query kandidat melalui RPC, dan Server Action submit suara.

### `src/features/results`

Berisi modul rekap hasil, agregasi suara, dan tampilan hasil pemilihan sesuai aturan publikasi.

### `src/lib`

Berisi integrasi library dan service bersama, misalnya client Supabase pada fase berikutnya. Pada fase pertama, Supabase belum dipasang.

Pada fase kedua, folder ini mulai berisi helper Supabase:

- `src/lib/supabase/browser.ts` untuk client browser.
- `src/lib/supabase/server.ts` untuk client server di App Router.
- `src/lib/supabase/proxy.ts` untuk refresh session cookie melalui Next.js Proxy.

### `src/types`

Berisi tipe TypeScript bersama untuk domain aplikasi, payload form, response service, dan kontrak data.

### `src/config`

Berisi konfigurasi aplikasi yang dapat berubah antar sekolah atau antar environment. Nilai rahasia tetap harus menggunakan environment variables.

Konfigurasi Supabase public berada di `src/config/supabase.ts` dan membaca `NEXT_PUBLIC_SUPABASE_URL` serta `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

### `src/utils`

Berisi helper murni yang tidak bergantung pada framework atau domain tertentu, seperti formatter tanggal, parser, dan utility validasi umum.

### `src/features/admin/auth`

Berisi fondasi autentikasi admin:

- Server Actions untuk login dan logout.
- Query untuk membaca user Supabase Auth dan memastikan role `admin` pada tabel `profiles`.
- Komponen form login admin.

### `src/proxy.ts`

Berisi Next.js Proxy untuk menjaga session cookie Supabase tetap sinkron pada request aplikasi. Proxy tidak menggantikan pemeriksaan otorisasi di layout atau Server Actions.

### `src/app/admin`

Berisi route admin:

- `/admin/login` untuk login admin.
- `/admin` untuk kerangka dashboard admin yang diproteksi role `admin`.
- `/admin/pengaturan` untuk pengaturan identitas sekolah dan nama admin.
- `/admin/pemilihan` untuk pengaturan kegiatan pemilihan.
- `/admin/kandidat` untuk pengelolaan calon Ketua OSIS.
- `/admin/pemilih` untuk pengelolaan dan impor daftar pemilih.
- `/admin/kotak-suara` untuk kontrol status kotak suara.

### `supabase/migrations`

Berisi migration SQL untuk schema database Supabase. Migration awal mendefinisikan tabel sekolah, profil pengguna internal, pemilihan, kandidat, pemilih, suara anonim, audit log, enum, index, trigger `updated_at`, dan RLS baseline.

## Fondasi Supabase Fase Kedua

- Dependensi Supabase memakai `@supabase/supabase-js` dan `@supabase/ssr`.
- Environment contoh tersedia di `.env.example`.
- Tipe database awal tersedia di `src/types/database.ts`.
- Keputusan schema dan aturan akses awal dijelaskan di `docs/DATABASE_DESIGN.md`.
- Service role key belum ditambahkan karena belum ada kebutuhan server-only setup pada fase ini.

## Fondasi Admin Fase Ketiga

- Login admin memakai Supabase Auth email/password.
- Tidak ada pendaftaran akun publik.
- Akses dashboard memerlukan session valid dan `profiles.role = 'admin'`.
- Logout dilakukan melalui Server Action.
- Kerangka dashboard belum berisi CRUD, voting, impor Excel, grafik hasil, atau animasi pengumuman.

## Pengaturan Admin Fase Keempat

- Pengaturan sekolah berada di `src/features/admin/settings`.
- Pengaturan pemilihan berada di `src/features/admin/elections`.
- Ringkasan dashboard mengambil data melalui `src/features/admin/dashboard`.
- Validasi formulir memakai Zod.
- Semua Server Actions memeriksa session dan role `admin`, lalu membatasi operasi ke `profiles.school_id`.
- Periode kepengurusan disimpan di `elections.term_label` melalui migration baru.

## Pengelolaan Kandidat Fase Kelima

- Pengelolaan kandidat admin berada di `src/features/admin/candidates`.
- Foto kandidat disimpan di Supabase Storage bucket `candidate-photos`.
- Path foto dibuat server-side dengan pola `school_id/candidate_id/nama-file`.
- Server Actions kandidat selalu memeriksa session, role `admin`, dan pemilihan milik sekolah admin.
- Belum ada fitur pemilih, impor Excel, token, voting, hasil, atau mode pengumuman.

## Pengelolaan Pemilih Fase Keenam

- Pengelolaan daftar pemilih admin berada di `src/features/admin/voters`.
- Impor `.xlsx` memakai ExcelJS dan `.csv` memakai Papa Parse.
- Preview impor tidak menyimpan data; data baru disimpan setelah konfirmasi impor.
- Template impor pemilih memakai `nama,kelas,jenis_kelamin`.
- UUID `voters.id` menjadi identitas internal pemilih; NIS/NISN lama disimpan sebagai `external_id` nullable untuk kompatibilitas dan tidak ditampilkan pada UI admin.
- Deteksi kemungkinan duplikat memakai kombinasi nama yang dinormalisasi dan kelas.
- Server Actions pemilih selalu memeriksa session, role `admin`, dan pemilihan milik sekolah admin.
- `school_id` dan `election_id` tidak diambil dari browser sebagai sumber kebenaran.
- Belum ada token pemilih, voting, hasil, atau mode pengumuman.

## Pengelolaan Token Fase Ketujuh

- Utility token berada di `src/features/admin/voters/token-utils.ts`.
- Server Actions token berada di `src/features/admin/voters/token-actions.ts`.
- State hasil token satu-kali berada di `src/features/admin/voters/token-state.ts` agar file `"use server"` hanya mengekspor fungsi async.
- Token dibuat dengan generator acak kriptografis dan diformat agar mudah dibaca.
- Token dinormalisasi sebelum hashing dengan menghapus spasi/tanda hubung dan mengubah huruf menjadi kapital.
- Database hanya menerima hasil HMAC-SHA-256 dari token menggunakan `VOTER_TOKEN_PEPPER`.
- UI admin tidak menampilkan `token_hash`.
- Hasil token asli batch dapat diunduh sebagai CSV `nama,kelas,token` satu kali dari state browser setelah aksi berhasil.

## Kontrol Kotak Suara Fase Kedelapan

- Kontrol kotak suara berada di `src/features/admin/ballot-box`.
- Helper status efektif berada di `src/features/admin/ballot-box/status.ts`.
- Query ringkasan kotak suara berada di `src/features/admin/ballot-box/queries.ts`.
- Server Action transisi status berada di `src/features/admin/ballot-box/actions.ts`.
- Lifecycle UI mengikuti `draft -> scheduled -> open -> paused -> open -> closed`.
- Status `closed` tidak dapat dibuka kembali melalui UI.
- Server Action selalu membaca status database terkini, memverifikasi admin dan sekolah, lalu memakai conditional update agar permintaan bersamaan tidak menghasilkan transisi yang salah.
- Status efektif dihitung server-side agar status database `open` tetap dianggap tidak menerima suara setelah `ends_at` terlewati.
- Fase ini belum membuat login pemilih, penerimaan suara, hasil kandidat, atau pengumuman.

## Voting Publik Fase Kesembilan

- Route publik voting berada di `src/app/pilih`.
- Server Actions voting berada di `src/features/voting/actions.ts`.
- Cookie sesi pemilih dikelola di `src/features/voting/session.ts`.
- Kandidat aktif dibaca melalui RPC `get_voting_context`, bukan query client langsung ke tabel admin.
- Token mentah hanya diterima oleh Server Action login, lalu langsung dinormalisasi dan di-hash. Token mentah tidak masuk URL, localStorage, sessionStorage, audit log, atau database.
- Cookie pemilih hanya menyimpan secret sesi acak HttpOnly. Cookie tidak berisi `voter_id`, `token_hash`, token mentah, atau pilihan kandidat.
- Boundary kepercayaan ada di server dan database: browser hanya mengirim token saat login dan `candidate_id` saat submit, sedangkan election, voter, session, dan status efektif ditentukan ulang oleh server/RPC.
- RPC `cast_vote` menjalankan validasi sesi, locking sesi dan voter, validasi election, validasi kandidat, insert suara anonim, update `has_voted`, dan penandaan sesi terpakai dalam satu transaksi database.
- Fase ini tidak membuat hasil, grafik, atau pengumuman.

## Batasan Fase Pertama

- Tidak memasang Supabase.
- Tidak membuat database atau skema tabel.
- Tidak membuat dashboard.
- Tidak membuat fitur voting.
- Tidak menambahkan konfigurasi yang belum diperlukan.
- Tidak menggunakan `any` dalam TypeScript.
