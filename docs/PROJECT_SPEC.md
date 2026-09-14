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

### Fase 8: Kontrol Kotak Suara

- Halaman `/admin/kotak-suara` mengontrol lifecycle kotak suara.
- Alur status pemilihan: `draft -> scheduled -> open -> paused -> open -> closed`.
- Status `closed` bersifat terminal dan tidak dapat dibuka kembali melalui UI.
- Kotak suara hanya dapat dibuka jika jadwal valid, waktu selesai belum terlewati, minimal dua kandidat aktif, terdapat pemilih, dan seluruh pemilih memiliki token.
- Status efektif dihitung di server; jika jadwal selesai sudah terlewati, kotak suara dianggap tidak menerima suara walaupun status database masih `open`.
- Fase ini belum membuat login pemilih, penyimpanan suara, penghitungan hasil, atau pengumuman.

### Fase 9: Login Token dan Pemberian Suara

- Pemilih masuk melalui `/pilih` menggunakan token satu kali.
- Token dinormalisasi dan di-hash dengan HMAC-SHA-256 memakai `VOTER_TOKEN_PEPPER`.
- Token mentah tidak dikirim melalui URL, tidak disimpan di localStorage/sessionStorage, dan tidak dicatat di log.
- Setelah token valid, aplikasi membuat sesi pemilih sementara selama 15 menit.
- Cookie sesi bersifat HttpOnly, SameSite=Strict, Secure pada production, dan hanya menyimpan secret acak sesi.
- Halaman `/pilih/kandidat` menampilkan kandidat aktif dari election sesi pemilih.
- Pemberian suara dilakukan melalui RPC database atomik agar insert `votes`, update `voters.has_voted`, dan penandaan sesi terpakai berhasil atau gagal bersama.
- Tabel `votes` tetap anonim dan tidak menyimpan voter, session, token, nama, kelas, atau external id.
- Halaman `/pilih/selesai` tidak menampilkan kandidat yang dipilih.
- Fase ini belum membuat grafik hasil, publikasi hasil, atau pengumuman.

### Fase 10: Penghitungan dan Finalisasi Hasil

- Halaman `/admin/hasil` menampilkan partisipasi agregat untuk admin sekolah.
- Sebelum status pemilihan `closed`, perolehan kandidat disembunyikan.
- Setelah `closed`, admin dapat melihat perolehan suara kandidat dari agregasi tabel `votes`.
- Sistem menentukan suara tertinggi server-side dan menangani hasil seri tanpa memilih pemenang tunggal otomatis.
- Finalisasi menyimpan `finalized_at` dan `finalized_by`, serta tidak menghitung ulang isi `votes`.
- Setelah finalisasi, kandidat dan konfigurasi penting pemilihan tidak dapat diedit melalui UI.
- Status siap diumumkan disimpan melalui `published_at`, tetapi fase ini belum membuat halaman publik hasil, countdown, atau animasi pengumuman.

### Fase 11: Pengumuman Hasil Publik

- Halaman `/admin/pengumuman` memulai momen pengumuman setelah election `closed`, hasil difinalisasi, dan `published_at` terisi.
- Pengumuman hanya dapat dimulai sekali. Server menyimpan `announcement_started_at` dan `results_revealed_at`.
- Halaman publik `/pengumuman` menampilkan layar tunggu, countdown 10 detik tersinkron dengan waktu server, lalu mengambil hasil final setelah waktu reveal tercapai.
- Endpoint publik hasil hanya mengembalikan agregat kandidat setelah `results_revealed_at` terlewati.
- Hasil publik menampilkan kandidat, jumlah suara, persentase, dan kandidat terpilih jika tidak seri.
- Jika suara tertinggi seri, aplikasi tidak memilih pemenang tunggal otomatis.
- Endpoint publik tidak mengembalikan data pemilih, sesi, token, atau hubungan pemilih dengan kandidat.

### Fase 11.5: Arsip Pemilihan dan Pemilihan Baru

- Pemilihan `closed` tetap terminal dan tidak dapat dibuka kembali.
- Admin dapat mengarsipkan pemilihan hanya jika statusnya `closed` dan hasilnya sudah difinalisasi.
- Arsip menyimpan `archived_at` tanpa menghapus kandidat, pemilih, token, sesi, suara, audit log, atau hasil lama.
- Satu sekolah hanya boleh memiliki satu pemilihan current yang belum diarsipkan.
- Setelah pemilihan lama diarsipkan, admin dapat membuat pemilihan baru dengan status `draft`.
- Pemilihan baru tidak menyalin kandidat, pemilih, token, sesi, suara, finalisasi, atau pengumuman dari arsip lama.
- Pemilihan dapat ditandai sebagai `Pemilihan Percobaan` tanpa bypass keamanan.
- Halaman `/admin/arsip-pemilihan` menampilkan arsip dan hasil agregat lama untuk admin sekolah terkait.
