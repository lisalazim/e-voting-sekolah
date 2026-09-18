# Database Design: Fase 2

## Tujuan

Dokumen ini menjelaskan rancangan database awal untuk template E-Voting Sekolah. Rancangan ini menyiapkan fondasi Supabase tanpa membuat UI dashboard, fitur voting, impor Excel, grafik hasil, atau animasi pengumuman.

Schema awal berada di:

```text
supabase/migrations/20260910120000_initial_e_voting_schema.sql
```

## Prinsip Data

- Data sekolah, periode pemilihan, kandidat, dan pemilih disimpan di database, bukan di komponen.
- Aplikasi dapat dipakai ulang oleh sekolah berbeda melalui data `schools`.
- Suara dibuat anonim: tabel `votes` tidak menyimpan `voter_id`.
- Validasi satu pemilih satu suara disiapkan melalui `voters.has_voted`, `voters.voted_at`, dan `votes.ballot_fingerprint`.
- Kode/token pemilih tidak disimpan mentah. Database hanya menyimpan `token_hash`.
- Service role key tidak digunakan di client dan tidak dicantumkan di `.env.example`.

## Tabel Inti

### `schools`

Menyimpan profil sekolah yang memakai aplikasi.

Kolom penting:
- `name`: nama sekolah.
- `slug`: identifier URL/config yang unik.
- `npsn`: nomor pokok sekolah nasional, opsional.
- `timezone`: default `Asia/Jakarta`.

### `profiles`

Menyimpan profil pengguna internal yang terhubung ke `auth.users`.

Role:
- `admin`: mengelola sekolah dan data pemilihan.
- `committee`: membantu operasional pemilihan.
- `observer`: melihat data sesuai izin.

### `elections`

Menyimpan periode pemilihan.

Status:
- `draft`
- `scheduled`
- `open`
- `paused`
- `closed`
- `archived`

Kolom penting:
- `starts_at` dan `ends_at` adalah informasi jadwal lama yang nullable dan tidak
  mengendalikan ketersediaan voting.
- `term_label` untuk periode kepengurusan.
- `results_visibility` untuk aturan publikasi hasil.
- `published_at` dan `finalized_at` untuk fase hasil.
- `finalized_by` untuk admin yang melakukan finalisasi hasil.
- `announcement_started_at` untuk waktu admin memulai momen pengumuman.
- `results_revealed_at` untuk waktu server saat hasil publik boleh dibuka.
- `archived_at` untuk menandai pemilihan lama yang sudah menjadi arsip.
- `is_test` untuk memberi label pemilihan percobaan tanpa bypass keamanan.

Lifecycle kotak suara:
- `draft`: pemilihan masih dipersiapkan.
- `scheduled`: pemilihan siap tetapi kotak suara belum dibuka.
- `open`: kotak suara menerima login token dan suara sampai admin menjeda atau
  menutupnya.
- `paused`: kotak suara dijeda sementara.
- `closed`: pemilihan selesai dan tidak dapat dibuka kembali melalui UI.

Ketersediaan voting ditentukan hanya oleh `elections.status`. Nilai waktu pada
`starts_at` dan `ends_at` tidak membuka, menjeda, atau menutup kotak suara.

Aturan current election:
- Satu sekolah hanya boleh memiliki satu election yang `archived_at is null`.
- Partial unique index `elections_one_current_per_school_idx` menegakkan aturan
  tersebut di database.
- Query aplikasi admin dan publik memakai election yang belum diarsipkan sebagai
  current election.
- Election yang sudah diarsipkan tetap menyimpan semua foreign key dan data
  historis.

### `candidates`

Menyimpan kandidat pada satu pemilihan.

Aturan:
- `ballot_number` harus positif.
- Nomor urut unik per pemilihan.
- Kandidat terikat ke `elections`.
- `photo_url` menyimpan URL publik foto kandidat dari Supabase Storage.

### Storage `candidate-photos`

Bucket `candidate-photos` menyimpan foto kandidat.

Aturan:
- Bucket bersifat public read karena foto kandidat akan tampil pada halaman voting.
- File dibatasi ke JPG, PNG, atau WebP.
- Ukuran file maksimal 2 MB.
- Path file dibuat dengan pola `school_id/candidate_id/nama-file`.
- Upload, update, dan delete hanya boleh dilakukan admin sekolah yang cocok dengan folder `school_id`.

### `voters`

Menyimpan daftar pemilih sah untuk satu pemilihan.

Kolom penting:
- `id`: UUID utama pemilih dan identitas internal yang dipakai sistem.
- `external_id`: nomor induk atau identifier sekolah dari data lama. Kolom ini nullable dan tidak diwajibkan pada antarmuka admin.
- `full_name`: nama pemilih.
- `class_name`: kelas pemilih.
- `gender`: `L` atau `P`.
- `token_hash`: hash dari token/kode akses pemilih. Pada fase daftar pemilih kolom ini dibuat nullable karena token belum dibuat.
- `has_voted` dan `voted_at`: status penggunaan hak suara.
- `token_revoked_at`: menandai token yang dibatalkan.

Catatan operasional:
- Token mentah hanya boleh muncul saat dibuat atau dicetak.
- Jika token hilang, panitia sebaiknya membuat ulang token dan membatalkan token lama.
- Token baru dibuat sebagai tepat enam digit angka memakai generator acak kriptografis. Token diperlakukan sebagai string sehingga nol di depan tidak hilang.
- Token disimpan hanya sebagai HMAC-SHA-256 pada `token_hash`.
- Secret HMAC dibaca dari environment server-only `VOTER_TOKEN_PEPPER`; nilai ini harus secret acak yang kuat dan tidak boleh dikirim ke browser.
- Input token dinormalisasi dengan menghapus spasi/tanda hubung. Format baru harus enam digit; pola legacy sepuluh karakter tetap diterima selama transisi.
- Token asli hanya tersedia satu kali saat dibuat atau diregenerasi. Setelah halaman ditutup atau dimuat ulang, aplikasi tidak dapat menampilkan token asli kembali.
- CSV token berisi `nama,kelas,token` dan harus disimpan, dicetak, serta dibagikan secara terbatas oleh panitia.
- CSV menampilkan token sebagai `123-456`; tanda hubung bukan bagian dari nilai canonical atau hash.
- File token tidak boleh diunggah ke tempat publik, dikirim ke grup terbuka, atau dicatat dalam audit log.
- Data lama yang memiliki `external_id` tetap dapat digunakan, tetapi token dan UI admin tidak menampilkan NIS/NISN.

### Rate limiting login token enam digit

Ruang kombinasi enam digit dilindungi rate limit durable pada tabel `voter_login_rate_limits`. Tabel hanya menyimpan jenis bucket, HMAC bucket, awal jendela, jumlah kegagalan, dan expiry. Batas per jendela 10 menit adalah 5 kegagalan untuk device/client, 5 untuk token-attempt, dan 100 untuk IP bersama. Batas IP sengaja lebih longgar agar jaringan sekolah dengan satu IP publik tidak mudah terblokir. Data kedaluwarsa dibersihkan oleh RPC login dan fungsi cleanup, dengan retensi maksimal 24 jam.

Tidak ada policy anon/authenticated pada tabel ini. RPC `create_voter_session` tidak dapat dijalankan dengan publishable key dan hanya diberikan kepada `service_role`. Pemeriksaan limit, lookup token, pencatatan kegagalan, dan pembuatan sesi berlangsung atomik dengan row lock bucket.

Format impor pemilih:
- File didukung: `.xlsx` dan `.csv`.
- Header wajib: `nama,kelas,jenis_kelamin`.
- `nama`, `kelas`, dan `jenis_kelamin` wajib diisi.
- `jenis_kelamin` hanya menerima `L` atau `P`.
- Maksimal 1.500 baris per file.
- Sistem mendeteksi kemungkinan duplikat memakai kombinasi nama yang dinormalisasi dan kelas dalam pemilihan yang sama.
- Baris dengan kemungkinan duplikat ditandai sebagai duplikat pada preview dan tidak diimpor otomatis.

### `votes`

Menyimpan suara yang sudah masuk.

Aturan:
- Tidak menyimpan `voter_id`.
- Tidak menyimpan `voter_session_id`, `token_hash`, nama, kelas, atau `external_id`.
- `candidate_id` wajib berasal dari `election_id` yang sama.
- `ballot_fingerprint` unik per pemilihan untuk membantu pencegahan submit ganda tanpa membuka identitas pemilih.

### `voter_sessions`

Menyimpan sesi pemilih sementara setelah token valid.

Aturan:
- `session_hash` adalah hash dari secret sesi acak; secret asli hanya berada pada cookie HttpOnly pemilih.
- Cookie sesi berlaku 15 menit, SameSite=Strict, dan Secure pada production.
- Sesi terkait dengan `voter_id` dan `election_id` di database, tetapi nilai tersebut tidak dikirim ke cookie yang dapat dibaca JavaScript.
- `used_at` diisi setelah suara berhasil dicatat.
- RLS diaktifkan dan tidak ada policy akses langsung client ke tabel ini.

### RPC Voting

RPC `create_voter_session`:
- hanya dapat dipanggil Secret Key server melalui role `service_role`;
- menerima `token_hash`, `session_hash`, expiry, dan tiga HMAC bucket yang dihitung Server Action;
- mengunci bucket client, token-attempt, dan IP sebelum lookup pemilih;
- memastikan token cocok dengan pemilih yang belum memilih;
- memastikan election `open`, belum diarsipkan, dan belum difinalisasi;
- membuat sesi pemilih dengan `session_hash` dan expiry.

RPC `get_voting_context`:
- memvalidasi sesi belum kedaluwarsa dan belum digunakan;
- memastikan kotak suara efektif `open`;
- mengembalikan kandidat aktif untuk election sesi.

RPC `cast_vote`:
- memvalidasi `session_hash`;
- mengunci baris sesi dan voter dengan `for update`;
- menolak sesi terpakai/kedaluwarsa;
- menolak election yang statusnya bukan `open`, sudah diarsipkan, atau sudah
  difinalisasi;
- memastikan kandidat aktif berasal dari election yang sama;
- memastikan `voters.has_voted = false`;
- memasukkan satu baris ke `votes` tanpa identitas pemilih;
- memperbarui `voters.has_voted` dan `voted_at`;
- menandai sesi sebagai sudah digunakan.

Semua langkah RPC `cast_vote` berada dalam satu transaksi database. Dua submit
bersamaan dari sesi atau voter yang sama hanya dapat menghasilkan satu suara.

### `audit_logs`

Menyimpan jejak aksi penting seperti perubahan data sekolah, pemilihan, kandidat, pemilih, suara, dan publikasi hasil.

Perubahan status kotak suara dicatat dengan action `election.status_changed`
dan metadata status lama, status baru, serta transisi yang dijalankan. Metadata
tidak menyimpan token pemilih atau data rahasia.

Penerimaan suara dapat dicatat sebagai agregat `vote.cast` pada entity election
tanpa menyimpan voter dan candidate dalam entri audit yang sama.

Finalisasi dan kontrol publikasi hasil:
- `results.finalized` dicatat saat hasil difinalisasi.
- `results.published` dicatat saat hasil ditandai siap diumumkan.
- `results.unpublished` dicatat saat status siap diumumkan dibatalkan.
- `results.announcement_started` dicatat saat countdown pengumuman publik dimulai.
- `election.archived` dicatat saat pemilihan selesai dipindahkan ke arsip.
- `election.test_deleted` dicatat sebelum arsip pemilihan percobaan dihapus
  permanen. Metadata minimum memuat nama election, periode, waktu penghapusan,
  ID admin, dan path foto untuk kebutuhan cleanup tanpa data pemilih atau token.
- Audit tidak mencatat identitas pemilih atau pasangan pemilih-kandidat.

Penghitungan hasil:
- Sumber hasil adalah agregasi langsung tabel `votes`.
- Sebelum status election `closed`, perolehan kandidat tidak ditampilkan.
- Setelah finalisasi, isi `votes` tidak dihitung ulang ke tabel snapshot pada fase ini.
- Halaman publik hasil memakai `published_at` sebagai tanda siap diumumkan,
  lalu `announcement_started_at` dan `results_revealed_at` sebagai kontrol
  countdown. `results_revealed_at` ditetapkan server menjadi 10 detik setelah
  pengumuman dimulai.

### RPC Pengumuman Publik

RPC `get_public_announcement_state`:
- hanya mengembalikan status layar pengumuman, waktu server, identitas sekolah,
  nama pemilihan, periode, `announcement_started_at`, dan `results_revealed_at`;
- hanya memilih election yang belum diarsipkan;
- tidak mengembalikan jumlah suara, persentase, kandidat teratas, atau data
  pemilih;
- dipakai halaman `/pengumuman` untuk menampilkan layar tunggu atau countdown.

RPC `get_public_final_results`:
- hanya mengembalikan hasil jika election `closed`, `finalized_at` terisi,
  `published_at` terisi, `results_revealed_at` terisi, dan waktu server sudah
  melewati `results_revealed_at`;
- hanya memilih election yang belum diarsipkan;
- melakukan agregasi hasil dari tabel `votes` server-side;
- mengembalikan data kandidat dan agregat suara saja;
- tidak mengembalikan `voter_id`, `voter_session_id`, `token_hash`, nama
  pemilih, kelas pemilih, external id, atau waktu voting individual.

## Arsip Pemilihan

Pemilihan dapat diarsipkan hanya setelah status database `closed` dan
`finalized_at` terisi. Proses arsip:
- mengisi `archived_at`;
- mengubah status menjadi `archived`;
- mencatat audit `election.archived`;
- tidak menghapus atau mengubah `votes`, `candidates`, `voters`,
  `voter_sessions`, atau `audit_logs`.

Setelah current election diarsipkan, sekolah dapat membuat election baru dengan
status `draft`. Election baru memakai identitas sekolah yang sama, tetapi tidak
menyalin kandidat, pemilih, token, sesi, suara, finalisasi, atau pengumuman dari
arsip lama.

### RPC Penghapusan Pemilihan Percobaan

RPC `delete_archived_test_election` hanya dapat dieksekusi role database
`authenticated`. Function memakai `SECURITY DEFINER` dengan `search_path`
eksplisit dan tetap memverifikasi `auth.uid()` terhadap profil admin.

RPC menolak election yang bukan milik sekolah admin, bukan percobaan, atau belum
diarsipkan. Setelah baris election dikunci, audit sekolah disimpan dan child
data dihapus berurutan: `voter_sessions`, `votes`, `voters`, `candidates`, lalu
`elections`. Seluruh perubahan database berada dalam satu transaksi function.
Baris `schools`, `profiles`, audit, current election, dan election lain tidak
ikut dihapus.

Path foto kandidat dikumpulkan sebelum kandidat dihapus dan dicatat pada audit.
Setelah RPC sukses, aplikasi mencoba menghapus hanya path tersebut dari bucket
`candidate-photos`. Kegagalan Storage tidak membatalkan penghapusan database dan
ditampilkan sebagai peringatan cleanup kepada admin.

## RLS Awal

Row Level Security diaktifkan untuk semua tabel public.

Kebijakan awal:
- Anggota sekolah dapat membaca data sekolahnya.
- Admin dapat memperbarui data sekolah.
- Admin dapat mengelola profil sekolah.
- Admin dan panitia dapat mengelola pemilihan, kandidat, dan pemilih.
- Akses hasil mengikuti `results_visibility`.
- Tabel `votes` hanya dapat dibaca sesuai izin hasil.

## Catatan Bootstrap

Pembuatan sekolah pertama dan admin pertama tidak diselesaikan oleh UI aplikasi. Opsi bootstrap:

- Jalankan SQL seed manual di Supabase SQL Editor.
- Buat server-only setup action memakai service role key yang tidak pernah dikirim ke browser.
- Buat proses onboarding admin yang dibatasi environment/deployment tertentu.

Untuk login admin fase ketiga, akun harus sudah ada di Supabase Auth dan memiliki baris `profiles` dengan `role = 'admin'`.

## Hal yang Belum Dibuat

- Tidak ada CRUD kandidat atau pemilih.
- Tidak ada grafik hasil.
- Tidak ada halaman hasil publik.
- Tidak ada countdown pengumuman.
- Tidak ada animasi pengumuman.
