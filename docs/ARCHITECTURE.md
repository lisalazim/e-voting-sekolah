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
    announcement/
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

### `src/features/announcement`

Berisi modul pengumuman hasil publik, termasuk pembacaan status countdown,
fetch hasil final setelah reveal, dan komponen layar publik.

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
- `/admin/hasil` untuk penghitungan, finalisasi, dan status siap diumumkan.
- `/admin/pengumuman` untuk memulai countdown pengumuman hasil publik.
- `/admin/arsip-pemilihan` untuk membaca arsip pemilihan lama dan
  mengarsipkan pemilihan current yang sudah selesai.

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
- Token baru dibuat sebagai string enam digit memakai `crypto.randomInt`; nilai seperti `000123` tidak dikonversi menjadi number.
- Normalisasi bersama berada di `src/utils/voter-token.ts`. Spasi/tanda hubung dihapus sebelum validasi dan hashing.
- Server menerima format enam digit baru serta format legacy sepuluh karakter selama masa transisi.
- Database hanya menerima hasil HMAC-SHA-256 dari token menggunakan `VOTER_TOKEN_PEPPER`.
- UI admin tidak menampilkan `token_hash`.
- Hasil token asli batch dapat diunduh sebagai CSV `nama,kelas,token` satu kali dari state browser setelah aksi berhasil.
- CSV memakai bentuk `123-456` agar mudah dibaca dan agar spreadsheet mempertahankan nol di depan.
- RPC `create_voter_session` masih dapat dipanggil langsung dengan publishable client role. Durable rate limiting dan trust boundary sumber login adalah blocker wajib sebelum deployment produksi; pembatasan React, browser storage, atau memory proses tidak dianggap perlindungan.

## Kontrol Kotak Suara Fase Kedelapan

- Kontrol kotak suara berada di `src/features/admin/ballot-box`.
- Label status dan checklist kesiapan berada di
  `src/features/admin/ballot-box/status.ts`.
- Query ringkasan kotak suara berada di `src/features/admin/ballot-box/queries.ts`.
- Server Action transisi status berada di `src/features/admin/ballot-box/actions.ts`.
- Lifecycle UI mengikuti `draft -> scheduled -> open -> paused -> open -> closed`.
- Status `closed` tidak dapat dibuka kembali melalui UI.
- Server Action selalu membaca status database terkini, memverifikasi admin dan sekolah, lalu memakai conditional update agar permintaan bersamaan tidak menghasilkan transisi yang salah.
- Ketersediaan kotak suara ditentukan server-side hanya dari status database.
  Jadwal tidak mengubah status dan tidak memblokir voting.
- Fase ini belum membuat login pemilih, penerimaan suara, hasil kandidat, atau pengumuman.

## Voting Publik Fase Kesembilan

- Route publik voting berada di `src/app/pilih`.
- Server Actions voting berada di `src/features/voting/actions.ts`.
- Cookie sesi pemilih dikelola di `src/features/voting/session.ts`.
- Kandidat aktif dibaca melalui RPC `get_voting_context`, bukan query client langsung ke tabel admin.
- Token mentah hanya diterima oleh Server Action login, lalu langsung dinormalisasi dan di-hash. Token mentah tidak masuk URL, localStorage, sessionStorage, audit log, atau database.
- Cookie pemilih hanya menyimpan secret sesi acak HttpOnly. Cookie tidak berisi `voter_id`, `token_hash`, token mentah, atau pilihan kandidat.
- Boundary kepercayaan ada di server dan database: browser hanya mengirim token saat login dan `candidate_id` saat submit, sedangkan election, voter, session, dan status database ditentukan ulang oleh server/RPC.
- RPC `cast_vote` menjalankan validasi sesi, locking sesi dan voter, validasi election, validasi kandidat, insert suara anonim, update `has_voted`, dan penandaan sesi terpakai dalam satu transaksi database.
- Fase ini tidak membuat hasil, grafik, atau pengumuman.

## Hasil Admin Fase Kesepuluh

- Penghitungan hasil admin berada di `src/features/admin/results`.
- Query hasil selalu berangkat dari `getAdminDashboardData`, sehingga election dibatasi ke `profiles.school_id` admin.
- Sebelum status database `closed`, halaman hanya menampilkan partisipasi agregat.
- Setelah `closed`, perolehan kandidat dihitung dari agregasi tabel `votes` tanpa join ke `voters` atau `voter_sessions`.
- Finalisasi dan publikasi memakai Server Actions dengan conditional update.
- Finalisasi menyimpan `finalized_at` dan `finalized_by`.
- Status siap diumumkan memakai `published_at`; pembatalan siap diumumkan mengosongkan `published_at`.
- Setelah finalisasi, Server Actions kandidat dan pengaturan pemilihan menolak perubahan.
- Fase ini tidak membuat countdown, animasi, atau halaman hasil publik.

## Pengumuman Publik Fase Kesebelas

- Kontrol admin pengumuman berada di `src/features/admin/announcement`.
- Route admin `/admin/pengumuman` menampilkan checklist kesiapan dan tombol
  `Mulai Pengumuman`.
- Route publik `/pengumuman` hanya membaca status pengumuman dan timestamp
  reveal. Data suara tidak dikirim ke halaman sebelum waktu reveal tercapai.
- Route handler `/pengumuman/hasil` memanggil RPC publik agregasi hasil dan
  menolak request sebelum `results_revealed_at`.
- Countdown dihitung dari `server_now` dan `results_revealed_at`, sehingga
  refresh halaman atau perangkat berbeda tidak memulai ulang hitungan.
- Hasil publik tetap anonim: endpoint hanya mengembalikan data kandidat dan
  agregat suara, tanpa data pemilih, sesi, token, atau waktu voting individual.

## Arsip Pemilihan Fase 11.5

- Arsip pemilihan berada di `src/features/admin/election-archive`.
- Query current election utama berada di `getAdminDashboardData` dan selalu
  memakai `archived_at is null`.
- Fitur kandidat, pemilih, token, kotak suara, hasil admin, dan pengumuman admin
  berangkat dari current election tersebut, sehingga arsip lama tidak ikut
  menjadi target operasi.
- Halaman `/admin/arsip-pemilihan` membaca daftar election yang sudah memiliki
  `archived_at` dan membatasi data ke `profiles.school_id` admin.
- Action arsip memakai conditional update: status harus `closed`,
  `finalized_at` harus terisi, dan `archived_at` masih null.
- Pemilihan baru dibuat melalui form `/admin/pemilihan` sebagai `draft` setelah
  tidak ada current election. Data kandidat, pemilih, token, sesi, suara,
  finalisasi, dan pengumuman tidak disalin.
- Halaman publik pengumuman dan RPC hasil publik mengabaikan election yang sudah
  diarsipkan.

## Penghapusan Arsip Percobaan Fase 11.6

- Dialog penghapusan berada di
  `src/features/admin/election-archive/delete-election-dialog.tsx` dan hanya
  dirender untuk arsip dengan `is_test = true`.
- Server Action `deleteArchivedTestElection` memvalidasi UUID lalu memanggil
  RPC dengan session Supabase admin; browser tidak mengirim `school_id`.
- RPC `delete_archived_test_election` mengunci election, mengambil sekolah dari
  profil `auth.uid()`, lalu memverifikasi role admin, `is_test`, dan
  `archived_at` sebelum menghapus data.
- Penghapusan `voter_sessions`, `votes`, `voters`, `candidates`, dan `elections`
  terjadi dalam satu transaksi RPC. Sekolah, profil, election lain, serta audit
  sekolah tidak menjadi target penghapusan.
- RPC mengembalikan path foto kandidat yang sudah dikumpulkan sebelum delete.
  Server Action kemudian membersihkan hanya object tersebut dari bucket
  `candidate-photos`.
- RPC hanya diberikan kepada role database `authenticated`; akses `anon` dan
  `public` dicabut.

## Batasan Fase Pertama

- Tidak memasang Supabase.
- Tidak membuat database atau skema tabel.
- Tidak membuat dashboard.
- Tidak membuat fitur voting.
- Tidak menambahkan konfigurasi yang belum diperlukan.
- Tidak menggunakan `any` dalam TypeScript.
