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

Berisi modul alur pemberian suara. Direktori ini disiapkan untuk fase berikutnya dan belum berisi implementasi voting pada fase fondasi.

### `src/features/results`

Berisi modul rekap hasil, agregasi suara, dan tampilan hasil pemilihan sesuai aturan publikasi.

### `src/lib`

Berisi integrasi library dan service bersama, misalnya client Supabase pada fase berikutnya. Pada fase pertama, Supabase belum dipasang.

### `src/types`

Berisi tipe TypeScript bersama untuk domain aplikasi, payload form, response service, dan kontrak data.

### `src/config`

Berisi konfigurasi aplikasi yang dapat berubah antar sekolah atau antar environment. Nilai rahasia tetap harus menggunakan environment variables.

### `src/utils`

Berisi helper murni yang tidak bergantung pada framework atau domain tertentu, seperti formatter tanggal, parser, dan utility validasi umum.

## Batasan Fase Pertama

- Tidak memasang Supabase.
- Tidak membuat database atau skema tabel.
- Tidak membuat dashboard.
- Tidak membuat fitur voting.
- Tidak menambahkan konfigurasi yang belum diperlukan.
- Tidak menggunakan `any` dalam TypeScript.
