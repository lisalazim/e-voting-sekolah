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
- `starts_at` dan `ends_at` untuk jadwal.
- `term_label` untuk periode kepengurusan.
- `results_visibility` untuk aturan publikasi hasil.
- `published_at` dan `finalized_at` untuk fase hasil.
- `finalized_by` untuk admin yang melakukan finalisasi hasil.

Lifecycle kotak suara:
- `draft`: pemilihan masih dipersiapkan.
- `scheduled`: pemilihan siap tetapi kotak suara belum dibuka.
- `open`: kotak suara dibuka selama jadwal masih berlaku.
- `paused`: kotak suara dijeda sementara.
- `closed`: pemilihan selesai dan tidak dapat dibuka kembali melalui UI.

Status efektif dihitung oleh aplikasi server-side. Jika `ends_at` sudah
terlewati, kotak suara dianggap tidak menerima suara walaupun status database
masih `open`.

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
- Token dibuat dari 10 karakter acak kriptografis dengan alfabet huruf kapital dan angka yang mudah dibaca tanpa karakter ambigu seperti `O`, `0`, `I`, dan `1`.
- Token disimpan hanya sebagai HMAC-SHA-256 pada `token_hash`.
- Secret HMAC dibaca dari environment server-only `VOTER_TOKEN_PEPPER`; nilai ini harus secret acak yang kuat dan tidak boleh dikirim ke browser.
- Input token harus dinormalisasi dengan menghapus spasi/tanda hubung dan mengubah huruf menjadi kapital sebelum hashing.
- Token asli hanya tersedia satu kali saat dibuat atau diregenerasi. Setelah halaman ditutup atau dimuat ulang, aplikasi tidak dapat menampilkan token asli kembali.
- CSV token berisi `nama,kelas,token` dan harus disimpan, dicetak, serta dibagikan secara terbatas oleh panitia.
- File token tidak boleh diunggah ke tempat publik, dikirim ke grup terbuka, atau dicatat dalam audit log.
- Data lama yang memiliki `external_id` tetap dapat digunakan, tetapi token dan UI admin tidak menampilkan NIS/NISN.

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
- menerima `token_hash` yang dihitung server-side dari token mentah;
- memastikan token cocok dengan pemilih yang belum memilih;
- memastikan election efektif `open` dan berada dalam jadwal;
- membuat sesi pemilih dengan `session_hash` dan expiry.

RPC `get_voting_context`:
- memvalidasi sesi belum kedaluwarsa dan belum digunakan;
- memastikan kotak suara efektif `open`;
- mengembalikan kandidat aktif untuk election sesi.

RPC `cast_vote`:
- memvalidasi `session_hash`;
- mengunci baris sesi dan voter dengan `for update`;
- menolak sesi terpakai/kedaluwarsa;
- menolak election yang tidak `open`, dijeda, belum mulai, atau sudah lewat `ends_at`;
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
- Audit tidak mencatat identitas pemilih atau pasangan pemilih-kandidat.

Penghitungan hasil:
- Sumber hasil adalah agregasi langsung tabel `votes`.
- Sebelum status election `closed`, perolehan kandidat tidak ditampilkan.
- Setelah finalisasi, isi `votes` tidak dihitung ulang ke tabel snapshot pada fase ini.

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
