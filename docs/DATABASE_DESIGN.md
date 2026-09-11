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
- `closed`
- `archived`

Kolom penting:
- `starts_at` dan `ends_at` untuk jadwal.
- `term_label` untuk periode kepengurusan.
- `results_visibility` untuk aturan publikasi hasil.
- `published_at` dan `finalized_at` untuk fase hasil.

### `candidates`

Menyimpan kandidat pada satu pemilihan.

Aturan:
- `ballot_number` harus positif.
- Nomor urut unik per pemilihan.
- Kandidat terikat ke `elections`.

### `voters`

Menyimpan daftar pemilih sah untuk satu pemilihan.

Kolom penting:
- `external_id`: nomor induk atau identifier sekolah.
- `token_hash`: hash dari token/kode akses pemilih.
- `has_voted` dan `voted_at`: status penggunaan hak suara.
- `token_revoked_at`: menandai token yang dibatalkan.

Catatan operasional:
- Token mentah hanya boleh muncul saat dibuat atau dicetak.
- Jika token hilang, panitia sebaiknya membuat ulang token dan membatalkan token lama.

### `votes`

Menyimpan suara yang sudah masuk.

Aturan:
- Tidak menyimpan `voter_id`.
- `candidate_id` wajib berasal dari `election_id` yang sama.
- `ballot_fingerprint` unik per pemilihan untuk membantu pencegahan submit ganda tanpa membuka identitas pemilih.

### `audit_logs`

Menyimpan jejak aksi penting seperti perubahan data sekolah, pemilihan, kandidat, pemilih, suara, dan publikasi hasil.

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

- Tidak ada RPC `cast_vote`.
- Tidak ada CRUD kandidat atau pemilih.
- Tidak ada form manajemen kandidat atau pemilih.
- Tidak ada alur login pemilih.
- Tidak ada impor Excel.
- Tidak ada grafik hasil.
- Tidak ada animasi pengumuman.
