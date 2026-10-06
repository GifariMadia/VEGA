# Presentasi VEGA - Rabu, 7 Oktober 2026

Versi ini untuk demo dan percobaan lokal oleh SPV. ZIP dari Downloads hanya dibaca sebagai referensi flow. App yang diperbaiki ada di workspace ini.

Pemeriksaan 6 Oktober: 17 tes backend lulus; pemeriksaan TypeScript dan build lulus. Uji HTTP lokal berhasil untuk kedua role, preview/simpan Budget dan GL, penggantian GL dengan backup, dan total dashboard yang tidak berubah setelah penggantian file yang sama. Browser memverifikasi login/logout, dashboard terisi, filter kuartal, matriks, serta pembatasan menu viewer; tidak ada error console pada alur ini. Ini bukan verifikasi seluruh lingkungan production.

Database demo sudah berisi kedua workbook lokal dan dua COA tambahan yang didaftarkan untuk smoke test. Jika mengunggah file yang sama untuk demonstrasi, preview akan menawarkan penggantian. Nama dua akun tambahan masih berupa label kode GL dan kategorinya belum ditetapkan; perbaiki memakai master resmi di Daftar COA jika diperlukan untuk presentasi.

## Menjalankan

Dari folder yang berisi package.json, jalankan `./Start-Presentation.ps1` di PowerShell, lalu buka http://127.0.0.1:3000. Simpan terminal tetap terbuka. Jika port 3000 dipakai app lain, hentikan app tersebut dahulu.

Mode ini memakai PostgreSQL 18.1, hasil build dan satu server, tanpa Vite atau reload watcher. Untuk membangun ulang setelah perubahan kode, jalankan `npm run demo`. Lingkungan Python dan dependensi Node harus sudah tersedia sesuai README.

Kredensial lokal di `tmp/presentation/accounts.txt`: akun `admin` adalah Administrator, akun `viewer` adalah Viewer. Password dibuat acak saat pertama dijalankan. Startup berikutnya mempertahankan akun, password, dan data. Database aktif sekarang PostgreSQL `vega_db`, sesuai `.env.postgresql` dan `.env`. Data SQLite sebelumnya di `tmp/presentation/vega.db` dipertahankan sebagai salinan lama; app normal tidak lagi memakainya. Backup PostgreSQL di `tmp/postgresql-backups/`.

## Alur 10-15 menit

1. Login admin. Tunjukkan nama dan peran di header serta menu Manajemen User.
2. Buka Unggah, pilih Budget, pilih workbook Budget .xlsx. Periksa sheet, FY, total dan sampel pada preview; baru simpan. Preview sendiri belum menyimpan data.
3. Buka Daftar COA. Akun budget berasal dari unggahan. GL dengan COA yang belum terdaftar akan ditolak dengan alasan; daftarkan akun tersebut lewat admin sebelum preview GL lagi. Pada workbook lokal Budget Dummy dan GL Dummy ada dua kode GL tambahan: 770102000 dan 770107001. Isi nama/kategori sesuai master departemen; jangan mengarang kategori untuk mendapatkan grafik yang tampak lengkap.
4. Unggah GL .xlsx, preview, periksa periode fiskal dan jumlah baris yang dimuat/disaring, lalu simpan. Satu file GL harus berisi satu Pd. Workbook GL lokal memakai Pd. 03 (Juni), sehingga bulan lain belum memiliki aktual.
5. Buka Dasbor. Jelaskan sumber Budget aktif dan jumlah bulan GL. FY mengikuti April-Maret; aktual = converted debit USD minus converted credit USD untuk scope MIS. Total kartu, kategori dan akun berasal dari unggahan aktif, bukan mock data.
6. Coba FY, kategori dan kuartal. Kartu total/detail mengikuti kuartal; tren bulanan/kuartal dan proyeksi tahunan tetap memberi konteks satu FY, mengikuti kategori. Angka negatif digambar ke kiri garis nol. Status alokasi berlaku untuk budget negatif.
7. Buka Matriks Bulanan. Sel menampilkan Budget / Aktual per akun; tanda '-' pada aktual berarti GL belum diunggah. Angka 0.00 pada bulan yang dimuat berarti benar-benar nol. Ekspor CSV tersedia di dashboard dan matriks.
8. Buka Riwayat Unggahan. Coba upload ulang periode yang sama: pilih mengganti secara eksplisit atau batal. Penggantian membuat backup dahulu dan tidak menggandakan angka. Pembatalan batch menghapus datanya dan tidak memulihkan versi sebelumnya; lakukan hanya pada database demo.
9. Buka Manajemen User. Admin dapat membuat viewer, mengubah role, menonaktifkan dan reset password. Admin tidak bisa menurunkan role atau menonaktifkan akun sendiri; minimal satu admin aktif dipertahankan.
10. Logout lalu login viewer. Viewer boleh melihat dashboard, matriks, COA dan riwayat, serta ekspor; upload dan manajemen user dibatasi oleh UI dan server. Minta SPV mencoba filter, melihat per akun dan membandingkan dengan Excel.

## Batas penerimaan

Angka harus dibandingkan dengan workbook yang benar-benar akan dipakai saat presentasi. Uji repository memakai dua workbook lokal yang tersedia; hasilnya tidak mewakili file baru atau pivot resmi Finance. Budget adalah blok Budget pada sheet MIS (FC), bukan Forecast, Actual atau subtotal ganda. GL memakai USD conversion, bukan mata uang native.

App saat ini memakai toleransi nol setelah pembulatan dua desimal. Timeline PDF mencantumkan +/-5% sebagai asumsi yang perlu approval. Konfirmasi aturan status dengan SPV; nominal budget dan aktual tidak berubah akibat pilihan threshold.

Ini belum merupakan sign-off production. Migrasi lokal PostgreSQL, jumlah baris, total nominal, kedua login, pembatasan viewer, preview GL dan pembuatan backup pg_dump sudah diverifikasi. Restore backup dan rekonsiliasi pivot resmi tetap perlu diuji pada lingkungan departemen. Demo localhost hanya dapat dibuka di laptop ini; SPV dapat mencobanya langsung di laptop. Akses dari laptop lain membutuhkan host dan pengaturan jaringan yang disetujui.
