# VEGA
## Variance Evaluation & Graphical Analytics
### Aplikasi web pemantau anggaran & realisasi departemen, diakses lewat jaringan lokal

*"Every number, clear as starlight. Every insight, connected like a constellation."*

Tim: 2 magang SI/MIS · Durasi: ~10 minggu

> Dokumen ini sengaja tetap dalam Bahasa Indonesia karena pembacanya adalah pihak
> departemen. Seluruh dokumen teknis lainnya berbahasa Inggris.

---

## Masalah Saat Ini

Setiap bulan, angka perbandingan anggaran vs realisasi dibuat ulang dengan tangan:

- File **General Ledger** difilter ke departemen IT.
- Kode akun dipecah manual dengan `LEFT()` dan `RIGHT()`.
- Setiap COA dicari satu per satu, lalu di-*pivot*.
- Selisihnya dibaca dengan mata.

Akibatnya:

- Pekerjaan yang sama diulang tiap bulan, dan hasilnya bergantung pada ketelitian saat itu.
- Status **overbudget / underbudget** baru terlihat setelah dihitung, bukan langsung.
- Pertanyaan *"sampai akhir tahun masih aman atau tidak?"* tidak terjawab oleh file yang ada. Perlu perhitungan tambahan lagi.
- Tidak ada satu tampilan yang menjawab semuanya sekaligus.

---

## Solusi: VEGA

VEGA **tidak mengubah cara Bapak/Ibu bekerja dengan Excel.** File yang sudah ada tetap dipakai: VEGA yang membaca dan menghitungnya.

1. **Unggah file anggaran** satu kali per tahun fiskal.
2. **Unggah file GL** satu kali setiap bulan.
3. VEGA langsung menampilkan **perbandingan anggaran vs realisasi** per COA di dashboard.
4. VEGA menandai status: **Overbudget / On-track / Underbudget**.
5. VEGA memproyeksikan **posisi sampai akhir tahun fiskal**.

Rumus inti: **Selisih = Anggaran − Realisasi**

Tahun fiskal mengikuti yang berlaku di perusahaan: **April s.d. Maret** (FY26 = Apr 2026 s.d. Mar 2027).

---

## Bentuk Aplikasi

- **Aplikasi web yang diakses lewat jaringan lokal departemen.** Cukup dibuka di browser, tidak ada yang perlu diinstal di komputer masing-masing pengguna.
- Aplikasi dan datanya tinggal di **satu komputer host** di departemen, **terisolasi dari jaringan utama perusahaan**.
- Pengguna lain mengaksesnya dengan mengetik nama komputer host di browser.
- Lingkup awal: **satu divisi, sekitar 6 pengguna.**

> **Perubahan dari rencana awal:** semula direncanakan aplikasi desktop yang diinstal
> per komputer. Atas permintaan pihak departemen, bentuknya diubah menjadi aplikasi
> web lokal. Konsekuensinya: pembaruan aplikasi cukup dilakukan di satu komputer host,
> tidak perlu diinstal ulang di setiap komputer pengguna. Versi mobile tidak dilanjutkan.

---

## Fitur Utama

| Fitur | Keterangan |
|---|---|
| Login & Hak Akses | 2 peran: **Administrator** dan **User biasa** |
| Template Excel | Aplikasi menyediakan format standar yang siap diisi, agar file yang diunggah sudah pasti sesuai |
| Unggah Anggaran | File anggaran satu tahun fiskal, per COA |
| Unggah GL Bulanan | Realisasi dibaca dari file GL — **tidak ada input manual** |
| Pratinjau Sebelum Simpan | Setelah file diunggah, sistem menampilkan **pratinjau**: periode yang terbaca, jumlah baris, total nominal, dan contoh baris — **belum ada yang tersimpan**. Sesuai → lanjut. Tidak sesuai → batal, dan alasannya ditampilkan |
| Laporan Hasil Unggah | Jumlah baris terbaca / masuk / ditolak, **beserta alasan tiap baris yang ditolak** |
| Riwayat Unggahan | Setiap unggahan tercatat dan bisa dibatalkan |
| Master Data COA | **Hanya dibaca.** Daftar kode akun dibentuk dari file yang diunggah — tidak ada tambah/ubah/hapus di aplikasi. Salah kode atau nama diperbaiki di Excel-nya, lalu diunggah ulang |
| Dashboard Analitik | Grafik perbandingan, tren per kuartal, indikator status, proyeksi akhir tahun |
| Keamanan Dasar | Password ter-hash, akses dibatasi per peran |
| Backup Otomatis | Database dibackup terjadwal, dan otomatis sebelum data lama ditimpa |

---

## Dua Hal yang Kami Tangani Secara Khusus

Keduanya adalah sumber angka salah yang paling mungkin terjadi, jadi kami tangani di desain, bukan diserahkan ke ketelitian pengguna.

**1. File GL tertinggal satu bulan.**
File yang diterima bulan Juli berisi transaksi bulan Juni. Kalau periode dipilih dari dropdown oleh pengguna, satu bulan realisasi bisa masuk ke kotak yang salah. Karena itu **VEGA menentukan periodenya dari tanggal transaksi di dalam file itu sendiri.** Kalau isinya tidak cocok dengan yang dinyatakan pengguna, unggahan **berhenti dan bertanya**, bukan menebak.

**2. Unggah ulang tidak boleh menggandakan angka.**
Kalau GL bulan Juni diunggah dua kali, realisasi Juni tidak boleh jadi dua kali lipat. VEGA **menimpa** data bulan yang sama, bukan menambahkannya. Bulan lain tidak tersentuh.

Sejalan dengan itu: **koreksi dilakukan dengan mengunggah ulang file yang sudah benar**, bukan dengan mengubah angka di aplikasi. Dengan begitu setiap angka di dashboard selalu bisa dilacak kembali ke dokumen sumbernya.

---

## Kalau File-nya Tidak Bisa Dipakai

Prinsipnya: **kesalahan yang terlihat jauh lebih baik daripada angka salah yang diam.**

| Keadaan | Yang dilakukan VEGA |
|---|---|
| Sheet atau kolom tidak sesuai | File **ditolak seluruhnya**, dengan penjelasan kolom mana yang bergeser |
| Kode akun tidak ada padanannya di COA | Baris itu **dilaporkan**, tidak dibuang diam-diam |
| Nominal negatif, bukan angka, atau desimalnya memakai koma | Baris disisihkan beserta alasannya |
| Tidak ada satu baris pun yang valid | Unggahan ditolak, tidak ada yang tersimpan |
| Gagal di tengah proses simpan | Semua dibatalkan — tidak ada bulan yang tersimpan setengah |

---

## Contoh Dashboard (gambaran)

- **Kartu ringkasan**: total anggaran, total realisasi, selisih.
- **Grafik batang**: anggaran vs realisasi per kategori COA.
- **Grafik tren**: realisasi per kuartal (Q1 Apr-Jun, Q2 Jul-Sep, Q3 Okt-Des, Q4 Jan-Mar).
- **Kartu proyeksi**: perkiraan posisi akhir tahun fiskal, sisa anggaran, dan batas belanja bulanan agar tetap aman.
- **Indikator warna**: merah = overbudget, hijau = masih di bawah anggaran.
- **Filter**: tahun fiskal, kuartal/bulan, kategori, departemen.

*Mockup final akan diajukan untuk persetujuan sebelum pengembangan (Fase 2, Minggu 3).*

---

## Siapa Memakai Apa

**Administrator**
- Kelola pengguna dan perannya, satu-satunya data yang diubah lewat aplikasi
- Unggah file anggaran dan file GL
- Batalkan unggahan yang salah
- Lihat seluruh laporan

**User biasa**
- Lihat dashboard dan laporan
- Tidak bisa mengunggah maupun mengubah data

---

## Tahapan & Jadwal

| Minggu | Hasil yang diserahkan |
|---|---|
| 1 | ✅ Analisis proses bisnis + Flowchart alur sistem |
| 2 | Spesifikasi kebutuhan, Use Case, ERD, spesifikasi format Excel |
| 3 | Mockup tampilan (disetujui bersama) |
| 5 | Login, hak akses, dan pengelolaan pengguna berfungsi |
| 6 | Unggah Excel berfungsi, termasuk uji unggah ulang tidak menggandakan angka |
| 7 | Perhitungan selisih, status, dan proyeksi akhir tahun di dashboard |
| 8 | Pengamanan aplikasi + backup otomatis |
| 9 | Pengujian & **pencocokan angka VEGA dengan pivot Excel milik departemen** (termasuk UAT) |
| 10 | **Aplikasi terpasang di komputer host + User Manual + serah terima** |

**Uji terima yang paling menentukan** adalah Minggu 9: kalau angka VEGA berbeda dengan hasil pivot Excel yang sudah ada, yang salah adalah VEGA sampai terbukti sebaliknya.

---

## Yang Kami Butuhkan dari Bapak/Ibu

Nomor 1 adalah yang paling mendesak: pekerjaan pembacaan file (Minggu 5-6) tidak bisa diselesaikan tanpanya.

1. **File anggaran FY26 dan satu contoh file GL** (boleh disamarkan/redacted). Kami butuh posisi kolom yang sebenarnya dan cara kode akun dipecah.
2. **Daftar COA dan kategorinya.** Apakah ada master list, atau kategori diambil dari bagian kode akunnya?
3. **Batas ambang status.** Selisih berapa persen yang dianggap overbudget? Sementara kami pakai ±5%.
4. **Konfirmasi penamaan tahun fiskal.** FY26 = April 2026 s.d. Maret 2027, yaitu dinamai menurut tahun *awal*. Sebagian perusahaan menamainya menurut tahun akhir, dan kalau terbalik seluruh layar salah label.
5. **Bentuk anggaran.** Satu angka setahun yang dibagi 12, atau sudah dirinci 12 baris bulanan?
6. **Komputer host**: satu PC dengan alamat tetap, plus izin admin lokal untuk memasang layanannya dan membuka port-nya.
7. **Kebijakan backup**: berapa lama backup disimpan, dan salinannya diletakkan di mana.
8. Waktu singkat untuk **persetujuan mockup** (Minggu 3) dan **UAT** (Minggu 9).

---

## Catatan Keamanan yang Perlu Disampaikan Terbuka

Lalu lintas antar komputer di jaringan lokal ini **tidak dienkripsi (HTTP biasa)**. Ini keputusan yang kami ambil secara sadar, dengan alasan jaringannya sudah terisolasi dari jaringan utama perusahaan, dan sertifikat HTTPS untuk nama komputer internal menambah beban pemeliharaan yang tidak sebanding pada lingkup 6 pengguna.

Yang tetap dilakukan: password disimpan dalam bentuk ter-hash (tidak pernah polos dan tidak bisa dibalik), hak akses diperiksa di setiap endpoint, dan aplikasi dijaga terhadap SQL Injection serta XSS.

Kami mencantumkan ini di User Manual, bukan menyembunyikannya. Kalau nanti dinilai perlu HTTPS, itu bisa ditambahkan.

---

# Terima Kasih

**VEGA**: Variance Evaluation & Graphical Analytics

Pertanyaan & masukan sangat kami harapkan.
