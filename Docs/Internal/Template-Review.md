# Review template upload: `Budget Final2.xlsx` dan `GL Final2.xlsx`

Ditinjau 28 Agustus 2026 terhadap `Docs/Client/Excel-Template-Spec.md`, kontrak pembacaan file yang
sudah dikunci. File yang ditinjau ada di `Docs/Source/`, tidak masuk git.

Dokumen ini ditulis supaya cukup dibaca sebagai satu file. Setiap aturan kontrak dikutip di
tempatnya, jadi tidak perlu buka file spec untuk mengerti temuannya, dan salinan utuh kontraknya
ada di lampiran paling bawah. Nomor pasal (§) tetap dicantumkan kalau mau menelusuri sendiri.

Semua angka di bawah dihitung ulang dari workbook-nya memakai openpyxl, bukan dibaca dari nilai
yang tersimpan di sel. Jadi kalau ada sel yang menampilkan angka basi, angka di dokumen ini tetap
yang sebenarnya.

Satu catatan soal notasi. Tanda § berarti "bagian", jadi "kontrak §2.4" artinya bagian 2.4 di
`Excel-Template-Spec.md`, yang judulnya "Row classification". Nomor bagiannya bisa dicari langsung
di lampiran paling bawah.

---

## Ringkasan

Versi 2 menambah satu sheet baru (`PIVOT_DEMO`) di masing-masing file. Sheet lainnya identik sel
per sel dengan versi 1, sehingga lima konflik yang ditemukan di versi 1 masih ada semua.

| # | Konflik | Status | Kenapa begitu |
|---|---|---|---|
| 1 | Baris subtotal `TOTAL SGA DEPRECIATION` ikut tersimpan sebagai akun | Sudah salah sekarang | Nilainya +67.370,88, kebetulan sama besar dengan total budget sebenarnya (-67.370,88). Keduanya saling meniadakan, jadi total FY26 terbaca 0,00. Lihat `BUDGET_UPLOAD` baris 2858 sampai 2869. |
| 2 | GL tidak difilter ke MIS: 4.951 baris terbawa, cakupannya cuma 73 | Sudah salah sekarang | Setiap agregat yang dihitung dari sheet ini ikut membesar. Grand total di `PIVOT_DEMO` keluar 4,5 miliar, padahal angka MIS-nya 488.981,16. Baris 2, 4, 7, dan 9 di `GL_UPLOAD` semuanya di luar cakupan tapi ditandai `Department = IT`. |
| 3 | Kolom periode `Pd.` tidak dibawa ke `GL_UPLOAD` | Belum salah, tapi akan | Di file ini `Pd.` dan `Date` kebetulan cocok di semua baris, jadi hasilnya kebetulan sama. Bahayanya, karena template cuma menyodorkan `Date`, importer akan ditulis mengikuti `Date`, dan salahnya baru ketahuan di file pertama yang keduanya berbeda. `Pd.` masih ada di `RAW_CORE` kolom A, cuma tidak ikut dibawa. |
| 4 | COA duplikat menghasilkan 24 baris per kode, seharusnya 12 | Belum salah, tapi akan | Keempat baris sumbernya bernilai nol, jadi angkanya masih benar. Yang patah kuncinya di database. Contohnya baris 86 dan 1022: COA `740199001`, sama-sama FY26, sama-sama Apr 2026. Begitu salah satu diisi nilai di FY berikutnya, langsung jadi salah hitung. |
| 5 | Aturan validasi `>= 0` menolak budget negatif yang sah | Belum salah, tapi akan | Aturannya masih di lembar dokumentasi, belum dijalankan program mana pun. Kalau diterapkan apa adanya, dia menolak `772502000` di baris 2882 sampai 2893, yang totalnya -368.593,63 dan justru dicontohkan kontrak sebagai status `ALOKASI`. |

Nomor 1 dan 2 yang perlu dikerjakan lebih dulu, karena keduanya sudah mengubah angka hari ini.
Nomor 3 sampai 5 belum menghasilkan angka salah di sample ini, tapi ketiganya adalah jenis
kesalahan yang muncul belakangan, setelah kodenya terlanjur ditulis mengikuti template.

Di luar lima itu, banyak yang sudah benar dan sudah saya verifikasi ulang. Daftarnya di bagian 4.
Yang paling meyakinkan: jumlah 63 baris `MIS000` keluar 488.973,642541, persis sama dengan angka
kanonik di kontrak.

---

## 1. Apa yang berubah dari versi 1 ke versi 2

Perbandingan per sheet, `Budget_Final.xlsx` ke `Budget Final2.xlsx` dan `GL_Final.xlsx` ke
`GL Final2.xlsx`:

| Sheet | Budget | GL |
|---|---|---|
| `README` | identik | identik |
| `BUDGET_UPLOAD` / `GL_UPLOAD` | identik, 2.892 / 4.951 baris data | identik |
| `COA_MAPPING` | identik, 241 / 82 baris | identik |
| `VALIDATION_REFERENCE` | identik | identik |
| `RAW_SOURCE` / `RAW_CORE` | identik | identik |
| `PIVOT_DEMO` | baru, 11 baris | baru, 20 baris |

Satu sheet baru di tiap workbook. Selain itu tidak ada yang bergeser, setiap sheet lain dibandingkan
sel per sel dan hasilnya sama.

---

## 2. Lima konflik terhadap kontrak

Tiap konflik ditulis dengan empat bagian yang sama: aturannya apa, kenyataannya apa (lengkap dengan
lokasi yang bisa langsung dibuka), akibatnya berapa, dan perbaikannya bagaimana.

---

### Konflik 1: baris subtotal tersimpan sebagai akun asli

#### Aturannya

Sebuah baris di sheet budget baru dihitung sebagai baris data kalau dua-duanya terpenuhi:

1. Kolom B tidak mengandung kata `TOTAL`, tanpa peduli huruf besar-kecil, dan
2. Kolom A, setelah dijadikan teks dan di-strip, berupa kode angka 9 digit.

Tes kolom B harus dijalankan lebih dulu. Alasannya persis baris 263 di file sumber: isinya
`TOTAL SGA DEPRECIATION`, sebuah subtotal, tapi kolom A-nya berisi `770101000`, kode yang kelihatan
seperti COA sungguhan. Kalau filternya cuma melihat kolom A, subtotal ini masuk sebagai akun tanpa
peringatan apa pun.

Di sheet sumber ada 9 baris subtotal: 15, 87, 89, 100, 172, 174, 186, 261, 263. Tiga di antaranya
membawa angka di kolom A, yaitu baris 89 berisi `123`, baris 174 berisi `1234`, dan baris 263
berisi `770101000`. Dua yang pertama gampang ketahuan karena bukan 9 digit. Yang ketiga tidak.

Kontrak §2.4, bagian "Row classification".

#### Kenyataannya

Baris 263 masuk sebagai akun.

| Lokasi | Isinya |
|---|---|
| `Budget Final2.xlsx` › `BUDGET_UPLOAD` baris 2858 sampai 2869 | COA `770101000`, deskripsi `TOTAL SGA DEPRECIATION`, 12 bulan x 5.614,24, kolom `Source Row` = 263, `Validation Status` = `OK` |
| `Budget Final2.xlsx` › `COA_MAPPING` baris 240 | kode yang sama terdaftar di master COA, annual 67.370,88, status `OK` |

Isi barisnya, dibaca langsung dari file:

```
baris | FY   | COA       | Kategori | Budget Amount | Periode  | Source Row | Description
 2858 | FY26 | 770101000 | SGA      |      5.614,24 | Apr 2026 |        263 | TOTAL SGA DEPRECIATION
 2859 | FY26 | 770101000 | SGA      |      5.614,24 | May 2026 |        263 | TOTAL SGA DEPRECIATION
  ...   berlanjut sampai baris 2869, Mar 2027, pola yang sama
```

Kolom `Source Row` menunjuk ke 263, dan baris 263 di `RAW_SOURCE` isinya memang
`TOTAL SGA DEPRECIATION`. Jadi jejaknya jelas: baris subtotal, disalin apa adanya, diberi status
`OK`.

Sheet `README` di workbook itu sendiri menulis bahwa baris ini sudah dikecualikan:

> One further row, 'TOTAL SGA DEPRECIATION', is labeled as a subtotal but carries a real-looking
> 9-digit COA (770101000) … (currently excluded from BUDGET_UPLOAD; see above)

Nyatanya tidak dikecualikan, jadi README dan isi datanya bertentangan. Kemungkinan besar ini bukan
keputusan sadar, melainkan filter yang tidak jalan sesuai niat penulisnya.

#### Akibatnya

| Angka | Menurut kontrak | Di template |
|---|---:|---:|
| Grand total budget FY26 | -67.370,88 | 0,00 |
| Jumlah COA distinct | 238 | 239 |

Kebetulan yang tidak enak: subtotal hantu itu bernilai +67.370,88, sementara total budget yang
sebenarnya -67.370,88. Keduanya saling meniadakan sampai ke sen terakhir, jadi hasilnya bukan angka
yang agak meleset tapi tepat nol. Dan nol terlihat seperti sheet yang belum diisi, bukan seperti
bug. Angka kontraknya ada di §2.6, bagian "Verified facts about the sample".

#### Perbaikannya

Balik urutan tesnya: cek kolom B untuk kata `TOTAL` sebelum cek 9 digit di kolom A.

---

### Konflik 2: GL tidak difilter ke MIS

#### Aturannya

GL tidak punya kolom departemen. Departemen ada di dalam `Account Number` sebagai segmen ketiga
yang dipisah tanda `-`, misalnya `740201000-A7744-MIS000`.

Sebuah baris GL masuk cakupan kalau salah satu dari dua klausa ini benar:

- (a) punya 3 segmen dan segmen ke-3 adalah `MIS000`, ada 63 baris, atau
- (b) punya 2 segmen dan kode COA-nya ada di master budget, ada 10 baris.

Totalnya 73 baris.

Klausa (b) bukan tambahan sepele. Sepuluh baris tanpa segmen itu adalah
`772404000-A7744 Welfare Expense SGA` sebanyak 8 baris, dan
`771501000-A7744 Handling Charge and Profession` sebanyak 2 baris. Dua-duanya akun yang MIS punya
baris budget-nya. Filter yang ditulis `parts[2] == "MIS000"` membuang keduanya tanpa bunyi.
Nilainya memang kecil, 7,51 USD di sample, tapi yang jadi masalah keheningannya, bukan besarannya.

Kontrak §3.4, bagian "Row filter".

#### Kenyataannya

Semua 4.951 baris CORE diekspor, dan kolom `Department` di `GL Final2.xlsx` › `GL_UPLOAD` berisi
konstanta `IT` di setiap baris.

Distribusi segmen ke-3 hasil hitung ulang:

| Segmen ke-3 | Baris | Masuk cakupan? |
|---|---:|---|
| `COMM00` | 4.174 | tidak |
| `GA0000` | 261 | tidak |
| `HRD000` | 126 | tidak |
| `AF0000` | 125 | tidak |
| `ME0000` | 97 | tidak |
| `SHP000` | 94 | tidak |
| `MIS000` | 63 | ya, lewat klausa (a) |
| hanya 2 segmen | 10 | ya, lewat klausa (b) |
| `SB0000` | 1 | tidak |
| Total | 4.951 | 73 yang masuk |

Contoh empat baris pertama yang ikut terbawa padahal di luar cakupan, semuanya diberi
`Department = IT`:

```
baris | Account Number         | Department | Account Description
    2 | 980302000-A7744-COMM00 | IT         | Gain/Loss from FX-Operating AP/AR
    4 | 752201001-A7744-ME0000 | IT         | Communication Line Expense Indirect
    7 | 771303000-A7744-SHP000 | IT         | Freight Cost(Air) SGA
    9 | 772403000-A7744-AF0000 | IT         | Office Supply SGA
```

Bandingkan dengan baris yang memang MIS, dan baris tanpa segmen yang masuk lewat klausa (b):

```
  944 | 772001001-A7744-MIS000 | IT         | Light and Heat Expense SGA (Electricity)
 2344 | 772404000-A7744        | IT         | Welfare Expense SGA
```

Kolom `Department` isinya `IT` di keenam baris itu, baik yang masuk cakupan maupun tidak. Yang
membedakan cuma segmen ketiga di `Account Number`, dan itu tidak dipakai.

Enaknya, 63 + 10 baris yang benar itu semuanya ada dan nilainya tepat. Masalahnya 4.878 baris lain
ikut terbawa.

#### Akibatnya

Kolom `Department` tidak bisa dipakai untuk membuang baris di luar cakupan, karena isinya
konstanta. Kolom yang nilainya sama di semua baris tidak membawa informasi apa pun. Artinya program
importer tetap harus mem-parse segmen ke-3 dari `Account Number` sendiri, yaitu justru pekerjaan
yang diharapkan sudah diselesaikan oleh template.

Efeknya kelihatan di `PIVOT_DEMO` GL: grand total-nya 4.511.273.650, bukan angka MIS. Detailnya di
bagian 3.

#### Perbaikannya

Terapkan dua klausa §3.4 di atas, dan pastikan klausa (b) ikut, bukan cuma `MIS000`. Setiap baris
yang masuk lewat klausa (b) sebaiknya ditandai "included, section missing" supaya kelihatan.

---

### Konflik 3: kolom periode tidak dibawa

#### Aturannya

Periode diambil dari kolom `Pd.`, yaitu kolom A di sheet CORE:

```
period = (fiscal_year, int(Pd.))
```

Kolom `Date` hanya untuk cross-check. Kalau bulan di `Date` tidak cocok dengan `Pd.`, munculkan
peringatan, tapi jangan pernah menurunkan periode dari `Date`.

Keduanya terbukti bisa berbeda. Di sheet `IAB` dan `OCBID` ada baris ber-stempel `Pd. 03` tapi
bertanggal akhir Mei. Di sheet `CORE` kebetulan tidak terjadi, tapi kemungkinannya nyata dan sudah
terdokumentasi.

Kontrak §3.6 bagian "Period" dan §4.1 bagian "Period key".

#### Kenyataannya

`GL Final2.xlsx` › `GL_UPLOAD` punya 15 kolom, dan `Pd.` tidak termasuk:

```
Account Number | COA | Department | Nominal (Actual Amount) | Date | Category |
Account Description | Currency | Source Sheet | Debit (Local) | Credit (Local) |
Debit (Converted) | Credit (Converted) | Nominal (Local Ccy Net) | Validation Status
```

Datanya sendiri tidak hilang. `Pd.` masih utuh di sheet `RAW_CORE` kolom A, cuma tidak dibawa ke
sheet upload-nya. Baris yang sama, dibaca dari dua sheet:

```
RAW_CORE  baris 2 :  Pd. = '03'   Date = 2026-06-05   Account = 980302000-A7744-COMM00
GL_UPLOAD baris 2 :  (tidak ada)  Date = 2026-06-05   Account = 980302000-A7744-COMM00
```

`Pd. = '03'` berarti periode 3 di FY26, yaitu Juni 2026. Di baris ini `Date` kebetulan juga Juni,
jadi dua-duanya menghasilkan jawaban yang sama. Yang hilang bukan angkanya, tapi sumber yang sah
untuk menentukannya.

#### Akibatnya

Sumber periode yang sah hilang, yang tersisa justru kolom yang statusnya cuma cross-check.

Di sample ini tidak ada yang rusak: semua 4.951 baris bertanggal Juni 2026 dan cocok dengan
`Pd. 03`. Persoalannya, karena template cuma menyodorkan `Date`, program importer akan ditulis
mengikuti `Date`, dan baru ketahuan salah di file pertama yang keduanya berbeda, ketika kodenya
sudah terlanjur jadi.

#### Perbaikannya

Bawa `Pd.` sebagai satu kolom di `GL_UPLOAD`.

---

### Konflik 4: COA duplikat menghasilkan dua baris per periode

#### Aturannya

Kalau satu kode COA muncul dua kali di sheet, ambil kemunculan pertama, lalu laporkan duplikatnya
di hasil upload. Jangan diam-diam menyimpan dua-duanya.

Ada dua kode yang begini di file sumber, dan keempat barisnya bernilai nol:

- `740199001`, di baris 14 sebagai `LABOR DIRECT Other Fixed Costs-Labor` dan di baris 99 sebagai
  `LABOR INDIRECT Other Fixed Costs-Labor`
- `761001000`, di baris 184 sebagai `LABOR SGA Directors Remuneration` dan di baris 185 sebagai
  `LABOR SGA Other Fixed Costs-Labor`

Kontrak §2.5 bagian "Validation" check 5, dan §2.6 bagian "Verified facts about the sample".

#### Kenyataannya

Dua-duanya disimpan, sehingga tiap kode mendapat 12 bulan sebanyak dua kali:

| COA | Dari baris sumber | Baris di `BUDGET_UPLOAD` | Jumlah |
|---|---:|---|---:|
| `740199001` | 14 | 86 sampai 97 | 12 |
| `740199001` | 99 | 1022 sampai 1033 | 12 |
| `761001000` | 184 | 1958 sampai 1969 | 12 |
| `761001000` | 185 | 1970 sampai 1981 | 12 |

Jadi 24 baris per kode, bukan 12. Ambil satu bulan saja, April 2026, dan duplikatnya langsung
kelihatan:

```
baris | FY   | COA       | Kategori | Budget Amount | Periode  | Source Row | Description
   86 | FY26 | 740199001 | Direct   |          0,00 | Apr 2026 |         14 | LABOR DIRECT Other Fixed Costs-Labor
 1022 | FY26 | 740199001 | Indirect |          0,00 | Apr 2026 |         99 | LABOR INDIRECT Other Fixed Costs-Labor
 1958 | FY26 | 761001000 | SGA      |          0,00 | Apr 2026 |        184 | LABOR SGA Directors Remuneration
 1970 | FY26 | 761001000 | SGA      |          0,00 | Apr 2026 |        185 | LABOR SGA Other Fixed Costs-Labor
```

Perhatikan baris 86 dan 1022: COA sama, fiscal year sama, periode sama. Cuma `Category` dan
`Source Row`-nya yang beda, dan dua kolom itu bukan bagian dari kunci.

#### Akibatnya

Dua baris berbagi kunci yang sama: (fiscal year, COA, period). Begitu masuk database, salah satu
dari dua hal terjadi. Batch-nya ditolak karena melanggar unique constraint, atau kalau
constraint-nya belum dipasang, angkanya terhitung dua kali.

Keempat baris sumbernya bernilai nol, jadi hari ini belum ada angka yang salah. Yang patah
skemanya, bukan aritmetikanya. Tapi begitu salah satu kode ini diisi nilai di FY berikutnya,
langsung jadi salah angka.

Keputusan "ambil yang pertama" sendiri memang bisa diperdebatkan. README workbook sudah benar
menandai bahwa satu COA dipakai untuk dua grouping berbeda dan itu perlu dikonfirmasi ke Finance.
Yang tidak boleh adalah menyimpan dua-duanya diam-diam sambil menunggu jawaban.

#### Perbaikannya

Simpan kemunculan pertama, laporkan yang kedua di hasil upload.

---

### Konflik 5: aturan validasi menolak budget negatif yang sah

#### Aturannya

Angka negatif itu valid dan tidak boleh dijadikan alasan penolakan file. Budget bulanan yang
negatif diberi status `ALOKASI` dan dikeluarkan dari perbandingan under/over, bukan ditolak.

Kontrak §2.5 bagian "Validation" dan §5.3 bagian "Negative budget".

#### Kenyataannya

`Budget Final2.xlsx` › `VALIDATION_REFERENCE` baris 2, field Budget Amount:

> Required; numeric only; >= 0; decimal separator '.'; must not contain letters

#### Akibatnya

Dijalankan apa adanya, aturan itu menolak `772502000 Internal cost allocation(Expense)` senilai
-368.593,63. Itu baris budget tunggal terbesar di seluruh file, dan justru baris yang di tabel
verifikasi kontrak §6 terdaftar dengan status `ALOKASI`.

Baris itu ada di file, dengan nilai negatif di setiap bulan:

```
baris | FY   | COA       | Kategori | Budget Amount | Periode  | Source Row | Description
 2882 | FY26 | 772502000 | SGA      |    -29.311,58 | Apr 2026 |        266 | EXP SGA Internal cost allocation(Expense)
 2884 | FY26 | 772502000 | SGA      |    -29.083,58 | Jun 2026 |        266 | EXP SGA Internal cost allocation(Expense)
```

Angka Juni itu, -29.083,58, persis yang tercantum di tabel verifikasi kontrak §6 dengan status
`ALOKASI`. Jadi aturan `>= 0` bukan cuma menolak baris yang kebetulan negatif, dia menolak baris
yang kontraknya sudah tunjuk sebagai contoh perilaku yang benar.

Catatan di kolom sebelah aturannya sendiri sudah merasakan ada yang janggal:

> Source contains a small number of negative values (e.g. adjustment/reversal lines) — confirm
> whether negatives are valid or should be treated as a data issue.

Pertanyaannya bagus, dan kontrak sudah menjawabnya: valid.

#### Perbaikannya

Hapus `>= 0` dari aturannya. Ganti catatannya jadi: negatif valid, statusnya `ALOKASI`, dikeluarkan
dari perbandingan under/over.

---

### Dua poin sekunder

Dua ini bukan konflik, melainkan pertanyaan yang template ajukan padahal kontraknya sudah menutup.

Soal currency, kedua `README` menandai mata uang pelaporan sebagai *Needs Business Confirmation*,
lalu menalar ke arah USD dari besaran angka converted. Penalarannya benar, dan kontrak §1 bagian
"MVP scope" memang sudah mengunci: unit of account adalah USD, angka budget USD, dan actual GL
dibaca dari pasangan debit/credit converted. Jadi tinggal kutip spec-nya, tidak perlu dibuka lagi ke Finance.

Soal category, kontrak tidak mendefinisikan turunan `Direct` / `Indirect` / `SGA`. Entitas COA
membawa atribut kategori, tapi tidak ada aturan yang menurunkannya dari suffix deskripsi. Template
menurunkannya, dan hasilnya 4.143 dari 4.951 baris GL mendarat di
`Category undetermined - Needs Business Confirmation`. Tidak merusak angka mana pun, tapi ini
aturan yang hidup di luar kontrak. Pilih salah satu: masukkan aturannya ke spec, atau buang
kolomnya.

---

## 3. Apa yang ditunjukkan sheet `PIVOT_DEMO` yang baru

### Budget: semua sel bernilai 0,00

Empat kategori dikali dua belas bulan dikali grand total, nol semua.

Ini bukan rumus basi. Saya hitung ulang pivot yang sama langsung dari `BUDGET_UPLOAD` dan hasilnya
memang begitu:

```
Grand total FY26, termasuk COA 770101000 :       0.00   <- yang tampil di PIVOT_DEMO
Grand total FY26, tanpa   COA 770101000 : -67,370.88   <- angka kontrak §2.6
```

Subtotal hantu dari konflik 1 membatalkan total yang sebenarnya secara persis, bukan cuma di grand
total tapi juga per kategori dan per bulan.

Justru di sinilah `PIVOT_DEMO` berguna. Pivot yang nol di seluruh sel adalah gejala konflik 1 yang
paling gampang dilihat, tanpa perlu menghitung apa pun.

### GL: grand total 4.511.273.650,41

Dari 4.951 baris, dan 4.507.847.319,61 di antaranya, atau 99,9%, duduk di kategori
`Needs Confirmation`.

Angka sebesar itu datang dari baris di luar cakupan, di mana faktor konversi di file sumber
terbalik. Contoh paling ekstrem, COA `970299001-A7744-COMM00`:

| Kolom | Nilai |
|---|---:|
| Debit (Local), IDR | 46.325 |
| Debit (Converted) | 812.719.298,25 |

Nominal converted seharusnya lebih kecil dari nominal IDR, bukan puluhan ribu kali lebih besar.

Angka MIS sendiri tidak tersentuh masalah ini. Tapi selama pivot-nya belum discope, dia tidak bisa
dipakai sebagai alat cek. Kalau discope sesuai kontrak, angkanya jadi bisa diverifikasi:

| Cakupan | Baris | Total actual Juni 2026 |
|---|---:|---:|
| Sesuai kontrak §3.4, klausa a + b | 73 | 488.981,16 |
| Hanya `MIS000`, klausa a saja | 63 | 488.973,64 |
| Seluruh CORE, yang sekarang | 4.951 | 4.511.273.650,41 |

Dua angka pertama ada di tabel verifikasi kanonik kontrak §6 dan bisa dicocokkan langsung.

---

## 4. Yang sudah benar di template

Semua ini saya verifikasi dengan hitung ulang, bukan diterima begitu saja.

Sumber sheet-nya tepat: budget dari `MIS (FC)`, GL hanya dari `CORE`. Tiga sheet GL lainnya
(`EMC`, `IAB`, `OCBID`) memang entitas legal lain dan benar tidak diikutkan.

Rumus nominalnya benar. `Nominal (Actual Amount)` = debit converted dikurangi credit converted,
sesuai kontrak §4.4, bagian "Amounts". Diperiksa di seluruh 4.951 baris, hasilnya nol selisih
terhadap hitungan ulang, dan nol baris yang debit dan kreditnya terisi dua-duanya sekaligus.
Kondisi terakhir ini yang membuat pengurangannya aman.

Kolom yang dipilih juga tepat, dan ini bagian yang paling gampang salah. Kolom L/M dan N/O punya
teks header yang sama persis, `Debits` dan `Credits`, tanpa penanda "converted" di mana pun.
Template mengambil pasangan yang benar. Buktinya, jumlah 63 baris `MIS000` keluar 488.973,642541,
persis angka kanonik di kontrak §6, bagian "Canonical verification table", sampai ke sen.

Grain bulanan budget-nya asli, bukan hasil bagi annual dibagi 12. Diuji dengan
`jumlah 12 bulan == kolom G` di setiap baris, hasilnya 0 selisih. Ini kontrak §2.5 check 4, dan
lolos.

Baris junk dibuang. Baris 4953 di CORE berisi `#DIV/0!` di kolom nominal, dan kalau ikut terbawa,
aritmetikanya melempar error atau diam-diam terhitung nol. Template membuangnya, 4.952 jadi 4.951.

`RAW_SOURCE` dan `RAW_CORE` disimpan utuh, jadi setiap angka turunan bisa ditelusuri balik ke baris
aslinya. Keputusan yang bagus, sebaiknya dipertahankan.

Struktur workbook-nya sendiri juga rapi. Pemisahan README, UPLOAD, COA_MAPPING,
VALIDATION_REFERENCE, dan RAW itu jelas, dan kolom `Source Row` yang menunjuk balik ke baris sumber
membuat review seperti ini jauh lebih cepat.

---

## 5. Urutan perbaikan

1. Balik urutan filter baris budget: cek `TOTAL` di kolom B sebelum cek 9 digit di kolom A. Satu
   kondisi saja, dan ini menghapus konflik 1 sekaligus membuat `PIVOT_DEMO` budget berhenti
   menampilkan nol.
2. Terapkan filter departemen di GL, dua klausa kontrak §3.4, hasilnya 73 baris. Ini juga membuat
   `PIVOT_DEMO` GL berguna, karena totalnya bisa dicocokkan dengan 488.981,16 di kontrak §6.
3. Bawa kolom `Pd.` ke `GL_UPLOAD`, satu kolom.
4. Gabungkan baris COA duplikat jadi kemunculan pertama saja, dan laporkan duplikatnya.
5. Hapus `>= 0` dari aturan Budget Amount, ganti catatannya jadi: negatif valid, status `ALOKASI`.

Nomor 1 dan 2 yang mengubah angka hari ini. Nomor 3 sampai 5 adalah kepatuhan kontrak yang belum
menghasilkan angka salah di sample ini, tapi akan menghasilkan di file berikutnya.

---

# Lampiran: kontrak lengkap `Excel-Template-Spec.md`

Bagian di bawah ini salinan utuh `Docs/Client/Excel-Template-Spec.md`, disertakan supaya dokumen
ini cukup dibaca sebagai satu file. Tidak ada satu kata pun yang diubah, jadi kalau bagian 2 di
atas mengutip §2.4 atau §3.4, pasal aslinya bisa langsung dicek di sini.

Kalau ada perbedaan antara ringkasan di atas dan salinan di bawah, yang di bawah yang berlaku.
Itu kontraknya.

---

# Excel Template Specification

Status: **locked for MVP** · Last verified against the sample files on 2026-08-06.

This document defines exactly how VEGA reads the two source workbooks. Every rule below was
verified against `Docs/Source/Budget Dummy.xlsx` and `Docs/Source/GL Dummy.xlsx`.

> **Those workbooks are not in this repository.** Only their amounts were scaled. The vendor
> names, document and PIB numbers, batch-entry IDs, and transaction dates are the client's real
> data. They are kept on the host machine under `Docs/Source/`, which `.gitignore` excludes.
> Ask the MIS supervisor for a copy before re-verifying any figure below.

Where a rule and
[VEGA-Board.drawio.svg](VEGA-Board.drawio.svg) disagree, **this document wins**; see
[§8 Board corrections](#8-board-corrections-required).

---

## 1. MVP scope

| Dimension | In scope | Out of scope |
|---|---|---|
| Department | Section `MIS000` only | `COMM00`, `GA0000`, `HRD000`, `AF0000`, `ME0000`, `SHP000`, `SB0000` |
| GL sheet | `CORE` only | `EMC`, `IAB`, `OCBID` |
| Budget sheet | `MIS (FC)` only | — (the workbook has only this sheet) |
| Currency | Converted USD figures only | Native-currency figures (`Debits`/`Credits` in columns L/M) |

**Unit of account: USD.** Budget figures are USD; GL actuals are read from the *converted*
debit/credit pair, which is also USD. The two are therefore directly comparable without any
further conversion. See [§4.4](#44-amounts).

---

## 2. Budget workbook

### 2.1 Identity

- Sheet name: `MIS (FC)`, exact, including the space and parentheses.
- Used range: `A1:CA270`, 270 rows × 79 columns.
- Header row: **6**. Data starts at row **7**.
- No cell in the sheet contains a formula. Loading with `data_only=True` is safe.

Reference cells, informational only:

| Cell | Value |
|---|---|
| `A1` | `FY 2026 Fix Cost ` (note the trailing space) |
| `E1` | `371526.8198169087` — a literal, **not** derived from anything in the sheet |
| `A3` | `Division/Workshop Name : MIS` |
| `BP4` | `FY25 Q2F VS FY26 Budget ` |

### 2.2 Locating the budget columns — the critical rule

Row 6 month labels are **not unique**. `Apr '26` appears twice (`BD` and `BP`); `Apr '25`
appears four times. Month labels alone cannot identify the budget block.

The disambiguator is **row 5**, which carries a band label over each 12-column block:

| Columns | Row 5 band | Row 6 range | Read? |
|---|---|---|---|
| H:S | `Actual` | Apr '25 – Mar '26 | no |
| T:AE | `Q3` | Apr '25 – Mar '26 | no |
| AF:AQ | `Q2` | Apr '25 – Mar '26 | no |
| AR:BC | `Q1` | Apr '25 – Mar '26 | no |
| **BD:BO** | **`Budget`** | **Apr '26 – Mar '27** | **yes** |
| BP:CA | `Gap` | Apr '26 – Mar '27 | no |

**Layout check on upload:** locate the 12-column block whose row-5 label is `Budget`, then
confirm its row-6 labels are the twelve fiscal months in order starting at April. Reject the
file if either half of that pair fails. Do not hard-code `BD:BO` as the only accepted position;
hard-code it as the *expected* position and report a mismatch.

**Why the other five bands are `no`.** `Q1`, `Q2` and `Q3` are successive forecast revisions of
FY25, and `Gap` is a comparison the app derives itself. None of them is an input.

The `Actual` band (`H:S`) is the one that invites a second look, because it is genuine FY25
monthly realisation, the only historical series anywhere in either workbook. It is still not
read, for two reasons that hold independently:

1. **An actual has exactly one source: the GL upload.** If the budget parser also wrote to
   `actual`, one `(fy, month, coa)` could carry two different figures with no rule for which
   wins, and the `actual` table has no column to tell them apart (`budget` has `source`,
   `actual` does not). "Every number traces back to an uploaded file" only survives while there
   is one kind of file per number.
2. **It is the wrong fiscal year.** `H:S` is FY25; the dashboard compares FY26 budget against
   FY26 GL. FY25 actuals have no budget counterpart in this workbook, so the rows could be
   stored but never compared to anything.

Sample evidence, should the band ever be reconsidered: it is **not** a full twelve months. Only
Apr, May, Jun and Jul '25 carry values; Aug '25 through Mar '26 are empty apart from a single
stray cell in Nov '25. Of 240 data rows, 84 have any value at all (69 rows × 4 months, 15 rows ×
1 month); 2,589 of the 2,880 cells are blank. Column C (`FY'25 Actual`) is the sum of the band and
agrees exactly on every row checked. The file was evidently prepared partway through FY25, so a
real FY26 workbook may well arrive with the band filled, but reason 1 above does not depend on
how full it is.

### 2.3 Column map

Zero-based indexes are for `openpyxl` tuples from `values_only=True`.

| Column | Index | Row-6 header | Use |
|---|---|---|---|
| A | 0 | `COA No.` | COA code — primary key |
| B | 1 | `DESCRIPTION` | COA name; also the subtotal marker |
| C | 2 | `FY'25 Actual` | not used |
| D | 3 | `FY'25 Q3 Forecast` | not used |
| E | 4 | `FY'25 Q2 Forecast` | not used |
| F | 5 | `FY'25 Q1 Forecast` | not used |
| G | 6 | `FY'26 Budget` | FY total — used as a cross-check only |
| BD…BO | 55…66 | `Apr '26` … `Mar '27` | **the twelve monthly budget figures** |

June 2026 (fiscal period 3) is column `BF`, index **57**.

### 2.4 Row classification

A row in 7…270 is a **data row** when both hold:

1. Column B is non-empty and does **not** contain the substring `TOTAL` (case-insensitive).
2. Column A, coerced to string and stripped, is a 9-digit numeric code.

Everything else is a subtotal, a section heading, or blank, and is skipped.

Two traps this rule exists to survive:

- **Column A is not consistently typed.** Rows 7-270 hold 237 strings, 6 integers, 21 empties.
  Always `str(value).strip()` before matching.
- **Three subtotal rows carry a number in column A**: row 89 = `123`, row 174 = `1234`,
  row 263 = `770101000`. The last one is a *valid-looking COA code on a subtotal row*. Filtering
  on column A alone would ingest `TOTAL SGA DEPRECIATION` as if it were an account. The `TOTAL`
  test on column B is what prevents that; it must come first.

There are 9 subtotal rows in total: 15, 87, 89, 100, 172, 174, 186, 261, 263.

### 2.5 Validation

| # | Check | Action on failure |
|---|---|---|
| 1 | Sheet `MIS (FC)` exists | reject file |
| 2 | Row 5 has a `Budget` band; row 6 under it reads Apr…Mar | reject file |
| 3 | Row 6 columns A, B, G match the expected headers | reject file |
| 4 | Every data row: `G == sum(BD:BO)`, tolerance 0.005 | reject file, list offending rows |
| 5 | Duplicate COA code within the sheet | accept, report the rows (see below) |
| 6 | At least one data row found | reject file |

Check 4 is the strong one: it holds on **240 of 240** data rows in the sample and catches both a
shifted column block and a corrupted figure.

Negative figures are **valid** and must never be a rejection reason. See
[§5.3](#53-negative-budget).

### 2.6 Verified facts about the sample

- **240 data rows, 238 distinct COA codes.**
- Two codes appear twice, all four rows zero-valued:
  - `740199001`: row 14 `LABOR DIRECT Other Fixed Costs-Labor`, row 99 `LABOR INDIRECT Other Fixed Costs-Labor`
  - `761001000`: row 184 `LABOR SGA Directors' Remuneration`, row 185 `LABOR SGA Other Fixed Costs-Labor`

  Policy: keep the **first** occurrence, report the duplicate in the upload result. Because both
  pairs are entirely zero, the choice has no numeric effect on the sample.
- **Only 19 of the 240 rows carry a non-zero budget.** The real FY26 budget is 19 accounts.
- Sum of column G across all data rows = **−67,370.88**, not zero. The negative is entirely
  attributable to `772502000 Internal cost allocation(Expense)` at −368,593.63.
- Subtotals: `TOTAL SGA LABOR` 103,195.38 · `TOTAL SGA EXPENSES` 198,027.38 ·
  `TOTAL SGA DEPRECIATION` 67,370.88. Their sum is 368,593.64, which is 2,933.18 short of the
  371,526.82 in `E1`.
- **The depreciation budget exists only at subtotal level.** `TOTAL SGA DEPRECIATION` is
  67,370.88 while every depreciation detail row is zero. This is the direct cause of the two
  unregistered GL accounts in [§5.4](#54-unregistered-coa); both are depreciation.

Because `E1` cannot be reproduced from any combination of rows in the sheet, **it is not used as
a verification total.** Check 4 (`G == sum of 12 months`, per row) replaces it.

---

## 3. GL workbook

### 3.1 Identity

- Four sheets: `EMC` (11,999 rows), `IAB` (12,286), **`CORE` (4,953)**, `OCBID` (3,143).
  **Only `CORE` is read.** The other three are different legal entities.
- `CORE`: header row 1, data rows 2-4953 = **4,952 data rows**, 19 columns.

### 3.2 Column map — read by position, not by name

| Column | Index | Header text | Use |
|---|---|---|---|
| A | 0 | `Pd.` | fiscal period — the authoritative period source |
| B | 1 | `Srce.` | not used |
| C | 2 | `Date` | cross-check only |
| D | 3 | `Account Number` | COA + entity + section |
| E | 4 | `Account Description` | shown when a COA is unregistered |
| F–I | 5–8 | `Reference`, `Vendor`, `Seq.`, `Batch-Entry` | stored, not used in analytics |
| J | 9 | `Curr.` | reported, not used in arithmetic |
| K | 10 | `Exch. Rate` | reported, **never** used to compute |
| L | 11 | `Debits` | native currency — **not used** |
| M | 12 | `Credits` | native currency — **not used** |
| **N** | **13** | `Debits` | **converted debit (USD)** — used |
| **O** | **14** | `Credits` | **converted credit (USD)** — used |
| P–S | 15–18 | `Comment`, `FP Number`, `Doc. Number`, `Comment2` | stored, not used |

**L/M and N/O carry byte-identical header text.** There is no `(converted)` suffix anywhere in
the file. A parser that maps columns by header name will silently read the native-currency pair
and produce actuals inflated by roughly the exchange rate. Columns must be addressed by index,
and the header check must assert that indexes 11-14 read `Debits, Credits, Debits, Credits` in
that order.

The relationship `N = L / Exch. Rate` holds on all 63 in-scope rows and can be asserted as a
sanity check, but the value written in N is always the one used. See [§4.4](#44-amounts).

### 3.3 Account Number

Format: hyphen-separated, `COA-ENTITY-SECTION`, e.g. `740201000-A7744-MIS000`.

| Segments | Rows in `CORE` | Meaning |
|---|---|---|
| 3 | 4,941 | normal |
| 2 | 10 | section segment missing |
| 1 | 1 | the junk row, see [§3.5](#35-rejection-and-junk-rows) |

`CORE` has a maximum of **3 segments**. The four-segment `COA-ENTITY-SECTION-MODEL` form occurs
only in sheet `IAB` and is out of scope; do not build parsing for it.

The entity segment is constant `A7744` across all 4,951 parseable rows. Assert it and report a
deviation; do not filter on it.

### 3.4 Row filter — which rows belong to IT/MIS

A row is in scope when **either**:

- it has 3 segments and segment 3 is `MIS000` (**63 rows**); or
- it has 2 segments and its COA code exists in the budget master (**10 rows**).

Total: **73 rows**.

The second clause is not a convenience. The ten section-less rows are
`772404000-A7744 Welfare Expense SGA` (8 rows) and
`771501000-A7744 Handling Charge and Profession` (2 rows). Both are accounts MIS holds a budget
line for. A filter written as `parts[2] == "MIS000"` drops them without a word and understates
those two accounts. Their combined value is small (7.51 USD in the sample) but the silence is the
problem, not the amount.

Every in-scope row taken by the second clause must be listed in the upload result as
*"included, section missing"*.

### 3.5 Rejection and junk rows

**Row 4953 is junk**: `Pd.`, `Date` and `Account Number` are all empty, and columns N and O hold
the *string* `'#DIV/0!'`. Arithmetic on it raises `TypeError`; a bare `float()` raises
`ValueError`; a permissive `try/except` silently books it as zero.

Row-level rules, applied in order:

| # | Condition | Action |
|---|---|---|
| 1 | `Account Number` empty | skip, count as *"skipped: no account"* |
| 2 | `Pd.` empty | skip, count as *"skipped: no period"* |
| 3 | N or O is not a number | **reject the file** and name the row |
| 4 | Both N and O non-zero on the same row | **reject the file** and name the row |
| 5 | Otherwise | ingest |

Rule 3 is a file-level rejection rather than a skip because a `#DIV/0!` in an amount column means
the source spreadsheet miscalculated; the correct fix is upstream, not a silent drop. Rule 1 and
rule 2 both fire on row 4953, so in practice the sample file is caught by rule 1 first; rule 3
remains as the guard for a `#DIV/0!` on an otherwise-complete row.

Rule 4 never fires in the sample (0 of 4,952 rows carry both), which is what makes
[§4.4](#44-amounts) safe.

### 3.6 Period

`Pd.` is the period. In the sample it is `'03'` on 4,951 rows and empty on 1. Period 3 of FY26 is
**June 2026**.

`Date` is a **cross-check only**: warn if a row's date month disagrees with `Pd.`, but never
derive the period from it. All 4,951 dated `CORE` rows fall in June 2026 and agree. (Sheets `IAB`
and `OCBID` do contain rows stamped `Pd. 03` but dated late May, proof that the two can diverge,
even though it does not happen inside `CORE`.)

Reject the file if a single upload contains more than one distinct `Pd.` value, since one upload
batch represents one month.

### 3.7 Verified facts about the sample

- Currency mix across `CORE`: IDR 4,680 · USD 243 · JPY 28 · empty 1.
- In-scope MIS rows: IDR 37 · USD 26 · no JPY.
- **Exchange rate varies row by row, even within IDR**: 17546, 17141, 16828, 16309,
  17521.2121212, 17740.587918 all appear. Recomputing conversion from any single rate is wrong.
- Section distribution: `COMM00` 4,174 · `GA0000` 261 · `HRD000` 126 · `AF0000` 125 · `ME0000` 97
  · `SHP000` 94 · **`MIS000` 63** · none 11 · `SB0000` 1.

---

## 4. Reading rules, restated as code contracts

### 4.1 Period key

`period = (fiscal_year, int(Pd.))` taken from column A of the GL. Never from `Date`.

### 4.2 Fiscal calendar

April-March. FY26 = Apr 2026 → Mar 2027. `Pd. 01` = April, `Pd. 03` = June, `Pd. 12` = March.
All of this lives in `backend/app/fiscal.py` and nowhere else.

### 4.3 GL lag

A GL file received in month M contains month M−1's transactions. This affects when a file is
expected, not how it is parsed.

### 4.4 Amounts

```
actual_row = N - O        # both already in USD; N and O are never both non-zero
```

Columns L, M and `Exch. Rate` are stored for traceability and **never** enter a calculation.
Currency is displayed, not computed with.

### 4.5 Aggregation

`actual(coa, period) = Σ (N − O)` over all in-scope rows with that COA and period. No stored
aggregates; everything is derived at query time. `upload_batch` is the idempotency key:
re-uploading a period replaces that period's rows wholesale.

---

## 5. Analytics rules

### 5.1 Variance

```
variance = budget_month - actual_month
```

Positive variance = spent less than budgeted.

### 5.2 Status — zero tolerance

**Any non-zero gap is a status.** There is no tolerance band.

| Condition | Status |
|---|---|
| `budget < 0` | `ALOKASI` — excluded from comparison, see [§5.3](#53-negative-budget) |
| `round(variance, 2) == 0` | `ON BUDGET` |
| `variance > 0` | `UNDER BUDGET` |
| `variance < 0` | `OVER BUDGET` |

Rounding to 2 decimals before the comparison is not cosmetic: without it, float residue turns an
exact match into a 1e-13 variance and every account reads `OVER` or `UNDER`. Round once, at the
comparison.

This replaces the ±5 % placeholder shown on the board.

### 5.3 Negative budget

`772502000 Internal cost allocation(Expense)` carries a **negative** budget: −368,593.63 for FY26,
−29,083.58 for June. It is an internal cost allocation: a credit back to the department, not
spending capacity.

Under the plain formula it produces `variance = −29,083.58 − 0 = −29,083.58`, i.e. **OVER BUDGET
on an account with zero spend**. The sign convention inverts for negative budgets.

Rule: when `budget_month < 0`, the row is labelled `ALOKASI`, its variance is displayed, and it is
**excluded** from over/under status and from any over-budget count. It still contributes its
figures to totals.

### 5.4 Unregistered COA

Two GL accounts have no row in the budget master, 9 rows in total:

| COA | Rows | Net June | Description |
|---|---|---|---|
| `770102000` | 2 | 25,890.55 | Depreciation of Machinery SGA |
| `770107001` | 7 | 134,047.21 | Depreciation of Fixture and Fitting SGA |

Both are depreciation, the same root cause as the missing depreciation detail rows in
[§2.6](#26-verified-facts-about-the-sample). The budget for these exists, but only inside the
`TOTAL SGA DEPRECIATION` subtotal of 67,370.88.

**Policy (recommended, pending confirmation): ingest, register, report.**

1. The actual is ingested and counted in every total. Dropping 159,937.76 USD of real spend
   because a master row is missing would be a far larger error than a missing budget.
2. The COA is auto-created in the master with budget 0 and a flag marking it GL-derived.
3. The upload result page lists every auto-created COA so an administrator can review it.
4. The account appears on the dashboard with budget 0 and status `OVER BUDGET`, percentage `—`.

The alternative (reject the whole 4,952-row file over 9 rows) makes the file un-ingestable until
the department fixes a budget sheet nobody controls, and blocks the other 64 rows for no reason.
**This contradicts [Flowchart.md](Flowchart.md) §8, which currently says reject-file.** Flowchart
must be patched.

### 5.5 Percentage

```
pct = variance / abs(budget_month) * 100      # only when budget_month != 0
```

When `budget_month == 0` the percentage is undefined and rendered as `—`. It is never rendered as
0 %, ∞, or a division error. Three accounts hit this in the sample: `771199000`, `771501000`, and
`771502000` (which has an FY budget of 11,071.38 but zero allocated to June; the annual budget is
**not** evenly spread across months).

### 5.6 Year-end projection

```
projection = actual_to_date / months_loaded * 12
```

`months_loaded` is the count of **distinct periods that actually have GL data**: 1 in the sample.
Never calendar months elapsed. Because the GL lags a month, calendar months always understate the
run rate and would report "safe" when it is not.

---

## 6. Canonical verification table

June 2026 · `Pd. 03` · FY26 · section `MIS000` plus the section-less in-master rows · 73 GL rows.
Every implementation of the ingest and analytics path must reproduce this table exactly.

| COA | Description | Budget FY | Budget Jun | Actual Jun | Variance | % | Status |
|---|---|---:|---:|---:|---:|---:|---|
| 760101000 | LABOR SGA Salary(Full-time) | 60,582.03 | 4,989.86 | 1.31 | 4,988.56 | 100.0 | UNDER |
| 760102000 | LABOR SGA Bonus(Full-time) | 12,361.43 | 1,017.75 | 22,622.25 | −21,604.50 | −2,122.8 | OVER |
| 760102001 | LABOR SGA THR(Full-time) | 4,451.68 | 370.97 | 44,534.03 | −44,163.06 | −11,904.7 | OVER |
| 760103000 | LABOR SGA Overtime Hours(Full-time) | 513.09 | 42.17 | 1.93 | 40.24 | 95.4 | UNDER |
| 760104000 | LABOR SGA Benefits-Employer's portion | 17,541.59 | 1,157.29 | 9.03 | 1,148.26 | 99.2 | UNDER |
| 760105000 | LABOR SGA Wages (Temporary Worker) | 1,245.86 | 103.82 | 0.00 | 103.82 | 100.0 | UNDER |
| 760106000 | LABOR SGA Cost of Retirement Benefit | 6,499.69 | 541.64 | 44,535.36 | −43,993.72 | −8,122.3 | OVER |
| 770699000 | EXP SGA Repair and Maintenance(Other) | 360.00 | 30.00 | 0.00 | 30.00 | 100.0 | UNDER |
| 770701000 | EXP SGA Subcontract Expense(IT)-G | 172,480.31 | 14,354.36 | 196,900.90 | −182,546.54 | −1,271.7 | OVER |
| 771199000 | EXP SGA Subcontract Expense(Other)-G | 0.00 | 0.00 | 20,402.28 | −20,402.28 | — | OVER |
| 771401000 | EXP SGA Travel Expense(Domestic and Intl) | 300.00 | 25.00 | 0.00 | 25.00 | 100.0 | UNDER |
| 771501000 | EXP SGA Handling Charge and Professional | 0.00 | 0.00 | 4.29 | −4.29 | — | OVER |
| 771502000 | EXP SGA Handling Charge and Professional | 11,071.38 | 0.00 | 2.80 | −2.80 | — | OVER |
| 772001001 | EXP SGA Light and Heat Expense (Electricity) | 5,584.17 | 465.35 | 3.60 | 461.75 | 99.2 | UNDER |
| 772001002 | EXP SGA Light and Heat Expense (Water) | 79.28 | 6.61 | 1.22 | 5.39 | 81.6 | UNDER |
| 772201000 | EXP SGA Communication Line Expense | 66.34 | 5.53 | 2.62 | 2.91 | 52.5 | UNDER |
| 772202000 | EXP SGA Communication Expense(IT) | 1,459.96 | 121.66 | 2.71 | 118.95 | 97.8 | UNDER |
| 772403000 | EXP SGA Office Supply | 252.00 | 21.00 | 2.06 | 18.94 | 90.2 | UNDER |
| 772404000 | EXP SGA Welfare Expense | 3,373.93 | 216.33 | 17.00 | 199.33 | 92.1 | UNDER |
| 772502000 | EXP SGA Internal cost allocation(Expense) | −368,593.63 | −29,083.58 | 0.00 | −29,083.58 | — | ALOKASI |
| 770102000 | Depreciation of Machinery SGA | — | — | 25,890.55 | −25,890.55 | — | OVER · unregistered |
| 770107001 | Depreciation of Fixture and Fitting SGA | — | — | 134,047.21 | −134,047.21 | — | OVER · unregistered |

**Total actual, June 2026 = 488,981.16 USD** (73 rows). The strict-`MIS000`-only filter yields
488,973.64 across 63 rows; the 7.51 difference is the ten section-less rows of
[§3.4](#34-row-filter--which-rows-belong-to-itmis).

### Sample-data warning

The dummy data is **not magnitude-realistic**. IDR rows convert to 1-3 USD while USD rows carry
20k-200k, so June salary reads 1.31 against a monthly budget of 4,989.86. The table above is
correct as an *arithmetic* fixture and must be reproduced exactly, but no business conclusion,
threshold, or "match the client's pivot" exercise may be based on these amounts.

---

## 7. Open questions for the department

| # | Question | Blocks | Status |
|---|---|---|---|
| 1 | Where is the detail behind the 67,370.88 depreciation budget? | correct budget for `770102000`, `770107001` | **open** — department does not know yet |
| 2 | Is `E1` = 371,526.82 meant to reconcile to anything? | nothing — dropped as a verification total | closed, not used |
| 3 | Duplicate codes `740199001`, `761001000` — which row is authoritative? | nothing while both are zero | first-occurrence rule applied |
| 4 | Are `772404000-A7744` / `771501000-A7744` (no section) IT's? | 7.51 USD | included by rule, reported on upload |
| 5 | Unit of account | — | **answered: USD, converted columns** |
| 6 | Over/under threshold | — | **answered: zero tolerance, any gap counts** |
| 7 | Unknown-COA policy | — | **recommended: ingest + auto-register + report** ([§5.4](#54-unregistered-coa)) — awaiting confirmation |
| 8 | Section `COMM00` (4,174 rows) | — | **closed: out of MVP scope** |

---

## 8. Board corrections required

[VEGA-Board.drawio.svg](VEGA-Board.drawio.svg) is the corrected board generated from this document.
[VEGA-Board.drawio.svg](VEGA-Board.drawio.svg) is the **old** export and is now stale. A rendered
drawio SVG cannot be patched in place, because its embedded `mxfile` XML and its drawn geometry
are separate artefacts. Re-export from the `.drawio` source when a picture is needed.

**Wrong on the old board (fixed):**

| On the old board | Correct value |
|---|---|
| `241 kode COA` / `cocok di seluruh 241 baris` | 240 data rows, 238 distinct codes; the `G == Σ12` check holds 240/240 |
| `jumlah seluruh baris rincian kolom G = 0` | −67,370.88 |
| `Debits (konversi)` / `Credits (konversi)` | headers read `Debits` / `Credits`, identical to L/M — the "(konversi)" label does not exist in the file |
| `model — opsional, 2–4 segmen` | `CORE` has max 3 segments; the model segment is `IAB`-only, out of scope — removed |
| Dashboard `772001001` actual `2,22` | **3.60** (4 rows: +2.2473 −0.0308 +1.3966 −0.0149) → variance 461.75 and projection 43.20 |
| GL panel says `2,25`, dashboard says `2,22` for the same row | the row is 2.2473 — the old board disagreed with itself |
| `toleransi ±5%` | zero tolerance |

**Missing on the old board (added):** the row-5 band rule
([§2.2](#22-locating-the-budget-columns--the-critical-rule)); the L/M vs N/O header collision
([§3.2](#32-column-map--read-by-position-not-by-name)); 9 subtotal rows with 3 numeric column-A
values ([§2.4](#24-row-classification)); mixed column-A types; only 19 of 240 rows non-zero; the
two duplicate codes; the `#DIV/0!` junk row; the ten section-less rows; per-row exchange-rate
variation; depreciation budget existing only at subtotal level; the negative budget inverting
status ([§5.3](#53-negative-budget)); `771502000` having an FY budget but zero in June.

**Removed (out of scope):** the `COMM00` question, the `model` segment, and the cross-sheet
"29-30 May" argument (true for `IAB`/`OCBID`, but all 4,951 `CORE` rows are June; the
period-less row 4953 is the in-scope justification for trusting `Pd.` instead).

**Correct and verified, carried over unchanged:** sheet `MIS (FC)`; header row 6, data row 7; 79
columns; columns A/B/C/G/BD/BE/BF/BO; every sample budget figure; the `G = Σ 12 months` rule;
sheet `CORE` with header row 1 and 4,951 rows; all `Pd. 03`; the IDR 4,680 / USD 243 / JPY 28 mix;
entity constant `A7744`; `MIS000` = 63 rows; 9 unmatched rows across 2 codes; `770701000` =
210,740.00 − 13,839.10 = 196,900.90 and its full dashboard row including the 2,362,810.80
projection; `months_loaded = 1`; `variance = budget − actual`; undefined percentage at zero budget.

---

## 9. Downstream changes

**Status: every [Flowchart.md](Flowchart.md) row below is applied.** They are kept here as the
record of what changed and why. The two source-file rows are Phase 3 and Phase 5 work and are
still outstanding; no feature code exists yet.

| Document | Change |
|---|---|
| [Flowchart.md](Flowchart.md) §2 | verification total: replace "compare against the Excel's own total" with the per-row `G == Σ12` check |
| [Flowchart.md](Flowchart.md) §7 rule 2, §3 stage 7, Diagram 1 | period comes from `Pd.`, not from transaction dates |
| [Flowchart.md](Flowchart.md) §8 | remove "negative amount" as a rejection reason; change unknown-COA from reject-file to ingest-and-report |
| [Flowchart.md](Flowchart.md) §2 | add mixed currency and the converted-column rule |
| [Flowchart.md](Flowchart.md) §11 | drop the stale open items (sample files delivered; annual-vs-monthly answered) |
| [Flowchart.md](Flowchart.md) | account number is 3 segments in scope, not "3 segments" as an unqualified claim |
| `backend/app/analytics.py` | zero-tolerance status, `ALOKASI` for negative budget, `—` percentage at zero budget |
| `backend/app/fiscal.py` | `Pd.` → month mapping, April-start |
