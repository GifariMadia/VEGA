# Perbandingan Technology Stack — VEGA

**Variance Evaluation & Graphical Analytics · Aplikasi web internal, jaringan lokal departemen**

Tim: 2 magang SI/MIS · Durasi: ~10 minggu · Pilot: 1 divisi, ±6 pengguna

> Dokumen ini sengaja ditulis dalam Bahasa Indonesia karena dipresentasikan kepada
> pihak departemen. Dokumen teknis lainnya berbahasa Inggris.
> Dokumen pendamping: [Project-Plan.md](../Internal/Project-Plan.md) (jadwal & pembagian kerja),
> [Flowchart.md](Flowchart.md) (spesifikasi perilaku sistem).

---

## 0. Keputusan Akhir — dibuat setelah dokumen ini disusun

**Stack yang dipakai: Opsi C — Python 3.13 + FastAPI + React 18 (Vite) + PostgreSQL 18.**

Bagian 8 di bawah merekomendasikan Opsi A (SQLite). **Rekomendasi itu tidak dicabut dan
tidak diedit** — ia tetap berdiri sebagai catatan jujur dari perbandingan yang kami
lakukan, lengkap dengan angkanya. Yang berubah adalah keputusannya, dan keputusan itu
milik klien: departemen meminta PostgreSQL, dan meminta dengan sadar akan biayanya.

Yang didapat dengan Opsi C, dan ini nyata:

- **Aritmetika uang eksak.** `NUMERIC(18,2)` di PostgreSQL dipetakan langsung ke `Decimal`
  Python oleh psycopg, tanpa melewati float. Ini yang paling mengena, karena BR-6 memakai
  zero tolerance — residu float sekecil 1e-13 membuat setiap akun terbaca OVER atau UNDER.
  Di SQLite hal ini harus ditutup sendiri dengan `TypeDecorator`.
- **Banyak penulis serentak**, dan database tidak terkunci harus di disk lokal host.
- **Tidak ada migrasi database di kemudian hari** kalau VEGA meluas ke divisi lain.

Yang dibayar, dan ini juga nyata: satu service Windows tambahan yang harus dipasang,
dirawat, di-backup dengan prosedur sendiri (`pg_dump`, bukan `VACUUM INTO`), dijelaskan
saat serah terima, dan bisa mati sendiri saat demo. Estimasi biaya jadwalnya ada di
bagian 6: sekitar 2–3 hari.

Perubahan ini **tidak menyentuh sisi Python**. Uji empiris openpyxl vs ExcelJS di bagian 5
tetap berlaku apa adanya, karena ia menguji pembacaan Excel, bukan database.

---

## 1. Tujuan Dokumen

Menyajikan **tiga opsi technology stack** yang layak untuk membangun VEGA, lengkap
dengan kelebihan dan kekurangan masing-masing, lalu menutup dengan rekomendasi dan
alasannya.

Opsi A dan B adalah dua stack yang berbeda secara utuh. Opsi C adalah gabungan
keduanya: sisi terkuat Opsi A (Python untuk membaca Excel) dipasangkan dengan sisi
terkuat Opsi B (PostgreSQL sebagai database).

Satu kriteria tidak dinilai dari reputasi melainkan **diuji langsung**: kemampuan
membaca file Excel yang berantakan, karena itulah inti pekerjaan VEGA. Hasil
pengukurannya ada di bagian 5, dan skor di matriks bagian 7 mengikuti hasil itu,
termasuk ketika hasilnya membantah dugaan awal kami.

Keputusan stack diambil **sebelum** Phase 3 (Foundation, minggu 3) dimulai. Setelah
titik itu, mengganti stack berarti membuang pekerjaan yang sudah jadi.

---

## 2. Batasan yang Membentuk Keputusan

Semua opsi dinilai terhadap batasan yang sudah pasti, bukan terhadap "mana yang
paling modern". Batasannya:

| # | Batasan                                         | Implikasi                                                                                                                                                                                                                                                     |
| - | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | **Waktu 10 minggu, 2 orang magang**       | Waktu belajar teknologi baru diambil dari waktu membangun. Stack yang butuh 3 minggu belajar hanya menyisakan 7 minggu kerja.                                                                                                                                 |
| 2 | **Satu PC host, Windows, LAN terisolasi** | Tidak ada cloud, tidak ada Docker cluster, tidak ada CI/CD pipeline. Deployment = copy folder + daftarkan sebagai Windows service.                                                                                                                            |
| 3 | **±6 pengguna, 1 divisi**                | Beban baca sangat ringan. Beban tulis hanya saat upload Excel bulanan. Tidak ada kebutuhan concurrent write yang serius.                                                                                                                                      |
| 4 | **Serah terima ke tim IT departemen**     | Setelah magang selesai, aplikasi harus bisa dirawat orang lain. Stack yang eksotis = aplikasi mati setelah kami pergi.                                                                                                                                        |
| 5 | **Kriteria penilaian magang**             | Wajib ada: CRUD, autentikasi & hak akses, database relasional, laporan/analitik. Lihat [Job Desc - Magang SI.md](<Job%20Desc%20-%20Magang%20SI.md>).                                                                                                            |
| 6 | **Biaya lisensi = 0**                     | Tidak ada anggaran pembelian software untuk proyek magang.                                                                                                                                                                                                    |
| 7 | **Inti pekerjaan = membaca Excel**        | GL bulanan dan budget tahunan datang sebagai `.xlsx` dengan struktur rumit (header di baris 6, kolom duplikat, kode akun gabungan). Lihat [Excel-Template-Spec.md](Excel-Template-Spec.md). Kualitas library Excel adalah faktor penentu, bukan detail kecil. **Karena batasan inilah yang paling menentukan, ia satu-satunya yang kami uji langsung — lihat bagian 5.** |

---

## 3. Opsi A — Python + FastAPI + React + SQLite

**Posisi:** ringan, cepat dibangun, ekosistem data terkuat.

### Komponen

| Layer            | Pilihan                                    | Versi           |
| ---------------- | ------------------------------------------ | --------------- |
| Bahasa backend   | Python                                     | 3.13.14         |
| Framework API    | FastAPI                                    | 0.115.6         |
| ORM & migrasi    | SQLAlchemy + Alembic                       | 2.0.36 / 1.14.0 |
| Database         | SQLite (mode WAL)                          | bawaan Python   |
| Baca/tulis Excel | openpyxl                                   | 3.1.5           |
| Autentikasi      | JWT (`PyJWT`) + `bcrypt`                   | 2.13.0 / 5.0.0  |
| UI               | React + Vite                               | 18.3.1 / 6.4.3  |
| Grafik           | Recharts                                   | 2.15.4          |
| Routing          | react-router-dom                           | 7.18.2          |
| Styling          | CSS custom properties (tanpa UI framework) | —              |
| Web server       | uvicorn, 1 worker, Windows service         | 0.34.0          |

### Bentuk penyajian

Perlu dinyatakan eksplisit, karena sering disalahpahami: **SQLite di sini bukan
database sisi klien.** Ia hidup di dalam proses FastAPI di PC host, sebagai satu
file di disk lokal host itu. Pengguna mengaksesnya lewat browser ke
`http://<nama-host>:8000` dan hanya menerima HTML, JavaScript, dan JSON. Mereka
tidak pernah menyentuh file databasenya, dan file itu tidak pernah dibagikan
lewat jaringan.

```
Browser (6 PC pengguna)  --HTTP LAN-->  PC host
                                        `- 1 proses uvicorn (1 worker)
                                           |- FastAPI  (API + file statis React)
                                           `- SQLite   (vega.db, disk lokal)
```

Dari sudut pandang browser, susunan ini tidak bisa dibedakan dari PostgreSQL
atau SQL Server. Bedanya hanya di sisi host: database server berjalan sebagai
proses terpisah, SQLite sebagai pustaka di dalam proses aplikasi. Karena itu
tidak ada service database yang perlu dipasang, dibuka portnya, atau dirawat.

### Kelebihan

- **Ekosistem pengolahan data terkuat di antara ketiganya.** Membaca Excel, memvalidasi angka, menghitung selisih dan proyeksi adalah wilayah yang paling matang di Python. Pada uji di bagian 5, `openpyxl` menyelesaikan seluruh jebakan file GL asli **tanpa satu baris kode penjaga pun** dan hanya menarik 1 paket tambahan, sementara `read_only=True` membuatnya menyetel baris satu per satu, jadi puncak memorinya 96 MB, bukan 1,4 GB.
- **Waktu belajar paling pendek untuk tim ini.** Kedua anggota tim sudah mengenal Python dari mata kuliah; React sudah masuk rencana Phase 2-3. Tidak ada bahasa baru yang harus dipelajari dari nol.
- **Dokumentasi API otomatis.** FastAPI menghasilkan halaman `/docs` yang interaktif tanpa kode tambahan, langsung jadi lampiran laporan magang dan alat bantu QA.
- **Pustaka autentikasi mengikuti rekomendasi resmi FastAPI terkini, bukan contoh tutorial lama.** Dokumentasi keamanan FastAPI sekarang memakai `PyJWT`; `python-jose` yang dulu dicontohkan perawatannya berhenti, dan versi 3.3.0 yang masih beredar luas membawa CVE (kebingungan algoritma dan DoS pada JWE) yang baru ditambal di 3.4.0. Kami memakai `PyJWT` sejak awal, jadi pemindaian dependensi saat serah terima tidak akan menyalakan baris ini.
- **Nol instalasi database.** SQLite adalah satu file di disk. Tidak ada service database yang harus dipasang, di-tuning, atau di-backup terpisah. Serah terima ke IT jadi jauh lebih sederhana.
- **Backup sederhana dan aman.** Satu perintah `VACUUM INTO` menghasilkan salinan konsisten tanpa menghentikan aplikasi.
- **Deployment satu proses.** React di-*build* jadi file statis, lalu disajikan oleh FastAPI itu sendiri. Hanya ada **satu** service Windows yang perlu hidup, bukan dua.
- **Jalur pertumbuhan tersedia.** SQLAlchemy membuat perpindahan SQLite ke PostgreSQL sebagian besar hanya perubahan connection string, bukan penulisan ulang.
- **Seluruhnya gratis dan open source.** Tidak ada lisensi yang perlu dibeli, tidak ada batasan penggunaan komersial.

### Kekurangan

- **SQLite hanya menerima satu penulis pada satu waktu.** Mode WAL membuat pembaca tetap jalan saat ada penulisan, tapi dua upload GL bersamaan akan saling menunggu. Dengan 6 pengguna dan upload sebulan sekali, ini tidak terasa, tapi ini batas nyata.
- **SQLite tidak boleh diletakkan di network drive** (SMB/NFS). File database harus di disk lokal host. Ini mengunci arsitektur ke satu PC.
- **Dua bahasa dalam satu repo.** Python di backend, JavaScript di frontend. Anggota tim harus berpindah konteks, dan ada dua tool linting (`ruff` dan `eslint`) serta dua manajer paket (`pip` dan `npm`).
- **Python tidak punya pengecekan tipe wajib.** Kesalahan tipe baru ketahuan saat program berjalan. Diredam sebagian oleh Pydantic (validasi data masuk) dan `ruff`, tapi tidak sekuat bahasa bertipe statis.
- **Bukan stack "asli Windows".** Tim IT yang terbiasa dengan lingkungan Microsoft mungkin kurang familiar dengan Python service dan virtual environment.
- **Perlu 1 worker saja.** Timer backup harian hidup di dalam aplikasi; menjalankan beberapa worker akan menjalankan backup berkali-kali. Batasan ini harus didokumentasikan agar tidak dilanggar tanpa sengaja.

### Estimasi risiko jadwal

**Rendah.** Phase 0 sudah berjalan dengan stack ini: backend hello-world dan halaman React yang membaca status backend sudah hidup. Risiko teknis terbesar bukan di stack, melainkan di kerumitan file Excel, dan itu sama untuk semua opsi.

---

## 4. Opsi B — Node.js + Express/NestJS + React + PostgreSQL

**Posisi:** satu bahasa (JavaScript) di kedua sisi, database paling kuat, ketergantungan paling banyak.

### Komponen

| Layer            | Pilihan                                     |
| ---------------- | ------------------------------------------- |
| Bahasa           | JavaScript / TypeScript                     |
| Framework API    | Express (minimal) atau NestJS (terstruktur) |
| ORM & migrasi    | Prisma                                      |
| Database         | PostgreSQL 18                               |
| Baca/tulis Excel | ExcelJS                                     |
| Autentikasi      | `jsonwebtoken` + `bcrypt`               |
| UI               | React + Vite (sama seperti Opsi A)          |
| Grafik           | Recharts (sama seperti Opsi A)              |
| Web server       | Node process + PM2, atau Windows service    |

### Kelebihan

- **Satu bahasa di backend dan frontend.** JavaScript di kedua sisi; struktur data mengalir tanpa penerjemahan. Dengan TypeScript, tipe bahkan bisa dibagi antar sisi.
- **Frontend identik dengan Opsi A,** jadi seluruh pekerjaan UI, grafik, dan wireframe tetap berlaku apa pun antara A dan B yang dipilih. Perbedaannya murni di backend.
- **PostgreSQL jauh lebih kuat dari SQLite sebagai database**: banyak penulis sekaligus, tipe data kaya, tahan uji di produksi. Kalau suatu hari VEGA melayani seluruh perusahaan, tidak ada migrasi database yang perlu dipikirkan.
- **Prisma menghasilkan skema dan tipe secara otomatis,** dan punya alat visual (Prisma Studio) untuk melihat isi database.
- **Kolam SDM luas.** Developer JavaScript mudah dicari kalau nanti aplikasinya diteruskan orang lain.
- **Gratis dan open source seluruhnya.**

### Kekurangan

- **PostgreSQL harus dipasang dan dirawat**, sama seperti SQL Server Express, plus tim IT belum tentu familiar dengan Postgres di Windows. Ini beban operasional yang tidak dibayar oleh manfaat apa pun pada skala 6 pengguna.
- **Penanganan Excel lebih mahal dirawat dibanding Opsi A**, dan ini sudah diuji, bukan diperkirakan (bagian 5). ExcelJS **berhasil** membaca file GL asli dengan benar, sampai ke angka terakhir. Tapi untuk sampai ke sana ia menuntut sebuah fungsi penjaga sepanjang 14 baris, karena selnya bisa kembali sebagai objek (`{error}`, `{result}`, `{richText}`, `{text}`) alih-alih nilai polos, dan penjaga itu harus dipanggil di **setiap** pembacaan sel. Lupa satu kali, dan nilai yang masuk database adalah `[object Object]`. openpyxl dengan `data_only=True` tidak punya kelas kesalahan ini sama sekali. Kekurangan inilah yang dijawab Opsi C di bagian 6.
- **Memakai memori jauh lebih besar untuk file yang sama.** Pada uji bagian 5, ExcelJS memuncak di 1,4 GB melawan 96 MB. Sebabnya struktural: `readFile()` memuat keempat sheet GL (32.000 baris) ke memori sebelum satu baris pun dibaca, sementara openpyxl `read_only=True` menyetelnya bertahap dan hanya menyentuh sheet `CORE`. Di PC host bersama yang juga menjalankan aplikasi lain, ini bukan angka yang bisa diabaikan.
- **Permukaan ketergantungan paling besar.** Terukur pada uji yang sama: `npm install exceljs` menarik **97 paket**, `pip install openpyxl` menarik **1**. Setiap paket adalah permukaan keamanan dan sumber peringatan `npm audit`. Kami sudah merasakan ini di sisi frontend saja.
- **Aritmetika angka perlu kehati-hatian ekstra.** JavaScript hanya punya satu tipe angka (floating point), dan tidak ada padanan `Decimal` di pustaka standarnya. Uji di bagian 5 justru membuktikan jebakan ini nyata di **kedua** bahasa: versi pertama skrip Python kami pun salah 2 sen karena membulatkan per baris. Bedanya, di Python jalan keluarnya sudah ada di pustaka standar; di Node ia harus ditarik sebagai dependensi lain lagi.
- **Menjalankan Node sebagai Windows service butuh alat bantu tambahan** (`node-windows`, NSSM, atau PM2). Satu bagian bergerak lagi yang harus dijelaskan saat serah terima.

### Estimasi risiko jadwal

**Sedang.** Frontend tidak berubah, jadi separuh proyek aman. Risikonya terkonsentrasi di ingestion Excel. Uji bagian 5 menurunkan risiko itu dari yang semula kami duga (ExcelJS terbukti sanggup), tapi tidak menghapusnya: yang tersisa adalah kode penjaga yang harus ditulis benar di setiap pembacaan sel, dan itu dikerjakan oleh tim yang baru belajar sambil jalan.

---

## 5. Uji Empiris — openpyxl vs ExcelJS atas File Asli

Kriteria "kekuatan menangani file Excel" berbobot 20% dan menyentuh bagian tersulit
sistem ini setiap bulan. Terlalu penting untuk dinilai dari reputasi, jadi kami
mengujinya langsung.

### Cara uji

Dua skrip, **tugas identik**, dijalankan atas file asli di [Docs/Source/](../Source/):
baca budget master (`MIS (FC)`, header baris 6), baca GL sheet `CORE`, terapkan
saringan dua klausa, jumlahkan debit dikurangi kredit terkonversi. Keduanya sengaja
dihadapkan pada seluruh jebakan yang tercatat di
[Excel-Template-Spec.md](Excel-Template-Spec.md): kolom L/M dan N/O berjudul
byte-identical, baris junk berisi `#DIV/0!`, kolom A yang campur `str` dan `int`,
dan baris subtotal berkode COA yang sah.

Skrip, data ekspor, dan ringkasan HTML-nya ada di
[stack-bakeoff/](stack-bakeoff/) dan bisa dijalankan ulang kapan saja.

### Hasil

| Ukuran                          | Python + openpyxl        | Node + ExcelJS       |
| ------------------------------- | ------------------------ | -------------------- |
| Baris lolos saringan            | 63 + 10 = **73**         | 63 + 10 = **73**     |
| Total (USD)                     | **488.981,16**           | **488.981,16**       |
| Baris ditolak (junk `#DIV/0!`)  | 1                        | 1                    |
| Ekspor CSV 73 baris             | **identik** ¹            | **identik** ¹        |
| Waktu                           | ±8 detik                 | **±4 detik**         |
| Puncak memori                   | **96 MB**                | 1.385 MB             |
| Paket terpasang                 | **1**                    | 97                   |
| Kode penjaga yang harus ditulis | **0 baris**              | 14 baris             |
| Baca bertahap (streaming)       | **ya** (`read_only`)     | tidak                |

¹ Kedua file ekspor **byte-identical**: sama sampai byte terakhir, bukan sekadar
sama nilainya. Diperiksa dengan membandingkan hash kedua file
(SHA-256 `py.csv` = `js.csv` = `d690004541345c…`), bukan dengan melihatnya sekilas.

### Apa yang uji ini buktikan — dan apa yang ia bantah

**Yang dibantah:** dugaan bahwa ExcelJS akan tersandung file GL yang berantakan.
Tidak. Hasilnya sama persis sampai ke sen terakhir, dan ekspor CSV kedua engine
byte-identical. ExcelJS bahkan **dua kali lebih cepat**. Kalimat "jauh lebih lemah"
pada draf sebelumnya terlalu keras, dan sudah kami perbaiki.

**Yang dibuktikan:** bedanya bukan benar-versus-salah, melainkan **berapa banyak
kode penjaga yang harus ditulis dan dirawat sendiri.** ExcelJS mengembalikan objek
untuk sel non-polos, jadi setiap pembacaan sel harus melewati fungsi seperti ini:

```javascript
function plain(v) {
  if (typeof v === 'object') {
    if ('error' in v) return v.error;                        // '#DIV/0!'
    if ('result' in v) return v.result;                      // sel formula
    if ('richText' in v) return v.richText.map(t => t.text).join('');
    if ('text' in v) return v.text;                          // hyperlink
  }
  return v;
}
```

Padanan openpyxl-nya adalah satu argumen, `data_only=True`, lalu selesai. Kegagalan
di sini tidak berisik: lupa memanggil `plain()` sekali saja tidak melempar error,
ia menyimpan `[object Object]` atau `NaN` ke database, dan baru ketahuan saat ada
yang mencocokkan dashboard dengan pivot Excel-nya sendiri.

### Temuan sampingan yang mengubah cara kami menulis kode

Versi pertama skrip **Python** kami menghasilkan `488.981,18`, meleset 2 sen.
Sebabnya bukan library: kami menjumlahkan nilai yang sudah dibulatkan per baris,
73 kali, alih-alih membulatkan sekali di akhir. Ini menegaskan bahwa jebakan
aritmetika uang **tidak dijawab oleh pilihan bahasa**, dan aturan "bulatkan sekali
di akhir" wajib diberlakukan apa pun stack yang dipakai.

**Satu baris ini wajib ikut ke slide, karena tanpanya dua angka di atas terbaca
saling membantah:**

> **0 baris penjaga tipe data**: masalah *library*, hanya muncul di ExcelJS ·
> **1 aturan pembulatan**: masalah *domain*, berlaku sama di Python, Node, dan
> stack apa pun.

Keduanya bukan hal yang sama. "openpyxl butuh 0 baris penjaga" berbicara tentang
membaca sel; "skrip Python pertama kami meleset 2 sen" berbicara tentang cara
menjumlahkan uang. Aturan pembulatan tetap harus ditulis di Opsi A, Opsi B, maupun
Opsi C. Ia tidak menghapus selisih 14 baris kode penjaga, dan tidak dihapus olehnya.

### Catatan kejujuran atas angka di atas

- Angka memori adalah laporan heap masing-masing runtime (`tracemalloc` dan
  `process.memoryUsage`), bukan pembanding presisi. Yang bisa dipegang adalah
  selisih ordenya, bukan digitnya.
- Waktu bervariasi antar-jalan pada mesin yang sama; keunggulan ExcelJS konsisten.
- Uji ini menyentuh **satu** file GL dan **satu** file budget. Ia menguji ketepatan
  membaca, bukan ketahanan terhadap seluruh ragam file yang mungkin datang nanti.

---

## 6. Opsi C — Python + FastAPI + React + PostgreSQL (gabungan A dan B)

**Posisi:** ambil sisi terkuat masing-masing: Python untuk membaca Excel, PostgreSQL untuk database.

Pertanyaan yang melahirkan opsi ini wajar: kelemahan terbesar Opsi B adalah
library Excel-nya, dan kelemahan terbesar Opsi A adalah databasenya. Kenapa tidak
diambil yang bagus dari keduanya saja?

Bisa, dan hasilnya sah secara teknis. Perlu dinyatakan jujur sejak awal: **Opsi C
bukan stack ketiga yang berdiri sendiri.** Ia adalah Opsi A dengan database yang
ditukar. Bahasa, framework, ORM, library Excel, autentikasi, dan seluruh frontend
identik dengan Opsi A. Yang berubah hanya satu lapisan.

### Komponen

| Layer            | Pilihan                                    | Beda dari Opsi A       |
| ---------------- | ------------------------------------------ | ---------------------- |
| Bahasa backend   | Python 3.13                                | sama                   |
| Framework API    | FastAPI 0.115.6                            | sama                   |
| ORM & migrasi    | SQLAlchemy 2.0 + Alembic                   | sama                   |
| **Database**     | **PostgreSQL 18** + `psycopg[binary]` 3.2  | **beda** (dari SQLite) |
| Baca/tulis Excel | openpyxl 3.1.5                             | sama                   |
| Autentikasi      | JWT (`PyJWT`) + `bcrypt`                   | sama                   |
| UI               | React 18 + Vite 6 + Recharts               | sama                   |
| Web server       | uvicorn, 1 worker, Windows service         | sama                   |

### Bentuk penyajian

```
Browser (6 PC pengguna)  --HTTP LAN-->  PC host
                                        |- proses uvicorn (1 worker)
                                        |  `- FastAPI (API + file statis React)
                                        `- service PostgreSQL (proses terpisah)
                                           `- data di disk lokal host
```

Beda dengan Opsi A hanya di sisi host: sekarang ada **dua service Windows** yang
harus hidup, bukan satu.

### Kelebihan

- **Menghapus kekurangan terbesar Opsi B.** Ingestion Excel tetap dikerjakan `openpyxl`, tool terkuat untuk pekerjaan itu. Kelemahan ExcelJS hilang sepenuhnya.
- **Menghapus dua kekurangan Opsi A sekaligus.** PostgreSQL menerima banyak penulis serentak, dan datanya tidak terikat harus di disk lokal, bisa dipindah ke server database tersendiri kalau nanti dibutuhkan.
- **Tidak ada migrasi database di kemudian hari.** Kalau VEGA benar-benar dipakai lintas divisi, tidak ada langkah pindah SQLite ke Postgres yang perlu dijadwalkan; sudah di sana sejak hari pertama.
- **Aritmetika uang tetap aman.** Python punya `Decimal`, dan PostgreSQL punya tipe `NUMERIC` yang eksak. Ini kombinasi paling ketat untuk angka rupiah di antara ketiga opsi.
- **Waktu belajar hampir sama dengan Opsi A.** Tidak ada bahasa baru. Yang perlu dipelajari hanya pemasangan dan perawatan Postgres, bukan menulis kode dengan cara berbeda. Berkat SQLAlchemy, kode aplikasinya nyaris tidak berubah.
- **Gratis dan open source seluruhnya.**

### Kekurangan

- **Dua service Windows, bukan satu.** Keduanya harus hidup, dipantau, dan dinyalakan ulang dengan urutan yang benar setelah PC host di-*restart*. Ini persis beban operasional yang ingin dihindari saat serah terima.
- **Backup tidak lagi satu perintah.** Opsi A cukup `VACUUM INTO` dari dalam aplikasi. Di sini backup berarti `pg_dump` sebagai Scheduled Task terpisah, dengan kredensial database yang harus disimpan di suatu tempat, plus prosedur *restore* yang harus diuji dan ditulis di User Manual.
- **Manfaatnya tidak terpakai pada skala pilot.** Kemampuan banyak penulis serentak dibayar tunai di minggu 3 (pemasangan, tuning, backup, dokumentasi) untuk kebutuhan yang muncul pada ±50 pengguna, angka yang belum tentu pernah tercapai.
- **Tim IT departemen belum tentu familiar dengan Postgres di Windows.** Sama seperti kekurangan Opsi B; menukar library Excel tidak menyelesaikan bagian ini.
- **Batasan 1 worker tetap berlaku.** Timer backup harian tetap hidup di dalam aplikasi, jadi keterbatasan itu tidak ikut hilang.
- **Menambah satu titik gagal saat demo.** Service Postgres mati = aplikasi mati total, dengan pesan error yang tidak jelas bagi pengguna.

### Estimasi risiko jadwal

**Rendah-sedang.** Kode aplikasi sama persis dengan Opsi A, jadi risiko pemrograman
tidak bertambah. Tambahannya murni operasional: perkiraan 2-4 hari di Phase 3 untuk
pemasangan, konfigurasi, backup, dan dokumentasi Postgres, diambil dari waktu
membangun ingestion dan dashboard.

---

## 7. Matriks Keputusan

Skor 1-5 (5 = terbaik). Bobot mencerminkan batasan di bagian 2. Satu-satunya baris
yang **terukur**, bukan dinilai, adalah baris Excel, dari uji di bagian 5.

| Kriteria                                      | Bobot          | A : Python/SQLite | B : Node/Postgres | C : Python/Postgres |
| --------------------------------------------- | -------------- | ----------------- | ----------------- | ------------------- |
| Bisa selesai dalam 10 minggu oleh 2 magang    | 25%            | 5                 | 4                 | 4                   |
| Kekuatan menangani file Excel yang tidak rapi | 20%            | 5                 | 4 ⬆              | 5                   |
| Kemudahan deploy & serah terima ke tim IT     | 20%            | 4                 | 3                 | 3                   |
| Kesesuaian dengan kriteria penilaian magang   | 15%            | 5                 | 5                 | 5                   |
| Ketiadaan biaya & risiko lisensi              | 10%            | 5                 | 5                 | 5                   |
| Jalur pertumbuhan bila dipakai lebih luas     | 10%            | 3                 | 5                 | 5                   |
| **Total tertimbang**                    | **100%** | **4,60**    | **4,15**    | **4,35**      |

⬆ **Skor ini naik dari 3 ke 4 setelah uji bagian 5.** ExcelJS ternyata menghasilkan
angka yang benar dan bahkan lebih cepat; yang menahannya di 4, bukan 5, adalah 14
baris kode penjaga wajib, 97 paket, dan ketiadaan pembacaan bertahap. Kenaikan ini
memperkecil jarak A-B dari 0,65 ke **0,45**, tapi tidak mengubah urutannya.

Catatan cara membaca:

- Opsi C menang atas Opsi B (4,35 vs 4,15) karena satu perubahan itu saja: menukar ExcelJS dengan openpyxl mengangkat kriteria berbobot 20%. Ini menjawab pertanyaannya secara langsung: kalau Opsi B harus dipilih, memakai Python untuk sisi Excel memang lebih baik.
- Opsi C kalah dari Opsi A (4,35 vs 4,60) hanya di dua kriteria, dan keduanya bermuara pada satu hal yang sama: **PostgreSQL adalah biaya operasional yang dibayar sekarang untuk manfaat yang baru terasa nanti.** Dua service, dua prosedur backup, satu komponen lagi yang harus dijelaskan saat serah terima.
- Opsi B kalah bukan karena satu kelemahan besar, melainkan karena kalah tipis di banyak tempat sekaligus: waktu, serah terima, dan biaya rawat Excel. Keunggulannya, jalur pertumbuhan, justru berbobot paling kecil (10%).
- Keunggulan PostgreSQL nyata, tapi tidak terpakai pada skala 6 pengguna dengan satu upload per bulan. Sebaliknya, biaya rawat ExcelJS mengenai bagian tersulit sistem setiap bulan.
- **Uji sensitivitas, dan hasilnya perlu dinyatakan terus terang.** Kalau bobot "bisa selesai 10 minggu" diturunkan dari 25% ke 10% dan sisanya dibagi rata (18% masing-masing), urutannya **berubah**: C 4,54 · A 4,46 · B 4,36. Artinya batasan waktulah yang memutuskan antara A dan C, bukan kualitas teknis, karena secara teknis C memang sedikit lebih unggul. Kami tidak menyembunyikan ini: batasan 10 minggu itu nyata, dan justru karena itu A dipilih **sekarang** sementara C tetap berdiri sebagai jalur pertumbuhannya (bagian 8). *Angka ini tetap ada di dokumen dan dibawa sebagai slide cadangan, bukan slide utama. Alasannya, beserta jawaban yang sudah disiapkan untuk pertanyaan yang menyertainya, ada di bagian 9.*

---

## 8. Rekomendasi

> **Dibaca bersama [bagian 0](#0-keputusan-akhir--dibuat-setelah-dokumen-ini-disusun).**
> Rekomendasi di bawah ini adalah rekomendasi *kami*, dan sengaja dibiarkan utuh.
> Keputusan akhir klien adalah Opsi C (PostgreSQL). Bagian ini tetap ada karena
> perbandingan yang jujur lebih berguna daripada dokumen yang dirapikan setelah fakta.

**Opsi A: Python 3.13 + FastAPI + React 18 (Vite) + SQLite (WAL).**

Tiga alasan, berurutan menurut bobot:

1. **Waktu.** Tidak ada bahasa baru yang perlu dipelajari, dan Phase 0 sudah berjalan di atasnya. Seluruh 10 minggu terpakai untuk membangun, bukan untuk belajar.
2. **Kecocokan dengan inti pekerjaan.** Bagian tersulit VEGA bukan tampilan, melainkan membaca file GL yang berantakan dengan benar dan menghitung angkanya secara akurat. Uji di bagian 5 menunjukkan keduanya sanggup, tapi openpyxl sampai ke sana dengan 0 baris kode penjaga dan 1 paket, melawan 14 baris dan 97 paket. Untuk tim berisi 2 magang yang akan menyerahkan kode ini ke orang lain, selisih itu berarti.
3. **Beban operasional paling ringan.** Satu service Windows, satu file database, satu perintah backup. Ini yang menentukan apakah aplikasi masih hidup enam bulan setelah magang berakhir.

**Yang kami korbankan dengan sadar:** SQLite hanya menerima satu penulis pada satu waktu, dan file databasenya harus berada di disk lokal. Pada 6 pengguna dengan satu kali upload per bulan, keduanya tidak terasa.

**Posisi Opsi C dalam keputusan ini.** Opsi C tidak ditolak; ia adalah jalur
pertumbuhan Opsi A, bukan alternatif yang dibuang. Karena keduanya memakai kode
aplikasi yang sama persis, berpindah dari A ke C tidak pernah menjadi penulisan
ulang: cukup ganti connection string, jalankan ulang migrasi Alembic, dan pindahkan
datanya. Karena itu memilih A sekarang **tidak** menutup pintu ke Postgres, dan
justru itu alasan tidak perlu membayar biayanya sejak minggu ketiga. Driver
`psycopg[binary]` 3.2 belum dipasang sekarang karena belum dibutuhkan.

**Ke mana backup disimpan, dan bagian mana yang belum diputuskan.** Backup harian
dijalankan dari dalam aplikasi dengan satu perintah `VACUUM INTO`, menghasilkan
salinan yang konsisten tanpa menghentikan layanan. Salinan itu **tidak boleh
berhenti di disk yang sama dengan databasenya**: kalau disk itu mati, keduanya
hilang bersamaan, dan yang tersimpan tadi bukan backup melainkan salinan. Rencana
kami: file harian ditulis dulu ke disk lokal host (cepat dan selalu berhasil), lalu
disalin ke satu share jaringan milik departemen. **Lokasi share itu masih menunggu
penetapan dari tim IT, dan kami catat sebagai butir terbuka, bukan sebagai hal yang
sudah selesai.** Selama belum ditetapkan, yang berlaku hanya retensi lokal, dan itu
kami nyatakan apa adanya. Prosedur pemulihan diuji sekali sebelum serah terima dan
ditulis langkah demi langkah di User Manual.

**Kapan keputusan ini harus ditinjau ulang:**

| Pemicu                                                                  | Tindakan                                                                                            |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Pengguna melewati ±50 orang, atau beberapa divisi mengunggah bersamaan | Pindah ke **Opsi C**: tukar SQLite dengan PostgreSQL. Berkat SQLAlchemy, sebagian besar hanya perubahan connection string. |
| Departemen mewajibkan seluruh aplikasi internal memakai stack Microsoft | Tinjau ulang jalur .NET/ASP.NET Core — tapi sebagai proyek terpisah, bukan penulisan ulang di tengah jalan. |
| File GL tumbuh sampai openpyxl terasa lambat                            | Tambahkan pandas hanya di jalur ingestion. Tidak ada bagian lain yang perlu berubah. Uji bagian 5 memberi angka dasarnya: ±8 detik untuk 4.952 baris. |

---

## 9. Rencana Presentasi (±15 menit, 2 pembicara)

Tujuh slide, bukan sembilan. Sembilan slide dalam 15 menit berarti 1,6 menit per
slide, sementara slide komponen-per-opsi masing-masing berisi satu tabel plus
kelebihan plus kekurangan, tidak bisa disampaikan secepat itu tanpa membaca
terburu-buru, dan membaca terburu-buru menghapus otoritas yang dibangun seluruh
dokumen ini. Tiga slide per-opsi digabung jadi **satu tabel sisi-ke-sisi**;
detailnya pindah ke slide cadangan.

| Slide | Isi                                                                 | Pembicara | Menit    |
| ----- | ------------------------------------------------------------------- | --------- | -------- |
| 1     | VEGA dalam satu kalimat + apa yang kami minta hari ini              | A         | 1        |
| 2     | Tujuh batasan — dan mana yang paling menentukan                     | A         | 2        |
| 3     | Tiga opsi dalam **satu** tabel perbandingan sisi-ke-sisi             | A         | 3        |
| 4     | **Uji empiris openpyxl vs ExcelJS** — tabel hasil + kode `plain()`  | B         | 4        |
| 5     | Matriks keputusan (**tanpa** uji sensitivitas)                      | B         | 2        |
| 6     | Rekomendasi + apa yang dikorbankan + pemicu peninjauan ulang        | A & B     | 2        |
| 7     | **Permintaan keputusan + tenggat**                                  | A         | 1        |
|       | **Total**                                                           |           | **15**   |

**Slide cadangan** (dipegang, dikeluarkan hanya kalau ditanya):

1. Uji sensitivitas bobot, lihat "Pertanyaan yang paling mungkin datang" di bawah.
2. Tabel komponen lengkap per opsi (bagian 3, 4, 6).
3. Diagram susunan Opsi A dan Opsi C.
4. Rencana backup dan pemulihan, termasuk butir yang masih terbuka (bagian 8).
5. Daftar versi hasil `pip list` dan `npm list --depth=0`, disalin apa adanya.

> Slide 4 adalah satu-satunya slide berisi angka hasil pengukuran sendiri. Kalau waktu
> presentasi mepet, slide inilah yang **tidak** dipotong; ia yang membedakan
> "kami membandingkan" dari "kami menguji". Wajib memuat baris pembeda ini, supaya
> "0 baris penjaga" dan "meleset 2 sen" tidak terbaca saling membantah:
> **0 baris penjaga tipe data** (masalah library) · **1 aturan pembulatan**
> (masalah domain, berlaku di semua bahasa).

### Slide 7 — permintaan keputusan

Presentasi ini tidak berakhir di tanya jawab. Ia berakhir di satu permintaan yang
spesifik, supaya rapatnya tidak menggantung:

> **Yang kami minta hari ini:** persetujuan **Opsi A**, atau instruksi untuk
> mengerjakan **Opsi C**.
>
> **Batas waktu: [isi tanggal sebelum slide dicetak, hari kerja terakhir sebelum
> Phase 3 dimulai, yaitu awal minggu ke-3].** Setelah Phase 3 berjalan, mengganti
> stack berarti membuang pekerjaan yang sudah jadi.
>
> **Kalau belum ada keputusan sampai tanggal itu:** kami lanjut dengan Opsi A
> sebagai default dan mencatatnya sebagai keputusan tertulis di `Decisions.md`,
> lengkap dengan tanggal dan alasannya.

Tawaran yang dinyatakan di slide yang sama, karena ia mengubah posisi kami dari
bertahan menjadi menawarkan pilihan berbiaya jelas:

> Kalau departemen bersedia memberi tambahan **2-4 hari kerja** di luar jadwal
> magang untuk pemasangan, konfigurasi, backup, dan dokumentasi PostgreSQL, kami
> kerjakan **Opsi C** hari ini juga. Kode aplikasinya identik; yang dibeli dengan
> hari-hari itu murni pekerjaan operasional.

### Bahasa untuk slide: sederhanakan slide-nya, bukan dokumennya

Dokumen ini dibaca; slide ditonton sambil mendengarkan. Istilah yang tepat di
dokumen justru menghalangi di slide, jadi di slide istilahnya diganti; dokumennya
biarkan tetap presisi.

| Jangan tampilkan di slide            | Tampilkan                                             |
| ------------------------------------ | ----------------------------------------------------- |
| Puncak heap 1.385 MB vs 96 MB        | Pemakaian memori **14× lebih besar**                  |
| Baca bertahap (`read_only`)          | Membaca file sedikit demi sedikit, tidak sekaligus    |
| Ekspor CSV byte-identical            | Hasil ekspor persis sama, sampai karakter terakhir    |
| Cukup ganti *connection string*      | Cukup ganti satu baris konfigurasi                    |
| Mode WAL, 1 worker                   | Satu program yang berjalan di PC host                 |
| Satu penulis pada satu waktu         | Dua orang mengunggah bersamaan: yang kedua menunggu sebentar |

### Pertanyaan yang paling mungkin datang — hafalkan jawabannya

Satu pertanyaan lebih menentukan hasil rapat daripada seluruh isi slide, dan ia
lahir langsung dari uji sensitivitas di bagian 7: dokumen ini sendiri mengakui
Opsi C sedikit lebih unggul secara teknis.

**"Sepuluh minggu itu batasan kalian sebagai magang. Departemen ini akan memakai
aplikasinya tiga tahun. Kenapa batasan kalian yang menentukan arsitektur kami?"**

Pertanyaan ini sah, dan jawabannya tidak boleh dikarang di tempat:

> Karena aplikasi yang tidak selesai bernilai nol bagi departemen, bukan hanya bagi
> kami. Dan karena Opsi A dan Opsi C memakai kode aplikasi yang identik, memilih A
> bukan menutup pintu ke C; kami menunda biayanya sampai ada yang membayarnya.
> Kalau departemen bersedia memberi 2-4 hari tambahan di luar jadwal magang untuk
> pemasangan PostgreSQL, kami kerjakan Opsi C hari ini juga.

Kalimat terakhir yang menentukan: kalau jawabannya ya, kami mengerjakan opsi yang
secara teknis lebih unggul; kalau tidak, memilih Opsi A menjadi keputusan
departemen dengan biaya yang sudah diketahui, bukan keputusan sepihak kami. Slide
sensitivitas dikeluarkan di sini, bukan disembunyikan, tapi dipegang sampai
ditanya, supaya bedanya jelas antara "kelemahan kami dipergoki" dan "kami sudah
mengantisipasinya".

Waktu persiapan terakhir sebaiknya dipakai untuk melatih jawaban ini sampai keluar
tanpa ragu, bukan untuk memperindah slide.

### Pertanyaan lain yang mungkin muncul, dan jawabannya

**"Ini kan aplikasi web, SQLite bisa dipakai?"**
Bisa, dan justru cocok. SQLite berjalan di dalam proses FastAPI di PC host, bukan
di komputer pengguna; browser hanya bicara HTTP dan tidak pernah menyentuh file
databasenya. Lihat "Bentuk penyajian" di bagian 3. SQLite baru bermasalah dalam
tiga keadaan, dan tidak satu pun berlaku di sini: file database ditaruh di
network drive, beberapa proses atau mesin berbagi file yang sama, atau banyak
penulis serentak. Kita memakai disk lokal, satu worker, dan satu unggahan per
bulan.

**"SQLite itu bukan database mainan?"**
SQLite adalah mesin database yang paling banyak dipasang di dunia: ada di setiap ponsel Android dan iOS, setiap browser, dan sebagian besar aplikasi desktop. Batasnya bukan keandalan, melainkan jumlah penulis bersamaan. Kita punya enam pengguna dan satu upload per bulan.

**"Kalau Opsi C menggabungkan yang terbaik dari keduanya, kenapa tidak itu saja yang dipakai?"**
Karena "yang terbaik" di sini artinya dua hal yang tidak setara harganya. Kekuatan
openpyxl kami pakai setiap bulan, sejak upload pertama. Kekuatan PostgreSQL baru
terpakai kalau penggunanya bertambah sekitar delapan kali lipat, sementara
biayanya (dua service, backup terpisah, satu komponen lagi saat serah terima)
dibayar penuh sejak minggu ketiga. Dan karena Opsi A dan Opsi C memakai kode
aplikasi yang sama persis, biaya itu bisa ditunda tanpa hukuman: kalau saatnya
tiba, pindahnya cukup ganti connection string, bukan bangun ulang.

**"Kalau di uji kalian ExcelJS hasilnya sama persis dan malah lebih cepat, kenapa tidak Node saja?"**
Karena yang diukur uji itu adalah hasil sekali jalan, sedangkan yang kami bayar
selama sepuluh minggu adalah biaya rawatnya. ExcelJS menuntut fungsi penjaga
14 baris yang harus dipanggil di setiap pembacaan sel; lupa satu kali tidak
menimbulkan error, melainkan menyimpan nilai salah ke database secara diam-diam.
Tambah 97 paket dan memori 14 kali lipat. Kecepatan 4 detik versus 8 detik pada
upload sebulan sekali bukan sesuatu yang pengguna rasakan, sementara satu angka
salah yang lolos ke dashboard, sangat terasa.

**"Berarti kalau tetap mau Node, sebaiknya Excel-nya pakai Python?"**
Betul, dan itulah kesimpulan yang tercermin di matriks. Tapi kalau backend Excel
sudah Python, menambahkan runtime Node di sebelahnya hanya menambah satu bahasa,
satu manajer paket, dan satu service, tanpa menambah kemampuan apa pun. Karena
itu jalur "Node + Python untuk Excel" tidak dijadikan opsi tersendiri: hasil
akhirnya selalu lebih sederhana kalau Node-nya dihapus, dan yang tersisa persis
Opsi A atau Opsi C.

**"Kalau nanti dipakai divisi lain bagaimana?"**
Pindah ke PostgreSQL. Karena kita memakai SQLAlchemy sebagai lapisan akses data, perubahannya terutama satu baris konfigurasi sambungan database dan sekali jalan migrasi, bukan penulisan ulang. Driver `psycopg[binary]` 3.2 belum dipasang sekarang karena belum dibutuhkan.

**"Kenapa tidak pakai .NET, kan servernya Windows?"**
Secara teknis .NET pilihan yang kuat: paling selaras dengan lingkungan Windows dan paling disiplin soal tipe. Kami mengeluarkannya dari perbandingan akhir karena jadwal: 2-3 minggu dari 10 minggu akan habis untuk belajar C#, EF Core, dan Blazor, diambil langsung dari waktu membangun ingestion Excel dan analitik. Ditambah jebakan lisensi library Excel di .NET yang harus dihindari dengan hati-hati.

**"Siapa yang merawat setelah magang selesai?"**
Ini alasan utama kami memilih beban operasional serendah mungkin: satu service, satu file database, satu perintah backup. Kami juga menyiapkan User Manual dan dokumentasi API otomatis di `/docs` sebagai bagian dari serah terima.

**"Backup harian itu disimpan di mana?"**
Dijalankan dari dalam aplikasi setiap hari, ditulis dulu ke disk lokal PC host,
lalu disalin ke share jaringan departemen. Bagian yang perlu kami sampaikan apa
adanya: **lokasi share itu belum ditetapkan**, masih menunggu tim IT. Selama
belum ada, yang berlaku hanya salinan lokal, dan salinan di disk yang sama dengan
databasenya bukan backup yang sesungguhnya: satu disk mati, keduanya hilang. Kami
mencatat ini sebagai butir terbuka dan meminta penetapan lokasinya sebagai bagian
dari persiapan serah terima. Prosedur pemulihannya diuji sekali dan ditulis di
User Manual.

**"Kenapa React 18, bukan React 19 yang sudah lama stabil?"**
Keputusan sadar, bukan versi yang kebetulan terpasang: React 18.3 adalah versi yang
seluruh pustaka pendukung kami (Recharts dan react-router-dom) sudah teruji di
atasnya. Naik ke React 19 di tengah proyek 10 minggu berarti menukar waktu
membangun dengan waktu menyesuaikan pustaka, tanpa satu pun fitur React 19 yang
dibutuhkan VEGA. Kenaikannya bisa dilakukan kapan saja setelah serah terima.

**"Kenapa kriteria Excel yang berbobot 20% diuji habis-habisan, sementara kriteria
berbobot terbesar (25%, 'selesai dalam 10 minggu') tidak diukur sama sekali?"**
Karena kriteria jadwal tidak bisa diuji, hanya bisa diperkirakan. Tidak ada
eksperimen yang bisa dijalankan hari ini untuk membuktikan sesuatu selesai sepuluh
minggu lagi. Jadi kami menguji yang memang bisa diuji, dan membuka seluruh bobotnya
supaya bagian yang tidak terukur bisa diperdebatkan, bukan disembunyikan di balik
angka total.

**"Amankah kalau lewat HTTP biasa?"**
Jaringan ini terisolasi dari jaringan perusahaan. Kata sandi tetap di-*hash* saat disimpan, hak akses ditegakkan di sisi server, dan setiap unggahan tercatat di audit log. Keputusan memakai HTTP polos di LAN terisolasi kami nyatakan secara eksplisit di User Manual, bukan dibiarkan tersirat. Bila di kemudian hari diminta HTTPS, sertifikat internal bisa ditambahkan tanpa mengubah kode aplikasi.

---

## Lampiran — versi yang benar-benar terpasang

Angka versi di bagian 3 disalin dari mesin pengembangan, bukan ditulis dari ingatan.
Perintahnya dijalankan ulang sebelum dokumen ini dicetak, dan hasilnya disalin apa
adanya. Diambil **12 Agustus 2026**, di lingkungan Phase 0 (`backend/.venv`,
`frontend/node_modules`).

```
$ python -V
Python 3.13.14

$ pip list          # dependensi langsung; sisanya dependensi turunan
alembic==1.14.0        openpyxl==3.1.5          python-multipart==0.0.20
bcrypt==5.0.0          pydantic==2.10.4         ruff==0.8.4
cryptography==50.0.0   pydantic-settings==2.7.0 SQLAlchemy==2.0.36
fastapi==0.115.6       PyJWT==2.13.0            uvicorn==0.34.0
httpx==0.28.1          pytest==8.3.4
                       python-dotenv==1.0.1

$ node -v && npm -v
v22.14.0 / 10.9.2

$ npm list --depth=0
vega-frontend@0.1.0
+-- @vitejs/plugin-react@4.7.0   +-- react-dom@18.3.1        +-- recharts@2.15.4
+-- eslint@9.39.5               +-- react-router-dom@7.18.2  `-- vite@6.4.3
+-- eslint-plugin-react@7.37.5  +-- react@18.3.1
```

Catatan atas daftar ini:

- **`python-jose` sudah tidak ada, diganti `PyJWT`.** Penggantian dilakukan di Phase 0,
  sebelum ada satu baris kode autentikasi ditulis, jadi biayanya nol. Alasannya ada
  di daftar kelebihan Opsi A.
- **`react-router-dom` 7.18.2 tetap dipakai dengan sadar.** `npm audit` menandainya
  untuk satu kerentanan yang hanya berlaku pada mode React Server Components,
  mode yang tidak dipakai VEGA, karena router-nya berjalan sepenuhnya di browser di
  atas file statis. Menurunkan versinya justru menukar satu temuan yang tidak berlaku
  dengan 14 temuan yang sebagian benar-benar berlaku. Temuan ini **diterima secara
  sadar, bukan terlewat**, dan ditinjau ulang saat ada versi yang benar-benar
  memperbaikinya.

---

*Dokumen ini menjadi lampiran laporan magang, bab "Pemilihan Teknologi".*
