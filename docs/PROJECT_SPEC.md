# Project Spec: E-Voting Sekolah

## Tujuan Aplikasi

E-Voting Sekolah adalah template aplikasi pemilihan Ketua OSIS berbasis web yang dapat digunakan ulang oleh sekolah berbeda. Aplikasi dirancang agar identitas sekolah, periode pemilihan, kandidat, jadwal, dan daftar pemilih tidak ditulis permanen di dalam komponen antarmuka.

Template ini akan dikembangkan dengan Next.js App Router, TypeScript, Tailwind CSS, Supabase, dan Vercel. Pada fase pertama, proyek hanya menyiapkan fondasi struktur aplikasi dan dokumentasi awal tanpa integrasi Supabase, database, fitur voting, atau dashboard.

## Pengguna Aplikasi

- Admin sekolah: mengatur data sekolah, periode pemilihan, kandidat, dan daftar pemilih.
- Panitia pemilihan: memantau kesiapan pemilihan dan membantu proses operasional.
- Pemilih siswa: masuk ke aplikasi dan memberikan suara pada periode yang ditentukan.
- Pengamat hasil: melihat hasil pemilihan sesuai izin akses yang diberikan sekolah.

## Fitur Inti

- Konfigurasi profil sekolah dan periode pemilihan.
- Manajemen kandidat Ketua OSIS.
- Manajemen daftar pemilih.
- Autentikasi dan otorisasi pengguna sesuai peran.
- Proses pemberian suara yang hanya dapat dilakukan satu kali oleh pemilih sah.
- Rekap hasil pemilihan.
- Tampilan mobile-first yang tetap nyaman digunakan pada Chromebook.

## Tahapan Pengembangan

### Fase 1: Fondasi Proyek

- Audit proyek Next.js awal.
- Gunakan struktur `src/app`.
- Bersihkan halaman bawaan create-next-app.
- Siapkan struktur direktori aplikasi.
- Buat halaman awal sederhana.
- Buat metadata dasar aplikasi.
- Dokumentasikan spesifikasi dan arsitektur awal.

### Fase 2: Model Data dan Integrasi Supabase

- Rancang tabel untuk sekolah, pemilihan, kandidat, pemilih, suara, dan peran pengguna.
- Tambahkan konfigurasi Supabase melalui environment variables.
- Siapkan client/server utility Supabase.
- Dokumentasikan aturan akses data awal.

Output fondasi fase kedua:

- Dependensi `@supabase/supabase-js` dan `@supabase/ssr`.
- `.env.example` untuk konfigurasi Supabase public.
- Helper Supabase browser dan server.
- Migration SQL awal di `supabase/migrations`.
- Tipe database awal di `src/types/database.ts`.
- Dokumentasi rancangan database di `docs/DATABASE_DESIGN.md`.

### Fase 3: Admin dan Manajemen Data

- Bangun area admin untuk konfigurasi sekolah dan pemilihan.
- Bangun manajemen kandidat dan pemilih.
- Tambahkan validasi form dan state kosong.

Fondasi awal fase ketiga:

- Halaman login admin di `/admin/login`.
- Login memakai email dan password Supabase Auth.
- Tidak ada pendaftaran akun publik.
- Logout admin melalui Server Action.
- Proteksi `/admin` berdasarkan user Supabase Auth dan role `admin` pada tabel `profiles`.
- Kerangka dashboard admin tanpa CRUD sekolah, pemilihan, kandidat, pemilih, impor Excel, voting, grafik hasil, atau animasi pengumuman.

### Fase 4: Voting

- Bangun alur autentikasi pemilih.
- Bangun halaman pemilihan kandidat.
- Pastikan satu pemilih hanya dapat memberikan satu suara.
- Tambahkan state jadwal pemilihan seperti belum mulai, berlangsung, dan selesai.

Fondasi pengaturan sebelum fitur voting:

- Halaman `/admin/pengaturan` untuk nama sekolah, slug sekolah, zona waktu, dan nama admin/pengelola.
- Halaman `/admin/pemilihan` untuk nama kegiatan, periode kepengurusan, jadwal mulai, jadwal selesai, dan izin tampilan hasil setelah diumumkan.
- Dashboard `/admin` menampilkan ringkasan sekolah dan kegiatan pemilihan.
- Belum membuat kandidat, pemilih, impor Excel, voting, penghitungan, atau pengumuman hasil.

### Fase 5: Hasil dan Publikasi

- Bangun rekap hasil.
- Tambahkan pengaturan visibilitas hasil.
- Siapkan deployment Vercel dan dokumentasi penggunaan template untuk sekolah baru.

Fondasi pengelolaan kandidat sebelum fitur pemilih dan voting:

- Halaman `/admin/kandidat` untuk menampilkan, menambah, mengedit, dan menghapus calon Ketua OSIS.
- Form kandidat memuat nomor urut, nama lengkap, kelas, foto, visi, misi, dan status aktif.
- Foto kandidat disimpan di Supabase Storage bucket `candidate-photos`.
- Belum membuat pemilih, impor Excel, token, voting, hasil, atau mode pengumuman.

### Fase 6: Daftar Pemilih

- Halaman `/admin/pemilih` untuk melihat, mencari, memfilter, menambah, mengedit, dan menghapus pemilih.
- Kolom pemilih: nama, kelas, jenis kelamin, dan status memilih.
- Impor daftar pemilih dari `.xlsx` dan `.csv`.
- Template impor memakai header `nama,kelas,jenis_kelamin`.
- Preview impor wajib dilakukan sebelum konfirmasi simpan.
- NIS/NISN tidak diwajibkan karena pemilih nantinya masuk memakai token.
- Data lama yang masih memiliki NIS/NISN tetap dipertahankan di database untuk kompatibilitas, tetapi tidak ditampilkan pada antarmuka admin.
- Belum membuat token pemilih, proses voting, hasil, atau mode pengumuman.

### Fase 7: Token Pemilih

- Admin dapat membuat token untuk seluruh pemilih yang belum memiliki token.
- Admin dapat meregenerasi token satu pemilih yang belum memberikan suara.
- Token asli hanya ditampilkan satu kali setelah dibuat atau diregenerasi.
- Database hanya menyimpan `token_hash`, bukan token asli.
- Hash token memakai HMAC-SHA-256 dengan secret server-only `VOTER_TOKEN_PEPPER`.
- Token tidak boleh dibuat setelah pemilihan dibuka atau jadwal mulai tercapai.
- Belum membuat login pemilih, proses voting, hasil, atau mode pengumuman.
