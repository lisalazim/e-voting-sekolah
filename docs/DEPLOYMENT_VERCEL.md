# Deployment Vercel

Dokumen ini adalah panduan manual deployment production. Jangan menyalin `.env.local`, nilai secret, atau database production ke branch Preview.

## Environment Variable

| Nama | Visibilitas | Wajib | Scope Vercel awal | Sumber nilai | Boleh masuk Git |
| --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Ya | Production | Supabase Project URL | Ya sebagai nama/placeholder, bukan konfigurasi aktif |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Ya | Production | Supabase Publishable Key | Ya sebagai nama/placeholder |
| `SUPABASE_URL` | Server-only | Ya | Production | Supabase Project URL | Tidak sebagai nilai aktif |
| `SUPABASE_SECRET_KEY` | Server-only | Ya | Production | Supabase Secret Key `sb_secret_...` | Tidak |
| `VOTER_TOKEN_PEPPER` | Server-only | Ya | Production | Secret acak kuat yang dibuat operator | Tidak |
| `VOTER_RATE_LIMIT_PEPPER` | Server-only | Ya | Production | Secret acak kuat yang dibuat operator | Tidak |

`NODE_ENV` dan `VERCEL` disediakan runtime dan tidak perlu dimasukkan manual. Secret tidak boleh memakai awalan `NEXT_PUBLIC_`.

## Sebelum Deployment

1. Terapkan seluruh migration Supabase secara berurutan, termasuk hardening login dan akses raw votes.
2. Pastikan branch `main` sudah diperiksa dan di-push ke GitHub.
3. Pastikan `.env.local`, `.vercel`, dan file secret tidak masuk commit.
4. Jalankan `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build`, dan `npm.cmd audit --omit=dev`.
5. Periksa `.next/static` dan diff Git untuk pola secret sebelum push.
6. Pastikan Supabase production memiliki admin profile yang benar dan data uji tidak menjadi current election.

## Membuat Project Vercel

1. Masuk ke Vercel.
2. Pilih **Add New -> Project**.
3. Import repository GitHub aplikasi ini.
4. Gunakan **Framework Preset: Next.js**.
5. Gunakan root repository sebagai **Root Directory**.
6. Biarkan build command mengikuti `package.json`, yaitu `npm run build`.
7. Tambahkan keenam environment variable pada tabel di atas satu per satu untuk scope **Production**.
8. Jangan mengunggah atau menyalin file `.env.local`.
9. Jangan memasukkan secret production ke scope Preview pada tahap awal.
10. Jalankan deployment dan catat URL `*.vercel.app` yang diterbitkan.

## Supabase Auth

1. Buka pengaturan URL Supabase Auth.
2. Atur **Site URL** ke URL production Vercel.
3. Tambahkan URL redirect production hanya jika alur Auth yang digunakan membutuhkannya.
4. Jangan menambahkan wildcard Preview ke Supabase production.
5. Redeploy Vercel setelah perubahan environment.

## Preview Deployment

Preview branch tidak boleh menerima Secret Key, pepper, atau URL database production secara default. Tanpa environment tersebut, health check akan berstatus `degraded` dan login voter privileged gagal tertutup.

Jika Preview diperlukan, buat project Supabase staging terpisah beserta key, pepper, user admin, Storage bucket, dan migration sendiri. Jangan gunakan election production untuk eksperimen branch.

## Verifikasi Setelah Deploy

1. Buka `/api/health`; pastikan hanya status, timestamp, dan status konfigurasi yang tampil.
2. Uji `/admin/login`, login, proteksi route `/admin`, dan logout.
3. Uji `/pilih` dengan token uji dan `/pengumuman` pada perangkat berbeda.
4. Periksa Vercel Function Logs. Log tidak boleh memuat token, IP, cookie, hash, secret, atau pilihan kandidat.
5. Pastikan HTTPS aktif dan cookie voter memiliki atribut Secure.
6. Periksa Network/HTML/client bundle untuk memastikan tidak ada Secret Key atau pepper.

## Checklist Production

- [ ] Admin dapat login dan logout.
- [ ] Route `/admin` menolak pengguna tanpa session admin.
- [ ] Pengaturan sekolah hanya mengubah sekolah admin.
- [ ] Kandidat dan foto maksimal 2 MB dapat dikelola.
- [ ] Impor pemilih dan preview bekerja.
- [ ] Token dapat dibuat dan diunduh satu kali.
- [ ] Login token enam angka bekerja.
- [ ] Percobaan salah keenam diblokir pada window rate limit.
- [ ] Kotak suara dapat dibuka, dijeda, dilanjutkan, dan ditutup permanen.
- [ ] Satu pemilih hanya dapat memilih sekali.
- [ ] Token terpakai ditolak.
- [ ] Hasil dapat difinalisasi tanpa membuka raw votes ke publik.
- [ ] Countdown sinkron pada dua perangkat.
- [ ] Pengumuman menampilkan hasil setelah reveal.
- [ ] Election selesai dapat diarsipkan.
- [ ] Tampilan nyaman pada mobile dan Chromebook.
- [ ] HTTPS aktif dan cookie production memakai Secure.
- [ ] Secret tidak ditemukan pada client bundle.
- [ ] Browser tidak menerima error database sensitif.
- [ ] Endpoint publik tidak mengembalikan data voter.

## Rollback

1. Hentikan penggunaan deployment bermasalah melalui Vercel Dashboard.
2. Promote deployment production terakhir yang diketahui sehat atau gunakan rollback Vercel.
3. Jangan membuka kembali election `closed` dan jangan menghapus votes sebagai bagian rollback aplikasi.
4. Jika perubahan melibatkan migration, lakukan koreksi melalui migration baru setelah menilai data; jangan mengedit migration yang sudah diterapkan.
5. Jalankan smoke test login admin, login voter, voting, hasil, dan health check setelah rollback.

## Rotasi Secret

Jika Secret Key bocor:

1. Buat Secret Key pengganti di Supabase.
2. Perbarui `SUPABASE_SECRET_KEY` pada environment Production Vercel.
3. Redeploy dan verifikasi login voter.
4. Cabut key lama setelah deployment baru sehat.
5. Periksa log dan audit akses selama periode kebocoran.

Jika salah satu pepper bocor, buat nilai acak kuat baru dan perbarui environment. Rotasi `VOTER_TOKEN_PEPPER` membatalkan token pemilih yang sudah diterbitkan sehingga harus dijadwalkan bersama regenerasi token. Rotasi `VOTER_RATE_LIMIT_PEPPER` membuat bucket lama tidak terpakai; data tersebut akan dibersihkan sesuai retensi.

Supabase Secret Key melewati RLS dan hanya boleh digunakan oleh client `server-only` untuk RPC login voter yang terbatas. Referensi: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys). Header IP production mengikuti dokumentasi [Vercel request headers](https://vercel.com/docs/headers/request-headers).
